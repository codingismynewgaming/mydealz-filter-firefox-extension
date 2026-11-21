/**
 * Content Script for mydealz.de Filter - Optimized for mydealz.de structure
 * This script runs on mydealz.de pages and filters postings based on keywords
 */

const DEBUG = false; // Set to true for console logging

// Store the hidden count and details
let hiddenCount = 0;
let hiddenDeals = []; // Track hidden deals with details
const hiddenDealKeys = new Set(); // Prevent duplicate hidden deals within one page session

// Store the total count of hidden deals across sessions
let totalHiddenDealCount = 0;
let totalHiddenDealKeys = new Set();
let hiddenCountsByTerm = {};
let persistTotalsTimer = null;
const TOTALS_PERSIST_DEBOUNCE_MS = 1500;
const DEAL_DETAILS_PATH_PREFIX = "/deals/";
const SETTINGS_UPDATED_AT_KEY = "settingsUpdatedAt";
const SYNC_SETTINGS_STORAGE_KEYS = [
   "filterTerms",
   "exceptionTerms",
   "autoSortComments",
   "greyOutOpacityPercent",
   "filterTermCategories",
   "categoryStates",
   "keywordShortcut",
   SETTINGS_UPDATED_AT_KEY,
];
const LOCAL_SETTINGS_STORAGE_KEYS = [
  "filterTerms",
  "exceptionTerms",
  "autoSortComments",
  "greyOutSeenDeals",
  "greyOutOpacityPercent",
  "filterTermCategories",
  "categoryStates",
  "keywordShortcut",
  SETTINGS_UPDATED_AT_KEY,
];
const AUTO_SORT_COMMENTS_KEY = "autoSortComments";
const GREY_OUT_SEEN_DEALS_KEY = "greyOutSeenDeals";
const GREY_OUT_OPACITY_KEY = "greyOutOpacityPercent";
const SEEN_DEAL_URLS_KEY = "seenDealUrls";
const FILTER_CATEGORY_STORAGE_KEY = "filterTermCategories";
const CATEGORY_STATES_STORAGE_KEY = "categoryStates";
const SEEN_DEAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SEEN_DEAL_ENTRIES = 5000;
const MAX_TRACKED_HIDDEN_KEYS = 5000;
const DEFAULT_GREY_OUT_OPACITY_PERCENT = 30;
const GREYED_DEAL_CLASS = "mydealz-filter-greyed";
const HIDDEN_DEAL_CLASS = "mydealz-filter-hidden";
const FILTER_STYLE_ELEMENT_ID = "mydealz-filter-seen-deal-style";
const SEEN_DEALS_PERSIST_DEBOUNCE_MS = 1200;
const DEAL_DETAILS_INIT_DELAY_MS = 150;
const COMMENT_SORT_MAX_ATTEMPTS = 12;
const COMMENT_SORT_RETRY_DELAY_MS = 350;
const COMMENT_SECTION_SELECTOR = "#thread-comments";
const SEEN_DEAL_VISIBILITY_THRESHOLD = 0.35;
let seenDealUrls = {};
let persistSeenDealsTimer = null;
let seenDealsLoaded = false;
let seenDealObserver = null;
let currentDetailDealState = null;
let currentSeenSettings = { greyOutSeenDealsEnabled: false };
const seenDealElementStates = new Map();
const visibleSeenDealElements = new Set();
const DEFAULT_CATEGORY_NAME = "Uncategorized";
let helpfulCommentSortState = {
  threadId: null,
  inFlight: false,
  applied: false,
};

// Deal cards on mydealz listings are <article class="thread ..." id="thread_123">.
// Primary selectors prevent falling back onto inner sub-elements or wrapper containers.
const PRIMARY_DEAL_SELECTORS = ["article.thread", "[data-thread-id]"];
const PRIMARY_DEAL_SELECTOR_UNION = PRIMARY_DEAL_SELECTORS.join(", ");
// mydealz infinite scroll sentinel: <ins id="thread-inject" data-replace="..."> at the end of .js-threadList.
const LOAD_TRIGGER_SELECTOR = "#thread-inject, .js-threadList [data-replace]";
const LOAD_TRIGGER_PRELOAD_MARGIN_PX = 800;
const LOAD_TRIGGER_DELAY_MS = 140;
const LOAD_TRIGGER_COOLDOWN_MS = 700;
const MAX_CONSECUTIVE_AUTO_LOADS = 4;
const SCROLL_ANCHOR_MAX_AGE_MS = 20000;
const USER_SCROLL_GRACE_MS = 180;
const PAGE_SEPARATOR_CLASS = "mydealz-filter-page-separator";
const MIN_BATCH_SIZE_FOR_SEPARATOR = 5;
const ASYNC_FILTER_PASS_DELAY_MS = 250;
const SETTINGS_CACHE_KEYS = new Set([...SYNC_SETTINGS_STORAGE_KEYS, ...LOCAL_SETTINGS_STORAGE_KEYS]);
const INACTIVE_FILTER_CONTEXT = Object.freeze({ inactive: true });

let runtimeSettingsCache = null;
let runtimeSettingsPromise = null;
let runtimeSettingsGeneration = 0;
// Settings snapshot used to filter newly inserted deals synchronously before paint.
let activeFilterContext = null;
let loadTriggerObserver = null;
let observedLoadTrigger = null;
let loadTriggerTimer = null;
let lastLoadTriggerAt = 0;
let consecutiveAutoLoads = 0;
let pendingScrollAnchor = null;
let lastStableScrollAnchor = null;
let lastBatchMutationAt = 0;
let isReconcilingScroll = false;
let pendingScrollAnchorRafId = null;
let pendingSeparatorCandidates = [];
let pendingResizeRafId = null;
let lastUserScrollInputAt = 0;
let isFilteringRun = false;
let needsFollowUpFilterPass = false;

/**
 * Debug logging helper
 */
function log(...args) {
  if (DEBUG) console.log("[mydealz.de Filter]", ...args);
}

function getI18nMessage(key, substitutions, fallback) {
  try {
    if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
      const message = chrome.i18n.getMessage(key, substitutions);
      if (message) return message;
    }
  } catch {
    // Fall back to default message if chrome.i18n is unavailable.
  }
  return fallback;
}

function isDealDetailsPage() {
  const pathname = (window.location && window.location.pathname) || "";
  return pathname.toLowerCase().startsWith(DEAL_DETAILS_PATH_PREFIX);
}

function isSearchResultsPage() {
  const pathname = (window.location && window.location.pathname) || "";
  return pathname.toLowerCase().startsWith("/search");
}

function isGreyOutExcludedPage() {
  const pathname = ((window.location && window.location.pathname) || "").toLowerCase();
  return (
    pathname.startsWith("/search") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/profile")
  );
}

