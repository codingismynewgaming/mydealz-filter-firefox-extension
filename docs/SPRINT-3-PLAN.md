# Sprint 3 Plan - v1.0.3 Release

**Sprint Name:** Sprint 3 - v1.0.3 Release  
**Sprint Duration:** 2026-02-24 to 2026-03-24 (1 month / 4 weeks)  
**Sprint Goal:** Release v1.0.3 with UI/UX improvements, filter management features (export/import), statistics tab, and critical bug fixes  
**Status:** 🟡 Planned (Ready to Start)

---

## Sprint Overview

This sprint focuses on delivering a comprehensive feature release that enhances user experience, adds powerful filter management capabilities, and fixes critical bugs reported by users.

### Sprint Metrics

| Metric | Value |
|--------|-------|
| **Total Issues** | 12 (3 Epics + 9 Stories) |
| **Total Story Points** | 31 |
| **Sprint Duration** | 29 days |
| **Team Capacity** | 1 developer |
| **Velocity Target** | 31 points |

---

## Epics Summary

| Epic Key | Epic Name | Stories | Story Points | Priority |
|----------|-----------|---------|--------------|----------|
| **MD-54** | v1.0.3 UI/UX Improvements | 3 | 9 | High |
| **MD-55** | v1.0.3 Filter Management Features | 4 | 14 | High |
| **MD-56** | v1.0.3 Bug Fixes | 2 | 8 | Critical |

---

## User Stories Breakdown

### Epic MD-54: UI/UX Improvements (9 points)

#### MD-57: Remove Clear All button from settings
- **Story Points:** 1
- **Priority:** Low
- **Status:** 🟡 To Do
- **Description:** Remove the "Clear All" button to prevent accidental deletion of all filter terms
- **Acceptance Criteria:**
  - Clear All button removed from Settings tab
  - Individual delete functionality remains intact
- **Estimated Effort:** 2-3 hours

#### MD-58: Add statistics tab showing filter term effectiveness ranking
- **Story Points:** 5
- **Priority:** High
- **Status:** 🟡 To Do
- **Description:** New "Statistics" tab showing which filter terms hide the most deals (ranked top to bottom)
- **Acceptance Criteria:**
  - New "Statistics" tab added to popup
  - Filter terms ranked by hidden deal count (descending order)
  - Each term shows count of deals hidden
  - Empty state with helpful message
  - Data persists in chrome.storage.local
- **Estimated Effort:** 1-2 days

#### MD-59: Make popup auto-grow when there are many hidden deals
- **Story Points:** 3
- **Priority:** Medium
- **Status:** 🟡 To Do
- **Description:** Popup should automatically expand to show more hidden deals without scrolling
- **Acceptance Criteria:**
  - Popup height dynamically calculated based on hidden deals count
  - Maximum height enforced (e.g., 600px or 80vh)
  - Smooth CSS transitions
- **Estimated Effort:** 0.5-1 day

---

### Epic MD-55: Filter Management Features (14 points)

#### MD-62: Check for duplicate keywords and notify user
- **Story Points:** 3
- **Priority:** Medium
- **Status:** 🟡 To Do
- **Description:** Detect and prevent duplicate filter terms with user notification
- **Acceptance Criteria:**
  - Duplicate detection on save (case-insensitive, diacritics-aware)
  - User-friendly notification shown
  - Works for both single and bulk adds
- **Estimated Effort:** 0.5-1 day

#### MD-63: Make filter terms input field auto-grow with content
- **Story Points:** 3
- **Priority:** Medium
- **Status:** 🟡 To Do
- **Description:** Auto-growing textarea for filter terms so all terms are always visible
- **Acceptance Criteria:**
  - Auto-growing textarea implemented
  - Field expands vertically with content
  - Maximum height enforced with scroll
- **Estimated Effort:** 0.5-1 day

#### MD-64: Export filter terms as JSON file
- **Story Points:** 3
- **Priority:** High
- **Status:** 🟡 To Do
- **Description:** Allow users to export their filter configuration as JSON for backup/sharing
- **Acceptance Criteria:**
  - Export button added to Settings
  - JSON file with metadata (version, date, filter terms, exceptions)
  - File download triggered automatically
  - Empty state handled
