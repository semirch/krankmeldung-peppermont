/***** KONFIG *****/
/** Namen */
const CHILD_FIRST   = 'VornameKind';
const CHILD_LAST    = 'NachnameKind';
const PARENT_FIRST  = 'VornameEltern';
const PARENT_LAST   = 'NachnameEltern';

/** Schule / Klasse */
const SCHOOL_NAME   = 'Freie Sekundarschule Pfefferwerk';
const SCHOOL_CLASS  = 'Klasse 4b'; // optional, sonst '' lassen

/** Empfänger */
const RECIPIENTS_TO = 'klassenleitung@example.com, sekretariat@example.com'; // Pflicht
const RECIPIENTS_CC = 'hort@example.com'; // optional, '' wenn nicht genutzt

/** Eltern-Erinnerungs-Mail an diese Adresse */
const PARENT_EMAIL  = 'dein.mail@example.com';

/** Reminder-Uhrzeit (Europe/Berlin) – Standard 06:00 */
const REMINDER_HOUR   = 6;  // 0–23
const REMINDER_MINUTE = 0;  // 0–59

/** Absenderanzeige auf PDF (voller Name) */
const SENDER_DISPLAY_NAME = `${PARENT_FIRST} ${PARENT_LAST}`;

/** NICHT MEHR BENÖTIGT: Web-App-URL wird automatisch ermittelt */
const WEB_APP_URL  = ''; // leer lassen – Script füllt das selbst

/***** INTERN (nichts ändern) *****/
const PROPS = PropertiesService.getScriptProperties();
const TZ = Session.getScriptTimeZone() || 'Europe/Berlin';
const REMINDER_FUNC = 'sendDailyReminder';

/** Automatische /exec-URL ermitteln & merken */
function getWebUrl() {
  const saved = PROPS.getProperty('WEB_URL');
  if (saved) return saved;
  try {
    const u = ScriptApp.getService().getUrl(); // /exec der aktuellen Deployment
    if (u) { PROPS.setProperty('WEB_URL', u); return u; }
  } catch (e) {}
  // Fallback: Platzhalter – wird überschrieben, sobald doGet einmal aufgerufen wurde
  return WEB_APP_URL || 'https://script.google.com/macros/s/EXEC_URL_EINFÜGEN/exec';
}

