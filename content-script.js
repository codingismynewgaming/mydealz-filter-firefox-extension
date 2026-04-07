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
const SYNC_SETTINGS_STORAGE_KEYS = [
   "filterTerms",
   "exceptionTerms",
   "autoSortComments",
   "greyOutOpacityPercent",
   "filterTermCategories",
   "categoryStates",
   "keywordShortcut",
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
];
const AUTO_SORT_COMMENTS_KEY = "autoSortComments";
const GREY_OUT_SEEN_DEALS_KEY = "greyOutSeenDeals";
const GREY_OUT_OPACITY_KEY = "greyOutOpacityPercent";
const SEEN_DEAL_URLS_KEY = "seenDealUrls";
const FILTER_CATEGORY_STORAGE_KEY = "filterTermCategories";
const CATEGORY_STATES_STORAGE_KEY = "categoryStates";
const SEEN_DEAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SEEN_DEAL_ENTRIES = 5000;
const DEFAULT_GREY_OUT_OPACITY_PERCENT = 30;
const GREYED_DEAL_CLASS = "mydealz-filter-greyed";
const GREYED_STYLE_ELEMENT_ID = "mydealz-filter-seen-deal-style";
const SEEN_DEALS_PERSIST_DEBOUNCE_MS = 1200;
const DEAL_LIST_INIT_DELAY_MS = 450;
const DEAL_DETAILS_INIT_DELAY_MS = 150;
const COMMENT_SORT_MAX_ATTEMPTS = 12;
const COMMENT_SORT_RETRY_DELAY_MS = 350;
const HELPFUL_COMMENTS_ENDPOINT = "https://www.mydealz.de/graphql/h/28e9288515aaa33107e3c20006417a4ab5ba3953712fbd44169de48c172f0516";
const COMMENT_SECTION_SELECTOR = "#thread-comments";
const COMMENT_LIST_SELECTOR = `${COMMENT_SECTION_SELECTOR} .commentList`;
const COMMENT_ITEM_SELECTOR = "li.commentList-item[data-id]";
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

/**
 * Debug logging helper
 */
