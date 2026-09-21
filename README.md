# Queens Berlin — Website

Statische Website (HTML/CSS/JS, kein Build-Schritt nötig). Einfach
`index.html` im Browser öffnen oder den ganzen Ordner auf einen
beliebigen Webhoster (Netlify, GitHub Pages, eigenes Hosting) hochladen.

## Struktur

```
index.html        Alle Inhalte/Sektionen
css/style.css      Design (Farben, Typografie, Layout)
js/main.js         Menü, Sprachumschalter DE/EN
images/            Platzhalterbilder (SVG)
```

## Vor dem Livegang: das Wichtigste

1. **Hero-Video einbauen**
   In `index.html` im `<section class="hero">`-Block:
   - Das `<img class="hero-media__img" ...>` entfernen
   - Das auskommentierte `<video class="hero-media__video" ...>` aktivieren
   - `images/hero-video.mp4` durch eure echte Videodatei ersetzen
   - `poster="images/hero-placeholder.svg"` kann durch ein echtes Standbild
     ersetzt werden (wird gezeigt, solange das Video lädt)

2. **Fotos austauschen**
   Alle `images/*-placeholder.svg` durch echte Fotos ersetzen (gleicher
   Dateiname und Format ist nicht nötig — einfach den `src=` in
   `index.html` anpassen, z.B. `images/billiard.jpg`).

3. **Formular aktivieren (Reservierung)**
   Das Kontaktformular nutzt [Formspree](https://formspree.io) (kostenloser
   Formular-Versand für statische Seiten, keine eigene Server-Programmierung
   nötig):
   - Kostenloses Konto auf formspree.io anlegen
   - Neues Formular erstellen, Ziel-E-Mail: `info@queensberlin.de`
   - Die dort angezeigte Formular-ID in `index.html` eintragen:
     `action="https://formspree.io/f/REPLACE_WITH_FORMSPREE_ID"`
   - Kostenlos bis 50 Anfragen/Monat — reicht für den Start locker

4. **TripAdvisor-Link**
   Es gibt aktuell **kein kostenloses Live-Widget** von TripAdvisor mehr
   ohne Business-Konto. Umgesetzt ist daher ein einfacher Link-Button
   ("Bewertungen auf TripAdvisor"). In `index.html` (zwei Stellen:
   Öffnungszeiten-Sektion + Footer) das `href="#"` durch euren echten
   TripAdvisor-Profil-Link ersetzen.

5. **Adresse & Öffnungszeiten**
   Aktuell Platzhalter ("Musterstraße 1, 12047 Berlin", Beispielzeiten) —
   in `index.html` (Abschnitt "Öffnungszeiten") durch die echten Werte
   ersetzen. Auch den Google-Maps-Embed-Link anpassen (aktuell zeigt er
   nur allgemein auf "Berlin").

6. **Social-Links**
   Alle `href="#"` bei Instagram/Facebook (Header + Footer) durch die
   echten Profil-Links ersetzen.

7. **Blog-Beitrag**
   Der Beitrag unter "Kiez-Blog" ist ein Beispieltext — Titel, Datum und
   Text in `index.html` (Abschnitt `#kiez-blog`) durch echten Inhalt
   ersetzen. Für weitere Beiträge einfach das `<article class="blog-post">`
   duplizieren.

8. **Impressum & Datenschutz**
   Aktuell nur Platzhalter-Links im Footer — als Kneipenbetreiber seid ihr
   gesetzlich zur Angabe eines Impressums verpflichtet. Am einfachsten:
   zwei weitere Unterseiten (`impressum.html`, `datenschutz.html`) mit den
   Pflichtangaben anlegen und im Footer verlinken.

9. **Adresse für die Anfahrt & den "Route planen"-Button**
   In `index.html` im Abschnitt `#anfahrt`: den Google-Maps-Embed-Link
   und den `href` beim "Route planen"-Button (aktuell `Musterstraße 1
   12047 Berlin`) durch die echte Adresse ersetzen.

## Getränkekarte (versteckte QR-Seite)

Die Karte liegt unter `menu/index.html` — **absichtlich nicht** über die
normale Navigation verlinkt und mit `<meta name="robots" content="noindex">`
versehen, damit sie nur über den QR-Code am Tisch gefunden wird, nicht
über Google oder die Website selbst. Sie funktioniert schon heute mit der
echten, aus dem alten Projekt übernommenen Getränkeliste (`menu/menu-data.json`,
115 Positionen).

**Damit der Kunde die Karte selbst ändern kann, ohne Code anzufassen**
(so wie er es sich gewünscht hat), auf ein Google Sheet umstellen:
1. Neues Google Sheet anlegen mit den Spalten `Kategorie | Getränk | Größe | Preis`
   (Größe darf leer bleiben, z.B. bei Espresso). Die 115 Zeilen aus
   `menu/menu-data.json` können 1:1 als Startpunkt reinkopiert werden.
2. In Google Sheets: **Datei → Freigeben → Im Web veröffentlichen → Format: CSV**
3. Die dort angezeigte Link in `menu/menu.js` bei `SHEET_CSV_URL` eintragen
4. Fertig — der Kunde bearbeitet ab dann nur noch ganz normal die Tabelle
   (wie in Excel), die Website zieht sich bei jedem Aufruf automatisch den
   aktuellen Stand. Ohne Internetverbindung zum Sheet fällt die Seite
   automatisch auf `menu-data.json` zurück, geht also nie "kaputt".