function setup() {
  if (!PROPS.getProperty('IS_SICK')) PROPS.setProperty('IS_SICK', 'false');
  if (!PROPS.getProperty('LAST_DRAFT_DATE')) PROPS.setProperty('LAST_DRAFT_DATE', '');
  if (!PROPS.getProperty('WELCOME_SENT')) {
    const WEB = getWebUrl();
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif">
        <p><strong>${escapeHtml(CHILD_FIRST)} ${escapeHtml(CHILD_LAST)}</strong><br>${escapeHtml(SCHOOL_NAME)}${SCHOOL_CLASS ? ' · ' + escapeHtml(SCHOOL_CLASS) : ''}</p>
        <p>Startseite: <a href="${WEB}">${WEB}</a></p>
        <p>Reminder-Zeit: ${two(REMINDER_HOUR)}:${two(REMINDER_MINUTE)} Uhr (Europe/Berlin)</p>
      </div>`;
    GmailApp.sendEmail(PARENT_EMAIL, 'Krankmeldung – Startseite/Bookmark', stripHtml(html), {htmlBody: html});
    PROPS.setProperty('WELCOME_SENT', 'true');
  }
}

/** Täglicher Reminder: nur Link zur Seite */
function sendDailyReminder() {
  if (PROPS.getProperty('IS_SICK') !== 'true') return;
  const WEB = getWebUrl();
  const subject = 'Krankmeldung – Noch krank?';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">
      <p>Guten Morgen ${escapeHtml(PARENT_FIRST)},</p>
      <p>bitte prüfe die Krankmeldung für <strong>${escapeHtml(CHILD_FIRST)}</strong> (${escapeHtml(SCHOOL_NAME)}${SCHOOL_CLASS ? ', ' + escapeHtml(SCHOOL_CLASS) : ''}).</p>
      <p><a href="${WEB}" style="background:#0b57d0;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px;">Zur Krankmeldungs-Seite</a></p>
      <p style="color:#666;font-size:12px;">(Auf der Seite kannst du starten/ändern, sofort senden, Entwurf erstellen oder PDF erzeugen.)</p>
    </div>`;
  GmailApp.sendEmail(PARENT_EMAIL, subject, stripHtml(html), {htmlBody: html});
}

/** Web-App */
function doGet(e) {
  // Beim Aufruf merken wir uns die echte /exec-URL automatisch
  const _ = getWebUrl();

  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = p.action || '';
    if (!action) return HtmlService.createHtmlOutput(renderHome());

    if (action === 'startToday') {
      const msg = startOrUpdate(todayStr());
      return HtmlService.createHtmlOutput(renderConfirm(msg));
    }
    if (action === 'setStart' && p.start) {
      const start = validIsoDateOrNull(p.start);
      const msg = setStartDate(start);
      return HtmlService.createHtmlOutput(renderConfirm(msg));
    }
    if (action === 'draftToday') {
      const msg = draftToday();
      return HtmlService.createHtmlOutput(renderConfirm(msg));
    }
    if (action === 'sendTodayNow') {
      const msg = sendTodayNow();
      return HtmlService.createHtmlOutput(renderConfirm(msg));
    }
    if (action === 'pdfNow') {
      const msg = pdfNow(false);
      return HtmlService.createHtmlOutput(renderConfirm(msg));
    }
    if (action === 'pdfEnd') {
      const msg = pdfNow(true);
      return HtmlService.createHtmlOutput(renderConfirm(msg));
    }
    if (action === 'ensureReminder') {
      ensureReminderTrigger(true);
      return HtmlService.createHtmlOutput(renderConfirm('Täglicher Reminder aktiviert/aktualisiert.'));
    }
    if (action === 'stopReminder') {
      deleteReminderTrigger();
      return HtmlService.createHtmlOutput(renderConfirm('Täglicher Reminder gestoppt.'));
    }
    if (action === 'resetAll') {
      resetAll();
      return HtmlService.createHtmlOutput(renderConfirm('Status zurückgesetzt (nicht aktiv).'));
    }
    if (action === 'status') {
      return HtmlService.createHtmlOutput(renderConfirm(getStatusText()));
    }
    return HtmlService.createHtmlOutput(renderConfirm('Keine Aktion erkannt.'));
  } catch (err) {
    return HtmlService.createHtmlOutput(renderConfirm('Fehler: ' + err));
  }
}

/** Starten/aktualisieren (setzt IS_SICK=true, End=today, Reminder an) */
function startOrUpdate(startIso) {
  const today = todayStr();
  let start = startIso || today;
  if (compareIso(start, today) > 0) start = today;

  PROPS.setProperty('IS_SICK', 'true');
  PROPS.setProperty('START_DATE', start);
  PROPS.setProperty('END_DATE', today);

  ensureReminderTrigger(); // (re)aktivieren
  return `Krank-Modus aktiv/aktualisiert. Start: ${formatDate(start)}. Reminder täglich um ${two(REMINDER_HOUR)}:${two(REMINDER_MINUTE)} Uhr.`;
}

/** Startdatum setzen (kein Auto-Draft) */
function setStartDate(startIso) {
  if (!startIso) return 'Ungültiges Datum.';
  const today = todayStr();
  let s = startIso;
  if (compareIso(s, today) > 0) s = today;
  PROPS.setProperty('IS_SICK', 'true');
  PROPS.setProperty('START_DATE', s);
  PROPS.setProperty('END_DATE', today);
  return `Startdatum gesetzt: ${formatDate(s)}.`;
}

/** Heute: Entwurf erzeugen (1×/Tag) */
function draftToday() {
  const today = todayStr();
  PROPS.setProperty('IS_SICK', 'true');
  if (!PROPS.getProperty('START_DATE')) PROPS.setProperty('START_DATE', today);
  PROPS.setProperty('END_DATE', today);

  const last = PROPS.getProperty('LAST_DRAFT_DATE') || '';
  if (last === today) return 'Heutiger Entwurf wurde bereits erstellt.';
  createSickDraft(today);
  PROPS.setProperty('LAST_DRAFT_DATE', today);
  return 'Entschuldigungs­mail als Entwurf erstellt.';
}