function log(...args) {
  if (DEBUG) console.log("[mydealz.de Filter]", ...args);
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

function parseTermEntries(rawTerms) {
  return (rawTerms || "")
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .map((raw) => ({
      raw,
      normalized: normalizeForMatch(raw),
    }))
    .filter((term) => term.normalized.length > 0);
}

function containsWholeTerm(normalizedTitle, normalizedTerm) {
  if (!normalizedTitle || !normalizedTerm) return false;

  const escapedTerm = escapeRegExp(normalizedTerm).replace(/\s+/g, "\\s+");
  const regex = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapedTerm}([^\\p{L}\\p{N}]|$)`,
    "u"
  );
  return regex.test(normalizedTitle);
}

function findMatchingFilterTerm(normalizedTitle, filterTerms) {
  for (const term of filterTerms) {
    if (containsWholeTerm(normalizedTitle, term.normalized)) {
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

function normalizeDealTitle(title) {
  return (title || "").toLowerCase().replace(/\s+/g, " ").trim();
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
  const entries = Object.entries(rawSeenDealUrls || {}).filter(([, timestamp]) => {
    return Number.isInteger(timestamp) && now - timestamp < SEEN_DEAL_EXPIRY_MS;
  });
  entries.sort((a, b) => b[1] - a[1]);
  const trimmedEntries = entries.slice(0, MAX_SEEN_DEAL_ENTRIES);
  return Object.fromEntries(trimmedEntries);
}

function ensureGreyOutStyles() {
  if (document.getElementById(GREYED_STYLE_ELEMENT_ID)) return;

  const style = document.createElement("style");
  style.id = GREYED_STYLE_ELEMENT_ID;
  style.textContent = `
    .${GREYED_DEAL_CLASS} {
      opacity: var(--mydealz-filter-grey-opacity, 0.3) !important;
      filter: grayscale(100%) !important;
      transition: opacity 0.2s ease, filter 0.2s ease;
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
  element.setAttribute("title", `Seen on ${seenDateLabel}`);
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
  if (!dealKey) return { wasSeenBefore: false, seenAt: null, changed: false };

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

function isHelpfulSortLabel(text) {
  const normalizedText = normalizeForMatch(text);
  return (
    normalizedText.includes("hilfreichst") ||
    normalizedText.includes("nutzlich") ||
    normalizedText.includes("helpful")
  );
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

function getCookieValue(name) {
  const cookies = (document.cookie || "").split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    return decodeURIComponent(trimmed.slice(name.length + 1));
  }
  return null;
}

function getCommentListElement() {
  return document.querySelector(COMMENT_LIST_SELECTOR);
}

function getTopLevelCommentItems() {
  const commentList = getCommentListElement();
  if (!commentList) return [];
  return Array.from(commentList.querySelectorAll(`:scope > ${COMMENT_ITEM_SELECTOR}`));
}

function extractHelpfulCommentsPayload(rawPayload) {
  const payload = Array.isArray(rawPayload) ? rawPayload : [];
  const comments = payload.find((entry) => Array.isArray(entry?.data?.comments?.items))?.data?.comments;
  const commentsPinned = payload.find((entry) => Array.isArray(entry?.data?.commentsPinned?.items))?.data?.commentsPinned;

  return {
    items: Array.isArray(comments?.items) ? comments.items : [],
    pinnedItems: Array.isArray(commentsPinned?.items) ? commentsPinned.items : [],
    pagination: comments?.pagination || null,
  };
}

async function fetchHelpfulComments(threadId) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    "X-Request-Type": "application/vnd.pepper.v1+json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Pepper-Txn": "threads.show.deal",
  };
  const xsrfToken = getCookieValue("xsrf_t");
  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  const response = await fetch(HELPFUL_COMMENTS_ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers,
    referrer: window.location.href,
    mode: "cors",
  });

  if (!response.ok) {
    throw new Error(`Helpful comments request failed with status ${response.status}`);
  }

  const payload = extractHelpfulCommentsPayload(await response.json());
  const responseThreadId =
    payload.items[0]?.threadId ||
    payload.pinnedItems[0]?.threadId ||
    threadId;

  if (responseThreadId && threadId && responseThreadId !== threadId) {
    throw new Error(`Helpful comments response thread mismatch: expected ${threadId}, got ${responseThreadId}`);
  }

  return payload;
}

function reorderCommentsInDom(payload) {
  const commentList = getCommentListElement();
  if (!commentList) return false;

  const topLevelItems = getTopLevelCommentItems();
  if (topLevelItems.length === 0) return false;

  const itemById = new Map(
    topLevelItems
      .map((item) => [item.getAttribute("data-id"), item])
      .filter(([id]) => !!id)
  );

  const desiredIds = [
    ...payload.pinnedItems.map((comment) => String(comment.commentId)),
    ...payload.items.map((comment) => String(comment.commentId)),
  ];

  const orderedItems = desiredIds.map((id) => itemById.get(id)).filter(Boolean);
  if (orderedItems.length === 0) return false;

  const orderedSet = new Set(orderedItems);
  const remainingItems = topLevelItems.filter((item) => !orderedSet.has(item));

  [...orderedItems, ...remainingItems].forEach((item) => {
    commentList.appendChild(item);
  });

  return true;
}

function setHelpfulSortLabel() {
  const sortRoot = document.querySelector("[data-t='sort']");
  if (!sortRoot) return false;

  const labelNode = Array.from(sortRoot.querySelectorAll("button span span, button span, button"))
    .find((node) => {
      const text = (node.textContent || "").trim();
      return text.length > 0 && node.children.length === 0;
    });

  if (!labelNode) return false;
  labelNode.textContent = "Am hilfreichsten";
  return true;
}

