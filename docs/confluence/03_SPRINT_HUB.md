---
title: 🏃 Sprint Hub - Sprint 3
space: MD
labels: [sprint, sprint-3, planning, execution]
---

# Sprint Hub - Sprint 3

**Sprint Name:** Sprint 3 - v1.0.3 Release  
**Sprint Goal:** Release v1.0.3 with UI/UX improvements, filter management features (export/import), statistics tab, and critical bug fixes  
**Sprint Duration:** Feb 24, 2026 - Mar 24, 2026 (4 weeks / 29 days)  
**Sprint Status:** 🟡 **In Progress** (Week 1 of 4)

---

## 📊 Sprint Overview

### Sprint Metrics

| Metric | Planned | Current | % Complete |
|--------|---------|---------|------------|
| **Total Story Points** | 31 | 31 | 100% (planned) |
| **Total Issues** | 12 (3 epics + 9 stories) | 17 (incl. follow-up) | 100% |
| **Issues Completed** | 9 | 7 Done + 4 Testing | ~78% |
| **Sprint Duration** | 29 days | Day 1 of 29 | 3% |
| **Team Capacity** | 1 developer | 1 developer | 100% |

### Epic Summary

| Epic Key | Epic Name | Stories | Story Points | Status |
|----------|-----------|---------|--------------|--------|
| **MD-54** | v1.0.3 UI/UX Improvements | 3 | 9 | 🟡 In Progress |
| **MD-55** | v1.0.3 Filter Management Features | 4 | 14 | 🟡 In Progress |
| **MD-56** | v1.0.3 Bug Fixes | 2 | 8 | 🟡 In Progress |

---

## 📋 Sprint Scope

### Planned Issues

| Key | Summary | Type | Points | Priority | Status | Epic |
|-----|---------|------|--------|----------|--------|------|
| **MD-57** | Remove Clear All button from settings | Story | 1 | Low | ✅ Done | MD-54 |
| **MD-58** | Add statistics tab showing filter term effectiveness ranking | Story | 5 | High | ✅ Done | MD-54 |
| **MD-59** | Make popup auto-grow when there are many hidden deals | Story | 3 | Medium | ✅ Done | MD-54 |
| **MD-60** | Fix badge counter reset when leaving and returning to tab | Story | 3 | Critical | 🟡 Testing | MD-56 |
| **MD-61** | Verify and fix Firefox Sync for filter terms | Story | 5 | Critical | ✅ Done | MD-56 |
| **MD-62** | Check for duplicate keywords and notify user | Story | 3 | Medium | ✅ Done | MD-55 |
| **MD-63** | Make filter terms input field auto-grow with content | Story | 3 | Medium | 🟡 Testing | MD-55 |
| **MD-64** | Export filter terms as JSON file | Story | 3 | High | ✅ Done | MD-55 |
| **MD-65** | Import filter terms from JSON file | Story | 5 | High | ✅ Done | MD-55 |

### Added Mid-Sprint (Follow-up Improvements)

| Key | Summary | Type | Points | Priority | Status | Notes |
|-----|---------|------|--------|----------|--------|-------|
| **MD-72** | Rename MyDealz naming to mydealz.de in user-facing text | Improvement | 1 | Medium | 🟡 Testing | Branding consistency |
| **MD-73** | Add Info tab in popup and move settings content below donation section | Improvement | 2 | Medium | 🟡 Testing | UX improvement |

### Removed/Deferred

*None - all planned scope retained*

---

## 📅 Sprint Schedule

### Week 1 (Feb 24 - Mar 02): Foundation & Critical Bugs

**Theme:** Set up sprint infrastructure, tackle critical bugs first

| Day | Date | Planned Tasks | Status |
|-----|------|---------------|--------|
| Mon | Feb 23 | Sprint planning, documentation setup | ✅ Complete |
| Tue | Feb 24 | Sprint execution starts, MD-60 implementation | 🟡 In Progress |
| Wed | Feb 25 | MD-60: Fix badge counter reset | 🟡 In Progress |
| Thu | Feb 26 | MD-61: Firefox Sync verification (start) | ⏳ Pending |
| Fri | Feb 27 | MD-61: Firefox Sync verification (complete) | ⏳ Pending |
| Mon | Mar 02 | MD-57: Remove Clear All button (quick win) | ⏳ Pending |

**Week 1 Goal:** Complete critical bugs (MD-60, MD-61) and one quick win (MD-57)  
**Week 1 Status:** 🟡 On track - Execution started Feb 23

---

### Week 2 (Mar 03 - Mar 09): Filter Management Core

**Theme:** Export/Import functionality and duplicate detection

| Day | Date | Planned Tasks | Status |
|-----|------|---------------|--------|
| Tue | Mar 03 | MD-62: Duplicate keyword detection | ⏳ Pending |
| Wed | Mar 04 | MD-62: Testing and refinement | ⏳ Pending |
| Thu | Mar 05 | MD-64: Export filter terms (start) | ⏳ Pending |
| Fri | Mar 06 | MD-64: Export filter terms (complete) | ⏳ Pending |
| Mon | Mar 09 | MD-65: Import filter terms (start) | ⏳ Pending |

