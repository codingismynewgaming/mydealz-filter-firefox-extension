---
title: 🏠 mydealz.de Filter - Project Home
space: MD
labels: [project-home, documentation, hub]
---

# mydealz.de Filter - Project Home

**Last Updated:** 2026-02-23  
**Product Owner:** Jan Kühn  
**Development Status:** 🟡 Active Development (Sprint 3)

---

## 📋 Overview

| Property | Details |
|----------|---------|
| **Product Name** | mydealz.de Filter |
| **Product Type** | Firefox Browser Extension |
| **Jira Project Key** | [MD](https://berlin-mitte-institut.atlassian.net/jira/software/projects/MD) |
| **GitHub Repository** | [mydealz-filter-firefox-extension](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension) |
| **Current Version** | 1.0.3 (Sprint 3 - In Progress) |
| **Current Sprint** | Sprint 3 (Feb 24 - Mar 24, 2026) |
| **AMO Listing** | [Firefox Add-ons Store](https://addons.mozilla.org/de/firefox/addon/mydealz-de-filter/) |
| **License** | Open Source |
| **Privacy Model** | Client-side only, no external data transmission |

---

## 🎯 Product Vision

**Empower mydealz.de users to take control of their deal feed by filtering out irrelevant content while maintaining complete privacy and data sovereignty.**

### Core Principles

1. **Privacy First** - All processing and storage happens locally in the browser
2. **User Control** - Users define their own filter rules
3. **Transparency** - Open source code, clear data practices
4. **Cross-Platform** - Works on Firefox Desktop and Android Nightly
5. **Performance** - Minimal impact on page load (<200ms)

---

## 🎯 Product Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **Reduce Noise** | Filter irrelevant deals from user feed | ≥95% filter accuracy |
| **Privacy Protection** | Zero external data transmission | 100% local storage |
| **UX Excellence** | Intuitive, responsive interface | ≥4.5 star rating |
| **Cross-Platform** | Seamless experience across devices | Firefox Desktop + Android support |
| **Community Trust** | Transparent, open-source development | Active user feedback loop |

---

## 📊 Current Status Dashboard

### Sprint 3 Status: 🟡 In Progress (Week 1 of 4)

**Sprint Goal:** Release v1.0.3 with UI/UX improvements, filter management features (export/import), statistics tab, and critical bug fixes

#### Progress Overview

| Status | Count | Tickets |
|--------|-------|---------|
| ✅ **Done** | 7 | MD-57, MD-58, MD-59, MD-62, MD-63, MD-64, MD-65 |
| 🟡 **Testing** | 4 | MD-60, MD-63, MD-72, MD-73 |
| 🔵 **To Do** | 6 | MD-66 to MD-71 (Confluence rollout) |
| **Total** | **17** | Sprint 3 + follow-up |

#### Sprint Metrics

| Metric | Target | Current | % Complete |
|--------|--------|---------|------------|
| Story Points | 31 | 31 | 100% planned |
| Issues Completed | 9 | 7 Done + 4 Testing | ~78% |
| Sprint Duration | 4 weeks | Week 1 of 4 | 25% |

---

## 🔗 Quick Links

### 📚 Documentation (GitHub)

| Document | Description | Link |
|----------|-------------|------|
| **PRD** | Product Requirements Document (67 pages) | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/PRD.md) |
| **STATUS** | Current project status with Jira integration | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/STATUS.md) |
| **Sprint 3 Plan** | Detailed sprint plan with weekly breakdown | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/SPRINT-3-PLAN.md) |
| **Test Checklist** | Manual verification checklist for Sprint 3 | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/SPRINT-3-TEST-CHECKLIST.md) |
| **CHANGELOG** | Version history and release notes | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/CHANGELOG.md) |
| **Privacy Policy** | Data practices and compliance | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/PRIVACY_POLICY.md) |
| **README** | Installation and usage guide | [View on GitHub](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/README.md) |

### 🏗️ Confluence Pages