async function tryApplyHelpfulCommentSortViaApi(threadId) {
  const payload = await fetchHelpfulComments(threadId);
  const reordered = reorderCommentsInDom(payload);
  const hasHelpfulOrdering =
    reordered ||
    payload.pagination?.orderBy === "helpful" ||
    payload.items.length === 0;

  if (hasHelpfulOrdering) {
    setHelpfulSortLabel();
  }

  return hasHelpfulOrdering;
}

async function applyCommentSorting(attempt = 0) {
  if (!isDealDetailsPage()) return;

  const { [AUTO_SORT_COMMENTS_KEY]: autoSortComments } = await getRuntimeSettings();
  if (!autoSortComments) return;

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
    applied = await tryApplyHelpfulCommentSortViaApi(threadId);
  } catch (error) {
    log("Helpful comment sort via API failed:", error);
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

function schedulePersistTotals() {
  clearTimeout(persistTotalsTimer);
  persistTotalsTimer = setTimeout(() => {
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


/**
 * Get filter terms and exception terms from storage
 * Tries sync storage first, falls back to local storage if sync is empty or fails.
 */
async function getRuntimeSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(SYNC_SETTINGS_STORAGE_KEYS, (result) => {
        if (chrome.runtime.lastError) {
          log("Sync storage unavailable, trying local fallback:", chrome.runtime.lastError);
          chrome.storage.local.get(LOCAL_SETTINGS_STORAGE_KEYS, (localResult) => {
            const filterTerms = localResult.filterTerms || "";
            const exceptionTerms = localResult.exceptionTerms || "";
            const parsedFilterTerms = parseTermEntries(filterTerms);
            const resolvedCategories =
              localResult[FILTER_CATEGORY_STORAGE_KEY] &&
              typeof localResult[FILTER_CATEGORY_STORAGE_KEY] === "object"
                ? localResult[FILTER_CATEGORY_STORAGE_KEY]
                : {};
            const resolvedCategoryStates =
              localResult[CATEGORY_STATES_STORAGE_KEY] &&
              typeof localResult[CATEGORY_STATES_STORAGE_KEY] === "object"
                ? localResult[CATEGORY_STATES_STORAGE_KEY]
                : {};
            resolve({ 
              filterTerms: getActiveFilterTermsFromCategories(
                parsedFilterTerms,
                resolvedCategories,
                resolvedCategoryStates
              ), 
              exceptionTerms: parseTermEntries(exceptionTerms),
              autoSortComments: localResult[AUTO_SORT_COMMENTS_KEY] === true,
              greyOutSeenDeals: localResult[GREY_OUT_SEEN_DEALS_KEY] === true,
              greyOutOpacityPercent: normalizeOpacityPercent(localResult[GREY_OUT_OPACITY_KEY]),
              keywordShortcut: localResult.keywordShortcut || "",
              filterTermCategories: resolvedCategories,
              categoryStates: resolvedCategoryStates,
            });
          });
          return;
        }

        let filterTerms = result.filterTerms || "";
        let exceptionTerms = result.exceptionTerms || "";
        chrome.storage.local.get([GREY_OUT_SEEN_DEALS_KEY], (localSeenSettings) => {
          if (!filterTerms && !exceptionTerms) {
            chrome.storage.local.get(LOCAL_SETTINGS_STORAGE_KEYS, (localResult) => {
              filterTerms = localResult.filterTerms || "";
              exceptionTerms = localResult.exceptionTerms || "";
              const parsedFilterTerms = parseTermEntries(filterTerms);
              const resolvedCategories =
                localResult[FILTER_CATEGORY_STORAGE_KEY] &&
                typeof localResult[FILTER_CATEGORY_STORAGE_KEY] === "object"
                  ? localResult[FILTER_CATEGORY_STORAGE_KEY]
                  : {};
              const resolvedCategoryStates =
                localResult[CATEGORY_STATES_STORAGE_KEY] &&
                typeof localResult[CATEGORY_STATES_STORAGE_KEY] === "object"
                  ? localResult[CATEGORY_STATES_STORAGE_KEY]
                  : {};
              resolve({ 
                filterTerms: getActiveFilterTermsFromCategories(
                  parsedFilterTerms,
                  resolvedCategories,
                  resolvedCategoryStates
                ), 
                exceptionTerms: parseTermEntries(exceptionTerms),
                autoSortComments: localResult[AUTO_SORT_COMMENTS_KEY] === true,
                greyOutSeenDeals: localSeenSettings[GREY_OUT_SEEN_DEALS_KEY] === true,
                greyOutOpacityPercent: normalizeOpacityPercent(localResult[GREY_OUT_OPACITY_KEY]),
                keywordShortcut: localResult.keywordShortcut || "",
                filterTermCategories: resolvedCategories,
                categoryStates: resolvedCategoryStates,
              });
            });
            return;
          }

          const parsedFilterTerms = parseTermEntries(filterTerms);
          const resolvedCategories =
            result[FILTER_CATEGORY_STORAGE_KEY] && typeof result[FILTER_CATEGORY_STORAGE_KEY] === "object"
              ? result[FILTER_CATEGORY_STORAGE_KEY]
              : {};
          const resolvedCategoryStates =
            result[CATEGORY_STATES_STORAGE_KEY] && typeof result[CATEGORY_STATES_STORAGE_KEY] === "object"
              ? result[CATEGORY_STATES_STORAGE_KEY]
              : {};
          resolve({ 
            filterTerms: getActiveFilterTermsFromCategories(
              parsedFilterTerms,
              resolvedCategories,
              resolvedCategoryStates
            ), 
            exceptionTerms: parseTermEntries(exceptionTerms),
            autoSortComments: result[AUTO_SORT_COMMENTS_KEY] === true,
            greyOutSeenDeals: localSeenSettings[GREY_OUT_SEEN_DEALS_KEY] === true,
            greyOutOpacityPercent: normalizeOpacityPercent(result[GREY_OUT_OPACITY_KEY]),
            keywordShortcut: result.keywordShortcut || "",
            filterTermCategories: resolvedCategories,
            categoryStates: resolvedCategoryStates,
          });
        });
      });
    } catch (error) {
      log("Exception getting filter terms:", error);
      try {
        chrome.storage.local.get(LOCAL_SETTINGS_STORAGE_KEYS, (localResult) => {
          const parsedFilterTerms = parseTermEntries(localResult.filterTerms || "");
          const resolvedCategories =
            localResult[FILTER_CATEGORY_STORAGE_KEY] &&
            typeof localResult[FILTER_CATEGORY_STORAGE_KEY] === "object"
              ? localResult[FILTER_CATEGORY_STORAGE_KEY]
              : {};
          const resolvedCategoryStates =
            localResult[CATEGORY_STATES_STORAGE_KEY] &&
            typeof localResult[CATEGORY_STATES_STORAGE_KEY] === "object"
              ? localResult[CATEGORY_STATES_STORAGE_KEY]
              : {};
          resolve({ 
            filterTerms: getActiveFilterTermsFromCategories(
              parsedFilterTerms,
              resolvedCategories,
              resolvedCategoryStates
            ), 
            exceptionTerms: parseTermEntries(localResult.exceptionTerms || ""),
            autoSortComments: localResult[AUTO_SORT_COMMENTS_KEY] === true,
            greyOutSeenDeals: localResult[GREY_OUT_SEEN_DEALS_KEY] === true,
            greyOutOpacityPercent: normalizeOpacityPercent(localResult[GREY_OUT_OPACITY_KEY]),
            keywordShortcut: localResult.keywordShortcut || "",
            filterTermCategories: resolvedCategories,
            categoryStates: resolvedCategoryStates,
          });
        });
      } catch (innerError) {
        resolve({
          filterTerms: [],
          exceptionTerms: [],
          autoSortComments: false,
          greyOutSeenDeals: false,
          greyOutOpacityPercent: DEFAULT_GREY_OUT_OPACITY_PERCENT,
          filterTermCategories: {},
          categoryStates: {},
        });
      }
    }
  });
}

