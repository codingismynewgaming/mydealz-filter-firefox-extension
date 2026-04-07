# Changelog

All notable changes to this project are documented in this file.

## 1.0.12 - 2026-04-07

### Added
- **Helpful comment sorting via XHR**: Auto-sort comments on deal detail pages by loading the helpful-sorted comments via mydealz GraphQL/XHR API and reordering the DOM accordingly.
- **Keyboard shortcut functionality**: Added keyboard shortcuts for quick access to extension features (Ctrl+Shift+K / Command+Shift+K to open keyword dialog).

### Changed
- **Comment sorting behavior**: Removed dropdown interaction from comment auto-sort - the extension no longer opens or clicks the mydealz sort menu when auto-sorting comments on deal pages.
- **Storage split optimization**: Refined storage responsibilities - `sync` storage now owns filter keywords, exception terms, category config, comment auto-sort, grey-out opacity, and shortcut preference; `local` storage now owns `greyOutSeenDeals`, seen-deal state, and hidden/count cache state.
- **Migration logic**: Added automatic local-to-sync settings migration for users with legacy local settings.

### Removed
- **Manual scroll trigger**: Removed remaining manual scroll functionality including the `Scroll further` button and delayed initialization code from live extension code.
- **Sync storage for hidden/count cache**: Stopped syncing hidden/count cache data (`totalHiddenDealCount`, `totalHiddenDealKeys`, `hiddenCountsByTerm`) - now persisted in local storage only.

### Fixed
- Comment sorter menu no longer opens/stays open after automatic selection.
- Storage usage optimized - hidden/count cache no longer writes to sync storage.

## 1.0.11 - 2026-03-20

### Added
- **Manual "Scroll further" button**: Added a dedicated button at the bottom of deal lists on homepage and /heisseste that fetches and appends next-page deals directly to the current list without a page reload or jump.
- **Reset Seen Deals option**: Added a button in the extension settings to clear the local cache of deals that have been "seen" (scrolled past), allowing users to reset the greying-out effect.

### Removed
- **Automatic infinite scroll improvements**: Removed all auto-navigation and threshold-based scrolling logic to prevent erratic behavior.
- **Infinite scroll toggle**: Removed the toggle from the options page as the feature is now manual.

### Fixed
- **Comment sorter menu**: Fixed an issue where the sort dropdown would sometimes stay open after automatic selection.
- **Sync storage state**: Fixed a minor bug in hidden deal key synchronization logic.

## 1.0.10 - 2026-03-20
- **Auto-navigate**: Automatically navigates to next page when scrolling past 50% threshold
- **Load More button**: Shows "Mehr Deals laden (Seite N)" button at 30% scroll position for manual navigation
- **End-of-results detection**: Gracefully stops when no more pages available
- **History management**: Uses `history.replaceState()` to avoid cluttering browser history
- **Dark mode support**: Load More button adapts to system theme preference
- **Universal support**: Works on all paginated pages (/heisseste, homepage, /gruppe/*, search results)

### Technical
- Added `getCurrentPageFromUrl()` to parse `?page=N` from URL
- Added `checkHasNextPage()` to detect if more pages exist via pagination selectors
- Added `navigateToNextPage()` to handle URL navigation with history replacement
- Added `createLoadMoreButton()` and `insertLoadMoreButton()` for manual navigation UI
- Added page tracking with `lastNavigatedPage` to prevent duplicate navigation
- Added comprehensive debug logging for scroll navigation events

## 1.0.10 - 2026-03-20

### Release
- **AMO Submission**: Released on Mozilla Add-ons website (not self-hosted)
- Signed XPI: `web-ext-artifacts/mydealz_de_filter-1.0.10.xpi`
- Distribution: Public release on addons.mozilla.org for automatic updates

### Added
- Added infinite scroll improvements toggle in extension options to enable/disable the feature
- Improved infinite scroll logic: Only triggers when going over 80% threshold of loaded deals and doesn't trigger again when already at bottom of page
- Enhanced 'am hilfreichsten' auto-sort: Only sets sort if it's not already set to avoid unnecessary changes

## 1.0.9 - 2026-03-19

### Release
- **Successfully submitted to Mozilla AMO** (unlisted channel)
- Signed XPI: `web-ext-artifacts/mydealz_de_filter-1.0.9.xpi`
- No Mozilla review required (unlisted/self-hosted)

### Fixed
- Fixed infinite scroll code: Was broken as string literals instead of executable code. Now properly triggers scroll on pages like /gruppe/freebies at 80% threshold.
- Fixed icon not turning green on mydealz.de: The background.js had corrupted code with escaped newlines that prevented proper icon state management.
- Fixed corrupted JavaScript files: options.js and background.js had `\n` string literals instead of actual newlines.

### Changed
- Completely redesigned keyboard shortcut implementation based on Mozilla documentation:
  - Firefox requires using `chrome.commands.getAll()` to read current shortcuts
  - Firefox requires using `chrome.commands.openShortcutSettings()` to let users change shortcuts
  - Added proper fallback handling for browsers without full commands API support
  - Updated UI to show current shortcut as read-only with "Change in Firefox" button
  - Added message handlers in background.js: `updateKeyboardShortcut`, `getKeyboardShortcut`, `openShortcutSettings`
- Redesigned keyword dialog:
  - Changed title to "Add filter keyword"
  - Single input field (no database display)
  - Removed exception terms section entirely
  - Green "Add filter terms" button saves but keeps popup open
  - "Close" button added to close the dialog
  - Enter key saves AND closes the popup
  - Shows success message and clears field for next entry when clicking green button
  - Checks for duplicates before adding
- Fixed keyword dialog layout with proper sizing (380px width) to prevent scrolling
- Added dark/light mode support to keyword dialog with CSS variables matching popup.css theme system

### Technical
- Updated options.html and popup.html with proper shortcut display and Firefox settings button
- CSS variables now respect `prefers-color-scheme` media query
- Auto-updates when system theme changes

## 1.0.8 - 2026-03-14

### Release
- Version submitted to Mozilla Add-ons for review
- Signed XPI: `web-ext-artifacts/mydealz_de_filter-1.0.8.xpi`

### Fixed
- Removed invalid homepage URL from AMO metadata (addons.mozilla.org URLs not allowed)

## 1.0.7 - 2026-03-08

### Added
- "Hide seen deals" feature now works correctly (previously the setting was ignored).
- Infinite scroll now continues loading when hidden deals make the page too short to scroll.

### Fixed
- `getRuntimeSettings()` was not returning the `hideSeenDeals` setting to the content script.
- Page would stop loading new deals when most visible deals were hidden by the seen-deals feature.

## 1.0.6 - 2026-03-07

### Added
- Auto-sort option for comments on deal detail pages.
- Grey-out option for previously seen deals with delayed seen tracking.
- Filter category management with drag-and-drop assignment and category enable/disable controls.
- Statistics grouping with grouped view, manage-groups flow, and term-to-group assignment.

### Changed
- Settings toggles now save immediately for supported preference checkboxes.
- Grouped statistics automatically become the default view once groups exist.
- Seen deals are only marked after leaving the viewport on listing pages or after leaving a deal detail page.
- Grey-out behavior is disabled on `/search`, `/alerts`, and `/profile`.
- Keyword filtering is disabled on `/search`.

### Removed
- Sync status badge from popup and options UI.
- Collapse seen-deals feature after testing showed grey-out works better.

### Fixed
- Greyed deals now stay grey on hover.
- Search, alerts, and profile pages no longer get unwanted seen-deal grey-out behavior.
- Popup statistics and manage-groups typography is more consistent.

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
