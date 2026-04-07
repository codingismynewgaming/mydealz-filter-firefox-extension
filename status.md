# Project Status - mydealz-filter-firefox-extension

## Current Status
- Version 1.0.12 **released** - Comment sorting improvements, storage optimization, and keyboard shortcuts
- Extension rebuilt and submitted to Mozilla AMO
- GitHub release v1.0.12 created with tag

## Last Changes (2026-04-07) - Version 1.0.12 Release
- **Helpful comment sorting via XHR**: Reworked auto-sort comments on deal pages to use GraphQL/XHR API
- **Comment sort menu fix**: Removed dropdown interaction - menu no longer opens/stays open
- **Storage split audit**: Optimized storage responsibilities (sync vs local)
- **Manual scroll trigger removed**: Cleaned up remaining manual scroll button code
- **Keyboard shortcuts**: Added Ctrl+Shift+K shortcut to open keyword dialog
- **Migration logic**: Auto-migrate legacy local settings to sync storage

## Last Changes (2026-04-07) - Comment Sort Menu No Longer Opens
- **Removed dropdown interaction from comment auto-sort**: The extension no longer opens or clicks the mydealz sort menu when auto-sorting comments on deal pages.
- **XHR-only helpful sorting path**: Helpful comment sorting now relies on the GraphQL/XHR response plus DOM reordering and label patching only.
- **Result**: The `Am hilfreichsten` dropdown menu no longer gets stuck open after the extension applies sorting.
- **Files modified**: `app-files/src/content-script.js`, `content-script.js`
- **Verification**:
  - Confirmed manually that the sort still works and the menu no longer remains open.
  - `node --check app-files/src/content-script.js`
  - `node --check content-script.js`

## Last Changes (2026-04-07) - Storage Split Audit + Fix
- **Refined storage responsibilities**:
  - `sync` is now the source of truth for filter keywords, exception terms, category config, comment auto-sort, grey-out opacity, and shortcut preference.
  - `local` now owns `greyOutSeenDeals`, seen-deal state, and hidden/count cache state.
- **Stopped syncing hidden/count cache data**: `totalHiddenDealCount`, `totalHiddenDealKeys`, and `hiddenCountsByTerm` are now persisted and loaded from local storage only.
- **Added local-to-sync settings migration**: If sync settings are empty but legacy local settings exist, the options page migrates them into sync automatically.
- **Updated shortcut preference persistence**: Background/options now persist shortcut preference to sync with local fallback.
- **Files modified**: `app-files/src/content-script.js`, `content-script.js`, `app-files/src/options.js`, `app-files/src/background.js`
- **Verification**:
  - `node --check app-files/src/content-script.js`
  - `node --check app-files/src/options.js`
  - `node --check app-files/src/background.js`
  - storage usage grep confirmed hidden/count cache no longer writes to sync and `greyOutSeenDeals` is read from local

## Last Changes (2026-04-07) - Helpful Comment Sorting via XHR
- **Reworked auto-sort comments on deal pages**: The extension now tries to load the helpful-sorted comments via mydealz GraphQL/XHR on deal detail pages when the `autoSortComments` setting is enabled.
- **Patched the existing comments DOM**: Reorders the already-rendered top-level comment nodes in `#thread-comments` based on the returned `commentId` order, while preserving unmatched nodes.
- **Updated sort label UI**: Forces the visible sort control label to `Am hilfreichsten` after a successful helpful-order response.
- **Kept DOM-click fallback**: If the XHR path fails, the previous UI interaction approach still runs as a fallback.
- **Files modified**: `app-files/src/content-script.js`, `content-script.js`
- **Verification**:
  - `node --check app-files/src/content-script.js`
  - `node --check content-script.js`
  - `rg -n "HELPFUL_COMMENTS_ENDPOINT|getCurrentThreadId|fetchHelpfulComments|reorderCommentsInDom|setHelpfulSortLabel|applyCommentSorting" app-files/src/content-script.js content-script.js`