/**
 * Check if a title matches any filter term but excludes terms that also contain exception terms
 * Uses optimized matching with early termination
 */
function matchesFilter(title, filterTerms, exceptionTerms) {
  if (!title || filterTerms.length === 0) return false;

  // Normalize title once for exact matching (diacritics-insensitive).
  const normalizedTitle = normalizeForMatch(title);

  // First check if the title contains any exception terms
  if (exceptionTerms && exceptionTerms.length > 0) {
    for (const exceptionTerm of exceptionTerms) {
      if (containsWholeTerm(normalizedTitle, exceptionTerm.normalized)) {
        // If it contains an exception term, don't filter it even if it contains filter terms
        return false;
      }
    }
  }

  return !!findMatchingFilterTerm(normalizedTitle, filterTerms);
}

/**
 * Extract text from an element safely
 */
function safeGetText(element) {
  if (!element) return "";
  try {
    return element.textContent.trim();
  } catch {
    return "";
  }
}

/**
 * Find deal title in a container using various selectors and methods
 */
function findTitleInElement(container) {
  if (!container) return "";

  // Try specific mydealz.de title selectors first
  const titleSelectors = [
    "[data-testid='thread-title']",  // Common test ID for titles
    ".thread-title",                 // Common class for titles
    ".cept-tt",                      // mydealz.de specific class for titles
    ".title",                        // Generic title class
    "h2 a",                          // Heading with link
    "h3 a",                          // Alternative heading with link
    "a[href*='/deals/'][data-clickable='true']", // Clickable deal links
    "a[href*='/deals/'].thread-title-link", // Specific deal title links
  ];
  
  for (const selector of titleSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      const text = safeGetText(element);
      if (text.length > 5) return text;
    }
  }

  // Try link with deals path first (most reliable)
  const dealLink = container.querySelector("a[href*='/deals/']");
  if (dealLink) {
    const text = safeGetText(dealLink);
    if (text.length > 5) return text; // Must be meaningful length
  }

  // Try heading tags
  for (const tag of ["h1", "h2", "h3", "h4"]) {
    const element = container.querySelector(tag);
    const text = safeGetText(element);
    if (text.length > 5) return text;
  }

  // Try class-based selectors specific to mydealz.de
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
      // Exclude temperature ratings and percentages that might be prices/discounts
      return text;
    }
  }

  // Last resort: look for any meaningful text in first text node
  for (const child of container.children) {
    if (child.textContent && child.textContent.length > 5) {
      const text = safeGetText(child);
      // Filter out common non-title elements
      if (!text.match(/^\d+°/) && 
          !text.match(/^\d+%/) && 
          !text.match(/€/) && 
          !text.match(/Gepostet/) &&
          !text.match(/von/) &&
          !text.match(/^(\d+k|\d+|k\+)/)) { // Avoid numbers like "12k" that might be vote counts
        return text.substring(0, 200); // First 200 chars
      }
    }
  }

  return "";
}