- **Estimated Effort:** 0.5-1 day

#### MD-65: Import filter terms from JSON file
- **Story Points:** 5
- **Priority:** High
- **Status:** 🟡 To Do
- **Description:** Allow users to import filter terms from JSON backup
- **Acceptance Criteria:**
  - Import button and file picker added
  - JSON validation implemented
  - Import merges with existing filters
  - Duplicates detected and skipped
  - Import summary shown to user
- **Estimated Effort:** 1-2 days

---

### Epic MD-56: Bug Fixes (8 points)

#### MD-60: Fix badge counter reset when leaving and returning to tab
- **Story Points:** 3
- **Priority:** Critical
- **Status:** 🟡 To Do
- **Description:** Badge counter should persist when user switches tabs and returns
- **Acceptance Criteria:**
  - Badge counter state persisted per tab
  - Counter survives tab switching and page refresh
  - Counter clears appropriately on site change
- **Estimated Effort:** 0.5-1 day

#### MD-61: Verify and fix Firefox Sync for filter terms
- **Story Points:** 5
- **Priority:** Critical
- **Status:** 🟡 To Do
- **Description:** Ensure filter terms sync correctly across devices via Firefox Sync
- **Acceptance Criteria:**
  - Verify chrome.storage.sync is used for filter terms
  - Test sync across desktop and Android
  - Handle sync errors gracefully
- **Estimated Effort:** 1-2 days

---

## Sprint Schedule

### Week 1 (Feb 24 - Mar 02): Foundation & Critical Bugs
**Focus:** Set up sprint infrastructure, tackle critical bugs first

| Day | Date | Tasks |
|-----|------|-------|
| Tue | Feb 24 | Sprint planning, setup dev environment |
| Wed | Feb 25 | MD-60: Fix badge counter reset |
| Thu | Feb 26 | MD-61: Firefox Sync verification (start) |
| Fri | Feb 27 | MD-61: Firefox Sync verification (complete) |
| Mon | Mar 02 | MD-57: Remove Clear All button (quick win) |

**Week 1 Goal:** Complete critical bugs (MD-60, MD-61) and one quick win (MD-57)

---

### Week 2 (Mar 03 - Mar 09): Filter Management Core
**Focus:** Export/Import functionality and duplicate detection

| Day | Date | Tasks |
|-----|------|-------|
| Tue | Mar 03 | MD-62: Duplicate keyword detection |
| Wed | Mar 04 | MD-62: Testing and refinement |
| Thu | Mar 05 | MD-64: Export filter terms (start) |
| Fri | Mar 06 | MD-64: Export filter terms (complete) |
| Mon | Mar 09 | MD-65: Import filter terms (start) |

**Week 2 Goal:** Complete MD-62, MD-64, start MD-65

---

### Week 3 (Mar 10 - Mar 16): UI/UX Enhancements
**Focus:** Statistics tab and auto-grow features

| Day | Date | Tasks |
|-----|------|-------|
| Tue | Mar 10 | MD-65: Import filter terms (complete) |
| Wed | Mar 11 | MD-63: Auto-grow input field |
| Thu | Mar 12 | MD-58: Statistics tab (start) |
| Fri | Mar 13 | MD-58: Statistics tab (continue) |
| Mon | Mar 16 | MD-58: Statistics tab (complete) |

**Week 3 Goal:** Complete MD-65, MD-63, MD-58

---

### Week 4 (Mar 17 - Mar 24): Polish & Release
**Focus:** Final feature, testing, bug fixes, release preparation

| Day | Date | Tasks |
|-----|------|-------|
| Tue | Mar 17 | MD-59: Auto-grow popup |
| Wed | Mar 18 | Integration testing |
| Thu | Mar 19 | Bug fixes and polish |
| Fri | Mar 20 | User documentation update |
| Mon | Mar 23 | Final testing, AMO submission prep |
| Tue | Mar 24 | **Release v1.0.3** 🚀 |

**Week 4 Goal:** Complete MD-59, testing, release preparation

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Firefox Sync complexity | High | Medium | Allocate extra time, test early |
| Statistics data migration | Medium | Low | Use existing storage, add new fields |
| Import/export edge cases | Medium | Medium | Comprehensive testing with various files |
| Scope creep | Medium | Medium | Stick to defined acceptance criteria |
| Testing on Android | High | Medium | Test features incrementally on Android |

