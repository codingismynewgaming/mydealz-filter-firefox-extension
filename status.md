# Project Status - mydealz-filter-firefox-extension

## Last Changes (2026-03-14)
- Bumped version to 1.0.8 for Mozilla Add-ons submission
- Updated manifest.json and package.json to version 1.0.8
- Created /internals folder for sensitive credentials
- Saved AMO API credentials (JWT issuer + secret) in /internals/amo-credentials.md
- Updated CHANGELOG.md with 1.0.8 release entry
- **Successfully submitted v1.0.8 to Mozilla Add-ons** 🎉
- Signed XPI available at: `web-ext-artifacts/mydealz_de_filter-1.0.8.xpi`

## Important Notes (Command Fails + Fixes)
- `rg -n "issues|github" *.md` failed in PowerShell because `*.md` globbing isn't supported -> used `rg -n "issues|github" -g "*.md"` instead.
- `Get-Content -Raw .web-ext-ignore` failed because the file does not exist in repo.
- `git remote -v` failed because this folder is not a git repo (`.git` missing).
- `npm run lint:firefox` completed, but `web-ext` update check failed due to config-store permissions. Lint still passed with 1 warning.
- **First AMO submission failed** with "homepage URL not allowed" error -> removed homepage field from `amo-metadata.json` (only external URLs allowed)
- **Second submission succeeded** after fixing metadata

## Used Tech Stack
- Firefox WebExtension (Manifest V3)
- Vanilla JavaScript
- HTML + CSS

## Current Status
- Version 1.0.8 **successfully submitted** to Mozilla Add-ons
- Awaiting Mozilla review and approval
- Signed XPI available at: `web-ext-artifacts/mydealz_de_filter-1.0.8.xpi`

## AMO Submission Info
- Add-on URL: https://addons.mozilla.org/en-US/firefox/addon/mydealz-de-filter/
- JWT Issuer: user:15554910:941
- Credentials stored in: /internals/amo-credentials.md
- Submission date: 2026-03-14

## Next Steps
- Monitor AMO review status in Developer Hub
- Manual verification of all 1.0.6/1.0.7 features in Firefox once approved