/**
 * Find all deal postings on the page
 * Optimized for mydealz.de's actual HTML structure
 */
function findDealPostings() {
  const postings = [];

  // mydealz.de specific selectors (in order of preference)
  const selectors = [
    // Primary selectors based on common mydealz.de structure
    "article.thread",           // Main article containers for deals
    "div.thread-item",          // Thread items
    "div[data-thread-id]",      // Data attribute for threads
    "[class*='thread-']",
    "[class*='deal-']",
    "article[class*='thread']",
    "div.threadCard",           // Card-style layout
    "div.posting",              // Alternative posting class
    "[data-testid='thread']",   // Test ID often used for threads
    "a[href*='/deals/']",       // Links to deals (fallback)
  ];

  // Try each selector until we find meaningful results
  for (const selector of selectors) {
    let elements = [];
    try {
      elements = Array.from(document.querySelectorAll(selector));
    } catch (e) {
      log("Invalid selector:", selector, e);
      continue;
    }

    if (elements.length === 0) continue;

    // Filter out very small elements and get parent containers if link
    for (let element of elements) {
      // If it's a link, get its parent container
      if (element.tagName === "A" && element.href.includes("/deals/")) {
        element = element.closest("div") || element.closest("article") || element;
      }

      // Skip if element is too small or already processed
      if (element.hasAttribute("data-mydealz-processed")) continue;

      const title = findTitleInElement(element);
      if (title.length > 5) {
        postings.push({
          element: element,
          title: title,
        });
        element.setAttribute("data-mydealz-processed", "true");
      }
    }

    if (postings.length > 0) {
      log(`Found ${postings.length} postings using selector: ${selector}`);
      break;
    }
  }

  // If no postings found with primary selectors, try broader search
  if (postings.length === 0) {
    log("Using fallback search for deal postings");
    
    // Look for elements containing deal-related text
    const allElements = Array.from(document.querySelectorAll("div, article, section"));
    for (const element of allElements) {
      if (element.hasAttribute("data-mydealz-processed")) continue;
      
      const title = findTitleInElement(element);
      if (title.length > 5 && (title.toLowerCase().includes('deal') || 
                               element.querySelector("a[href*='/deals/']"))) {
        postings.push({
          element: element,
          title: title,
        });
        element.setAttribute("data-mydealz-processed", "true");
      }
    }
  }

  log(`Total postings found: ${postings.length}`);
  return postings;
}

