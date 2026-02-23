# Project Status - mydealz.de Filter Firefox Extension

**Last Updated:** 2026-02-23
**Project Key:** MD (mydealz.de Extension)
**Current Version:** v1.0.3 (Sprint 3 - Planned)
**Next Release:** v1.0.3 (Target: 2026-03-24)
**Repository:** https://github.com/codingismynewgaming/mydealz-filter-firefox-extension

---

## Current Status: Sprint 3 Execution Started

Sprint 3 implementation is in progress. MD-60 and MD-61 are implemented and in Jira testing, and MD-57 has been implemented.

### Execution Log (2026-02-23)

- MD-60 moved to `In Progress` in Jira.
- Implemented badge re-sync in `src/background.js` to recover hidden-deal counts on tab activation and page refresh.
- Added bounded retry logic when content script is temporarily unavailable after reload.
- MD-60 moved to `Testing` in Jira after implementation and lint validation.
- MD-61 moved to `In Progress` in Jira.
- Added popup top-right sync status badge (`Sync: On` / `Sync: Error`) in `src/popup.html`, `src/popup.css`, and `src/popup.js`.
- Added graceful sync error handling and local fallback for filter-term storage in `src/popup.js`.
- MD-61 moved to `Testing` in Jira after implementation and lint validation.
- MD-57 moved to `In Progress` in Jira.
- Removed `Clear All` from popup and options settings in `src/popup.html`, `src/popup.js`, `src/options.html`, and `src/options.js`.
- MD-57 moved to `Testing` in Jira after implementation and lint validation.
- MD-64 moved to `In Progress` in Jira.
- Added JSON export flow with metadata in popup/options (`Export Filters`).
- MD-64 moved to `Testing` in Jira after implementation and lint validation.
- MD-65 moved to `In Progress` in Jira.
- Added JSON import flow in popup/options with validation, merge, duplicate skip, and summary feedback (`Import Filters`).
- MD-65 moved to `Testing` in Jira after implementation and lint validation.
- MD-62 moved to `In Progress` in Jira.
- Added duplicate detection on save (case-insensitive + diacritics-insensitive) in popup/options.
- Duplicate terms are skipped, listed in status message, and highlighted in affected textarea(s).
- MD-62 moved to `Testing` in Jira after implementation and lint validation.
- MD-63 moved to `In Progress` in Jira.
- Added auto-grow behavior for `filterTerms` input in popup/options with 300px max-height + overflow handling.
- MD-63 moved to `Testing` in Jira after implementation and lint validation.
- MD-59 moved to `In Progress` in Jira.
- Added popup auto-grow behavior for hidden deals list with dynamic sizing, max-height enforcement, and smooth transitions.
- MD-59 moved to `Testing` in Jira after implementation and lint validation.
- MD-58 moved to `In Progress` in Jira.
- Added Statistics tab in popup with ranked per-filter hidden counts and empty states.
- Added persistent cumulative per-term stats in `chrome.storage.local` via content script (`hiddenCountsByTerm`).
- MD-58 moved to `Testing` in Jira after implementation and lint validation.
- Added consolidated manual verification checklist: `docs/SPRINT-3-TEST-CHECKLIST.md`.
- Added Confluence rollout templates under `docs/confluence/`.
- Created Jira tasks for Confluence rollout: MD-66, MD-67, MD-68, MD-69, MD-70, MD-71.
- MD-59 re-opened for follow-up popup sizing fix and moved back to `Testing`.
- Created new Jira tickets: MD-72 (rename to `mydealz.de`) and MD-73 (new Info tab).
- MD-72 and MD-73 implemented and moved to `Testing`.
- **Follow-up fixes (2026-02-23):**
  - Improved duplicate term feedback message with warning icon for better visibility.
  - Increased popup default height from 360px to 720px (doubled) for better UX.
  - Made options page textareas editable only on click/focus (prevents accidental edits).
