---
title: 🗺️ Roadmap & Releases
space: MD
labels: [roadmap, releases, planning, timeline]
---

# Roadmap & Releases

**Last Updated:** 2026-02-23  
**Product:** mydealz.de Filter  
**Current Version:** 1.0.3 (In Development)

---

## 📅 Release Timeline Overview

| Version | Status | Start Date | Release Date | Sprint | Focus |
|---------|--------|------------|--------------|--------|-------|
| **v1.0.0** | ✅ Released | 2026-02-01 | 2026-02-11 | Sprint 1 | Core filtering functionality |
| **v1.0.1** | ✅ Released | 2026-02-12 | 2026-02-14 | Sprint 2 | Bug fixes, theme toggle, unique tracking |
| **v1.0.2** | ✅ Released | 2026-02-15 | 2026-02-17 | Sprint 2 (cont.) | Android support, options page |
| **v1.0.3** | 🟡 In Dev | 2026-02-24 | 2026-03-24 (Target) | Sprint 3 | Export/Import, Statistics, UX |
| **v1.0.4** | 🔵 Planned | TBA | TBA | Sprint 4 | Future enhancements (MD-40) |
| **v1.1.0** | 🔮 Backlog | TBA | TBA | TBA | Major feature release |
| **v2.0.0** | 🔮 Vision | TBA | TBA | TBA | Multi-site support |

---

## 📦 Release Details

### [v1.0.3] - Current Development (2026-03-24 Target)

**Sprint:** Sprint 3 (Feb 24 - Mar 24, 2026)  
**Story Points:** 31  
**Issues:** 9 user stories across 3 epics  
**Status:** 🟡 In Progress (Week 1 of 4)

#### Scope Summary

**Epics:**
- MD-54: v1.0.3 UI/UX Improvements (9 points)
- MD-55: v1.0.3 Filter Management Features (14 points)
- MD-56: v1.0.3 Bug Fixes (8 points)

#### Features

**🎨 UI/UX Improvements:**
- ✅ MD-57: Remove Clear All button from settings (1pt)
- ✅ MD-58: Add statistics tab showing filter term effectiveness ranking (5pt)
- ✅ MD-59: Make popup auto-grow when there are many hidden deals (3pt)

**📁 Filter Management:**
- ✅ MD-62: Check for duplicate keywords and notify user (3pt)
- ✅ MD-63: Make filter terms input field auto-grow with content (3pt)
- ✅ MD-64: Export filter terms as JSON file (3pt)
- ✅ MD-65: Import filter terms from JSON file (5pt)

**🐛 Bug Fixes:**
- 🟡 MD-60: Fix badge counter reset when leaving and returning to tab (3pt)
- ✅ MD-61: Verify and fix Firefox Sync for filter terms (5pt)

**Follow-up Improvements:**
- 🟡 MD-72: Rename MyDealz naming to mydealz.de in user-facing text
- 🟡 MD-73: Add Info tab in popup and move settings content below donation section

#### Release Readiness Checklist

| Check | Status | Notes |
|-------|--------|-------|
| **Build/Lint** | ✅ Ready | `npm run lint:amo` passing (0 errors) |
| **Manual QA** | 🟡 In Progress | Testing checklist created |
| **Desktop Firefox** | 🟡 Testing | MD-60, MD-63, MD-72, MD-73 in testing |
| **Android Nightly** | ⏳ Pending | Scheduled for Week 4 |
| **Documentation** | ✅ Ready | README, CHANGELOG updated |
| **AMO Submission** | ⏳ Pending | Ready for submission after testing |

#### Known Issues

| Issue | Severity | Workaround | Target Fix |
|-------|----------|------------|------------|
| None currently known | - | - | - |

---

### [v1.0.2] - Released 2026-02-17

**Sprint:** Sprint 2 (continued)  
**Focus:** Android support, options page, legal compliance  
**Total Issues:** 6

#### Added
- ✅ Full legal disclaimer/notice in README.md
- ✅ Legal disclaimer in popup settings view
- ✅ Legal disclaimer in options page
- ✅ Dedicated `options_ui` settings page for Firefox Android/Nightly
- ✅ Hidden deals list with refresh in options page for mobile
- ✅ Version display in popup
- ✅ Documentation for git-based version control