function clearProcessedMarkers() {
  document.querySelectorAll('[data-mydealz-processed="true"]').forEach((el) => {
    el.removeAttribute("data-mydealz-processed");
  });
}

function clearFilteredElements() {
  document.querySelectorAll('[data-mydealz-filtered="true"]').forEach((el) => {
    el.style.display = "";
    el.removeAttribute("data-mydealz-filtered");
    el.removeAttribute("data-filter-term");
    el.removeAttribute("data-mydealz-counted");
  });
}

/**
 * Hide postings that match filter terms but exclude those that also match exception terms
 * Optimized for performance with batch DOM operations
 */
async function filterPostings(options = {}) {
  const { fullRescan = false, resetSession = false } = options;

  if (fullRescan) {
    clearProcessedMarkers();
    cleanupSeenDealObserverState();
  }

  if (resetSession) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    cleanupSeenDealObserverState();
  }

  // Do not hide anything on deal detail pages so users can open hidden deals
  // from the popup list and view them normally.
  if (isDealDetailsPage()) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
    clearSeenDealPresentation();
    updateBadge(0);
    return;
  }

  const {
    filterTerms,
    exceptionTerms,
    greyOutSeenDeals,
    greyOutOpacityPercent,
  } = await getRuntimeSettings();
  applyGreyOutOpacitySetting(greyOutOpacityPercent);
  const keywordFilteringEnabled = !isSearchResultsPage();
  const greyOutEnabledOnPage = greyOutSeenDeals && !isGreyOutExcludedPage();

  const visualSeenFeaturesEnabled = greyOutEnabledOnPage;
  currentSeenSettings = {
    greyOutSeenDealsEnabled: greyOutEnabledOnPage,
  };

  if (visualSeenFeaturesEnabled) {
    ensureGreyOutStyles();
    await loadSeenDealUrls();
  } else {
    clearSeenDealPresentation();
    cleanupSeenDealObserverState();
  }

  if (!visualSeenFeaturesEnabled && (!keywordFilteringEnabled || filterTerms.length === 0)) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
    updateBadge(0);
    return;
  }

  const postings = findDealPostings();
  const hasFilterTerms = keywordFilteringEnabled && filterTerms.length > 0;

  // If no filter terms, show everything but still keep seen-deal styling active.
  if (!hasFilterTerms) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
  }

  // Batch DOM operations for better performance
  const elementsToHide = [];
  const elementsToShow = [];
  let newlyDiscoveredUniqueDeals = 0;

  postings.forEach(({ element, title }) => {
    const dealUrl = element.querySelector('a[href*="/deals/"]')?.href || "";
    const dealKey = buildDealUniqueKey(title, dealUrl);

    if (visualSeenFeaturesEnabled) {
      const seenAt = seenDealUrls[dealKey];
      applySeenDealStateToElement(
        element,
        Number.isInteger(seenAt) ? seenAt : null,
        currentSeenSettings
      );
      if (!Number.isInteger(seenAt)) {
        registerSeenDealCandidate(element, dealKey);
      }
    } else {
      applySeenDealStateToElement(
        element,
        null,
        {
          greyOutSeenDealsEnabled: false,
        }
      );
    }

    if (hasFilterTerms && matchesFilter(title, filterTerms, exceptionTerms)) {
      const normalizedTitle = normalizeForMatch(title);
      const matchingTermEntry = findMatchingFilterTerm(normalizedTitle, filterTerms);
      const matchingTerm = matchingTermEntry ? matchingTermEntry.raw : "";

      if (!hiddenDealKeys.has(dealKey)) {
        hiddenDealKeys.add(dealKey);
        hiddenDeals.push({ title, url: dealUrl, matchingTerm });
      }

      if (!totalHiddenDealKeys.has(dealKey)) {
        totalHiddenDealKeys.add(dealKey);
        newlyDiscoveredUniqueDeals++;
        incrementHiddenCountForTerm(matchingTerm);
      }

      if (element.style.display !== "none") {
        elementsToHide.push({ element, matchingTerm });
      }
    } else {
      if (element.style.display === "none" && element.getAttribute("data-mydealz-filtered") === "true") {
        elementsToShow.push(element);
      }
    }
  });

  // Apply hiding in batch
  elementsToHide.forEach(({ element, matchingTerm }) => {
    element.style.display = "none";
    element.setAttribute("data-mydealz-filtered", "true");
    element.setAttribute("data-filter-term", matchingTerm); // Store which term caused the hiding
  });

  // Apply showing in batch
  elementsToShow.forEach(element => {
    element.style.display = "";
    element.removeAttribute("data-mydealz-filtered");
    element.removeAttribute("data-filter-term");
    element.removeAttribute("data-mydealz-counted"); // Also remove counted attribute when showing
  });

  handleAllDealsHiddenNotice(postings);

  // Keep a cumulative per-page session count.
  hiddenCount = hiddenDeals.length;
  updateBadge(hiddenCount, newlyDiscoveredUniqueDeals);

}

