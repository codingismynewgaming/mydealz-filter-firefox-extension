# mydealz.de Filter

Version: 1.1.0

Auf mydealz.de landen jeden Tag unzählige Deals, die einen überhaupt nicht interessieren. Bestimmte Shops, immer wieder dieselben Produktkategorien oder Aktionen, die man schon dreimal gesehen hat. Genau dafür gibt es diese Erweiterung: einmal eigene Stichwörter festlegen, und der Feed bleibt sauber.

Alles läuft lokal direkt im Browser. Keine Server, kein Tracking, keine Weitergabe von Daten.

## Was die Erweiterung konkret macht

- **Deals nach Stichwörtern ausblenden**: Alles mit passenden Begriffen im Titel verschwindet direkt aus dem Feed (inklusive `/gutscheine/` und kompakter Titel).
- **Ausnahmebegriffe**: Begriffe schützen, die trotz Filter sichtbar bleiben sollen (zum Beispiel `Apple` filtern, aber `Android` als Ausnahme behalten).
- **Kategorien und Statistik-Gruppen**: Begriffe in Kategorien sortieren, per Drag-and-drop verschieben und direkt in der Statistik einzeln an- oder ausschalten.
- **Gesehene Deals ausgrauen**: Bereits vorbeigescrollte Deals verblassen dezent (einstellbare Deckkraft). Wer sie wieder normal sehen will, setzt den Verlauf einfach zurück.
- **Kommentare automatisch sortieren**: Auf Deal-Seiten auf Wunsch automatisch nach „Am hilfreichsten“ sortieren.
- **Ruhigeres Nachladen im Feed**: Hält die Scroll-Position beim Nachladen weiterer Deals stabiler und blendet kleine Seiten-Trenner ein.
- **Schnell-Dialog per Shortcut**: Mit `Strg+Umschalt+K` (`Cmd+Umschalt+K` auf macOS) blitzschnell einen neuen Filterbegriff hinzufügen.
- **Backup per JSON**: Filter, Kategorien und Einstellungen sauber exportieren und wieder importieren.
- **Deutsch & Englisch + Dark Mode**: Passt sich automatisch an Browsersprache und System-Theme an.

## Installation

### Firefox (Empfohlen)
Direkt über den [Firefox Add-ons Store](https://addons.mozilla.org/de/firefox/addon/mydealz-de-filter/) installieren.

### Microsoft Edge
1. Die aktuelle Datei `mydealz-de-filter-edge-v1.1.0.zip` von [GitHub Releases](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/releases) herunterladen und entpacken.
2. In Edge `edge://extensions` öffnen und den **Entwicklermodus** aktivieren.
3. Auf **Entpackte Erweiterung laden** klicken und den entpackten Ordner auswählen.

### Manuelle XPI-Installation (Firefox)
1. Die aktuelle `.xpi`-Datei von [GitHub Releases](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/releases) herunterladen.
2. In Firefox `about:addons` öffnen und die Datei per Drag-and-drop hineinziehen.

### Selbst bauen (Entwicklung)

```bash
npm test
npm run lint:firefox
npm run build:edge
```

Die Edge-Version liegt danach als Paket und entpackter Ordner unter `builds/`.

## Datenschutz

- Keine Datensammlung
- Keine Verbindung zu externen Entwickler-Servern
- Alle Filter und Zähler bleiben lokal in deinem Browser bzw. optional im Browser-Sync

## Fehler melden & Support

Hast du einen Bug gefunden oder eine Idee für das nächste Update?

- **Issues & Feature-Wünsche**: https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/issues
- **Buy me a coffee**: https://buymeacoffee.com/codingiymynewgaming
- **PayPal**: https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8

## Hinweis / Disclaimer

Dieses Projekt ist eine inoffizielle Browser-Erweiterung und steht in keiner Verbindung zu mydealz.de, Pepper.com oder deren Partnern.
Die Erweiterung arbeitet ausschließlich clientseitig und passt lediglich die Darstellung der mydealz.de-Website im Browser des Nutzers an.

- Es werden keine Inhalte von mydealz.de gespeichert oder weitergegeben.
- Es werden keine technischen Schutzmaßnahmen umgangen.
- Es werden keine Affiliate-Links verändert oder ersetzt.
- Es findet keine Datenübertragung an den Entwickler oder Dritte statt.

Alle Marken- und Produktnamen (einschließlich „mydealz.de“) sind Eigentum der jeweiligen Rechteinhaber und werden ausschließlich zur eindeutigen Beschreibung der Kompatibilität verwendet.
Die Nutzung dieser Erweiterung erfolgt auf eigene Verantwortung.
Es liegt in der Verantwortung des Nutzers, die Nutzungsbedingungen von mydealz.de zu beachten.