---

## Definition of Done (Sprint Level)

- [ ] All 9 user stories completed and tested
- [ ] All acceptance criteria met
- [ ] Code reviewed (if applicable)
- [ ] No critical bugs or regressions
- [ ] Tested on Firefox Desktop and Android
- [ ] Documentation updated
- [ ] Version bump to 1.0.3
- [ ] CHANGELOG.md updated
- [ ] Ready for AMO submission

---

## Files to Create/Modify

### New Files
- `src/export-import.js` - Export/import functionality
- `src/statistics.js` - Statistics tracking and display
- `src/components/StatisticsTab.js` or `statistics.html` - Statistics UI

### Modified Files
- `src/popup.js` - Add statistics tab, auto-grow logic
- `src/popup.html` - Add statistics tab UI
- `src/popup.css` - Auto-grow styles, statistics tab styles
- `src/background.js` - Badge counter persistence fix
- `src/options.js` - Export/import buttons, auto-grow textarea
- `manifest.json` - Version bump to 1.0.3

### Documentation Updates
- `/docs/CHANGELOG.md` - v1.0.3 release notes
- `/docs/STATUS.md` - Update sprint status
- `README.md` - New features documentation

---

## Testing Plan

### Manual Testing Checklist

#### Badge Counter (MD-60)
- [ ] Badge shows correct count on page load
- [ ] Badge persists when switching tabs
- [ ] Badge persists on page refresh
- [ ] Badge clears when leaving mydealz.de

#### Firefox Sync (MD-61)
- [ ] Add filter on desktop, verify on Android
- [ ] Add filter on Android, verify on desktop
- [ ] Test with 50+ filter terms
- [ ] Test sync error handling

#### Export/Import (MD-64, MD-65)
- [ ] Export creates valid JSON file
- [ ] JSON contains all filter and exception terms
- [ ] Import merges correctly with existing filters
- [ ] Import skips duplicates and reports them
- [ ] Import rejects invalid JSON files

#### Statistics Tab (MD-58)
- [ ] Tab visible and accessible
- [ ] Filter terms ranked correctly (descending)
- [ ] Counts accurate
- [ ] Empty state shows helpful message
- [ ] Data persists across sessions

#### Auto-grow Features (MD-59, MD-63)
- [ ] Popup grows with hidden deals
- [ ] Input field grows with filter terms
- [ ] Maximum heights enforced
- [ ] Smooth transitions

#### Duplicate Detection (MD-62)
- [ ] Duplicate detected on save
- [ ] Case-insensitive matching works
- [ ] Diacritics handled correctly
- [ ] User notified clearly

---

## Success Criteria

### Quantitative
- ✅ All 31 story points completed
- ✅ Zero critical bugs in production
- ✅ < 200ms performance impact
- ✅ 100% acceptance criteria met

### Qualitative
- ✅ Users can backup/restore filters easily
- ✅ Statistics provide actionable insights
- ✅ Badge counter reliable
- ✅ Firefox Sync working across devices
- ✅ No accidental filter deletions

---

## Sprint Ceremonies

| Ceremony | Date | Time | Attendees |
|----------|------|------|-----------|
| **Sprint Planning** | Feb 24 | 09:00 | Jan Kühn |
| **Daily Standup** | Daily | 09:00 | Jan Kühn (self) |
| **Mid-Sprint Review** | Mar 10 | 14:00 | Jan Kühn |
| **Sprint Review** | Mar 24 | 14:00 | Jan Kühn |
| **Retrospective** | Mar 24 | 15:00 | Jan Kühn |

---

## Notes

- Sprint starts tomorrow (Feb 24, 2026)
- Release target is v1.0.3 (note: PRD mentions v1.0.4 for future enhancements, this is intentional)
- All issues already created in Jira and linked to epics
- Sprint created in Jira (Sprint ID: 102)
- All issues assigned to Sprint 3 and fixVersion v1.0.3

---

**Document Created:** 2026-02-23  
**Last Updated:** 2026-02-23  
**Next Review:** Sprint Start (Feb 24)