function normalizeForMatch(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTermRegex(normalizedTerm) {
  const escapedTerm = escapeRegExp(normalizedTerm).replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapedTerm}([^\\p{L}\\p{N}]|$)`, "u");
}

function parseTermEntries(rawTerms) {
  return (rawTerms || "")
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .map((raw) => {
      const normalized = normalizeForMatch(raw);
      return {
        raw,
        normalized,
        regex: normalized ? buildTermRegex(normalized) : null,
      };
    })
    .filter((term) => term.normalized.length > 0);
}

function containsWholeTerm(normalizedTitle, termOrString) {
  if (!normalizedTitle || !termOrString) return false;
  if (typeof termOrString === "string") {
    return buildTermRegex(termOrString).test(normalizedTitle);
  }
  return termOrString.regex ? termOrString.regex.test(normalizedTitle) : false;
}

function findMatchingFilterTerm(normalizedTitle, filterTerms) {
  for (const term of filterTerms) {
    if (containsWholeTerm(normalizedTitle, term)) {
      return term;
    }
  }
  return null;
}

/**
 * Normalize a deal URL into a stable key component.
 */
function normalizeDealUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase().split("?")[0].split("#")[0];
  }
}

function stripInvisibleChars(text) {
  return (text || "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
}

function normalizeDealTitle(title) {
  return stripInvisibleChars(title).toLowerCase().replace(/\s+/g, " ").trim();
}

function isValidDealKey(dealKey) {
  if (typeof dealKey !== "string" || !dealKey) return false;
  if (dealKey.startsWith("url:")) {
    return dealKey.length > 4;
  }
  if (dealKey.startsWith("title:")) {
    return isValidPrimaryTitleText(dealKey.slice(6));
  }
  return stripInvisibleChars(dealKey).trim().length >= 2;
}

function normalizeOpacityPercent(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return DEFAULT_GREY_OUT_OPACITY_PERCENT;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function buildDealUniqueKey(title, url) {
  const normalizedUrl = normalizeDealUrl(url);
  if (normalizedUrl) return `url:${normalizedUrl}`;
  return `title:${normalizeDealTitle(title)}`;
}

function dedupeParsedTerms(termEntries) {
  const seenTerms = new Set();
  return termEntries.filter((term) => {
    if (!term?.normalized || seenTerms.has(term.normalized)) return false;
    seenTerms.add(term.normalized);
    return true;
  });
}

function getActiveFilterTermsFromCategories(filterTerms, rawCategories, rawStates) {
  const dedupedTerms = dedupeParsedTerms(filterTerms);
  const termLookup = new Map(dedupedTerms.map((term) => [term.normalized, term]));
  const assignedTerms = new Set();
  const categories = {};

  Object.entries(rawCategories || {}).forEach(([categoryName, categoryTerms]) => {
    const normalizedCategoryName = (categoryName || "").trim();
    if (!normalizedCategoryName) return;
    const safeCategoryName =
      normalizeForMatch(normalizedCategoryName) === normalizeForMatch(DEFAULT_CATEGORY_NAME)
        ? DEFAULT_CATEGORY_NAME
        : normalizedCategoryName;
    const safeTerms = Array.isArray(categoryTerms) ? categoryTerms : [];
    const resolvedTerms = [];

    safeTerms.forEach((term) => {
      const normalizedTerm = normalizeForMatch(term);
      const resolvedTerm = termLookup.get(normalizedTerm);
      if (!resolvedTerm || assignedTerms.has(normalizedTerm)) return;
      assignedTerms.add(normalizedTerm);
      resolvedTerms.push(resolvedTerm);
    });

    categories[safeCategoryName] = resolvedTerms;
  });

  const uncategorizedTerms = dedupedTerms.filter((term) => !assignedTerms.has(term.normalized));
  categories[DEFAULT_CATEGORY_NAME] = [...(categories[DEFAULT_CATEGORY_NAME] || []), ...uncategorizedTerms];

  const activeTerms = [];
  Object.entries(categories).forEach(([categoryName, categoryTerms]) => {
    if (rawStates?.[categoryName] === false) return;
    activeTerms.push(...categoryTerms);
  });

  return dedupeParsedTerms(activeTerms);
}

function cleanupExpiredSeenDeals(rawSeenDealUrls) {
  const now = Date.now();
  const entries = Object.entries(rawSeenDealUrls || {}).filter(([key, timestamp]) => {
    return isValidDealKey(key) && Number.isInteger(timestamp) && now - timestamp < SEEN_DEAL_EXPIRY_MS;
  });
  entries.sort((a, b) => b[1] - a[1]);
  const trimmedEntries = entries.slice(0, MAX_SEEN_DEAL_ENTRIES);
  return Object.fromEntries(trimmedEntries);
}

function ensureFilterStyles() {
  if (document.getElementById(FILTER_STYLE_ELEMENT_ID)) return;

  const style = document.createElement("style");
  style.id = FILTER_STYLE_ELEMENT_ID;
  // Class-based hiding survives mydealz ZI.replace() calling removeAttr("style").
  // Disable scroll anchoring on footer/pagination/trigger so new batches above never drag the viewport down.
  style.textContent = `
    .${HIDDEN_DEAL_CLASS} {
      display: none !important;
    }
    .${GREYED_DEAL_CLASS} {
      opacity: var(--mydealz-filter-grey-opacity, 0.3) !important;
      filter: grayscale(100%) !important;
      transition: opacity 0.2s ease, filter 0.2s ease;
    }
    #thread-inject,
    #exploreMoreTopWidgetPortal,
    #exploreMoreRelatedWidget,
    .js-pagi-bottom,
    .pagi--static,
    #footer,
    .${PAGE_SEPARATOR_CLASS} {
      overflow-anchor: none !important;
    }
    .${PAGE_SEPARATOR_CLASS} {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 0;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      background: rgba(128, 128, 128, 0.08);
      border-left: 3px solid #4caf50;
      border-radius: 4px;
    }
  `;
  document.documentElement.appendChild(style);
}

function applyGreyOutOpacitySetting(opacityPercent) {
  const normalizedPercent = normalizeOpacityPercent(opacityPercent);
  const cssOpacity = (normalizedPercent / 100).toFixed(2);
  document.documentElement.style.setProperty("--mydealz-filter-grey-opacity", cssOpacity);
  return normalizedPercent;
}

function clearSeenDealPresentation() {
  document.querySelectorAll(`.${GREYED_DEAL_CLASS}`).forEach((element) => {
    element.classList.remove(GREYED_DEAL_CLASS);
    element.removeAttribute("data-greyed-since");
    if (element.getAttribute("data-grey-tooltip") === "true") {
      element.removeAttribute("title");
      element.removeAttribute("data-grey-tooltip");
    }
  });
}

function applySeenDealStateToElement(element, seenTimestamp, seenSettings) {
  if (!element) return;
  const { greyOutSeenDealsEnabled } = seenSettings;

  if (!Number.isInteger(seenTimestamp)) {
    element.classList.remove(GREYED_DEAL_CLASS);
    element.removeAttribute("data-greyed-since");
    if (element.getAttribute("data-grey-tooltip") === "true") {
      element.removeAttribute("title");
      element.removeAttribute("data-grey-tooltip");
    }
    return;
  }

  const seenDateLabel = new Date(seenTimestamp).toLocaleDateString();
  element.setAttribute("data-greyed-since", seenDateLabel);
  element.setAttribute(
    "title",
    getI18nMessage("dealSeenOn", [seenDateLabel], `Seen on ${seenDateLabel}`)
  );
  element.setAttribute("data-grey-tooltip", "true");

  if (greyOutSeenDealsEnabled) {
    element.classList.add(GREYED_DEAL_CLASS);
  } else {
    element.classList.remove(GREYED_DEAL_CLASS);
  }
}

function schedulePersistSeenDeals() {
  clearTimeout(persistSeenDealsTimer);
  persistSeenDealsTimer = setTimeout(() => {
    chrome.storage.local.set({ [SEEN_DEAL_URLS_KEY]: seenDealUrls }, () => {
      if (chrome.runtime.lastError) {
        log("Error saving seen deal state to local storage:", chrome.runtime.lastError);
      }
    });
  }, SEEN_DEALS_PERSIST_DEBOUNCE_MS);
}

async function loadSeenDealUrls(forceReload = false) {
  if (seenDealsLoaded && !forceReload) {
    return seenDealUrls;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([SEEN_DEAL_URLS_KEY], (localResult) => {
      const rawSeenDeals =
        localResult &&
        localResult[SEEN_DEAL_URLS_KEY] &&
        typeof localResult[SEEN_DEAL_URLS_KEY] === "object"
          ? localResult[SEEN_DEAL_URLS_KEY]
          : {};

      seenDealUrls = cleanupExpiredSeenDeals(rawSeenDeals);
      seenDealsLoaded = true;

      if (Object.keys(rawSeenDeals).length !== Object.keys(seenDealUrls).length) {
        schedulePersistSeenDeals();
      }

      resolve(seenDealUrls);
    });
  });
}

function trackSeenDeal(dealKey) {
  if (!isValidDealKey(dealKey)) return { wasSeenBefore: false, seenAt: null, changed: false };

  const existingTimestamp = seenDealUrls[dealKey];
  if (Number.isInteger(existingTimestamp)) {
    return { wasSeenBefore: true, seenAt: existingTimestamp, changed: false };
  }

  const timestamp = Date.now();
  seenDealUrls[dealKey] = timestamp;
  seenDealUrls = cleanupExpiredSeenDeals(seenDealUrls);
  return { wasSeenBefore: false, seenAt: timestamp, changed: true };
}

function persistSeenDealsImmediately() {
  chrome.storage.local.set({ [SEEN_DEAL_URLS_KEY]: seenDealUrls }, () => {
    if (chrome.runtime.lastError) {
      log("Error saving seen deal state to local storage:", chrome.runtime.lastError);
    }
  });
}

function cleanupSeenDealObserverState() {
  if (seenDealObserver) {
    seenDealObserver.disconnect();
    seenDealObserver = null;
  }
  seenDealElementStates.clear();
  visibleSeenDealElements.clear();
}

function ensureSeenDealObserver() {
  if (seenDealObserver || isDealDetailsPage() || isGreyOutExcludedPage()) return;

  seenDealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const state = seenDealElementStates.get(entry.target);
        if (!state || state.markedSeen) return;

        const isFullyVisible = entry.intersectionRatio >= SEEN_DEAL_VISIBILITY_THRESHOLD;
        const isCompletelyOut = !entry.isIntersecting || entry.intersectionRatio === 0;

        if (isFullyVisible) {
          state.hasEnteredViewport = true;
          visibleSeenDealElements.add(entry.target);
          return;
        }

        if (isCompletelyOut) {
          const wasVisible = visibleSeenDealElements.has(entry.target);
          visibleSeenDealElements.delete(entry.target);

          if (state.hasEnteredViewport && wasVisible) {
            // Check if user scrolled down (deal left via the top of the viewport)
            if (entry.boundingClientRect.top < 0) {
              const { seenAt, changed } = trackSeenDeal(state.dealKey);
              state.markedSeen = true;
              applySeenDealStateToElement(state.element, seenAt, currentSeenSettings);
              if (changed) {
                schedulePersistSeenDeals();
              }
            } else {
              // Left via bottom, reset so it can be seen again later
              state.hasEnteredViewport = false;
            }
          }
        }
      });
    },
    {
      threshold: [0, SEEN_DEAL_VISIBILITY_THRESHOLD],
    }
  );
}

function registerSeenDealCandidate(element, dealKey) {
  if (!element || !dealKey || isDealDetailsPage() || isGreyOutExcludedPage()) return;

  ensureSeenDealObserver();
  const existingState = seenDealElementStates.get(element);
  if (existingState?.dealKey === dealKey) return;

  if (existingState && seenDealObserver) {
    visibleSeenDealElements.delete(element);
    seenDealObserver.unobserve(element);
  }

  seenDealElementStates.set(element, {
    element,
    dealKey,
    hasEnteredViewport: false,
    markedSeen: false,
  });

  if (seenDealObserver) {
    seenDealObserver.observe(element);
  }
}

function flushSeenDealCandidatesOnExit() {
  let changed = false;

  visibleSeenDealElements.forEach((element) => {
    const state = seenDealElementStates.get(element);
    if (!state || state.markedSeen || !state.hasEnteredViewport) return;
    const result = trackSeenDeal(state.dealKey);
    state.markedSeen = true;
    changed = changed || result.changed;
  });

  if (currentDetailDealState?.enabled && currentDetailDealState.dealKey) {
    const result = trackSeenDeal(currentDetailDealState.dealKey);
    changed = changed || result.changed;
  }

  if (changed) {
    persistSeenDealsImmediately();
  }
}

function getCurrentThreadId() {
  const detailElement = document.querySelector("[id^='thread_details_'], [id^='thread_']");
  const detailId = detailElement?.id || "";
  const detailMatch = detailId.match(/thread(?:_details)?_(\d+)/);
  if (detailMatch?.[1]) return detailMatch[1];

  const pathname = (window.location && window.location.pathname) || "";
  const pathMatch = pathname.match(/-(\d+)(?:$|[/?#])/);
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
}

function isHelpfulSortLabel(text) {
  return /hilfreich/i.test((text || "").trim());
}

function isSortOptionSelected(element) {
  if (!element) return false;
  if (element.selected === true) return true;
  if (
    element.getAttribute("aria-selected") === "true" ||
    element.getAttribute("aria-checked") === "true" ||
    element.getAttribute("aria-pressed") === "true"
  ) {
    return true;
  }
  return (
    element.classList.contains("is-selected") ||
    element.classList.contains("selected") ||
    element.classList.contains("active") ||
    element.classList.contains("is-active")
  );
}

function getCommentSortRoot() {
  const commentSection = document.querySelector(COMMENT_SECTION_SELECTOR);
  if (commentSection) {
    const scoped = commentSection.querySelector("[data-t='sort']");
    if (scoped) return scoped;
  }
  return document.querySelector("[data-t='sort']");
}

function isHelpfulSortAlreadyActive() {
  const sortRoot = getCommentSortRoot();
  if (!sortRoot) return false;
  const trigger = sortRoot.querySelector("button, [role='button']") || sortRoot;
  return isHelpfulSortLabel(trigger.textContent || "");
}

async function tryApplyHelpfulCommentSortViaDom() {
  if (isHelpfulSortAlreadyActive()) {
    return true;
  }

  const commentSection = document.querySelector(COMMENT_SECTION_SELECTOR);
  if (!commentSection) return false;

  const selects = Array.from(commentSection.querySelectorAll("select"));
  for (const select of selects) {
    const helpfulOption = Array.from(select.options || []).find((option) =>
      isHelpfulSortLabel(option.textContent || option.label || option.value || "")
    );
    if (!helpfulOption) continue;

    if (!isSortOptionSelected(helpfulOption) && select.value !== helpfulOption.value) {
      select.value = helpfulOption.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.blur();
    }
    return true;
  }

  const sortRoot = getCommentSortRoot();
  if (!sortRoot) return false;

  const trigger = sortRoot.querySelector("button, [role='button']") || sortRoot;
  if (isHelpfulSortLabel(trigger.textContent || "")) {
    return true;
  }

  trigger.click();
  await new Promise((resolve) => setTimeout(resolve, 140));

  const optionContainers = [
    sortRoot,
    ...Array.from(document.querySelectorAll("[role='listbox'], [role='menu'], .popover--visible")),
  ];
  const candidateSelectors = "[role='option'], [role='menuitem'], [role='menuitemradio'], button, a, label";

  for (const container of optionContainers) {
    const options = Array.from(container.querySelectorAll(candidateSelectors));
    const match = options.find((el) => {
      if (el === trigger) return false;
      const isVisible = el.offsetParent !== null || el.getClientRects().length > 0;
      return isVisible && isHelpfulSortLabel(el.textContent || "");
    });
    if (match) {
      if (!isSortOptionSelected(match)) {
        match.click();
      }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
      return true;
    }
  }

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
  return false;
}

async function applyCommentSorting(attempt = 0) {
  if (!isDealDetailsPage()) return;

  const { [AUTO_SORT_COMMENTS_KEY]: autoSortComments } = await getCachedRuntimeSettings();
  if (!autoSortComments) return;

  if (isHelpfulSortAlreadyActive()) {
    return;
  }

  const threadId = getCurrentThreadId();
  if (!threadId) {
    if (attempt < COMMENT_SORT_MAX_ATTEMPTS) {
      setTimeout(() => {
        applyCommentSorting(attempt + 1);
      }, COMMENT_SORT_RETRY_DELAY_MS);
    }
    return;
  }

  if (helpfulCommentSortState.threadId !== threadId) {
    helpfulCommentSortState = {
      threadId,
      inFlight: false,
      applied: false,
    };
  }

  if (helpfulCommentSortState.applied || helpfulCommentSortState.inFlight) return;

  helpfulCommentSortState.inFlight = true;
  let applied = false;

  try {
    applied = await tryApplyHelpfulCommentSortViaDom();
  } catch (domError) {
    log("Helpful comment sort via DOM failed:", domError);
  }

  helpfulCommentSortState.inFlight = false;
  helpfulCommentSortState.applied = applied;

  if (!applied && attempt < COMMENT_SORT_MAX_ATTEMPTS) {
    setTimeout(() => {
      applyCommentSorting(attempt + 1);
    }, COMMENT_SORT_RETRY_DELAY_MS);
  }
}

async function registerCurrentDealForSeenTracking(visualSeenFeaturesEnabled) {
  if (!isDealDetailsPage()) return;

  currentDetailDealState = {
    enabled: visualSeenFeaturesEnabled && !isGreyOutExcludedPage(),
    dealKey: buildDealUniqueKey(document.title || "", window.location.href),
  };
}

function trimTrackedHiddenKeys() {
  if (totalHiddenDealKeys.size <= MAX_TRACKED_HIDDEN_KEYS) return;
  const keys = Array.from(totalHiddenDealKeys);
  totalHiddenDealKeys = new Set(keys.slice(keys.length - MAX_TRACKED_HIDDEN_KEYS));
}

function schedulePersistTotals() {
  clearTimeout(persistTotalsTimer);
  persistTotalsTimer = setTimeout(() => {
    trimTrackedHiddenKeys();
    const payload = {
      totalHiddenDealCount,
      totalHiddenDealKeys: Array.from(totalHiddenDealKeys),
      hiddenCountsByTerm,
    };

    chrome.storage.local.set(payload, () => {
      if (chrome.runtime.lastError) {
        log("Error saving total hidden deal state to local storage:", chrome.runtime.lastError);
      }
    });

  }, TOTALS_PERSIST_DEBOUNCE_MS);
}

/**
 * Load unique hidden deal state from local storage.
 */
async function loadTotalHiddenDealState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["totalHiddenDealCount", "totalHiddenDealKeys", "hiddenCountsByTerm"],
      (result) => {
        const savedKeys = Array.isArray(result.totalHiddenDealKeys)
          ? result.totalHiddenDealKeys
          : [];
        totalHiddenDealKeys = new Set(savedKeys);
        trimTrackedHiddenKeys();
        hiddenCountsByTerm =
          result.hiddenCountsByTerm && typeof result.hiddenCountsByTerm === "object"
            ? result.hiddenCountsByTerm
            : {};

        const savedCount = Number.isInteger(result.totalHiddenDealCount)
          ? result.totalHiddenDealCount
          : totalHiddenDealKeys.size;
        totalHiddenDealCount = Math.max(savedCount, totalHiddenDealKeys.size);

        log("Loaded total hidden deal state from storage:", {
          totalHiddenDealCount,
          uniqueKeys: totalHiddenDealKeys.size,
          trackedFilterTerms: Object.keys(hiddenCountsByTerm).length,
        });
        resolve(totalHiddenDealCount);
      }
    );
  });
}

function incrementHiddenCountForTerm(rawTerm) {
  const normalizedTerm = normalizeForMatch(rawTerm);
  if (!normalizedTerm) return;

  const currentEntry = hiddenCountsByTerm[normalizedTerm] || {
    term: rawTerm,
    count: 0,
  };

  currentEntry.term = currentEntry.term || rawTerm;
  currentEntry.count += 1;
  hiddenCountsByTerm[normalizedTerm] = currentEntry;
}


function buildRuntimeSettingsFromStorage(primaryResult, greyOutSeenEnabled) {
  const parsedFilterTerms = parseTermEntries(primaryResult?.filterTerms || "");
  const resolvedCategories =
    primaryResult?.[FILTER_CATEGORY_STORAGE_KEY] &&
    typeof primaryResult[FILTER_CATEGORY_STORAGE_KEY] === "object"
      ? primaryResult[FILTER_CATEGORY_STORAGE_KEY]
      : {};
  const resolvedCategoryStates =
    primaryResult?.[CATEGORY_STATES_STORAGE_KEY] &&
    typeof primaryResult[CATEGORY_STATES_STORAGE_KEY] === "object"
      ? primaryResult[CATEGORY_STATES_STORAGE_KEY]
      : {};

  return {
    filterTerms: getActiveFilterTermsFromCategories(
      parsedFilterTerms,
      resolvedCategories,
      resolvedCategoryStates
    ),
    exceptionTerms: parseTermEntries(primaryResult?.exceptionTerms || ""),
    autoSortComments: primaryResult?.[AUTO_SORT_COMMENTS_KEY] === true,
    greyOutSeenDeals: greyOutSeenEnabled === true,
    greyOutOpacityPercent: normalizeOpacityPercent(primaryResult?.[GREY_OUT_OPACITY_KEY]),
    keywordShortcut: primaryResult?.keywordShortcut || "",
    filterTermCategories: resolvedCategories,
    categoryStates: resolvedCategoryStates,
  };
}

function readStorageAreaSafe(area, keys) {
  return new Promise((resolve) => {
    if (!area || typeof area.get !== "function") {
      resolve({ result: {}, error: true });
      return;
    }
    area.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        resolve({ result: {}, error: true });
        return;
      }
      resolve({ result: result || {}, error: false });
    });
  });
}

/**
 * Get filter terms and exception terms from storage.
 * Compares settingsUpdatedAt so newer local saves (e.g. sync quota exceeded) override stale sync.
 */
async function getRuntimeSettings() {
  try {
    const [syncRead, localRead] = await Promise.all([
      readStorageAreaSafe(chrome.storage?.sync, SYNC_SETTINGS_STORAGE_KEYS),
      readStorageAreaSafe(chrome.storage?.local, LOCAL_SETTINGS_STORAGE_KEYS),
    ]);

    const syncResult = syncRead.result;
    const localResult = localRead.result;
    const syncTs = Number(syncResult[SETTINGS_UPDATED_AT_KEY]) || 0;
    const localTs = Number(localResult[SETTINGS_UPDATED_AT_KEY]) || 0;
    const syncHasFilters = Boolean(syncResult.filterTerms || syncResult.exceptionTerms);

    const useLocal =
      syncRead.error ||
      localTs > syncTs ||
      (!syncHasFilters && Boolean(localResult.filterTerms || localResult.exceptionTerms));

    const primaryResult = useLocal ? localResult : syncResult;
    const greyOutSeenEnabled =
      typeof localResult[GREY_OUT_SEEN_DEALS_KEY] === "boolean"
        ? localResult[GREY_OUT_SEEN_DEALS_KEY]
        : syncResult[GREY_OUT_SEEN_DEALS_KEY] === true;

    return buildRuntimeSettingsFromStorage(primaryResult, greyOutSeenEnabled);
  } catch (error) {
    log("Exception getting runtime settings:", error);
    return buildRuntimeSettingsFromStorage({}, false);
  }
}

/**
 * Cached settings access. The cache is invalidated on storage changes and filter messages.
 */
function getCachedRuntimeSettings() {
  if (runtimeSettingsCache) return Promise.resolve(runtimeSettingsCache);
  if (runtimeSettingsPromise) return runtimeSettingsPromise;

  const generation = runtimeSettingsGeneration;
  runtimeSettingsPromise = getRuntimeSettings().then((settings) => {
    if (generation === runtimeSettingsGeneration) {
      runtimeSettingsCache = settings;
      runtimeSettingsPromise = null;
    }
    return settings;
  });
  return runtimeSettingsPromise;
}

function invalidateRuntimeSettingsCache() {
  runtimeSettingsGeneration++;
  runtimeSettingsCache = null;
  runtimeSettingsPromise = null;
}

/**
 * Check if a title matches any filter term while excluding titles that contain exception terms.
 * Returns { matched, matchingTerm } in a single pass.
 */
function getFilterMatch(title, filterTerms, exceptionTerms) {
  if (!title || filterTerms.length === 0) {
    return { matched: false, matchingTerm: "" };
  }

  const normalizedTitle = normalizeForMatch(title);

  if (exceptionTerms && exceptionTerms.length > 0) {
    for (const exceptionTerm of exceptionTerms) {
      if (containsWholeTerm(normalizedTitle, exceptionTerm)) {
        return { matched: false, matchingTerm: "" };
      }
    }
  }

  const matchingTermEntry = findMatchingFilterTerm(normalizedTitle, filterTerms);
  if (!matchingTermEntry) {
    return { matched: false, matchingTerm: "" };
  }

  return { matched: true, matchingTerm: matchingTermEntry.raw || "" };
}

function matchesFilter(title, filterTerms, exceptionTerms) {
  return getFilterMatch(title, filterTerms, exceptionTerms).matched;
}

/**
 * Extract text from an element safely
 */
function safeGetText(element) {
  if (!element) return "";
  try {
    return stripInvisibleChars(element.textContent).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function isValidPrimaryTitleText(text) {
  const normalized = stripInvisibleChars(text).replace(/\s+/g, " ").trim();
  if (normalized.length < 2) return false;
  if (!/[\p{L}\p{N}]/u.test(normalized)) return false;
  if (/^-?\d+[°%]$/.test(normalized)) return false;
  if (/^-?\d+(?:[.,]\d+)?\s*€?$/i.test(normalized)) return false;
  return true;
}

function extractVue3ThreadData(container) {
  if (!container || typeof container.querySelectorAll !== "function") return null;
  const vueNodes = container.querySelectorAll("[data-vue3]");
  for (const node of vueNodes) {
    const raw = node.getAttribute("data-vue3");
    if (!raw || !raw.includes("ThreadMainListItemNormalizer")) continue;
    try {
      const parsed = JSON.parse(raw);
      const thread = parsed?.props?.thread;
      if (thread && typeof thread === "object" && typeof thread.title === "string") {
        return thread;
      }
    } catch {
      // Ignore malformed JSON payloads and fall back to DOM selectors.
    }
  }
  return null;
}

function extractDealUrl(container) {
  if (!container || typeof container.querySelector !== "function") return "";
  const link = container.querySelector(
    'a[href*="/deals/"], a[href*="/gutscheine/"], a[href*="/diskussion/"]'
  );
  if (link?.href) return link.href;

  const thread = extractVue3ThreadData(container);
  if (thread?.threadId && thread?.titleSlug) {
    if (thread.type === "Deal") {
      return `https://www.mydealz.de/deals/${thread.titleSlug}-${thread.threadId}`;
    }
    if (thread.type === "Discussion") {
      return `https://www.mydealz.de/diskussion/${thread.titleSlug}-${thread.threadId}`;
    }
  }

  return "";
}