#### Changed
- ✅ Disabled auto-hiding on `/deals/*` detail pages (allows viewing hidden deals)
- ✅ Version bumped to 1.0.3 in preparation

#### Fixed
- ✅ Various UX improvements based on user feedback

#### Compatibility
- ✅ Firefox Desktop 142+
- ✅ Firefox Android Nightly (org.mozilla.fenix)

---

### [v1.0.1] - Released 2026-02-14

**Sprint:** Sprint 2  
**Focus:** Bug fixes, theme toggle, unique deal tracking  
**Total Issues:** 8

#### Added
- ✅ Manual light/dark mode toggle in popup header
- ✅ Persisted theme preference across sessions
- ✅ Chrome-portability manifest template (`manifest.chrome.json`)
- ✅ Unique deal tracking (cumulative "total hidden" count)

#### Changed
- ✅ Hidden Posts tab is now default/first tab (faster access)
- ✅ Improved popup sizing for smaller/mobile viewports
- ✅ Expanded mydealz.de host matching to all subdomains
- ✅ Stricter internal URL validation (host-based checks)

#### Fixed
- ✅ Badge/icon state scoped to individual tabs (no cross-tab leakage)
- ✅ Keyword matching respects exact word boundaries (`Audi` ≠ `Audible`)
- ✅ Matching is now accent-insensitive (`Pokémon` = `Pokemon`)
- ✅ "Total hidden" tracks unique deals only (no double-counting)
- ✅ Firefox popup rendering fix (no more collapsed scrollbar-only view)
- ✅ Added `tabs` permission for popup/background tab queries

---

### [v1.0.0] - Released 2026-02-11

**Sprint:** Sprint 1  
**Focus:** Core filtering functionality (MVP)  
**Total Issues:** 24 story points

#### Core Features
- ✅ Keyword-based deal filtering (case-insensitive)
- ✅ Exception keyword handling
- ✅ Hidden deals list in popup
- ✅ Badge counter for hidden deals
- ✅ Two-tab popup interface (Hidden Posts / Settings)
- ✅ Dynamic content observation (infinite scroll support)
- ✅ Multiple deal layout detection
- ✅ Mobile subdomain support (m.mydealz.de)

#### Technical Foundation
- ✅ Manifest V3 compliance
- ✅ chrome.storage.sync for settings
- ✅ MutationObserver for DOM changes
- ✅ Debounced filter operations (1s)
- ✅ Performance optimized (<100ms filter time)

#### Privacy & Security
- ✅ 100% client-side processing
- ✅ No external data transmission
- ✅ No tracking or analytics
- ✅ Minimal permissions model

---

## 🔮 Future Releases

### v1.0.4 - Planned Enhancements (MD-40 Epic)

**Status:** 🔵 Backlog  
**Target:** Q2 2026  
**Epic:** MD-40 "v1.0.4 Future Enhancements"

#### Candidate Features

| Feature | Description | Priority | Story Points |
|---------|-------------|----------|--------------|
| **Advanced Filter Rules** | Regex support, date-based filtering | Medium | 8 |
| **Deal Categories** | Pre-defined category filters (Tech, Home, Fashion) | Low | 5 |
| **Scheduled Filters** | Time-based filter activation (e.g., work hours only) | Low | 3 |
| **Filter Sharing** | Community filter lists, shareable URLs | Medium | 8 |
| **Deal Highlights** | Highlight (not just hide) deals matching positive keywords | Medium | 5 |
| **Performance Dashboard** | Real-time stats on filter performance | Low | 3 |

#### Decision Criteria for v1.0.4

- [ ] User demand (feedback, reviews, GitHub issues)
- [ ] Technical feasibility
- [ ] Impact on core performance
- [ ] AMO compliance
- [ ] Development capacity

---

### v1.1.0 - Vision (TBA)

**Status:** 🔮 Conceptual  
**Target:** H2 2026 (if v1.0.x gains traction)

#### Potential Major Features

| Feature | Description | Impact |
|---------|-------------|--------|
| **Multi-Site Support** | Extend filtering to other deal sites (idealo, billiger.de) | 🔴 High |
| **Cloud Sync** | Optional cloud backup for filter settings (opt-in) | 🟡 Medium |
| **AI-Powered Suggestions** | ML-based filter term recommendations | 🟡 Medium |
| **Browser Expansion** | Chrome, Edge, Safari support | 🔴 High |
| **Companion App** | Mobile app for deal management | 🟢 Low |