function handleAllDealsHiddenNotice(postings) {
  const NOTICE_ID = "mydealz-filter-all-hidden-notice";
  let existingNotice = document.getElementById(NOTICE_ID);
  
  if (postings.length === 0) {
    if (existingNotice) existingNotice.remove();
    return;
  }

  const allHidden = postings.every(({ element }) => element.style.display === "none");

  if (allHidden) {
    if (!existingNotice) {
      existingNotice = document.createElement("div");
      existingNotice.id = NOTICE_ID;
      existingNotice.style.padding = "20px";
      existingNotice.style.margin = "20px 0";
      existingNotice.style.textAlign = "center";
      existingNotice.style.backgroundColor = "#f0f0f0";
      existingNotice.style.border = "1px solid #ccc";
      existingNotice.style.borderRadius = "8px";
      existingNotice.style.fontSize = "16px";
      existingNotice.style.color = "#555";
      existingNotice.textContent = "No new deals currently, that have not been hidden or already seen by you. Come back later, bro!";
      
      const firstPosting = postings[0].element;
      const listContainer = firstPosting.closest(".listLayout-main") || firstPosting.parentElement;
      if (listContainer) {
        listContainer.appendChild(existingNotice);
      }
    }
  } else {
    if (existingNotice) {
      existingNotice.remove();
    }
  }
}

/**
 * Update the badge count in the extension icon
 */