/** Heute: sofort senden (ohne Entwurf) */
function sendTodayNow() {
  const today = todayStr();
  PROPS.setProperty('IS_SICK', 'true');
  if (!PROPS.getProperty('START_DATE')) PROPS.setProperty('START_DATE', today);
  PROPS.setProperty('END_DATE', today);

  const to = RECIPIENTS_TO;
  const cc = (RECIPIENTS_CC || '').trim();
  const dateNice = formatDate(today);
  const subject = `${CHILD_FIRST} ist heute krank${SCHOOL_CLASS ? ' – '+SCHOOL_CLASS : ''} (${dateNice})`;
  const body = [
    `Liebe Klassenleitung,`,
    ``,
    `${CHILD_FIRST} kann heute (${dateNice}) leider wegen Krankheit nicht zur Schule kommen.`,
    ``,
    `Viele Grüße`,
    `${PARENT_FIRST}`
  ].join('\n');

  const opts = {};
  if (cc) opts.cc = cc;

  GmailApp.sendEmail(to, subject, body, opts);
  PROPS.setProperty('LAST_DRAFT_DATE', today);

  return 'Entschuldigungs­mail wurde gesendet.';
}

/** PDF jetzt erzeugen; endCycle=true → beenden */
function pdfNow(endCycle) {
  const isSick = PROPS.getProperty('IS_SICK') === 'true';
  if (!isSick) return 'Aktuell ist kein Krankheitszeitraum aktiv.';
  const start = PROPS.getProperty('START_DATE') || todayStr();
  const end   = PROPS.getProperty('END_DATE') || todayStr();
  const pdfBlob = buildConfirmationPdf(start, end);
  createRecoveryDraft(start, end, pdfBlob);
  if (endCycle) {
    resetAll();
    return `PDF erstellt & Draft angelegt. Zeitraum: ${formatDate(start)} – ${formatDate(end)}. Zyklus beendet.`;
  }
  return `PDF erstellt & Draft angelegt (Zyklus bleibt aktiv). Zeitraum: ${formatDate(start)} – ${formatDate(end)}.`;
}

/** Reset */
function resetAll() {
  PROPS.setProperty('IS_SICK', 'false');
  PROPS.deleteProperty('START_DATE');
  PROPS.deleteProperty('END_DATE');
  PROPS.deleteProperty('LAST_DRAFT_DATE');
  deleteReminderTrigger();
}

/** Status */
function getStatusText() {
  const isSick = PROPS.getProperty('IS_SICK') === 'true';
  if (!isSick) return `Status: nicht aktiv. Reminder (falls aktiv): ${two(REMINDER_HOUR)}:${two(REMINDER_MINUTE)} Uhr.`;
  const start = PROPS.getProperty('START_DATE');
  const end   = PROPS.getProperty('END_DATE') || todayStr();
  return `Status: aktiv. Zeitraum bisher: ${formatDate(start)} – ${formatDate(end)}. Reminder: ${two(REMINDER_HOUR)}:${two(REMINDER_MINUTE)} Uhr.`;
}

/** Draft: tägliche Krankmeldung (informell) */
function createSickDraft(dateIso) {
  const to = RECIPIENTS_TO;
  const cc = (RECIPIENTS_CC || '').trim();
  const dateNice = formatDate(dateIso);
  const subject = `${CHILD_FIRST} ist heute krank${SCHOOL_CLASS ? ' – '+SCHOOL_CLASS : ''} (${dateNice})`;
  const body = [
    `Liebe Klassenleitung,`,
    ``,
    `${CHILD_FIRST} kann heute (${dateNice}) leider wegen Krankheit nicht zur Schule kommen.`,
    ``,
    `Viele Grüße`,
    `${PARENT_FIRST}`
  ].join('\n');

  const opts = {};
  if (cc) opts.cc = cc;
  GmailApp.createDraft(to, subject, body, opts);
}