/**
 * Find deal title in a container using various selectors and methods
 */
function findTitleInElement(container) {
  if (!container) return "";

  const titleSelectors = [
    "[data-testid='thread-title']",
    ".thread-title",
    ".cept-tt",
    ".title",
    "h2 a",
    "h3 a",
    "a[href*='/deals/'][data-clickable='true']",
    "a[href*='/gutscheine/'][data-clickable='true']",
    "a[href*='/deals/'].thread-title-link",
    "a[href*='/gutscheine/'].thread-title-link",
  ];

  for (const selector of titleSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      const text = safeGetText(element);
      if (isValidPrimaryTitleText(text)) return text;
    }
  }

  // Unhydrated Vue3 cards on mydealz render skeleton placeholders inside .thread-title
  // while carrying the authoritative title in ThreadMainListItemNormalizer's data-vue3 payload.
  const vueThread = extractVue3ThreadData(container);
  if (vueThread?.title) {
    const vueTitle = stripInvisibleChars(vueThread.title).replace(/\s+/g, " ").trim();
    if (isValidPrimaryTitleText(vueTitle)) return vueTitle;
  }

  // Never fall back onto card descriptions while a card's title is still an unhydrated skeleton.
  if (container.querySelector(".thread-title .skeleton")) {
    return "";
  }

  const dealLink = container.querySelector("a[href*='/deals/'], a[href*='/gutscheine/']");
  if (dealLink) {
    const text = safeGetText(dealLink);
    if (isValidPrimaryTitleText(text)) return text;
  }

  for (const tag of ["h1", "h2", "h3", "h4"]) {
    const element = container.querySelector(tag);
    const text = safeGetText(element);
    if (text.length > 5) return text;
  }

  const classSelectors = [
    "[class*='title']",
    "[class*='heading']",
    "[class*='name']",
    "[class*='deal-title']",
    "[class*='thread-title']",
    "[class*='cept-tt']",
    "[class*='userHtml']",
  ];

  for (const selector of classSelectors) {
    const element = container.querySelector(selector);
    const text = safeGetText(element);
    if (text.length > 5 && !text.match(/^\d+°/) && !text.match(/^\d+%/)) {
      return text;
    }
  }

  for (const child of container.children) {
    if (child.textContent && child.textContent.length > 5) {
      const text = safeGetText(child);
      if (
        !text.match(/^\d+°/) &&
        !text.match(/^\d+%/) &&
        !text.match(/€/) &&
        !text.match(/Gepostet/) &&
        !text.match(/von/) &&
        !text.match(/^(\d+k|\d+|k\+)/)
      ) {
        return text.substring(0, 200);
      }
    }
  }

  return "";
}

