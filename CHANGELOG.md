# Changelog

All notable changes to this project are documented in this file.

## 1.0.5 - 2026-03-01

### Added
- Full backup export/import for extension storage data.
- Backup payload now includes both `chrome.storage.local` and `chrome.storage.sync` snapshots.
- Full backup restore path in Options page import.
- Sync chunking for large hidden-deal tracking payloads.

### Changed
- Popup import flow now opens the Options page for stable JSON import in Firefox.
- Popup hint text updated to: `Import opens the Options page. There, click Import again.`
- Theme preference now syncs via Firefox Sync and is mirrored to local storage.
- Export feedback now reports exported sync/local key counts.

### Fixed
- JSON import compatibility improvements (`FileReader`, better input handling).
- Better resilience for same-file re-import behavior.
- Hidden deal counters and term statistics are now mirrored into Sync storage.