/** Draft: formelle Bestätigung (PDF + volle Namen) */
function createRecoveryDraft(startIso, endIso, pdfBlob) {
  const to = RECIPIENTS_TO;
  const cc = (RECIPIENTS_CC || '').trim();
  const subject = `Bestätigung Krankheitszeitraum ${CHILD_FIRST} ${CHILD_LAST}${SCHOOL_CLASS ? ' – '+SCHOOL_CLASS : ''}: ${formatDate(startIso)} – ${formatDate(endIso)}`;
  const body = [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `anbei die Bestätigung des Krankheitszeitraums für ${CHILD_FIRST} ${CHILD_LAST}: ${formatDate(startIso)} – ${formatDate(endIso)}.`,
    `Ich sende das unterschriebene PDF zurück.`,
    ``,
    `Mit freundlichen Grüßen`,
    `${SENDER_DISPLAY_NAME}`
  ].join('\n');

  const opts = { attachments: [pdfBlob] };
  if (cc) opts.cc = cc;
  GmailApp.createDraft(to, subject, body, opts);
}

/** PDF bauen (Doc → PDF) */
function buildConfirmationPdf(startIso, endIso) {
  const title = `Krankheitsbestätigung ${CHILD_FIRST} ${CHILD_LAST} ${formatDate(startIso)}–${formatDate(endIso)}`;
  const doc = DocumentApp.create(title);
  const body = doc.getBody();
  body.appendParagraph('Bestätigung des Krankheitszeitraums').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(' ');
  body.appendParagraph(`Kind: ${CHILD_FIRST} ${CHILD_LAST}${SCHOOL_CLASS ? ' ('+SCHOOL_CLASS+')' : ''}`);
  body.appendParagraph(`Schule: ${SCHOOL_NAME}`);
  body.appendParagraph(`Zeitraum: ${formatDate(startIso)} – ${formatDate(endIso)}`);
  body.appendParagraph(' ');
  body.appendParagraph('Ich bestätige den oben genannten Krankheitszeitraum.');
  body.appendParagraph(' ');
  body.appendParagraph('Ort/Datum: ____________________________');
  body.appendParagraph('Unterschrift: __________________________');
  body.appendParagraph(`${SENDER_DISPLAY_NAME}`);
  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  const pdf  = file.getAs('application/pdf').setName(title + '.pdf');
  try { file.setTrashed(true); } catch(e) {}
  return pdf;
}

/** Trigger-Helfer */
function ensureReminderTrigger(force=false) {
  let had = false;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === REMINDER_FUNC) {
      had = true;
      if (force) ScriptApp.deleteTrigger(t);
    }
  });
  if (force || !had) {
    ScriptApp.newTrigger(REMINDER_FUNC)
      .timeBased()
      .atHour(REMINDER_HOUR).nearMinute(REMINDER_MINUTE)
      .inTimezone('Europe/Berlin')
      .everyDays(1)
      .create();
  }
}
function deleteReminderTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === REMINDER_FUNC)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