function isExcludedDealCandidate(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return true;
  const tagName = (element.tagName || "").toUpperCase();
  if (
    tagName === "HTML" ||
    tagName === "BODY" ||
    tagName === "MAIN" ||
    tagName === "HEADER" ||
    tagName === "NAV" ||
    tagName === "FOOTER"
  ) {
    return true;
  }
  if (
    element.id === "main" ||
    element.id === "thread-inject" ||
    element.id === "mydealz-filter-all-hidden-notice" ||
    element.classList.contains("js-threadList") ||
    element.classList.contains("listLayout-main") ||
    element.classList.contains(PAGE_SEPARATOR_CLASS) ||
    element.getAttribute("data-mydealz-filter-ui") === "true"
  ) {
    return true;
  }
  return false;
}

function extractPrimaryDealElements(nodes) {
  const unique = new Set();
  for (const node of nodes) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE || isExcludedDealCandidate(node)) continue;
    if (node.matches(PRIMARY_DEAL_SELECTOR_UNION)) {
      if (!node.hasAttribute("data-mydealz-processed")) {
        unique.add(node);
      }
      continue;
    }
    const ancestorDeal = node.closest?.(PRIMARY_DEAL_SELECTOR_UNION);
    if (
      ancestorDeal &&
      !isExcludedDealCandidate(ancestorDeal) &&
      !ancestorDeal.hasAttribute("data-mydealz-processed")
    ) {
      unique.add(ancestorDeal);
      continue;
    }
    const nested = node.querySelectorAll(PRIMARY_DEAL_SELECTOR_UNION);
    for (const candidate of nested) {
      if (!isExcludedDealCandidate(candidate) && !candidate.hasAttribute("data-mydealz-processed")) {
        unique.add(candidate);
      }
    }
  }
  return Array.from(unique);
}

