# Project Status - mydealz-filter-firefox-extension

## Current Status
- Version 1.0.5 release candidate built.
- Full backup feature added: export/import now covers all storage data.

## Recent Changes
- **Import Compatibility Fix:**
  - Replaced `file.text()` with `FileReader` for better support across older browsers/Android.
  - Added "Reading file..." status message to provide immediate feedback.
  - Changed file input from `display: none` to `visually-hidden` to ensure event firing in all browsers.
  - Added extensive console logging for the import process.
- **Import Trigger Reliability Fix (2026-03-01):**
  - Updated file picker trigger to clear input before open (same-file re-import now reliable).
  - Added `showPicker()` with fallback to `.click()` for better browser compatibility.
  - Replaced `const [file] = event.target.files` destructuring with index-based access to avoid potential FileList iterator compatibility issues.
  - Applied fix in both `src/options.js` and `src/popup.js`.
- **Playwright Firefox Investigation (2026-03-01):**
  - Created Playwright investigation scripts in `.tmp/` and executed Firefox automation.
  - In mocked page runs, import flow worked in both popup/options (`fileChooserTriggered: true`, status showed successful import).
  - Real extension-context automation via `about:debugging` is not reachable under Playwright Firefox in this environment (timeout on privileged page navigation).
  - Cross-checked Mozilla Bugzilla references for popup lifecycle limitations around file picking in extension popups.
- **Popup Import Stability Fix (2026-03-01):**
  - Removed popup file-input flow and replaced popup `Import Filters` action with `chrome.runtime.openOptionsPage()`.
  - Added fallback tab-open behavior if `openOptionsPage` is unavailable.
  - Updated popup hint text to: `Import opens the Options page. There, click Import again.`
- **Full Backup Export/Import (2026-03-01):**
  - `src/options.js`: export now includes full `chrome.storage.local` + `chrome.storage.sync` snapshots in JSON backup.
  - `src/options.js`: import now supports full backup restore into both local and sync (legacy term-only JSON import still supported).
  - `src/popup.js`: export now also creates full-storage backup payload.
- **Sync Coverage Expansion (2026-03-01):**
  - `src/content-script.js`: hidden totals state (`totalHiddenDealCount`, `totalHiddenDealKeys`, `hiddenCountsByTerm`) now persists to both local and sync.
  - Added sync chunking logic for large payloads to avoid per-item sync limits.
  - Added sync-fallback loader for chunked totals state when local storage is empty.
  - `src/popup.js`: theme preference now saves to both local and sync; load checks sync first.
- **Validation:**
  - `node --check src/options.js` passed.
  - `node --check src/popup.js` passed.
  - `node --check src/content-script.js` passed.
  - `npx web-ext lint` passed (0 errors, 0 warnings).
- **Release Prep (2026-03-01):**
  - `manifest.json` bumped to `1.0.5`.
  - `README.md` version line updated to `1.0.5`.
  - Added `CHANGELOG.md` with 1.0.5 notes.
  - Built package with `npx web-ext build --overwrite-dest`.
  - Generated local debug artifact:
    - `web-ext-artifacts/mydealz.de_filter-1.0.5.zip`
    - `web-ext-artifacts/mydealz.de_filter-1.0.5.xpi` (zip copy for install convenience)
- **Dual Storage (Previously implemented):**
  - Settings saved to both `sync` and `local`.
  - Content script fallback logic.

## Next Steps
- Push release commit to GitHub.
- Deploy debug build to Firefox Nightly on Android device (ADB device connection required).
--- End of content ---
