# Changelog

## [1.0.1] - 2026-02-14

### Added
- Manual light/dark mode toggle in popup header with persisted preference.
- Chrome-portability manifest template (`manifest.chrome.json`) and documented browser-target workflow.

### Changed
- Hidden Posts is now the first and default popup tab for faster review of filtered results.
- Improved popup sizing to better fit smaller/mobile viewports.
- Expanded mydealz host matching to support root and subdomains (including mobile variants).
- Updated internal URL validation to strict host-based checks.

### Fixed
- Badge/icon state is now tab-scoped to prevent cross-tab leakage.
- Keyword matching now follows exact term boundaries (`Audi` no longer matches `Audible`).
- Matching is now accent-insensitive (`Pokemon` matches `Pokémon`).
- "Total hidden" now tracks unique deals ever hidden, with deduplicated persistent state.

## [1.0.0] - 2026-02-11

### Added
- First public release
- Keyword filtering for deal titles
- Exception keywords
- Hidden-deals list in popup
- Badge counter for hidden deals
- Local-only storage and no external tracking