/**
 * Find unprocessed deal postings on the page (or from a specific element list).
 * Once primary deal cards exist on the page, never fall back onto inner sub-elements or wrapper containers.
 */
function findDealPostings(candidateElements = null) {
  const postings = [];

  if (Array.isArray(candidateElements)) {
    for (const element of candidateElements) {
      if (!element || isExcludedDealCandidate(element)) continue;
      if (element.hasAttribute("data-mydealz-processed")) continue;

      const title = findTitleInElement(element);
      if (isValidPrimaryTitleText(title)) {
        postings.push({ element, title });
        element.setAttribute("data-mydealz-processed", "true");
      }
    }
    return postings;
  }

  const hasPrimaryDeals = Boolean(document.querySelector(PRIMARY_DEAL_SELECTOR_UNION));
  const selectors = hasPrimaryDeals
    ? PRIMARY_DEAL_SELECTORS
    : [
        "div.thread-item",
        "article[class*='thread']",
        "div.threadCard",
        "div.posting",
        "[data-testid='thread']",
        "a[href*='/deals/'], a[href*='/gutscheine/']",
      ];

  for (const selector of selectors) {
    let elements = [];
    try {
      elements = Array.from(document.querySelectorAll(selector));
    } catch (e) {
      log("Invalid selector:", selector, e);
      continue;
    }

    if (elements.length === 0) continue;

    for (let element of elements) {
      if (
        element.tagName === "A" &&
        (element.href.includes("/deals/") || element.href.includes("/gutscheine/"))
      ) {
        element = element.closest("article, div") || element;
      }

      if (isExcludedDealCandidate(element)) continue;
      if (element.hasAttribute("data-mydealz-processed")) continue;
      if (element.closest('[data-mydealz-processed="true"]')) continue;

      const title = findTitleInElement(element);
      if (isValidPrimaryTitleText(title)) {
        postings.push({ element, title });
        element.setAttribute("data-mydealz-processed", "true");
      }
    }

    if (postings.length > 0 || hasPrimaryDeals) {
      log(`Found ${postings.length} postings using selector: ${selector}`);
      break;
    }
  }

  log(`Total postings found: ${postings.length}`);
  return postings;
}

function isDealElementHidden(element) {
  return element.classList.contains(HIDDEN_DEAL_CLASS) || element.style.display === "none";
}

function hideDealElement(element, matchingTerm) {
  element.classList.add(HIDDEN_DEAL_CLASS);
  element.style.display = "";
  element.setAttribute("data-mydealz-filtered", "true");
  element.setAttribute("data-filter-term", matchingTerm);
}

function showDealElement(element) {
  element.classList.remove(HIDDEN_DEAL_CLASS);
  element.style.display = "";
  element.removeAttribute("data-mydealz-filtered");
  element.removeAttribute("data-filter-term");
  element.removeAttribute("data-mydealz-counted");
}

function clearProcessedMarkers() {
  document.querySelectorAll('[data-mydealz-processed="true"]').forEach((el) => {
    el.removeAttribute("data-mydealz-processed");
  });
}

function clearPageSeparators() {
  document.querySelectorAll(`.${PAGE_SEPARATOR_CLASS}`).forEach((el) => el.remove());
  pendingSeparatorCandidates = [];
}

function clearFilteredElements() {
  document
    .querySelectorAll(`[data-mydealz-filtered="true"], .${HIDDEN_DEAL_CLASS}`)
    .forEach((el) => {
      showDealElement(el);
    });
  clearPageSeparators();
}