| Page | Purpose | Status |
|------|---------|--------|
| **🏠 Project Home** | Central hub for project information | ✅ Current Page |
| **🗺️ Roadmap & Releases** | Version timeline and release planning | 📝 Created |
| **🏃 Sprint Hub** | Sprint overview and progress tracking | 📝 Created |
| **📋 Sprint 3 Review** | Sprint review outcomes and demos | 📝 Created |
| **✅ Sprint 3 Test Report** | Test results and quality sign-off | 📝 Created |
| **📐 ADR Log** | Architecture Decision Records | 📝 Created |

---

## 🎯 Active Scope

### Current Sprint Issues (Sprint 3)

**In Progress / Testing:**

```jql
project = MD AND sprint in openSprints() AND status IN ("Testing", "In Progress") ORDER BY priority DESC
```

**Recently Completed:**

- ✅ MD-57: Remove Clear All button from settings
- ✅ MD-58: Add statistics tab showing filter term effectiveness ranking
- ✅ MD-59: Make popup auto-grow when there are many hidden deals
- ✅ MD-62: Check for duplicate keywords and notify user
- ✅ MD-63: Make filter terms input field auto-grow with content
- ✅ MD-64: Export filter terms as JSON file
- ✅ MD-65: Import filter terms from JSON file

**Follow-up Improvements:**

- 🟡 MD-72: Rename MyDealz naming to mydealz.de in user-facing text
- 🟡 MD-73: Add Info tab in popup and move settings content below donation section

### Upcoming Backlog

```jql
project = MD AND status = "To Do" ORDER BY priority DESC
```

**Confluence Rollout (MD-66 to MD-71):**

- 🔵 MD-66: Publish Confluence Project Home page
- 🔵 MD-67: Publish Confluence Roadmap & Releases page
- 🔵 MD-68: Publish Confluence Sprint Hub page
- 🔵 MD-69: Publish Confluence Sprint 3 Review page
- 🔵 MD-70: Publish Confluence Sprint 3 Test Report page
- 🔵 MD-71: Create Confluence ADR log and first architecture decisions

---

## 👥 Team & Governance

### Team Structure

| Role | Name | Contact | Responsibilities |
|------|------|---------|------------------|
| **Developer** | Jan Kühn | jan.kuehn@ | Full-stack development, architecture, testing |
| **Project Type** | Open Source | Community-driven | Browser extension for mydealz.de users |

### Decision Making

- **Product Decisions:** Developer (based on user feedback)
- **Technical Decisions:** Architecture Decision Records (ADRs)
- **Priority Setting:** Jira backlog refinement
- **Release Decisions:** Sprint completion criteria

---

## ⚠️ Known Risks & Dependencies

### Technical Risks

| Risk | Impact | Likelihood | Mitigation Strategy | Owner |
|------|--------|------------|---------------------|-------|
| **Site DOM changes on mydealz.de** | 🔴 High | 🟡 Medium | Multiple CSS selectors, fallback detection, quick response to changes | Dev |
| **Firefox Sync reliability** | 🔴 High | 🟡 Medium | Graceful error handling, local fallback, user communication | Dev |
| **Cross-device sync behavior variance** | 🟡 Medium | 🟡 Medium | Test matrix includes Desktop + Android, user feedback loop | Dev |
| **Performance degradation** | 🟡 Medium | 🟢 Low | Performance profiling, debounce logic, optimization sprints | Dev |

### External Dependencies

| Dependency | Type | Criticality | Contingency |
|------------|------|-------------|-------------|
| **mydealz.de website** | External API (DOM) | Critical | Monitor for changes, maintain multiple selectors |
| **Firefox Browser** | Platform | Critical | Test on multiple versions, follow Mozilla guidelines |
| **AMO Store** | Distribution | High | Alternative: direct download from GitHub |
| **GitHub** | Hosting/Version Control | High | Local backups, versioned releases |

---

## 📐 Architecture Decisions

See **[ADR Log page](06_ADR_LOG.md)** for complete architecture decision records.

### Key Architectural Decisions

| ADR | Title | Status | Impact |
|-----|-------|--------|--------|
| **ADR-001** | Client-side only processing | ✅ Accepted | Privacy compliance, no backend required |
| **ADR-002** | Chrome.storage.sync for cross-device sync | ✅ Accepted | Firefox Sync support, graceful degradation |
| **ADR-003** | MutationObserver for dynamic content | ✅ Accepted | Infinite scroll support, performance optimization |
| **ADR-004** | Manifest V3 for Firefox compatibility | ✅ Accepted | Future-proof, AMO compliance |

