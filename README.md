# Queen's Schöneberg — Website

Website mit eigenem kleinen Server (nur Node.js, keine weiteren Pakete, kein
Build-Schritt). Der Wirt pflegt Getränkekarte und Kiez-Beiträge selbst im
passwortgeschützten Verwaltungsbereich.

## Struktur

```
index.html            Startseite
kiez-blog.html        "Was geht im Kiez" (Beiträge kommen vom Server)
menu/                 Getränkekarte (nur per QR-Code, nicht verlinkt)
verwaltung/           Verwaltungsbereich für den Wirt (nicht verlinkt, Passwort)
css/, js/, images/    Design, Skripte, Bilder
server/server.js      Webserver + Schnittstelle (/api/...)
server/data/          Inhalte als JSON + Passwort-Hash (nicht im Repository)
uploads/              Vom Wirt hochgeladene Fotos (nicht im Repository)
deploy/               Vorlagen für den VPS (systemd-Dienst, Caddy)
```

## Lokal starten

```
node server/set-password.js     # einmalig: Passwort für die Verwaltung setzen
node server/server.js           # Seite läuft auf http://127.0.0.1:8000
```

`index.html` direkt als Datei zu öffnen reicht nicht mehr: Beiträge,
Verwaltung und Reservierungsformular brauchen den Server. (Die Getränkekarte
fällt ohne Server auf `menu/menu-data.json` zurück.)

## Verwaltungsbereich (für den Wirt)

Adresse: `https://<domain>/verwaltung` — nirgends verlinkt, für Suchmaschinen
gesperrt, Zugang nur mit Passwort (8 Fehlversuche in 15 Minuten, dann Sperre).

- **Getränkekarte**: Kategorie aufklappen, Name/Größe/Preis ändern, Getränke
  hinzufügen, löschen, mit ▲▼ umsortieren, dann **Speichern**. Die
  Startwerte stammen aus `menu/menu-data.json`.
- **Kiez-Beiträge**: Überschrift, Datum, Text und optional ein Foto;
  „Veröffentlichen“ stellt den Beitrag sofort online. Fotos werden im Browser
  auf max. 1600 px verkleinert.
- **Anfragen**: Alles aus dem Formular „Tisch reservieren“. Es wird (noch)
  **keine E-Mail** verschickt — der Wirt sieht die Anfragen hier und antwortet
  per Tipp auf die E-Mail-Adresse.

Neue Kategorien lassen sich in der Verwaltung nicht anlegen. Welche Kategorie
zu welcher der sechs großen Kacheln gehört, steht in `menu/menu.js` im
`GROUPS`-Array; dort auch die Banner-Bilder.

Passwort ändern: auf dem Server `node server/set-password.js` (gilt sofort).

## Online stellen (VPS, z.B. Ubuntu 24.04)

```
sudo apt install nodejs caddy                 # Node.js ab Version 18
sudo useradd --system --home /srv/queens queens
sudo mkdir -p /srv/queens && sudo chown queens: /srv/queens
# Projektordner nach /srv/queens kopieren (git clone oder rsync), dann:
sudo -u queens node /srv/queens/server/set-password.js
sudo cp /srv/queens/deploy/queens.service /etc/systemd/system/
sudo systemctl enable --now queens
sudo cp /srv/queens/deploy/Caddyfile /etc/caddy/Caddyfile   # Domain darin prüfen
sudo systemctl reload caddy
```

Danach bei All-Inkl den **A-Eintrag** von `queensberlin.de` (und `www`) auf
die IP des VPS umstellen. Die MX-Einträge **nicht** anfassen, sonst kommen
keine E-Mails mehr an. Caddy holt das HTTPS-Zertifikat automatisch, sobald
die Domain auf den VPS zeigt.

**Sicherung**: `server/data/` und `uploads/` enthalten alles, was der Wirt
gepflegt hat — diese beiden Ordner regelmäßig sichern. Bei einem Update der
Website dürfen sie nicht überschrieben werden.

## Noch offen vor dem Livegang

- **Öffnungszeiten** in `index.html` sind Platzhalter.
- **Impressum & Datenschutz**: Links im Footer führen noch ins Leere
  (gesetzlich Pflicht).
- **Hero-Video** hat nur 848 × 352 px — für ein scharfes Bild eine Datei in
  mind. 1080p einsetzen (`images/queens-video.mp4`).
- **QR-Code** für die Tische auf `https://<domain>/menu/` erzeugen.
- **Google-Bewertungslink** im Footer einmal angemeldet testen.

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
