# myDealz Filter

Version: 1.0.2

myDealz Filter hides unwanted deals on `mydealz.de` based on your keywords.

## Hinweis

MyDealz Filter ist ein inoffizielles Open Source Hobbyprojekt, kein eigenes Angebot der MyDealz Webseite / Atolls Germany GmbH.

## Install

Local install:

  1. Open `about:debugging#/runtime/this-firefox` in Firefox.
  2. Click `Load Temporary Add-on...`.
  3. Select this project's `manifest.json`.

## What it does

- Hides deals by title keywords
- Supports exception keywords
- Shows hidden deals in the popup
- Shows the number of hidden deals in the badge

## Privacy

- No data collection
- No data transfer to external servers
- Settings stay in your browser

## Support

- GitHub: https://github.com/codingismynewgaming
- Buy me a coffee: https://buymeacoffee.com/codingiymynewgaming
- PayPal: https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8

## Versionskontrolle mit git

- Auf branchbasiert arbeiten und regelmäßig mit `git pull --rebase` aktuelle Änderungen nachziehen.
- Vor jedem Release `npm run git:status` ausführen, um sicherzustellen, dass Arbeitsbaum und Staging sauber sind.
- Neue Features oder Bugfixes in klar benannte Commits packen (z. B. `git commit -m "feat: filter nach Kategorie"`).
- Für Releases einen Tag anlegen (z. B. `git tag -a v1.0.2 -m "Release 1.0.2"`) und sowohl `package.json` als auch `CHANGELOG.md` auf die neue Versionsnummer aktualisieren.
- Unveröffentlichte Änderungen dokumentiert man oben in der `CHANGELOG.md`-Sektion „Unreleased“, damit die Historie sauber bleibt.
