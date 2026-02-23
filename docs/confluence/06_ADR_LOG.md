---
title: 📐 Architecture Decision Log (ADR)
space: MD
labels: [architecture, adr, decisions, technical, design]
---

# Architecture Decision Log (ADR)

**Project:** mydealz.de Filter  
**Last Updated:** 2026-02-23  
**Total ADRs:** 4 (4 proposed, 0 superseded)

---

## 📋 About ADRs

Architecture Decision Records (ADRs) capture significant architectural decisions made during the project's evolution. Each ADR includes:

- **Context:** The problem and constraints
- **Decision:** The chosen approach
- **Consequences:** Trade-offs and impacts
- **Status:** Proposed, Accepted, or Superseded

---

## 📑 ADR Index

| ADR # | Title | Status | Date | Links |
|-------|-------|--------|------|-------|
| **[ADR-001](#adr-001-client-side-only-processing)** | Client-side only processing | ✅ Accepted | 2026-02-01 | [MD-12](https://berlin-mitte-institut.atlassian.net/browse/MD-12) |
| **[ADR-002](#adr-002-chromestoragesync-for-cross-device-sync)** | chrome.storage.sync for cross-device sync | ✅ Accepted | 2026-02-01 | [MD-61](https://berlin-mitte-institut.atlassian.net/browse/MD-61) |
| **[ADR-003](#adr-003-mutationobserver-for-dynamic-content)** | MutationObserver for dynamic content | ✅ Accepted | 2026-02-01 | [MD-12](https://berlin-mitte-institut.atlassian.net/browse/MD-12) |
| **[ADR-004](#adr-004-manifest-v3-for-firefox-compatibility)** | Manifest V3 for Firefox compatibility | ✅ Accepted | 2026-02-01 | [MD-14](https://berlin-mitte-institut.atlassian.net/browse/MD-14) |

---

## ADR-001: Client-side only processing

**Status:** ✅ **Accepted**  
**Date:** 2026-02-01  
**Jira:** MD-12 (Core Filtering Functionality)

### Context

Users are concerned about privacy and data tracking when installing browser extensions. The mydealz.de Filter needs to:
- Filter deals based on user-defined keywords
- Store user preferences and filter history
- Maintain user trust and comply with privacy regulations (GDPR)
- Operate without backend infrastructure

**Constraints:**
- Zero budget for backend hosting
- Privacy-first design requirement
- Must work offline
- Minimal permissions model

### Decision

**All processing and data storage happens exclusively in the user's browser.**

**Implementation:**
- Deal filtering: Content script runs in browser context
- Data storage: chrome.storage.sync for settings, chrome.storage.local for statistics
- No external API calls (except Firefox Sync for chrome.storage.sync)
- No analytics, telemetry, or tracking
- No server-side components

**Code Location:**
- `src/content.js` - Deal detection and filtering
- `src/background.js` - Badge counter, storage management
- `src/popup.js`, `src/options.js` - UI interactions

### Consequences

#### Positive ✅
- **Privacy compliance:** No user data leaves the browser
- **GDPR compliant:** No personal data processing
- **Offline capable:** Works without internet connection
- **No infrastructure costs:** Zero backend hosting required
- **User trust:** Transparent privacy practices
- **Simplified AMO review:** No external data transmission to document

#### Negative ❌
- **Limited sync:** Relies on Firefox Sync (user must enable)
- **No cloud backup:** Users must manually export/import (added in v1.0.3)
- **Device-specific stats:** Hidden deal counts not synced across devices
- **No usage analytics:** Cannot track feature adoption or errors

#### Neutral ➖
- **Storage limits:** chrome.storage.sync has 100KB quota (sufficient for 1000+ filter terms)
- **Browser-specific:** Extension only works in Firefox (not Chrome/Safari without porting)

### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| **Backend API for sync** | Infrastructure cost, privacy concerns, complexity |
| **Local storage only** | No cross-device sync, users would need manual export/import |
| **IndexedDB** | More complex API, no sync support, overkill for simple key-value storage |
| **Third-party sync service** | Privacy concerns, external dependency, potential cost |

### Compliance Notes

**GDPR Assessment:**
- No personal data collected → Not subject to most GDPR requirements
- No data processing outside user's device → No data transfer agreements needed
- No tracking → No cookie consent required

**AMO Review:**
- Privacy policy clearly states "no data collection"
- Extension permissions minimal and justified
- No external connections declared

---

## ADR-002: chrome.storage.sync for cross-device sync

**Status:** ✅ **Accepted**  
**Date:** 2026-02-01  
**Jira:** MD-61 (Verify and fix Firefox Sync for filter terms)

### Context

Users want their filter settings to sync across devices (desktop, Android). Firefox provides built-in sync capabilities via Firefox Accounts.

**Requirements:**
- Sync filter terms across devices
- Work automatically when user enables Firefox Sync
- Graceful degradation when sync unavailable
- Minimal code complexity

**Constraints:**
- Must work on Firefox Desktop and Android
- No custom backend (ADR-001)
- Storage quota: 100KB for chrome.storage.sync

### Decision

**Use chrome.storage.sync for filter terms and settings, with chrome.storage.local as fallback.**

**Implementation:**
```javascript
// Save filter terms
await chrome.storage.sync.set({
  filterTerms: ['iPhone', 'Apple'],
  exceptionTerms: ['Android'],
  theme: 'dark'
});

// Load with fallback
const result = await chrome.storage.sync.get(['filterTerms']);
if (chrome.runtime.lastError) {
  // Fallback to local storage
  const local = await chrome.storage.local.get(['filterTerms']);
  return local.filterTerms;
}
```

**Storage Strategy:**
- **chrome.storage.sync:** Filter terms, exception terms, theme preference, user settings
- **chrome.storage.local:** Statistics, hidden deal counts, session data (device-specific)

### Consequences

#### Positive ✅
- **Automatic sync:** Works seamlessly when Firefox Sync enabled
- **Cross-device:** Desktop ↔ Android sync supported
- **No code changes:** Firefox handles sync automatically
- **Graceful degradation:** Falls back to local storage on error
- **User control:** Users can disable sync in Firefox settings

#### Negative ❌
- **Firefox dependency:** Only works with Firefox Sync (not available in Chrome/Safari)
- **Quota limits:** 100KB sync storage (sufficient for text, not for large datasets)
- **Sync delays:** Changes may take seconds/minutes to propagate
- **No conflict resolution:** Last-write-wins (acceptable for this use case)

#### Neutral ➖
- **User must enable Sync:** Not automatic, requires Firefox account
- **Storage segregation:** Must decide what goes to sync vs local

### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| **chrome.storage.local only** | No sync, users would need manual export/import |
| **Custom sync backend** | Infrastructure cost, complexity, privacy concerns |
| **WebDAV sync** | Complex setup, user configuration required |
| **P2P sync (WebRTC)** | Complex, unreliable, requires both devices online |

### Testing Strategy

**MD-61 Acceptance Criteria:**
- [ ] Add filter on desktop, verify on Android
- [ ] Add filter on Android, verify on desktop
- [ ] Test with 50+ filter terms
- [ ] Test sync error handling (graceful fallback)

### Error Handling

```javascript
try {
  await chrome.storage.sync.set({ filterTerms: terms });
} catch (error) {
  // Graceful fallback
  await chrome.storage.local.set({ filterTerms: terms });
  showNotification('Sync unavailable, saved locally');
}
```

---

## ADR-003: MutationObserver for dynamic content

**Status:** ✅ **Accepted**  
**Date:** 2026-02-01  
**Jira:** MD-12 (Core Filtering Functionality)

### Context

mydealz.de uses infinite scroll and dynamic content loading. Traditional DOMContentLoaded events don't capture deals loaded after initial page load.

**Requirements:**
- Detect new deals as user scrolls
- Filter deals within 1 second of appearance
- No performance degradation
- Handle rapid content loading

**Constraints:**
- Must not block main thread
- Must debounce filter operations
- Must work with mydealz.de's existing DOM structure

### Decision

**Use MutationObserver API to detect DOM changes and trigger filtering.**

**Implementation:**
```javascript
const observer = new MutationObserver(
  debounce((mutations) => {
    filterDealPostings();
  }, 1000)
);

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

**Key Design Choices:**
- **Debouncing:** 1 second delay to batch multiple mutations
- **Subtree observation:** Detect changes in nested elements
- **Selective filtering:** Only process new deal elements, not entire DOM

### Consequences

#### Positive ✅
- **Real-time filtering:** New deals hidden within 1 second
- **Infinite scroll support:** Works seamlessly with dynamic loading
- **Performance optimized:** Debouncing prevents redundant operations
- **Browser native:** No external libraries required
- **Efficient:** Only observes actual DOM changes

#### Negative ❌
- **Browser support:** Requires modern browsers (Firefox 14+, acceptable)
- **False positives:** May trigger on unrelated DOM changes (mitigated by selective filtering)
- **Memory leak risk:** Must disconnect observer on page unload (handled)

#### Neutral ➖
- **Complexity:** More complex than simple event listeners
- **Timing:** Filter timing depends on mydealz.de's DOM update patterns

### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| **DOMContentLoaded only** | Doesn't handle infinite scroll |
| **Scroll event listener** | Fires too frequently, performance issues |
| **setInterval polling** | Inefficient, wasteful, imprecise |
| **mydealz.de AJAX interception** | Fragile, breaks with site changes |

### Performance Considerations

**Debouncing Strategy:**
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

**Performance Targets:**
- Observer setup: <10ms
- Mutation callback: <50ms
- Filter operation: <100ms
- Total latency: <1 second (user imperceptible)

---

## ADR-004: Manifest V3 for Firefox compatibility

**Status:** ✅ **Accepted**  
**Date:** 2026-02-01  
**Jira:** MD-14 (Platform Support & Compatibility)

### Context

Mozilla requires Manifest V3 for new Firefox extensions. Chrome is also transitioning to MV3. The extension must be compatible with current and future browser versions.

**Requirements:**
- Firefox 142+ compatibility
- AMO submission approval
- Future-proof for browser updates
- Maintain Chrome portability option

**Constraints:**
- MV3 has different API patterns than MV2
- Service workers replace background pages
- Some APIs deprecated or changed

### Decision

**Develop extension using Manifest V3 from the start.**

**Implementation:**
```json
{
  "manifest_version": 3,
  "name": "mydealz.de Filter",
  "version": "1.0.3",
  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup.html"
  },
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ]
}
```

**Key MV3 Changes:**
- Service worker background script (non-persistent)
- `action` API replaces `browserAction`/`pageAction`
- Promise-based APIs (async/await)
- Host permissions in manifest

### Consequences

#### Positive ✅
- **Future-proof:** Compatible with current and future Firefox versions
- **AMO compliance:** Meets Mozilla submission requirements
- **Chrome portability:** MV3 is cross-browser standard
- **Better performance:** Non-persistent background, lower memory footprint
- **Security:** Stricter permission model

#### Negative ❌
- **Learning curve:** Different patterns than MV2
- **Service worker limitations:** No persistent state, must use storage
- **Migration effort:** If porting from MV2, requires refactoring

#### Neutral ➖
- **Background script:** Must be modular, event-driven
- **API differences:** Some MV2 APIs not available in MV3

### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| **Manifest V2** | Deprecated, won't be accepted by AMO for new extensions |
| **Wait for MV3 stabilization** | Delays launch, MV3 already stable in Firefox 142+ |
| **Dual manifest (MV2 + MV3)** | Maintenance burden, unnecessary complexity |

### Migration Notes

**For future MV3 → MV4 transition:**
- Monitor Mozilla announcements
- Keep code modular for easy updates
- Test early with beta Firefox versions

---

## 📝 ADR Template

*Use this template for future ADRs:*

```markdown
## ADR-XXX: [Title]

**Status:** [Proposed | Accepted | Superseded]
**Date:** YYYY-MM-DD
**Jira:** [MD-XXX](url)

### Context

[Problem statement, constraints, requirements]

### Decision

[Chosen approach, implementation details, code locations]

### Consequences

#### Positive ✅
- [Benefits]

#### Negative ❌
- [Trade-offs]

#### Neutral ➖
- [Neutral impacts]

### Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| [Option A] | [Reason] |
| [Option B] | [Reason] |

### Compliance Notes

[GDPR, AMO review, security considerations]

### Testing Strategy

[How to verify decision is working correctly]

### References

[Links to code, documentation, external resources]
```

---

## 🔗 Related Documentation

| Document | Link |
|----------|------|
| **Project Home** | [01_PROJECT_HOME.md](01_PROJECT_HOME.md) |
| **Technical Architecture** | [GitHub Repository](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension) |
| **PRD** | [docs/PRD.md](https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/blob/master/docs/PRD.md) |
| **Jira Epic MD-12** | [Core Filtering Functionality](https://berlin-mitte-institut.atlassian.net/browse/MD-12) |
| **Jira Epic MD-14** | [Platform Support](https://berlin-mitte-institut.atlassian.net/browse/MD-14) |

---

*This ADR log is a living document. New ADRs should be created for significant architectural decisions. Last update: 2026-02-23*