- Validation: `npm run lint:amo` passed with 0 errors, 0 warnings, 0 notices.
- **Confluence pages created (MD-66 to MD-71):**
  - ✅ MD-66: Project Home page created (`docs/confluence/01_PROJECT_HOME.md`)
  - ✅ MD-67: Roadmap & Releases page created (`docs/confluence/02_ROADMAP_RELEASES.md`)
  - ✅ MD-68: Sprint Hub page created (`docs/confluence/03_SPRINT_HUB.md`)
  - ✅ MD-69: Sprint 3 Review page created (`docs/confluence/04_SPRINT_3_REVIEW.md`)
  - ✅ MD-70: Sprint 3 Test Report page created (`docs/confluence/05_SPRINT_3_TEST_REPORT.md`)
  - ✅ MD-71: ADR Log created with 4 architecture decisions (`docs/confluence/06_ADR_LOG.md`)
  - All Jira tickets updated with implementation details
  - Next: Upload to Confluence and add Jira macros
- Next: manual browser verification and close all tickets currently in `Testing`.

---

## Sprint 3 - v1.0.3 Release (2026-02-24 to 2026-03-24)

### Sprint Goal
**Release v1.0.3 with UI/UX improvements, filter management features (export/import), statistics tab, and critical bug fixes**

### Sprint Metrics

| Metric | Value |
|--------|-------|
| **Total Issues** | 12 (3 Epics + 9 Stories) |
| **Total Story Points** | 31 |
| **Sprint Duration** | 29 days |
| **Status** | 🟡 In Progress |

### Epics in Sprint 3

| Epic Key | Epic Name | Stories | Story Points | Status |
|----------|-----------|---------|--------------|--------|
| MD-54 | v1.0.3 UI/UX Improvements | 3 | 9 | 🟡 To Do |
| MD-55 | v1.0.3 Filter Management Features | 4 | 14 | 🟡 To Do |
| MD-56 | v1.0.3 Bug Fixes | 2 | 8 | 🟡 To Do |

### User Stories in Sprint 3

| Key | Summary | Epic | Points | Priority |
|-----|---------|------|--------|----------|
| MD-57 | Remove Clear All button from settings | MD-54 | 1 | Low |
| MD-58 | Add statistics tab showing filter term effectiveness ranking | MD-54 | 5 | High |
| MD-59 | Make popup auto-grow when there are many hidden deals | MD-54 | 3 | Medium |
| MD-60 | Fix badge counter reset when leaving/returning to tab | MD-56 | 3 | Critical |
| MD-61 | Verify and fix Firefox Sync for filter terms | MD-56 | 5 | Critical |
| MD-62 | Check for duplicate keywords and notify user | MD-55 | 3 | Medium |
| MD-63 | Make filter terms input field auto-grow with content | MD-55 | 3 | Medium |
| MD-64 | Export filter terms as JSON file | MD-55 | 3 | High |
| MD-65 | Import filter terms from JSON file | MD-55 | 5 | High |

### Sprint Schedule

| Week | Dates | Focus | Key Deliverables |
|------|-------|-------|------------------|
| **Week 1** | Feb 24 - Mar 02 | Foundation & Critical Bugs | MD-60, MD-61, MD-57 |
| **Week 2** | Mar 03 - Mar 09 | Filter Management Core | MD-62, MD-64, MD-65 (start) |
| **Week 3** | Mar 10 - Mar 16 | UI/UX Enhancements | MD-65, MD-63, MD-58 |
| **Week 4** | Mar 17 - Mar 24 | Polish & Release | MD-59, Testing, **Release v1.0.3** 🚀 |

### Key Features Coming in v1.0.3

#### 🎨 UI/UX Improvements
- **Statistics Tab:** See which filter terms hide the most deals (ranked top to bottom)
- **Auto-growing Popup:** Popup expands to show more hidden deals without scrolling
- **Cleaner Settings:** Remove "Clear All" button to prevent accidental deletions

#### 📁 Filter Management
- **Export Filters:** Backup your filter configuration as JSON
- **Import Filters:** Restore or share filter configurations
- **Auto-growing Input:** Filter terms field expands with content
- **Duplicate Detection:** Get notified when adding duplicate keywords