function invalidateMydealzLayoutCache() {
  if (pendingResizeRafId !== null) return;
  pendingResizeRafId = requestAnimationFrame(() => {
    pendingResizeRafId = null;
    window.dispatchEvent(new Event("resize"));
  });
}

function buildFilterContextFromSettings(settings) {
  const keywordFilteringEnabled = !isSearchResultsPage();
  const greyOutEnabledOnPage = settings.greyOutSeenDeals && !isGreyOutExcludedPage();
  const hasFilterTerms = keywordFilteringEnabled && settings.filterTerms.length > 0;

  if (!greyOutEnabledOnPage && !hasFilterTerms) {
    return INACTIVE_FILTER_CONTEXT;
  }

  return {
    inactive: false,
    filterTerms: settings.filterTerms,
    exceptionTerms: settings.exceptionTerms,
    hasFilterTerms,
    visualSeenFeaturesEnabled: greyOutEnabledOnPage,
    seenSettings: {
      greyOutSeenDealsEnabled: greyOutEnabledOnPage,
    },
  };
}

function applyFilterToPostings(postings, context) {
  if (!postings.length || !context || context.inactive) {
    return {
      newlyDiscoveredUniqueDeals: 0,
      visibilityChanged: false,
      firstVisibleElement: null,
      visibleCount: 0,
      hiddenInBatchCount: 0,
    };
  }

  ensureFilterStyles();

  const elementsToHide = [];
  const elementsToShow = [];
  let newlyDiscoveredUniqueDeals = 0;
  let firstVisibleElement = null;
  let visibleCount = 0;
  let hiddenInBatchCount = 0;

  postings.forEach(({ element, title }) => {
    const dealUrl = extractDealUrl(element);
    const dealKey = buildDealUniqueKey(title, dealUrl);

    if (context.visualSeenFeaturesEnabled && isValidDealKey(dealKey)) {
      const seenAt = seenDealUrls[dealKey];
      applySeenDealStateToElement(
        element,
        Number.isInteger(seenAt) ? seenAt : null,
        context.seenSettings
      );
      if (!Number.isInteger(seenAt)) {
        registerSeenDealCandidate(element, dealKey);
      }
    } else {
      applySeenDealStateToElement(element, null, { greyOutSeenDealsEnabled: false });
    }

    const match = context.hasFilterTerms
      ? getFilterMatch(title, context.filterTerms, context.exceptionTerms)
      : { matched: false, matchingTerm: "" };

    if (match.matched) {
      hiddenInBatchCount++;
      if (!hiddenDealKeys.has(dealKey)) {
        hiddenDealKeys.add(dealKey);
        hiddenDeals.push({ title, url: dealUrl, matchingTerm: match.matchingTerm });
      }

      if (!totalHiddenDealKeys.has(dealKey)) {
        totalHiddenDealKeys.add(dealKey);
        newlyDiscoveredUniqueDeals++;
        incrementHiddenCountForTerm(match.matchingTerm);
      }

      if (!isDealElementHidden(element)) {
        elementsToHide.push({ element, matchingTerm: match.matchingTerm });
      }
    } else {
      visibleCount++;
      if (!firstVisibleElement) {
        firstVisibleElement = element;
      }
      if (isDealElementHidden(element) && element.getAttribute("data-mydealz-filtered") === "true") {
        elementsToShow.push(element);
      }
    }
  });

  elementsToHide.forEach(({ element, matchingTerm }) => {
    hideDealElement(element, matchingTerm);
  });

  elementsToShow.forEach((element) => {
    showDealElement(element);
  });

  return {
    newlyDiscoveredUniqueDeals,
    visibilityChanged: elementsToHide.length > 0 || elementsToShow.length > 0,
    firstVisibleElement,
    visibleCount,
    hiddenInBatchCount,
  };
}

function captureScrollAnchor(excludedSet = null) {
  const candidates = Array.from(document.querySelectorAll(PRIMARY_DEAL_SELECTOR_UNION));
  let inViewCandidate = null;
  let lastAboveCandidate = null;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;

  for (const el of candidates) {
    if (excludedSet && excludedSet.has(el)) continue;
    if (isDealElementHidden(el)) continue;
    if (el.style.position === "absolute" || el.style.opacity === "0") continue;

    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;

    if (rect.bottom > 0 && rect.top < viewportHeight) {
      inViewCandidate = { element: el, rectTop: rect.top };
    } else if (rect.bottom <= 0) {
      lastAboveCandidate = { element: el, rectTop: rect.top };
    }
  }

  const chosen = inViewCandidate || lastAboveCandidate;
  if (!chosen) return null;

  return {
    element: chosen.element,
    rectTop: chosen.rectTop,
    docTop: window.scrollY + chosen.rectTop,
    timestamp: Date.now(),
  };
}

function reconcilePendingScrollAnchor() {
  if (!pendingScrollAnchor) return;

  if (Date.now() - pendingScrollAnchor.timestamp > SCROLL_ANCHOR_MAX_AGE_MS) {
    pendingScrollAnchor = null;
    return;
  }

  const { element } = pendingScrollAnchor;
  if (!element || !element.isConnected || isDealElementHidden(element)) {
    pendingScrollAnchor = null;
    return;
  }

  const currentRectTop = element.getBoundingClientRect().top;
  const currentDocTop = window.scrollY + currentRectTop;
  const deltaDocTop = currentDocTop - pendingScrollAnchor.docTop;

  // Compensate layout shifts caused above the anchored deal.
  if (Math.abs(deltaDocTop) > 4) {
    isReconcilingScroll = true;
    window.scrollBy(0, deltaDocTop);
    isReconcilingScroll = false;
    pendingScrollAnchor.docTop = window.scrollY + element.getBoundingClientRect().top;
    return;
  }

  // If native scroll-anchoring jumped the viewport right when a batch settled without user input, restore anchor.
  if (Date.now() - lastUserScrollInputAt > USER_SCROLL_GRACE_MS) {
    const viewportDrift = currentRectTop - pendingScrollAnchor.rectTop;
    if (Math.abs(viewportDrift) > 80) {
      isReconcilingScroll = true;
      window.scrollBy(0, viewportDrift);
      isReconcilingScroll = false;
      pendingScrollAnchor.docTop = window.scrollY + element.getBoundingClientRect().top;
    }
  }
}

function extractBatchPageLabel(addedNodes) {
  for (const node of addedNodes) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
    const historyNode = node.matches?.("[data-history]")
      ? node
      : node.querySelector?.("[data-history]");
    const rawHistory = historyNode?.getAttribute("data-history") || "";
    const historyMatch = rawHistory.match(/[?&]page=(\d+)/);
    if (historyMatch?.[1]) {
      return getI18nMessage("pageNumberLabel", [historyMatch[1]], `Page ${historyMatch[1]}`);
    }

    const replaceNode = node.matches?.("[data-replace]")
      ? node
      : node.querySelector?.("[data-replace]");
    const rawReplace = replaceNode?.getAttribute("data-replace") || "";
    const replaceMatch = rawReplace.match(/[?&]page=(\d+)/);
    if (replaceMatch?.[1]) {
      const loadedPage = Number.parseInt(replaceMatch[1], 10) - 1;
      if (loadedPage >= 2) {
        return getI18nMessage("pageNumberLabel", [String(loadedPage)], `Page ${loadedPage}`);
      }
    }
  }
  return getI18nMessage("moreDealsLabel", [], "More deals");
}

function hasVisibleDealBefore(element) {
  let prev = element.previousElementSibling;
  while (prev) {
    if (
      !isExcludedDealCandidate(prev) &&
      prev.matches(PRIMARY_DEAL_SELECTOR_UNION) &&
      !isDealElementHidden(prev)
    ) {
      return true;
    }
    prev = prev.previousElementSibling;
  }
  return false;
}

