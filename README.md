# mydealz.de Filter

Version: 1.0.6

mydealz.de Filter hides unwanted deals on `mydealz.de` based on your keywords.

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

## Install

Get it on the Firefox Addons Store: https://addons.mozilla.org/de/firefox/addon/mydealz-de-filter/

Or local install from the unsigned Zip in Release:

  1. Open `about:debugging#/runtime/this-firefox` in Firefox.
  2. Click `Load Temporary Add-on...`.
  3. Select `app-files/manifest.json`.

## What it does

- Hides deals by title keywords
- Supports exception keywords
- Lets you organize filter terms into categories
- Supports drag-and-drop category assignment
- Can grey out previously seen deals
- Auto-sorts comments by most helpful on deal pages
- Shows hidden deals in the popup
- Shows filter statistics in the popup
- Supports grouped statistics with group management
- Shows the number of hidden deals in the badge

## Privacy

- No data collection
- No data transfer to external servers
- Settings stay in your browser

## Support

- GitHub: https://github.com/codingismynewgaming
- Buy me a coffee: https://buymeacoffee.com/codingiymynewgaming
- PayPal: https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8

## Firefox AMO Release

This project supports AMO publishing through `web-ext sign` without a manual upload step.

### Prerequisites

- `web-ext` 8+ available on your `PATH`
- AMO API credentials from https://addons.mozilla.org/developers/addon/api/key/
- `manifest.json` must keep `browser_specific_settings.gecko.id`

Example global install:

```bash
npm install --global web-ext@^8
```

### Environment

Copy `.env.example` into your local shell environment and set:

- `WEB_EXT_API_KEY`
- `WEB_EXT_API_SECRET`

Optional:

- `WEB_EXT_SOURCE_DIR` default: `.`
- `WEB_EXT_ARTIFACTS_DIR` default: `web-ext-artifacts`
- `WEB_EXT_AMO_METADATA` default: `amo-metadata.json`
- `WEB_EXT_UPLOAD_SOURCE_CODE` path to a source archive zip
- `WEB_EXT_APPROVAL_TIMEOUT` wait time in milliseconds
- `FIREFOX_APPROVAL_NOTES` reviewer notes for update submissions

### Commands

- `npm run release:firefox:validate`
  - checks `web-ext` version, manifest Gecko ID, and runs `web-ext lint`
- `npm run release:firefox:listed`
  - first listed submission or listed release using `amo-metadata.json`
- `npm run release:firefox:unlisted`
  - creates a signed unlisted XPI for self-distribution
- `npm run release:firefox:update`
  - submits a listed update; metadata is optional

### Typical Release Flow

First listed release:

```bash
npm run release:firefox:listed
```

Listed update:

```bash
npm run release:firefox:update
```

Unlisted self-distribution build:

```bash
npm run release:firefox:unlisted
```

Listed update with source upload:

```bash
git archive --format=zip --output web-ext-artifacts/extension-source.zip HEAD
WEB_EXT_UPLOAD_SOURCE_CODE=web-ext-artifacts/extension-source.zip npm run release:firefox:update
```

The GitHub Actions workflow in `.github/workflows/firefox-release.yml` publishes on tag push and defaults to `listed`. You can override the mode with the repository variable `FIREFOX_RELEASE_CHANNEL` set to `listed` or `unlisted`, or use `workflow_dispatch` to choose it manually.