/** Startseite (UI) */
function renderHome() {
  const WEB = getWebUrl();
  const today = todayStr();
  const status = getStatusText();
  return `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { --pri:#0b57d0; --bg:#f7f7f8; --fg:#111; --muted:#666; --card:#fff; --border:#e5e7eb; }
    body{font-family:Inter,Arial,Helvetica,sans-serif;margin:0;background:var(--bg);color:var(--fg)}
    .container{max-width:720px;margin:0 auto;padding:24px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin:12px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    h1{font-size:20px;margin:0 0 6px}
    h2{font-size:16px;margin:0 0 10px}
    .muted{color:var(--muted);font-size:12px}
    .row{display:flex;gap:8px;flex-wrap:wrap}
    a.btn, button.btn{display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;border:1px solid var(--border);background:#fff;color:var(--fg);cursor:pointer}
    a.primary, button.primary{background:var(--pri);color:#fff;border-color:var(--pri);font-weight:600;padding:12px 16px;font-size:15px}
    a.subtle{background:transparent;border:none;color:#0b57d0;padding:0;font-size:12px;text-decoration:underline}
    input[type="date"]{padding:8px;border-radius:8px;border:1px solid var(--border)}
    .tag{display:inline-block;background:#eef2ff;color:#3730a3;border-radius:999px;padding:2px 10px;font-size:11px;margin-left:6px}
    .grid{display:grid;grid-template-columns:1fr;gap:12px}
    @media(min-width:640px){ .grid{grid-template-columns:1fr 1fr} }
  </style></head>
  <body>
    <div class="container">
      <div class="card">
        <h1>${escapeHtml(CHILD_FIRST)} ${escapeHtml(CHILD_LAST)} <span class="tag">${escapeHtml(SCHOOL_NAME)}${SCHOOL_CLASS ? ' · ' + escapeHtml(SCHOOL_CLASS) : ''}</span></h1>
        <div class="muted">${escapeHtml(status)}</div>
      </div>

      <div class="grid">
        <div class="card">
          <h2>Krankheit starten/ändern</h2>
          <div class="row">
            <a class="btn" href="${WEB}?action=startToday">Heute krank melden</a>
          </div>
          <form method="GET" action="${WEB}" style="margin-top:10px">
            <input type="hidden" name="action" value="setStart" />
            <label class="muted">Erster Krankheitstag (Rückdatierung erlaubt)</label><br>
            <input type="date" name="start" value="${today}" max="${today}" required />
            <button class="btn" type="submit">Startdatum setzen/ändern</button>
          </form>
          <p class="muted">Hinweis: Rückdatierung passt nur den Zeitraum an (keine rückwirkenden Mails).</p>
        </div>

        <div class="card">
          <h2>Entschuldigungs­mail</h2>
          <div class="row" style="align-items:center; gap:12px">
            <a class="btn primary" href="${WEB}?action=sendTodayNow"
               onclick="return confirm('Entschuldigungs­mail jetzt sofort senden?');">
               Entschuldigungs­mail jetzt senden
            </a>
            <a class="subtle" href="${WEB}?action=draftToday">
               oder als Entwurf erstellen
            </a>
          </div>
          <p class="muted" style="margin-top:6px">
            <a class="subtle" href="${WEB}?action=ensureReminder">Reminder aktivieren/aktualisieren</a> ·
            <a class="subtle" href="${WEB}?action=stopReminder">Reminder stoppen</a>
          </p>
        </div>

        <div class="card">
          <h2>PDF & Abschluss</h2>
          <div class="row" style="align-items:center; gap:12px">
            <a class="btn primary" href="${WEB}?action=pdfEnd"
               onclick="return confirm('PDF erstellen und Zyklus beenden?');">
               PDF erstellen & beenden
            </a>
            <a class="subtle" href="${WEB}?action=pdfNow">
              oder nur PDF erstellen (Zyklus bleibt aktiv)
            </a>
          </div>
          <p class="muted">Das PDF enthält den Zeitraum vom Startdatum bis zum letzten Meldetag.</p>
        </div>

        <div class="card">
          <h2>Sonstiges</h2>
          <div class="row">
            <a class="btn" href="${WEB}?action=status">Status neu laden</a>
            <a class="btn" href="${WEB}?action=resetAll">Alles zurücksetzen</a>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

/** Utils */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = ('0' + (d.getMonth()+1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}
function formatDate(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  const date = new Date(y, (m-1), d);
  return Utilities.formatDate(date, TZ, 'dd.MM.yyyy');
}
function stripHtml(html) { return html.replace(/<[^>]*>/g,''); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&gt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function renderConfirm(message) {
  const WEB = getWebUrl();
  return `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:Arial,Helvetica,sans-serif;padding:24px;background:#f7f7f8}
    .card{border:1px solid #e0e0e0;border-radius:10px;padding:20px;max-width:640px;background:#fff;margin:auto;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .ok{background:#e8f0fe;padding:10px 12px;border-radius:6px;display:inline-block}
    a{color:#0b57d0;text-decoration:none}
  </style></head>
  <body>
    <div class="card">
      <div class="ok">${escapeHtml(message)}</div>
      <p style="margin-top:12px"><a href="${WEB}">Zur Startseite</a></p>
    </div>
  </body></html>`;
}
function validIsoDateOrNull(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [_, yy, mm, dd] = m.map(Number);
  const d = new Date(yy, mm-1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== (mm-1) || d.getDate() !== dd) return null;
  return `${yy}-${('0'+mm).slice(-2)}-${('0'+dd).slice(-2)}`;
}
function compareIso(a, b) { if (a === b) return 0; return a < b ? -1 : 1; }
function two(n){ return String(n).padStart(2,'0'); }