## Last Changes (2026-04-07) - Removed Remaining Manual Scroll Trigger
- **Removed remaining manual scroll functionality from live extension code**: Deleted the helper functions and delayed initialization that added the `Scroll further` button and forced next-page navigation.
- **Normal site pagination remains untouched**: Only the extension-injected manual trigger logic was removed.
- **Files modified**: `app-files/src/content-script.js`, `content-script.js`
- **Verification**:
  - Searched both live content scripts for `Scroll further`, `mydealz-manual-scroll-further`, `navigateToNextPage`, `getCurrentPageFromUrl`, and related trigger code.
  - Confirmed those live references are no longer present.

## Last Changes (2026-03-20) - Removed Auto-Infinite Scroll & Added Manual Button
- **Removed all automatic infinite scroll logic**: Stripped out auto-navigation, threshold triggers, and related settings to simplify the extension and avoid erratic behavior.
- **Added manual "Scroll further" button**: Implemented a dedicated button at the bottom of deal lists on `mydealz.de` and `mydealz.de/heisseste`.
- **Added "Reset Seen Deals" option**: New button in settings to clear the cache of deals already scrolled past, allowing them to be shown as "new" again.
- **Functionality**:
  - The button fetches the next page's deals in the background (using `fetch` and `DOMParser`).
  - It appends the new deals directly to the current page's list.
  - It updates the browser URL and history state without reloading or jumping.
  - This provides a smooth, truly infinite scrolling experience without page jumps.
- **UI Changes**:
  - Removed the "Infinite scroll improvements" toggle from the Options page.
  - Cleaned up storage keys and logic associated with the old feature.
- **Files modified**: `app-files/src/content-script.js`, `content-script.js`, `app-files/src/options.html`, `app-files/src/options.js`.

## Last Changes (2026-03-20) - Infinite Scroll Fix (Obsolete)
- (Previous changes related to infinite scroll fix were removed/replaced by the manual button approach)

## Last Changes (2026-03-20) - Hotfix
- **Fixed comment sorter menu staying open**: Added Escape key dispatch and blur() to close dropdowns after selection
- **Added dropdown trigger detection**: Better handles mydealz.de's React-based custom dropdowns

## Last Changes (2026-03-19)
- **Version 1.0.9 released** - Bumped from 1.0.8
- Completely rewrote keyboard shortcut implementation based on Mozilla documentation:
  - Firefox requires using `chrome.commands.getAll()` to read current shortcuts
  - Firefox requires using `chrome.commands.openShortcutSettings()` to let users change shortcuts
  - Updated UI to show current shortcut as read-only with "Change in Firefox" button
- **Redesigned keyword dialog** (keyword-dialog.html + keyword-dialog.js):
  - Changed title to "Add filter keyword"
  - Single input field (no database display)
  - Added dark/light mode support to keyword dialog

## Important Notes (Command Fails + Fixes)
- `cp app-files/src/content-script.js content-script.js` worked for synchronization.
- `bitChunks` typo in root `content-script.js` was found and fixed by full synchronization from source.
- `rg -n "issues|github" *.md` failed in PowerShell because `*.md` globbing isn't supported -> used `rg -n "issues|github" -g "*.md"` instead.
- `rg ... app-files/src/*.js ...` failed in PowerShell because that glob form was invalid there -> used explicit file paths / `Get-Content` reads instead.
- **First AMO submission failed** with "homepage URL not allowed" error -> removed homepage field from `amo-metadata.json`
- **Second submission succeeded** after fixing metadata

## Used Tech Stack
- Firefox WebExtensions (Manifest V3)
- Vanilla JavaScript
- HTML + CSS

## Current Status
- Version 1.0.12 **released** - Comment sorting improvements, storage optimization, and keyboard shortcuts
- Extension rebuilt and submitted to Mozilla AMO
- GitHub release v1.0.12 created with tag
- Ready for testing on mydealz.de/heisseste and mydealz.de

## GitHub Repo
- Repository: https://github.com/codingismynewgaming/mydealz-filter-firefox-extension
- Latest commit: `67e233c` - fix: infinite scroll erratic behavior and comment sorter menu staying open (Note: next commit will include the removal of auto-scroll)
- Branch: master

## AMO Submission Info
- Add-on URL: https://addons.mozilla.org/en-US/firefox/addon/mydealz-de-filter/
- JWT Issuer: `user:15554910:966`
- Credentials stored in: `/internals/amo-credentials.md`
- Submission channel: **listed**