**Navigation bewusst reduziert und für Handys optimiert**: Statt einer
Leiste mit allen 16 Einzelkategorien gibt es nur 6 große Kategorien
(Bier, Wein & Sekt, Spirituosen, Longdrinks, Alkoholfrei, Warme Getränke),
als **fixierte Bottom-Bar** in der Daumenzone — immer erreichbar, egal wie
weit man runtergescrollt hat, mit Scroll-Spy (zeigt per Hervorhebung an,
in welcher Kategorie man sich gerade befindet). Statt Emojis gibt es
dezente Monogramm-Icons (Serif-Buchstabe im Goldring), passend zum
Logo-Stil. Welche Tabellen-Kategorie zu welcher Kachel gehört, steht in
`menu/menu.js` ganz oben im `GROUPS`-Array. Trägt der Kunde in der Tabelle
eine komplett neue Kategorie ein, die dort nicht zugeordnet ist, landet
sie automatisch unter "Weitere Getränke" — die Seite bricht also nie,
auch ohne Code-Anpassung.

**Ein Foto pro Kategorie, nicht pro Getränk**: Damit die Karte auf dem
Handy appetitlich wirkt, ohne durch 115 Einzelbilder endlos lang zu
werden, hat jede der 6 Kategorien genau ein Banner-Bild oben
(`menu/images/banner-*.svg`, aktuell Platzhalter). Einfach durch ein
appetitliches Foto ersetzen (z.B. ein Glas Bier für "Bier").

**QR-Code zum Ausdrucken** (Tischaufsteller): Sobald die Seite online ist,
z.B. mit [qr-code-generator.com](https://www.qr-code-generator.com) oder
`qrencode` einen QR-Code auf die URL `https://eure-domain.de/menu/`
erzeugen und ausdrucken. Bewusst **nicht** die lokale `file://`-Adresse
verwenden — der QR-Code muss auf die live gehostete Seite zeigen.

## Noch offen (nicht Teil des Codes)

- **NFC-Chips**: Hardware separat bestellen (z.B. programmierbare NTAG215-
  Chips), auf den Google-Maps-Bewertungslink des Kunden programmieren
  (Google-Profil → "Rezension schreiben" → Link kopieren) und auf
  Tischaufstellern anbringen.
- **Fotos**: Falls keine eigenen Fotos vorliegen, Fotos aus dem
  Google-Maps-Business-Profil des Kunden übernehmen (mit seiner
  Zustimmung, da es sein eigenes Profil ist) und alle `images/*-placeholder.svg`
  damit ersetzen.
- **Instagram-Post-Design**: separate Aufgabe, nicht Teil dieser Website.

## Atmosphäre-Galerie ("Riesenrad")

Die Galerie-Sektion ist an den Scroll-Fortschritt gekoppelt und als
echtes 3D-Rad gebaut (CSS `rotateX`/`translateZ` + `perspective`): Die
Achse liegt waagerecht (links-rechts), wie bei einem Riesenrad von der
Seite betrachtet — sie zeigt nicht auf den Betrachter. Die Bilder hängen
wie Gondeln am Radius, bleiben dabei der Kamera zugewandt und schwingen
beim Scrollen groß und nah nach vorne, dann klein und blass wieder nach
hinten. Die Sektion ist dafür deutlich höher als der Bildschirm
(`.gallery-pin` in `css/style.css`, aktuell `380vh`), damit man nicht
daran vorbeischrollt, ohne alle Bilder einmal vorne gesehen zu haben.

Die Geometrie wird in `js/main.js` im Abschnitt "Atmosphäre-Galerie"
berechnet. Folgende Werte lassen sich bei Bedarf leicht anpassen, falls
es im Browser zu eng/weit/schnell wirkt:
- `radius` in `measure()` (wie weit die Bilder nach vorne/hinten schwingen)
- `perspective` auf `.gallery-stage` in `css/style.css` (aktuell `1100px`
  — kleinerer Wert = dramatischerer 3D-Effekt, größerer Wert = flacher)
- Die Breite der Bilder (`.gallery-item { width: ... }` in `css/style.css`)
- Die Höhe von `.gallery-pin` in `css/style.css` (wie viel Scroll-Distanz
  eine volle Umdrehung braucht — kleiner = schnellerer Durchlauf)

Bei aktivierter "Reduce Motion"-Systemeinstellung (oder ganz ohne JS)
fällt die Galerie automatisch auf eine normale scrollbare Bilderreihe
zurück, damit niemand ausgesperrt wird.

## Übersetzung DE/EN

Alle übersetzbaren Texte stehen zentral in `js/main.js` im
`translations`-Objekt. Ein Text ändert sich, wenn man den passenden Wert
bei `de:` bzw. `en:` anpasst. Für neue Texte: im HTML ein
`data-i18n="mein_key"`-Attribut setzen und den Key in `translations`
ergänzen.

## Farben anpassen

Alle Farben stehen als Variablen ganz oben in `css/style.css`
(`:root { ... }`) — z.B. `--color-green` für das Irish-Pub-Grün oder
`--color-gold` für den Kupfer-Akzent. Eine Änderung dort wirkt sich auf
die ganze Seite aus.