---

## 🚀 Version Roadmap

### Release History

| Version | Status | Release Date | Key Features | Story Points |
|---------|--------|--------------|--------------|--------------|
| **v1.0.0** | ✅ Released | 2026-02-11 | Core filtering, badge counter, hidden deals list | 24 |
| **v1.0.1** | ✅ Released | 2026-02-14 | Theme toggle, unique deal tracking, sync fixes | 8 |
| **v1.0.2** | ✅ Released | 2026-02-17 | Android support, options page, donate links | 13 |
| **v1.0.3** | 🟡 In Dev | 2026-03-24 (Target) | Export/Import, Statistics, UX improvements | 31 |
| **v1.0.4** | 🔵 Backlog | TBA | Future enhancements (MD-40 epic) | TBD |

### v1.0.3 Release Features (Current Sprint)

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

## 📊 Success Metrics

### User Adoption (Post-Launch)

| Metric | Target | Current | Measurement |
|--------|--------|---------|-------------|
| **Weekly Active Users (WAU)** | 100+ | TBD | Firefox Add-ons stats |
| **User Rating** | ≥4.5 stars | TBD | AMO user reviews |
| **Filter Accuracy** | ≥95% | TBD | User feedback & testing |
| **Page Load Impact** | <200ms | TBD | Performance profiling |

### Development Quality

| Metric | Target | Current | Measurement |
|--------|--------|---------|-------------|
| **Sprint Velocity** | 31 points/sprint | 31 (Sprint 3) | Jira sprint reports |
| **Code Quality** | 0 lint errors | ✅ Passing | `npm run lint:amo` |
| **Test Coverage** | >80% | TBD | Unit tests |
| **Documentation** | Complete | ✅ Complete | GitHub docs folder |

---

## 🎯 Sprint Schedule

### Sprint 3 Timeline (Feb 24 - Mar 24, 2026)

| Week | Dates | Focus | Key Deliverables |
|------|-------|-------|------------------|
| **Week 1** | Feb 24 - Mar 02 | Foundation & Critical Bugs | MD-60, MD-61, MD-57 ✅ |
| **Week 2** | Mar 03 - Mar 09 | Filter Management Core | MD-62, MD-64, MD-65 ✅ |
| **Week 3** | Mar 10 - Mar 16 | UI/UX Enhancements | MD-63, MD-58, MD-59 ✅ |
| **Week 4** | Mar 17 - Mar 24 | Polish & Release | MD-59, Testing, **Release v1.0.3** 🚀 |

### Key Milestones

- ✅ **Feb 23:** Sprint planning completed
- ✅ **Feb 23:** All Sprint 3 issues created in Jira
- 🟡 **Feb 24:** Sprint 3 execution starts
- 🟡 **Mar 10:** Mid-sprint review
- 🟡 **Mar 24:** Sprint 3 review & v1.0.3 release

---

## 📞 Communication & Reporting

### Status Updates

- **Daily:** Self standup (developer)
- **Weekly:** Status document update (`docs/STATUS.md`)
- **Sprint-level:** Sprint review & retrospective
- **Release-level:** CHANGELOG update, AMO submission

### Escalation Path

For issues or questions:
1. Check [GitHub Issues](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/issues)
2. Review [Documentation](docs/)
3. Contact: jan.kuehn@

---

## 📎 Appendix

### Glossary

| Term | Definition |
|------|------------|
| **AMO** | addons.mozilla.org - Firefox Add-ons store |
| **Badge Counter** | Number displayed on extension icon showing hidden deals count |
| **Content Script** | JavaScript that runs in the context of web pages |
| **Manifest V3** | Latest extension manifest format |
| **MutationObserver** | Web API for detecting DOM changes |
| **Options Page** | Settings page accessible via Firefox Add-ons menu |

### Related Projects

- **mydealz.de** - Deal sharing platform (https://www.mydealz.de/)
- **Firefox Browser** - Mozilla's web browser (https://www.mozilla.org/firefox/)
- **Web Extensions** - Cross-browser extension framework

---

*This page is automatically generated from project documentation. Last sync: 2026-02-23*