#### 🐛 Bug Fixes
- **Badge Counter:** Persists correctly when switching tabs
- **Firefox Sync:** Verified and fixed for cross-device synchronization

---

## GitHub Repository Status

| Property | Value |
|----------|-------|
| **Repository URL** | https://github.com/codingismynewgaming/mydealz-filter-firefox-extension |
| **Default Branch** | `master` |
| **Remote** | `origin` (configured) |
| **Latest Commit** | `a8bca07` - docs: add STATUS.md with GitHub-Jira integration instructions |
| **Status** | ✅ Connected to GitHub |

---

## Jira Integration Status

### Connection State

| Component | Status | Notes |
|-----------|--------|-------|
| **Jira Project** | ✅ Active | MD - mydealz.de Extension |
| **GitHub Repository** | ✅ Hosted | Private repository on GitHub |
| **GitHub-Jira Link** | ⚠️ Pending | Requires GitHub app installation |
| **Issue References** | ⚠️ Pending | Smart commits not yet active |

### Required Setup for GitHub-Jira Integration

To enable Jira to see and reference the GitHub repository, follow these steps:

#### Step 1: Install GitHub for Jira App

1. Navigate to your Jira Software Cloud instance
2. Go to **Settings** (⚙️) → **Apps**
3. Search for **"GitHub for Jira"** or visit: https://github.com/apps/github-for-jira
4. Click **Install**
5. Authorize the app to access your GitHub account

#### Step 2: Connect Your Repository

1. After installation, go to **Settings** → **GitHub**
2. Click **Connect GitHub organization**
3. Select the organization: `codingismynewgaming`
4. Choose repository: `mydealz-filter-firefox-extension`
5. Click **Install**

#### Step 3: Verify Connection

1. In Jira, navigate to your project: **MD - mydealz.de Extension**
2. Go to **Project Settings** → **Git integrations**
3. Verify `mydealz-filter-firefox-extension` appears in connected repos
4. Check that commits and branches are syncing

#### Step 4: Enable Smart Commits (Optional)

To reference Jira issues in commits:
- Commit message format: `MD-123 Fix filter bug #comment Fixed null check`
- Jira will automatically:
  - Link commits to issues
  - Add comments to issues
  - Transition issue status (if configured)

---

## Jira Project Overview

### All Epics

| Epic Key | Epic Name | Status | Issues |
|----------|-----------|--------|--------|
| MD-12 | Core Filtering Functionality | ✅ Complete | 6 |
| MD-13 | User Interface & Experience | ✅ Complete | 6 |
| MD-14 | Platform Support & Compatibility | ✅ Complete | 6 |
| MD-15 | Maintenance & Documentation | ✅ Complete | 6 |
| MD-40 | v1.0.4 Future Enhancements | 🟡 Backlog | 6 |
| **MD-54** | **v1.0.3 UI/UX Improvements** | 🟡 Sprint 3 | 3 |
| **MD-55** | **v1.0.3 Filter Management Features** | 🟡 Sprint 3 | 4 |
| **MD-56** | **v1.0.3 Bug Fixes** | 🟡 Sprint 3 | 2 |

### Version Roadmap

| Version | Status | Release Date | Notes |
|---------|--------|--------------|-------|
| v1.0.0 | ✅ Released | 2026-02-11 | Initial release |
| v1.0.1 | ✅ Released | 2026-02-14 | Bug fixes, theme toggle |
| v1.0.2 | ✅ Released | 2026-02-17 | Android support, options page |
| v1.0.3 | 🟡 In Development | 2026-03-24 (Target) | Sprint 3 - Current |
| v1.0.4 | 🟡 Backlog | TBA | Future enhancements (MD-40) |

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Build for Firefox
npm run build:amo

# Build for Chrome
npm run build:chrome

# Test extension
web-ext run
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/MD-60-badge-fix

