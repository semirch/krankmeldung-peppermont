# Krankmeldungs-Script für Eltern

Automatisierte tägliche Krankmeldung per E-Mail & PDF-Erstellung

---

## 🎯 Zweck des Scripts

Viele Schulen erwarten, dass Eltern ihr Kind **jeden Morgen** krankmelden – oft per E-Mail an Klassenleitung und Sekretariat.  
Am Ende braucht die Schule zusätzlich noch eine **formelle Entschuldigung mit Unterschrift** über den gesamten Krankheitszeitraum.

Dieses Script übernimmt die Routine:

1. **Krankheitsmodus starten** – z. B. wenn dein Kind krank ist.  
2. Jeden Morgen um 6 Uhr bekommst du automatisch eine **Erinnerungs-E-Mail** mit einem Link zur Krankmeldungs-Seite.  
3. Auf der Seite kannst du mit einem Klick:
   - die Entschuldigung **sofort verschicken**, oder  
   - nur einen **E-Mail-Entwurf** in Gmail erstellen.  
4. Sobald dein Kind wieder gesund ist, kannst du ein **PDF mit dem gesamten Krankheitszeitraum** erzeugen lassen. Dieses PDF wird als Entwurf vorbereitet, du unterschreibst es und sendest es an die Schule.  
5. Danach wird der Prozess automatisch beendet und ist bereit für die nächste Krankmeldung.

---

## 🔄 Prozessablauf

1. **Starten**
   - Klick auf „Heute krank melden“.  
   - Optional: Rückdatierung möglich, wenn das Kind schon früher krank war.  

2. **Tägliche Krankmeldung**
   - Jeden Morgen auf den Link in der Erinnerungs-Mail klicken.  
   - Dort auswählen:
     - „Entschuldigungs­mail jetzt senden“ (direkt an die Schule)  
     - oder „Entwurf erstellen“ (zum manuellen Anpassen).  

3. **Abschließen**
   - Bei Genesung: „PDF erstellen & beenden“ klicken.  
   - Script erstellt PDF mit Start- und Enddatum, legt Mailentwurf an.  
   - PDF unterschreiben & absenden.  
   - Prozess wird zurückgesetzt.

---

## ⚙️ Technische Voraussetzungen

- Ein **Google-Account** mit Gmail.  
- Zugriff auf den **Google Apps Script-Editor**.  
- Berechtigungen für:
  - **Gmail** (Entwürfe & Versand)  
  - **Google Drive & Docs** (PDF-Erstellung)  
- Internetzugang 😉  
- **Keine zusätzlichen Kosten** – läuft komplett mit deinem Google-Konto.

---

## 🚀 Installation

1. **Neues Script erstellen**
   - [script.google.com](https://script.google.com) öffnen.  
   - **Neues Projekt** anlegen.  
   - Script-Code hineinkopieren.

2. **Konfiguration anpassen**
   - Im Kopf des Scripts folgende Angaben ändern:
     - Vor- und Nachname deines Kindes  
     - Eigener Vor- und Nachname  
     - Schulname und ggf. Klasse  
     - Empfängeradressen der Schule (TO & CC)  
     - Deine eigene Mailadresse (für die Reminder)  
     - Uhrzeit des Reminders (Standard: 06:00 Uhr)

3. **Speichern**

4. **Web-App bereitstellen**
   - Menü: **Bereitstellen → Neue Bereitstellung → Web-App**  
   - *Ausführen als*: **Ich selbst**  
   - *Zugriff*: **Jeder, der den Link hat**  
   - Bereitstellen und die erzeugte URL (endet auf `/exec`) kopieren.

5. **Erstnutzung & Berechtigungen**
   - URL im Browser öffnen → Buttons testen.  
   - Google fragt einmalig nach Berechtigungen → alles zulassen.  

6. **Bookmark setzen**
   - Die `/exec`-URL als Lesezeichen auf Handy & PC speichern.  
   - Zusätzlich erhältst du beim ersten Setup eine Mail mit der Startseite.

---

## ✅ Zusammenfassung

- **Einmal einrichten** – danach läuft alles automatisch.  
- **Morgens 1 Klick** – Krankmeldung fertig.  
- **Automatische PDF-Erstellung** am Ende des Krankheitszeitraums.  
- Keine Textbausteine oder Adressen mehr suchen – alles direkt in deinem Google-Konto.