async function updateBadge(currentCount, newHiddenCount = 0) {
  try {
    // Update the total hidden deal count by newly discovered unique deals.
    if (newHiddenCount > 0) {
      totalHiddenDealCount += newHiddenCount;
      schedulePersistTotals();
    }

    chrome.runtime.sendMessage(
      {
        type: "updateBadge",
        count: currentCount,
        hiddenDeals: hiddenDeals
      },
      (response) => {
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
  const settings = await getRuntimeSettings();
  applyGreyOutOpacitySetting(settings.greyOutOpacityPercent);
  const visualSeenFeaturesEnabled = settings.greyOutSeenDeals;
  if (visualSeenFeaturesEnabled) {
    await loadSeenDealUrls();
  }
  await registerCurrentDealForSeenTracking(visualSeenFeaturesEnabled);
  await applyCommentSorting();
}

/**
 * Observe DOM changes and refilter when new postings are added
 * More efficient observer that targets specific areas
 */
function observeChanges() {
  // Flag to prevent multiple simultaneous filter operations
  let isFiltering = false;
  
  const observer = new MutationObserver((mutations) => {
    let shouldRefilter = false;
    
    // Check if mutations affect deal-related areas
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if added nodes match deal selectors
            if (node.matches && 
                (node.matches('article.thread, div.thread-item, [data-thread-id], [class*="thread-"], [class*="deal-"]') ||
                 node.querySelector('article.thread, div.thread-item, [data-thread-id], [class*="thread-"], [class*="deal-"]'))) {
              shouldRefilter = true;
              break;
            }
          }
        }
      }
      if (shouldRefilter) break;
    }
    
    if (shouldRefilter && !isFiltering) {
      // Debounce to avoid too many rapid filter operations
      clearTimeout(observeChanges.timeout);
      observeChanges.timeout = setTimeout(async () => {
        if (isFiltering) return;
        isFiltering = true;
        try {
          if (isDealDetailsPage()) {
            await applyDealDetailsEnhancements();
          } else {
            await filterPostings();
          }
        } finally {
          isFiltering = false;
        }
      }, 1000); // Increased debounce time
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

/**
 * Listen for messages from popup about filter changes
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "filtersChanged") {
    const refreshPromise = isDealDetailsPage()
      ? applyDealDetailsEnhancements()
      : filterPostings({ fullRescan: true, resetSession: true });

    refreshPromise
      .then(() => sendResponse({ status: "filters applied" }))
      .catch((error) => {
        log("Error applying filters after change:", error);
        sendResponse({ status: "error applying filters" });
      });
  } else if (request.type === "getHiddenDeals") {
    sendResponse({ hiddenDeals: [...hiddenDeals] }); // Return a copy of the hidden deals array
  } else if (request.type === "seenDealsReset") {
    log("Resetting seen deals state as requested by user");
    seenDealUrls = {};
    clearSeenDealPresentation();
    cleanupSeenDealObserverState();
    // Re-run filter to ensure everything is visible and correctly styled
    filterPostings({ fullRescan: true });
    sendResponse({ status: "seen deals reset" });
  }
  return true; // Required to keep message channel open for async response
});

// Persist seen deals at page exit and reset transient hidden-deal state.
window.addEventListener("pagehide", () => {
  flushSeenDealCandidatesOnExit();
});

window.addEventListener('beforeunload', () => {
  flushSeenDealCandidatesOnExit();
  hiddenCount = 0;
  hiddenDeals = [];
  hiddenDealKeys.clear();
  updateBadge(0); // This will update the current count but preserve the total

  // Also reset any hidden elements to visible state
  clearFilteredElements();
});

// Initialize and start the filter
async function init() {
  // Load the total hidden deal state from storage.
  await loadTotalHiddenDealState();
  
  // Wait a moment for the page to fully load
  const initialDelay = isDealDetailsPage() ? DEAL_DETAILS_INIT_DELAY_MS : DEAL_LIST_INIT_DELAY_MS;
  const runInitialTasks = () => {
    setTimeout(() => {
      if (isDealDetailsPage()) {
        applyDealDetailsEnhancements();
      } else {
        filterPostings({ resetSession: true });
      }
      observeChanges();
    }, initialDelay);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      runInitialTasks();
    });
  } else {
    runInitialTasks();
  }
}

// Start the filter
init();