**Week 2 Goal:** Complete MD-62, MD-64, start MD-65

---

### Week 3 (Mar 10 - Mar 16): UI/UX Enhancements

**Theme:** Statistics tab and auto-grow features

| Day | Date | Planned Tasks | Status |
|-----|------|---------------|--------|
| Tue | Mar 10 | MD-65: Import filter terms (complete) | ⏳ Pending |
| Wed | Mar 11 | MD-63: Auto-grow input field | ⏳ Pending |
| Thu | Mar 12 | MD-58: Statistics tab (start) | ⏳ Pending |
| Fri | Mar 13 | MD-58: Statistics tab (continue) | ⏳ Pending |
| Mon | Mar 16 | MD-58: Statistics tab (complete) | ⏳ Pending |

**Week 3 Goal:** Complete MD-65, MD-63, MD-58

---

### Week 4 (Mar 17 - Mar 24): Polish & Release

**Theme:** Final feature, testing, bug fixes, release preparation

| Day | Date | Planned Tasks | Status |
|-----|------|---------------|--------|
| Tue | Mar 17 | MD-59: Auto-grow popup | ⏳ Pending |
| Wed | Mar 18 | Integration testing (Desktop + Android) | ⏳ Pending |
| Thu | Mar 19 | Bug fixes and polish | ⏳ Pending |
| Fri | Mar 20 | User documentation update | ⏳ Pending |
| Mon | Mar 23 | Final testing, AMO submission prep | ⏳ Pending |
| Tue | Mar 24 | **Release v1.0.3** 🚀 | ⏳ Pending |

**Week 4 Goal:** Complete MD-59, testing, release preparation

---

## 📈 Progress Tracking

### Daily Progress Notes

| Date | Day | Progress Summary | Blockers | Notes |
|------|-----|------------------|----------|-------|
| **Feb 23** | Mon | ✅ Sprint planning completed, all Jira tickets created, documentation updated | None | Sprint ready to start |
| **Feb 24** | Tue | 🟡 Execution starts | None | First implementation day |
| **Feb 25** | Wed | | | |
| **Feb 26** | Thu | | | |
| **Feb 27** | Fri | | | |
| **Mar 02** | Mon | | | |

*Update daily during sprint execution*

---

### Burndown Chart (Manual Tracking)

| Day | Planned Remaining Points | Actual Remaining Points |
|-----|--------------------------|-------------------------|
| Day 1 (Feb 24) | 31 | 31 |
| Day 2 | 28 | |
| Day 3 | 25 | |
| Day 4 | 22 | |
| Day 5 | 19 | |
| Day 8 | 15 | |
| Day 10 | 12 | |
| Day 12 | 8 | |
| Day 15 | 5 | |
| Day 17 | 3 | |
| Day 19 | 0 | |
| Day 22 | 0 | |
| Day 24 | 0 | |
| Day 29 | 0 | |

---

## 🎯 Deliverables

### Feature Outcomes

#### Epic MD-54: UI/UX Improvements

| Feature | Acceptance Criteria | Status |
|---------|---------------------|--------|
| **Statistics Tab** | Filter terms ranked by hidden deal count, empty state handled | ✅ Done |
| **Auto-growing Popup** | Popup expands with hidden deals, max-height enforced | ✅ Done |
| **Cleaner Settings** | Clear All button removed, individual delete remains | ✅ Done |

#### Epic MD-55: Filter Management Features

| Feature | Acceptance Criteria | Status |
|---------|---------------------|--------|
| **Duplicate Detection** | Case-insensitive, diacritics-aware, user notified | ✅ Done |
| **Auto-grow Input** | Filter terms field expands, max-height with scroll | 🟡 Testing |
| **Export Filters** | JSON file with metadata, download triggered | ✅ Done |
| **Import Filters** | JSON validation, merge, duplicate skip, summary | ✅ Done |

#### Epic MD-56: Bug Fixes

| Feature | Acceptance Criteria | Status |
|---------|---------------------|--------|
| **Badge Counter Fix** | Persists across tab switches and page refresh | 🟡 Testing |
| **Firefox Sync Fix** | Works across desktop and Android, graceful error handling | ✅ Done |

### Documentation Updates

| Document | Update Required | Status |
|----------|-----------------|--------|
| **CHANGELOG.md** | v1.0.3 release notes | ⏳ Pending |
| **README.md** | New features documented | ⏳ Pending |
| **STATUS.md** | Sprint progress tracking | ✅ Current |
| **SPRINT-3-TEST-CHECKLIST.md** | Manual test cases | ✅ Created |

### Test Outcomes

| Test Type | Planned | Executed | Passed | Failed | Blocked |
|-----------|---------|----------|--------|--------|---------|
| **Desktop Firefox** | 25 cases | 0 | 0 | 0 | 0 |
| **Android Nightly** | 15 cases | 0 | 0 | 0 | 0 |
| **Integration** | 10 cases | 0 | 0 | 0 | 0 |
| **Total** | **50 cases** | **0** | **0** | **0** | **0** |