# Commit with Jira reference
git commit -m "fix(badge): persist counter across tab switches MD-60"

# Push to GitHub
git push origin feature/MD-60-badge-fix
```

### Jira Issue Reference Format

When committing code, reference Jira issues:
- **Format:** `MD-XX` in commit messages
- **Example:** `feat(settings): add export button MD-64`
- **Smart Commits:** `MD-60 #comment Fixed badge persistence #transition In Progress`

---

## Files & Documentation

### Core Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **PRD** | `/docs/PRD.md` | Product Requirements (67 pages) |
| **Privacy Policy** | `/docs/PRIVACY_POLICY.md` | AMO submission requirement |
| **AMO Listing** | `/docs/AMO_LISTING.md` | Firefox Add-on store listing |
| **AMO Submission** | `/docs/AMO_SUBMISSION.md` | Submission guide |
| **CHANGELOG** | `/docs/CHANGELOG.md` | Version history |
| **Sprint 3 Plan** | `/docs/SPRINT-3-PLAN.md` | Detailed sprint plan |
| **STATUS** | `/docs/STATUS.md` | This document |

### Source Code Structure

```
mydealz-filter-firefox-extension/
├── manifest.json          # Firefox manifest
├── manifest.chrome.json   # Chrome manifest
├── src/
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   ├── popup.html         # Popup UI
│   ├── popup.js           # Popup logic
│   ├── options.html       # Options page (Android)
│   ├── options.js         # Options logic
│   └── styles/
│       ├── popup.css      # Popup styles
│       └── options.css    # Options styles
├── icons/                 # Extension icons
├── docs/                  # Documentation
└── web-ext-artifacts/     # Build output
```

---

## Next Steps

### Immediate (This Week - Sprint 3 Week 1)

1. 🚀 **Start Sprint 3** (Feb 24)
2. 🐛 **Fix badge counter reset** (MD-60) - Critical
3. 🔧 **Verify Firefox Sync** (MD-61) - Critical
4. 🗑️ **Remove Clear All button** (MD-57) - Quick win

### Short Term (Next 2 Weeks)

- Complete critical bug fixes (MD-60, MD-61)
- Implement duplicate detection (MD-62)
- Build export/import functionality (MD-64, MD-65)

### Long Term (Sprint 3 Completion)

- Complete all 9 user stories
- Test on Firefox Desktop and Android
- Release v1.0.3 to AMO (March 24, 2026)

---

## Team & Contacts

| Role | Name | Jira User |
|------|------|-----------|
| **Developer** | Jan Kühn | jan.kuehn@ (authenticated) |
| **Project** | mydealz.de Extension | MD |

---

## Quick Links

- **Jira Project:** https://berlin-mitte-institut.atlassian.net/jira/software/projects/MD
- **GitHub Repo:** https://github.com/codingismynewgaming/mydealz-filter-firefox-extension
- **GitHub Apps:** https://github.com/apps/github-for-jira
- **Jira GitHub Integration Docs:** https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/
- **Sprint 3 Plan:** `/docs/SPRINT-3-PLAN.md`

---

**Status Report Generated:** 2026-02-23  
**Sprint 3 Start:** 2026-02-24  
**Sprint 3 End:** 2026-03-24  
**Next Review:** After Sprint 3 Week 1 completion

## Session Checkpoint (2026-02-23)

- Follow-up popup sizing fix completed and tracked in Jira (`MD-59` -> `Testing`).
- Naming update to `mydealz.de` completed and tracked in Jira (`MD-72` -> `Testing`).
- New popup `Info` tab completed and tracked in Jira (`MD-73` -> `Testing`).
- Updated settings UX: both `Filter Terms` and `Exception Terms` are now locked until clicked, with a clearer locked visual state.
- Fixed Settings tab rendering: keyword textareas now auto-grow after tab activation so terms are fully visible immediately.
- Validation successful: `npm run lint:amo` (0 errors, 0 warnings, 0 notices).
- Session paused. Resume from current `Testing` tickets in next session.