function flushPendingSeparators() {
  if (pendingSeparatorCandidates.length === 0) return;

  const remaining = [];
  for (const item of pendingSeparatorCandidates) {
    const { firstVisibleElement, pageLabel, visibleCount, hiddenInBatchCount } = item;
    if (!firstVisibleElement || !firstVisibleElement.isConnected || isDealElementHidden(firstVisibleElement)) {
      continue;
    }

    const style = window.getComputedStyle(firstVisibleElement);
    if (style.position === "absolute" || style.opacity === "0") {
      remaining.push(item);
      continue;
    }

    if (!hasVisibleDealBefore(firstVisibleElement)) {
      continue;
    }

    const prev = firstVisibleElement.previousElementSibling;
    if (prev && prev.classList.contains(PAGE_SEPARATOR_CLASS)) {
      continue;
    }

    const separator = document.createElement("div");
    separator.className = PAGE_SEPARATOR_CLASS;
    separator.setAttribute("data-mydealz-filter-ui", "true");

    const titleSpan = document.createElement("span");
    titleSpan.textContent = getI18nMessage("pageLoaded", [pageLabel], `${pageLabel} loaded`);
    const metaSpan = document.createElement("span");
    metaSpan.textContent =
      hiddenInBatchCount > 0
        ? getI18nMessage(
            "batchSummaryWithHidden",
            [String(visibleCount), String(hiddenInBatchCount)],
            `${visibleCount} visible · ${hiddenInBatchCount} hidden`
          )
        : getI18nMessage("batchSummaryVisibleOnly", [String(visibleCount)], `${visibleCount} visible`);

    separator.appendChild(titleSpan);
    separator.appendChild(metaSpan);
    firstVisibleElement.parentElement?.insertBefore(separator, firstVisibleElement);
  }
  pendingSeparatorCandidates = remaining;
}

function isLoadTriggerBusy(el) {
  if (!el || !el.isConnected) return true;
  if (el.getAttribute("data-mydealz-triggered") === "true") return true;
  if (el.classList.contains("seal") || el.querySelector(".spinner")) return true;
  if (el.style.position === "absolute" || el.style.opacity === "0") return true;
  return false;
}

function isAnyLoadInFlight() {
  return Boolean(
    document.querySelector(
      "#thread-inject.seal, #thread-inject .spinner, [data-mydealz-triggered='true']"
    )
  );
}

function findActiveLoadTrigger() {
  const candidates = document.querySelectorAll(LOAD_TRIGGER_SELECTOR);
  for (const el of candidates) {
    if (!isLoadTriggerBusy(el)) return el;
  }
  return null;
}

function isTriggerWithinPreloadZone(trigger) {
  const rect = trigger.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
  return rect.top <= viewportHeight + LOAD_TRIGGER_PRELOAD_MARGIN_PX;
}

function triggerNativeLoad(trigger) {
  if (isDealDetailsPage()) return;
  if (isLoadTriggerBusy(trigger) || isAnyLoadInFlight()) return;
  if (!isTriggerWithinPreloadZone(trigger)) return;
  if (consecutiveAutoLoads >= MAX_CONSECUTIVE_AUTO_LOADS) return;
  if (Date.now() - lastLoadTriggerAt < LOAD_TRIGGER_COOLDOWN_MS) return;

  lastLoadTriggerAt = Date.now();
  consecutiveAutoLoads++;
  trigger.dispatchEvent(new Event("replace", { bubbles: true }));

  // If mydealz synchronously started its AJAX transition (.seal / .spinner),
  // prevent its own ScrollTrigger from firing a duplicate request later.
  if (trigger.classList.contains("seal") || trigger.querySelector(".spinner")) {
    trigger.removeAttribute("data-handler");
    trigger.setAttribute("data-mydealz-triggered", "true");
  }
}

function scheduleLoadTriggerCheck(trigger) {
  clearTimeout(loadTriggerTimer);
  loadTriggerTimer = setTimeout(() => {
    triggerNativeLoad(trigger);
  }, LOAD_TRIGGER_DELAY_MS);
}

function observeLoadTrigger() {
  if (isDealDetailsPage()) return;

  const trigger = findActiveLoadTrigger();
  if (!trigger) {
    if (loadTriggerObserver && observedLoadTrigger) {
      loadTriggerObserver.unobserve(observedLoadTrigger);
      observedLoadTrigger = null;
    }
    return;
  }

  if (!loadTriggerObserver) {
    loadTriggerObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            scheduleLoadTriggerCheck(entry.target);
          }
        }
      },
      {
        rootMargin: `0px 0px ${LOAD_TRIGGER_PRELOAD_MARGIN_PX}px 0px`,
        threshold: 0,
      }
    );
  }

  if (observedLoadTrigger === trigger) {
    if (isTriggerWithinPreloadZone(trigger)) {
      scheduleLoadTriggerCheck(trigger);
    }
    return;
  }

  if (observedLoadTrigger) {
    loadTriggerObserver.unobserve(observedLoadTrigger);
  }
  observedLoadTrigger = trigger;
  loadTriggerObserver.observe(trigger);
}

/**
 * Hide postings that match filter terms but exclude those that also match exception terms.
 */
async function filterPostings(options = {}) {
  const { fullRescan = false, resetSession = false } = options;

  if (fullRescan) {
    clearProcessedMarkers();
    cleanupSeenDealObserverState();
    clearPageSeparators();
  }

  if (resetSession) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    cleanupSeenDealObserverState();
  }

  if (isDealDetailsPage()) {
    activeFilterContext = INACTIVE_FILTER_CONTEXT;
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
    clearSeenDealPresentation();
    updateBadge(0);
    return;
  }

  ensureFilterStyles();

  const settings = await getCachedRuntimeSettings();
  applyGreyOutOpacitySetting(settings.greyOutOpacityPercent);

  const context = buildFilterContextFromSettings(settings);
  activeFilterContext = context;
  currentSeenSettings = context.inactive
    ? { greyOutSeenDealsEnabled: false }
    : context.seenSettings;

  if (!context.inactive && context.visualSeenFeaturesEnabled) {
    await loadSeenDealUrls();
  } else {
    clearSeenDealPresentation();
    cleanupSeenDealObserverState();
  }

  if (context.inactive) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
    updateBadge(0);
    observeLoadTrigger();
    return;
  }

  const postings = findDealPostings();

  if (!context.hasFilterTerms) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
  }

  const { newlyDiscoveredUniqueDeals, visibilityChanged } = applyFilterToPostings(postings, context);

  if (visibilityChanged) {
    invalidateMydealzLayoutCache();
  }

  flushPendingSeparators();
  reconcilePendingScrollAnchor();
  handleAllDealsHiddenNotice();

  hiddenCount = hiddenDeals.length;
  updateBadge(hiddenCount, newlyDiscoveredUniqueDeals);
  observeLoadTrigger();
}

function handleAllDealsHiddenNotice() {
  const NOTICE_ID = "mydealz-filter-all-hidden-notice";
  let existingNotice = document.getElementById(NOTICE_ID);
  const allDeals = Array.from(document.querySelectorAll(PRIMARY_DEAL_SELECTOR_UNION));

  if (allDeals.length === 0) {
    if (existingNotice) existingNotice.remove();
    return;
  }

  const allHidden = allDeals.every((element) => isDealElementHidden(element));

  if (allHidden) {
    if (!existingNotice) {
      existingNotice = document.createElement("div");
      existingNotice.id = NOTICE_ID;
      existingNotice.setAttribute("data-mydealz-filter-ui", "true");
      existingNotice.style.padding = "20px";
      existingNotice.style.margin = "20px 0";
      existingNotice.style.textAlign = "center";
      existingNotice.style.backgroundColor = "#f0f0f0";
      existingNotice.style.border = "1px solid #ccc";
      existingNotice.style.borderRadius = "8px";
      existingNotice.style.fontSize = "16px";
      existingNotice.style.color = "#555";
      existingNotice.textContent = getI18nMessage(
        "allDealsHiddenNotice",
        [],
        "No visible deals left on this page. Adjust your filters or scroll down."
      );

      const firstPosting = allDeals[0];
      const listContainer = firstPosting.closest(".listLayout-main") || firstPosting.parentElement;
      if (listContainer) {
        listContainer.appendChild(existingNotice);
      }
    }
  } else if (existingNotice) {
    existingNotice.remove();
  }
}

/**
 * Update the badge count in the extension icon
 */
async function updateBadge(currentCount, newHiddenCount = 0) {
  try {
    if (newHiddenCount > 0) {
      totalHiddenDealCount += newHiddenCount;
      schedulePersistTotals();
    }

    chrome.runtime.sendMessage(
      {
        type: "updateBadge",
        count: currentCount,
        hiddenDeals: hiddenDeals,
      },
      () => {
        if (chrome.runtime.lastError) {
          log("Background script not ready yet:", chrome.runtime.lastError.message);
        }
      }
    );
  } catch (error) {
    log("Error sending message to update badge:", error);
  }
}

async function applyDealDetailsEnhancements() {
  const settings = await getCachedRuntimeSettings();
  applyGreyOutOpacitySetting(settings.greyOutOpacityPercent);
  const visualSeenFeaturesEnabled = settings.greyOutSeenDeals;
  if (visualSeenFeaturesEnabled) {
    await loadSeenDealUrls();
  }
  await registerCurrentDealForSeenTracking(visualSeenFeaturesEnabled);
  await applyCommentSorting();
}