---

## 📊 Release Metrics

### Velocity Trends

| Sprint | Duration | Story Points | Issues Completed | Notes |
|--------|----------|--------------|------------------|-------|
| **Sprint 1** | 2 weeks | 24 | 6 epics | MVP launch |
| **Sprint 2** | 1 week | 21 | 2 releases | Bug fixes + Android |
| **Sprint 3** | 4 weeks | 31 (planned) | In Progress | Feature-rich release |

### Release Frequency

| Metric | Value |
|--------|-------|
| **Average Sprint Length** | 2.3 weeks |
| **Releases per Sprint** | 1.5 |
| **Hotfix Response Time** | <24 hours |
| **Feature Lead Time** | 1-4 weeks |

---

## 🚀 Release Process

### Pre-Release Checklist

**2 Weeks Before Release:**
- [ ] All user stories completed
- [ ] All acceptance criteria verified
- [ ] Manual testing completed (desktop + Android)
- [ ] Performance benchmarks met
- [ ] No critical/open bugs

**1 Week Before Release:**
- [ ] CHANGELOG.md updated
- [ ] README.md updated (version, features)
- [ ] Screenshots updated (if UI changed)
- [ ] Privacy policy reviewed (if data handling changed)
- [ ] AMO listing content prepared (DE/EN)

**Release Week:**
- [ ] Version bump in manifest.json, manifest.chrome.json, package.json
- [ ] Git tag created (e.g., `v1.0.3`)
- [ ] GitHub release published
- [ ] XPI build artifacts generated
- [ ] AMO submission completed
- [ ] Status page updated

**Post-Release:**
- [ ] Monitor AMO reviews for feedback
- [ ] Track crash reports (if any)
- [ ] Respond to user questions
- [ ] Plan next sprint based on feedback

---

## 📦 Build Artifacts

### Current Build Status

| Artifact | Status | Location |
|----------|--------|----------|
| **Firefox XPI** | ✅ Automated | `web-ext-artifacts/` |
| **Chrome ZIP** | ✅ Automated | `web-ext-artifacts/` |
| **Source Code** | ✅ Versioned | GitHub `master` branch |
| **Documentation** | ✅ Complete | `docs/` folder |

### Build Commands

```bash
# Install dependencies
npm install

# Run linter (AMO compliance)
npm run lint:amo

# Build for Firefox
npm run build:amo

# Build for Chrome
npm run build:chrome

# Check git status
npm run git:status
```

---

## 📞 Release Communication

### Stakeholder Notifications

| Audience | Channel | Timing | Content |
|----------|---------|--------|---------|
| **Users** | AMO Listing | Release day | Release notes, new features |
| **Users** | GitHub Releases | Release day | Detailed changelog, artifacts |
| **Developer** | Jira | Sprint end | Sprint review, metrics |
| **Developer** | Confluence | Sprint end | This page updated |

### Rollback Plan

**If critical bug discovered post-release:**

1. **Immediate (0-2 hours):**
   - Acknowledge issue on GitHub/AMO
   - Assess severity

2. **Short-term (2-24 hours):**
   - Hotfix development
   - Expedited testing

3. **Resolution (24-48 hours):**
   - Hotfix release (v1.0.3.1)
   - AMO expedited review request
   - User communication

---

## 📎 Appendix

### Version Numbering Scheme

**Format:** `MAJOR.MINOR.PATCH` (Semantic Versioning)

- **MAJOR:** Breaking changes, architecture shifts
- **MINOR:** New features, backwards-compatible
- **PATCH:** Bug fixes, backwards-compatible

**Examples:**
- `1.0.0` → Initial release
- `1.0.1` → Bug fixes (patch)
- `1.1.0` → New features (minor)
- `2.0.0` → Breaking changes (major)

### Release Naming Convention

Starting from v1.1.0, releases may adopt code names for easier reference:

- v1.1.0: "Phoenix" (rebirth, multi-site support)
- v1.2.0: "Titan" (strength, performance improvements)
- v1.3.0: "Nova" (new features, AI suggestions)

---

*This roadmap is a living document and will be updated after each sprint/release. Last sync: 2026-02-23*