*Update during testing phase (Week 4)*

---

## ⚠️ Risks & Issues

### Current Risks

| Risk | Impact | Likelihood | Mitigation | Owner | Status |
|------|--------|------------|------------|-------|--------|
| **Firefox Sync complexity** | High | Medium | Allocate extra time, test early | Dev | 🟡 Monitoring |
| **Statistics data migration** | Medium | Low | Use existing storage, add new fields | Dev | 🟢 Resolved |
| **Import/export edge cases** | Medium | Medium | Comprehensive testing with various files | Dev | 🟡 Monitoring |
| **Scope creep** | Medium | Medium | Stick to defined acceptance criteria | Dev | 🟢 Controlled |
| **Testing on Android** | High | Medium | Test features incrementally | Dev | 🟡 Monitoring |

### Current Issues

| Issue | Impact | Action Taken | Resolution Date |
|-------|--------|--------------|-----------------|
| None currently | - | - | - |

### Follow-up Items

| Item | Description | Priority | Target Sprint |
|------|-------------|----------|---------------|
| **MD-72** | Rename to mydealz.de | Medium | Sprint 3 (current) |
| **MD-73** | Add Info tab | Medium | Sprint 3 (current) |
| **Confluence Rollout** | MD-66 to MD-71 | Low | Sprint 3 (current) |

---

## 🔗 Related Links

### Sprint Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| **Sprint Plan** | [docs/SPRINT-3-PLAN.md](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/SPRINT-3-PLAN.md) | Detailed sprint breakdown |
| **Test Checklist** | [docs/SPRINT-3-TEST-CHECKLIST.md](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/SPRINT-3-TEST-CHECKLIST.md) | Manual verification cases |
| **Status Document** | [docs/STATUS.md](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/STATUS.md) | Real-time progress tracking |
| **Sprint Review** | [Confluence - Sprint 3 Review](#) | Sprint outcomes and demo |
| **Test Report** | [Confluence - Sprint 3 Test Report](#) | Quality sign-off |

### Jira Filters

**Current Sprint Issues:**
```jql
project = MD AND sprint in openSprints() ORDER BY status ASC, priority DESC
```

**Sprint 3 Completed:**
```jql
project = MD AND sprint = 102 AND status = Done ORDER BY updated DESC
```

**Sprint 3 In Progress:**
```jql
project = MD AND sprint = 102 AND status = "In Progress" ORDER BY priority DESC
```

**Sprint 3 Testing:**
```jql
project = MD AND sprint = 102 AND status = Testing ORDER BY priority DESC
```

---

## 📊 Sprint Metrics (End of Sprint)

*To be completed at sprint end*

### Velocity

| Metric | Value |
|--------|-------|
| **Planned Points** | 31 |
| **Completed Points** | TBD |
| **Completion Rate** | TBD% |
| **Carry-over Points** | TBD |

### Quality Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| **Critical Bugs** | 0 | TBD |
| **Test Coverage** | >80% | TBD |
| **Lint Errors** | 0 | 0 (current) |
| **Documentation** | Complete | TBD |

### Team Happiness

| Metric | Rating (1-5) | Notes |
|--------|--------------|-------|
| **Sprint Goal Achievement** | - | - |
| **Work-Life Balance** | - | - |
| **Technical Satisfaction** | - | - |

---

## 📝 Sprint Ceremonies

### Sprint Planning

**Date:** Feb 23, 2026  
**Attendees:** Jan Kühn  
**Outcomes:**
- Sprint goal defined
- All 9 user stories estimated and committed
- 3 epics identified (MD-54, MD-55, MD-56)
- Sprint created in Jira (Sprint ID: 102)
- All issues assigned to Sprint 3

### Daily Standups

*Self-managed - daily progress tracked in this document*

### Mid-Sprint Review

**Scheduled:** Mar 10, 2026  
**Agenda:**
- Review progress against plan
- Identify blockers
- Adjust scope if needed

### Sprint Review

**Scheduled:** Mar 24, 2026, 14:00  
**Attendees:** Jan Kühn  
**Demo Agenda:**
1. Statistics tab demo
2. Export/Import flow
3. Auto-grow features
4. Badge counter fix
5. Firefox Sync verification

### Sprint Retrospective

**Scheduled:** Mar 24, 2026, 15:00  
**Format:** Self-reflection  
**Categories:**
- What went well?
- What could be improved?
- Action items for next sprint

---

## 🎯 Definition of Done (Sprint Level)

- [x] All 9 user stories implemented
- [ ] All 9 user stories tested and verified
- [ ] All acceptance criteria met
- [ ] No critical bugs or regressions
- [ ] Tested on Firefox Desktop (v142+)
- [ ] Tested on Firefox Android Nightly
- [ ] Documentation updated (CHANGELOG, README)
- [ ] Version bump to 1.0.3
- [ ] Lint passing (`npm run lint:amo`)
- [ ] Ready for AMO submission

**Current Progress:** 7/9 implemented, 4 in testing, 0 pending implementation

---

*This page is updated daily during sprint execution. Last update: 2026-02-23*
