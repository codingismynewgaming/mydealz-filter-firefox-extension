# Project Status - mydealz-filter-firefox-extension

## Last Changes (2026-03-20)
- **Version 1.0.10 released** - Bumped from 1.0.9
- **AMO Submission**: Public release on Mozilla Add-ons website (listed channel, not self-hosted)
- Built XPI using `web-ext build` command
- XPI file: `web-ext-artifacts/mydealz_de_filter-1.0.10.xpi`
- Distribution: Automatic updates via Mozilla Add-ons
- **Added infinite scroll improvements toggle** in extension options to enable/disable the feature
- **Improved infinite scroll logic**: Now only triggers when going over 80% threshold of loaded deals and doesn't trigger again when already at bottom of page
- **Enhanced 'am hilfreichsten' auto-sort**: Only sets sort if it's not already set to avoid unnecessary changes

## Last Changes (2026-03-19)

## Last Changes (2026-03-19)
- **Version 1.0.9 released** - Bumped from 1.0.8
- Fixed infinite scroll code: Was broken as string literals instead of executable code. Now properly triggers scroll on pages like /gruppe/freebies at 80% threshold.
- Fixed icon not turning green on mydealz.de: The background.js had corrupted code with escaped newlines that prevented proper icon state management.
- Completely rewrote keyboard shortcut implementation based on Mozilla documentation:
  - Firefox requires using `chrome.commands.getAll()` to read current shortcuts
  - Firefox requires using `chrome.commands.openShortcutSettings()` to let users change shortcuts
  - The `chrome.commands.update()` API has limitations and may not work for all shortcuts
  - Added proper fallback handling for browsers without full commands API support
  - Updated UI to show current shortcut as read-only with "Change in Firefox" button
  - Added message handlers in background.js: `updateKeyboardShortcut`, `getKeyboardShortcut`, `openShortcutSettings`
- Fixed corrupted JavaScript files: options.js and background.js had `\n` string literals instead of actual newlines.
- Updated options.html and popup.html with proper shortcut display and Firefox settings button.
- **Redesigned keyword dialog** (keyword-dialog.html + keyword-dialog.js):
  - Changed title to "Add filter keyword"
  - Single input field (no database display)
  - Removed exception terms section entirely
  - Green "Add filter terms" button saves but keeps popup open
  - "Close" button added to close the dialog
  - Enter key saves AND closes the popup
  - Shows success message and clears field for next entry when clicking green button
  - Checks for duplicates before adding
- **Fixed keyword dialog layout**: Proper sizing (380px width) to prevent scrolling
- **Added dark/light mode support to keyword dialog**:
  - CSS variables matching popup.css theme system
  - Respects `prefers-color-scheme` media query
  - Syncs with stored theme preference from extension
  - Auto-updates when system theme changes

## Important Notes (Command Fails + Fixes)
- `rg -n "issues|github" *.md` failed in PowerShell because `*.md` globbing isn't supported -> used `rg -n "issues|github" -g "*.md"` instead.
- `Get-Content -Raw .web-ext-ignore` failed because the file does not exist in repo.
- `git remote -v` failed because this folder is not a git repo (`.git` missing).
- `npm run lint:firefox` completed, but `web-ext` update check failed due to config-store permissions. Lint still passed with 1 warning.
- **First AMO submission failed** with "homepage URL not allowed" error -> removed homepage field from `amo-metadata.json` (only external URLs allowed)
- **Second submission succeeded** after fixing metadata
- **Infinite scroll code was broken** - the code was inside string literals (double quotes) instead of being executable JavaScript. Fixed by rewriting the end of content-script.js.
- **Background.js message handler was broken** - had `\`n` escaped newlines instead of actual newlines, preventing the keyboard shortcut update logic from working.

## Used Tech Stack
- Firefox WebExtension (Manifest V3)
- Vanilla JavaScript
- HTML + CSS

## Current Status
- Version 1.0.10 **successfully submitted to Mozilla AMO** (listed channel)
- Signed XPI available at: `web-ext-artifacts/mydealz_de_filter-1.0.10.xpi`
- GitHub repo updated with v1.0.10 release

## GitHub Repo
- Repository: https://github.com/codingismynewgaming/mydealz-filter-firefox-extension
- Latest commit: `b59a857` - docs: update status.md with v1.0.9 release notes
- Branch: master (up to date)

## AMO Submission Info
- Add-on URL: https://addons.mozilla.org/en-US/firefox/addon/mydealz-de-filter/
- JWT Issuer: `user:15554910:966` (updated 2026-03-19)
- Credentials stored in: `/internals/amo-credentials.md`
- Submission date: 2026-03-19
- Submission channel: **unlisted** (self-hosted, no Mozilla review required)
- Signed XPI size: 75,162 bytes

## AMO Deployment Notes
- **Failed:** Initial submission with old credentials (user:15554910:941) - "Error decoding signature"
- **Failed:** Environment variable approach (`WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET`) - same error
- **Worked:** Direct CLI flags with `npx web-ext sign --api-key --api-secret`
- Unlisted channel chosen for immediate availability (no Mozilla review wait)

## Next Steps
- Submit version 1.0.9 to Mozilla Add-ons
- Monitor AMO review status in Developer Hub
- Manual verification of all 1.0.9 features in Firefox once approved