function scheduleFollowUpFilterPass(delayMs = ASYNC_FILTER_PASS_DELAY_MS) {
  clearTimeout(observeChanges.timeout);
  observeChanges.timeout = setTimeout(async () => {
    if (isFilteringRun) {
      needsFollowUpFilterPass = true;
      return;
    }

    isFilteringRun = true;
    try {
      do {
        needsFollowUpFilterPass = false;
        if (isDealDetailsPage()) {
          await applyDealDetailsEnhancements();
        } else {
          await filterPostings();
        }
      } while (needsFollowUpFilterPass);
    } finally {
      isFilteringRun = false;
    }
  }, delayMs);
}

/**
 * Observe DOM changes, filter newly inserted deals synchronously before paint,
 * and keep infinite-scroll triggers + scroll anchors consistent.
 */
function observeChanges() {
  if (!document.body) return;

  const observer = new MutationObserver((mutations) => {
    const addedNodes = [];
    let hasTriggerMutation = false;

    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;

      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          if (mutation.target?.nodeType === Node.ELEMENT_NODE) {
            const parentDeal = mutation.target.closest?.(PRIMARY_DEAL_SELECTOR_UNION);
            if (parentDeal && !parentDeal.hasAttribute("data-mydealz-processed")) {
              addedNodes.push(parentDeal);
            }
          }
          continue;
        }
        if (
          node.getAttribute("data-mydealz-filter-ui") === "true" ||
          node.id === "mydealz-filter-all-hidden-notice"
        ) {
          continue;
        }
        addedNodes.push(node);
        if (
          node.id === "thread-inject" ||
          node.matches?.(LOAD_TRIGGER_SELECTOR) ||
          node.querySelector?.(LOAD_TRIGGER_SELECTOR)
        ) {
          hasTriggerMutation = true;
        }
      }

      for (const node of mutation.removedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.id === "thread-inject" || node.matches?.(LOAD_TRIGGER_SELECTOR)) {
          hasTriggerMutation = true;
        }
      }
    }

    if (addedNodes.length === 0 && !hasTriggerMutation) return;

    if (isDealDetailsPage()) {
      const hasRelevantNodes = addedNodes.some(
        (node) =>
          node.matches?.('article.thread, [data-thread-id], [class*="comment"], [id^="thread"]') ||
          node.querySelector?.('article.thread, [data-thread-id], [class*="comment"], [id^="thread"]')
      );
      if (hasRelevantNodes) {
        scheduleFollowUpFilterPass(ASYNC_FILTER_PASS_DELAY_MS);
      }
      return;
    }

    const addedDeals = extractPrimaryDealElements(addedNodes);
    let synchronousNewHidden = 0;
    let synchronousChanged = false;

    if (addedDeals.length > 0 || hasTriggerMutation) {
      lastBatchMutationAt = Date.now();
    }

    if (addedDeals.length > 0 && activeFilterContext) {
      if (!pendingScrollAnchor) {
        pendingScrollAnchor = lastStableScrollAnchor || captureScrollAnchor(new Set(addedDeals));
      }

      if (!activeFilterContext.inactive) {
        const postings = findDealPostings(addedDeals);
        const batchResult = applyFilterToPostings(postings, activeFilterContext);
        synchronousNewHidden = batchResult.newlyDiscoveredUniqueDeals;
        synchronousChanged = batchResult.visibilityChanged;

        if (
          postings.length >= MIN_BATCH_SIZE_FOR_SEPARATOR &&
          batchResult.firstVisibleElement
        ) {
          pendingSeparatorCandidates.push({
            firstVisibleElement: batchResult.firstVisibleElement,
            pageLabel: extractBatchPageLabel(addedNodes),
            visibleCount: batchResult.visibleCount,
            hiddenInBatchCount: batchResult.hiddenInBatchCount,
          });
        }
      }

      flushPendingSeparators();
      reconcilePendingScrollAnchor();
      requestAnimationFrame(() => {
        flushPendingSeparators();
        reconcilePendingScrollAnchor();
      });
    }

    if (synchronousChanged) {
      invalidateMydealzLayoutCache();
    }

    if (synchronousNewHidden > 0 || hiddenDeals.length !== hiddenCount) {
      hiddenCount = hiddenDeals.length;
      updateBadge(hiddenCount, synchronousNewHidden);
    }

    if (hasTriggerMutation) {
      flushPendingSeparators();
      reconcilePendingScrollAnchor();
      observeLoadTrigger();
      if (pendingSeparatorCandidates.length > 0) {
        // ZI.replace removes inline position:absolute after its 500ms transition.
        setTimeout(() => {
          flushPendingSeparators();
          reconcilePendingScrollAnchor();
          observeLoadTrigger();
        }, 560);
      }
    }

    if (addedDeals.length > 0 || hasTriggerMutation) {
      scheduleFollowUpFilterPass(ASYNC_FILTER_PASS_DELAY_MS);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

function setupUserScrollTracking() {
  const recordScrollInput = () => {
    lastUserScrollInputAt = Date.now();
  };
  const onKeyDown = (event) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "PageDown" ||
      event.key === "PageUp" ||
      event.key === " " ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      recordScrollInput();
    }
  };

  window.addEventListener("wheel", recordScrollInput, { passive: true });
  window.addEventListener("touchmove", recordScrollInput, { passive: true });
  window.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener(
    "scroll",
    () => {
      if (isReconcilingScroll) return;
      const now = Date.now();
      const userInputRecent = now - lastUserScrollInputAt < 400;
      const batchMutationRecent = now - lastBatchMutationAt < 180;

      if (userInputRecent) {
        consecutiveAutoLoads = 0;
      }

      // Only update the rolling anchor when this scroll is from user interaction (including scrollbar drag),
      // not from a layout shift right after a batch mutation.
      if ((userInputRecent || !batchMutationRecent) && pendingScrollAnchorRafId === null) {
        pendingScrollAnchorRafId = requestAnimationFrame(() => {
          pendingScrollAnchorRafId = null;
          const freshAnchor = captureScrollAnchor();
          if (freshAnchor) {
            lastStableScrollAnchor = freshAnchor;
            if (pendingScrollAnchor && (userInputRecent || !batchMutationRecent)) {
              pendingScrollAnchor = freshAnchor;
            }
          }
        });
      }
    },
    { passive: true }
  );
}

if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    if (Object.keys(changes).some((key) => SETTINGS_CACHE_KEYS.has(key))) {
      invalidateRuntimeSettingsCache();
      activeFilterContext = null;
    }
  });
}

/**
 * Listen for messages from popup/options about filter changes
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "filtersChanged") {
    invalidateRuntimeSettingsCache();
    activeFilterContext = null;
    const refreshPromise = isDealDetailsPage()
      ? applyDealDetailsEnhancements()
      : filterPostings({ fullRescan: true, resetSession: true });

    refreshPromise
      .then(() => sendResponse({ status: "filters applied" }))
      .catch((error) => {
        log("Error applying filters after change:", error);
        sendResponse({ status: "error applying filters" });
      });
    return true;
  }

  if (request.type === "getHiddenDeals") {
    sendResponse({ hiddenDeals: [...hiddenDeals] });
    return false;
  }

  if (request.type === "seenDealsReset") {
    log("Resetting seen deals state as requested by user");
    seenDealUrls = {};
    clearSeenDealPresentation();
    cleanupSeenDealObserverState();
    filterPostings({ fullRescan: true })
      .then(() => sendResponse({ status: "seen deals reset" }))
      .catch((error) => {
        log("Error resetting seen deals:", error);
        sendResponse({ status: "error resetting seen deals" });
      });
    return true;
  }

  return false;
});

// Persist seen deals at page exit without disabling Firefox bfcache.
window.addEventListener("pagehide", () => {
  flushSeenDealCandidatesOnExit();
});

// Initialize and start the filter
async function init() {
  setupUserScrollTracking();
  await loadTotalHiddenDealState();

  const runInitialTasks = () => {
    if (isDealDetailsPage()) {
      setTimeout(() => {
        applyDealDetailsEnhancements();
        observeChanges();
      }, DEAL_DETAILS_INIT_DELAY_MS);
      return;
    }

    filterPostings({ resetSession: true });
    observeChanges();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInitialTasks, { once: true });
  } else {
    runInitialTasks();
  }
}

// Start the filter
init();
