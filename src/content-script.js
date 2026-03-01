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
const SYNC_CHUNK_SIZE = 7000;
const SYNC_KEY_CHUNK_PREFIX = "totalHiddenDealKeysChunk_";
const SYNC_KEY_CHUNK_COUNT_KEY = "totalHiddenDealKeysChunkCount";
const SYNC_TERM_COUNT_CHUNK_PREFIX = "hiddenCountsByTermChunk_";
const SYNC_TERM_COUNT_CHUNK_COUNT_KEY = "hiddenCountsByTermChunkCount";

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

function buildDealUniqueKey(title, url) {
  const normalizedUrl = normalizeDealUrl(url);
  if (normalizedUrl) return `url:${normalizedUrl}`;
  return `title:${normalizeDealTitle(title)}`;
}

function chunkString(value, chunkSize) {
  if (!value) return [""];
  const chunks = [];
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildChunkKeys(prefix, count) {
  return Array.from({ length: Math.max(0, count) }, (_, i) => `${prefix}${i}`);
}

function parseChunkedJsonPayload(rawValue, fallbackValue) {
  if (typeof rawValue !== "string" || rawValue.length === 0) return fallbackValue;
  try {
    const parsed = JSON.parse(rawValue);
    return parsed === undefined ? fallbackValue : parsed;
  } catch {
    return fallbackValue;
  }
}

function persistTotalsToSync(payload) {
  const serializedKeys = JSON.stringify(payload.totalHiddenDealKeys || []);
  const serializedTermCounts = JSON.stringify(payload.hiddenCountsByTerm || {});
  const keyChunks = chunkString(serializedKeys, SYNC_CHUNK_SIZE);
  const termCountChunks = chunkString(serializedTermCounts, SYNC_CHUNK_SIZE);
  const syncPayload = {
    totalHiddenDealCount: payload.totalHiddenDealCount,
    [SYNC_KEY_CHUNK_COUNT_KEY]: keyChunks.length,
    [SYNC_TERM_COUNT_CHUNK_COUNT_KEY]: termCountChunks.length,
  };

  keyChunks.forEach((chunk, index) => {
    syncPayload[`${SYNC_KEY_CHUNK_PREFIX}${index}`] = chunk;
  });

  termCountChunks.forEach((chunk, index) => {
    syncPayload[`${SYNC_TERM_COUNT_CHUNK_PREFIX}${index}`] = chunk;
  });

  if (serializedKeys.length <= SYNC_CHUNK_SIZE) {
    syncPayload.totalHiddenDealKeys = payload.totalHiddenDealKeys;
  }
  if (serializedTermCounts.length <= SYNC_CHUNK_SIZE) {
    syncPayload.hiddenCountsByTerm = payload.hiddenCountsByTerm;
  }

  chrome.storage.sync.get(
    [SYNC_KEY_CHUNK_COUNT_KEY, SYNC_TERM_COUNT_CHUNK_COUNT_KEY],
    (existingSyncState) => {
      const previousKeyChunkCount = Number.isInteger(existingSyncState[SYNC_KEY_CHUNK_COUNT_KEY])
        ? existingSyncState[SYNC_KEY_CHUNK_COUNT_KEY]
        : 0;
      const previousTermChunkCount = Number.isInteger(
        existingSyncState[SYNC_TERM_COUNT_CHUNK_COUNT_KEY]
      )
        ? existingSyncState[SYNC_TERM_COUNT_CHUNK_COUNT_KEY]
        : 0;

      chrome.storage.sync.set(syncPayload, () => {
        if (chrome.runtime.lastError) {
          log("Error saving total hidden deal state to sync storage:", chrome.runtime.lastError);
          return;
        }

        const staleChunkKeys = [
          ...Array.from(
            {
              length: Math.max(previousKeyChunkCount - keyChunks.length, 0),
            },
            (_, idx) => `${SYNC_KEY_CHUNK_PREFIX}${idx + keyChunks.length}`
          ),
          ...Array.from(
            {
              length: Math.max(previousTermChunkCount - termCountChunks.length, 0),
            },
            (_, idx) => `${SYNC_TERM_COUNT_CHUNK_PREFIX}${idx + termCountChunks.length}`
          ),
        ];

        if (staleChunkKeys.length > 0) {
          chrome.storage.sync.remove(staleChunkKeys, () => {
            if (chrome.runtime.lastError) {
              log("Error removing stale sync chunk keys:", chrome.runtime.lastError);
            }
          });
        }
      });
    }
  );
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

    persistTotalsToSync(payload);
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

        if (
          !Number.isInteger(result.totalHiddenDealCount) &&
          savedKeys.length === 0 &&
          Object.keys(hiddenCountsByTerm).length === 0
        ) {
          chrome.storage.sync.get(
            [
              "totalHiddenDealCount",
              "totalHiddenDealKeys",
              "hiddenCountsByTerm",
              SYNC_KEY_CHUNK_COUNT_KEY,
              SYNC_TERM_COUNT_CHUNK_COUNT_KEY,
            ],
            (syncBaseState) => {
              const keyChunkCount = Number.isInteger(syncBaseState[SYNC_KEY_CHUNK_COUNT_KEY])
                ? syncBaseState[SYNC_KEY_CHUNK_COUNT_KEY]
                : 0;
              const termChunkCount = Number.isInteger(
                syncBaseState[SYNC_TERM_COUNT_CHUNK_COUNT_KEY]
              )
                ? syncBaseState[SYNC_TERM_COUNT_CHUNK_COUNT_KEY]
                : 0;
              const chunkKeys = [
                ...buildChunkKeys(SYNC_KEY_CHUNK_PREFIX, keyChunkCount),
                ...buildChunkKeys(SYNC_TERM_COUNT_CHUNK_PREFIX, termChunkCount),
              ];

              const finalizeFromSyncState = (syncChunkState) => {
                const serializedSyncKeys =
                  keyChunkCount > 0
                    ? buildChunkKeys(SYNC_KEY_CHUNK_PREFIX, keyChunkCount)
                        .map((chunkKey) => syncChunkState[chunkKey] || "")
                        .join("")
                    : null;
                const serializedSyncTermCounts =
                  termChunkCount > 0
                    ? buildChunkKeys(SYNC_TERM_COUNT_CHUNK_PREFIX, termChunkCount)
                        .map((chunkKey) => syncChunkState[chunkKey] || "")
                        .join("")
                    : null;

                const directSyncKeys = Array.isArray(syncBaseState.totalHiddenDealKeys)
                  ? syncBaseState.totalHiddenDealKeys
                  : [];
                const directSyncTermCounts =
                  syncBaseState.hiddenCountsByTerm &&
                  typeof syncBaseState.hiddenCountsByTerm === "object"
                    ? syncBaseState.hiddenCountsByTerm
                    : {};

                const parsedChunkKeys = parseChunkedJsonPayload(
                  serializedSyncKeys,
                  directSyncKeys
                );
                const parsedChunkTermCounts = parseChunkedJsonPayload(
                  serializedSyncTermCounts,
                  directSyncTermCounts
                );

                totalHiddenDealKeys = new Set(
                  Array.isArray(parsedChunkKeys) ? parsedChunkKeys : directSyncKeys
                );
                hiddenCountsByTerm =
                  parsedChunkTermCounts && typeof parsedChunkTermCounts === "object"
                    ? parsedChunkTermCounts
                    : directSyncTermCounts;
                const syncCount = Number.isInteger(syncBaseState.totalHiddenDealCount)
                  ? syncBaseState.totalHiddenDealCount
                  : totalHiddenDealKeys.size;
                totalHiddenDealCount = Math.max(syncCount, totalHiddenDealKeys.size);

                if (
                  totalHiddenDealCount > 0 ||
                  totalHiddenDealKeys.size > 0 ||
                  Object.keys(hiddenCountsByTerm).length > 0
                ) {
                  schedulePersistTotals();
                }

                log("Loaded total hidden deal state from sync fallback:", {
                  totalHiddenDealCount,
                  uniqueKeys: totalHiddenDealKeys.size,
                  trackedFilterTerms: Object.keys(hiddenCountsByTerm).length,
                });
                resolve(totalHiddenDealCount);
              };

              if (chunkKeys.length === 0) {
                finalizeFromSyncState({});
                return;
              }

              chrome.storage.sync.get(chunkKeys, (syncChunkState) => {
                finalizeFromSyncState(syncChunkState || {});
              });
            }
          );
          return;
        }

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
async function getFilterTerms() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(["filterTerms", "exceptionTerms"], (result) => {
        if (chrome.runtime.lastError) {
          log("Sync storage unavailable, trying local fallback:", chrome.runtime.lastError);
          // If sync fails, try local
          chrome.storage.local.get(["filterTerms", "exceptionTerms"], (localResult) => {
            const filterTerms = localResult.filterTerms || "";
            const exceptionTerms = localResult.exceptionTerms || "";
            resolve({ 
              filterTerms: parseTermEntries(filterTerms), 
              exceptionTerms: parseTermEntries(exceptionTerms) 
            });
          });
          return;
        }

        let filterTerms = result.filterTerms || "";
        let exceptionTerms = result.exceptionTerms || "";

        // If sync is empty but we might have local data (e.g. sync failed previously)
        if (!filterTerms && !exceptionTerms) {
          chrome.storage.local.get(["filterTerms", "exceptionTerms"], (localResult) => {
            filterTerms = localResult.filterTerms || "";
            exceptionTerms = localResult.exceptionTerms || "";
            resolve({ 
              filterTerms: parseTermEntries(filterTerms), 
              exceptionTerms: parseTermEntries(exceptionTerms) 
            });
          });
          return;
        }

        resolve({ 
          filterTerms: parseTermEntries(filterTerms), 
          exceptionTerms: parseTermEntries(exceptionTerms) 
        });
      });
    } catch (error) {
      log("Exception getting filter terms:", error);
      // Final fallback to local
      try {
        chrome.storage.local.get(["filterTerms", "exceptionTerms"], (localResult) => {
          resolve({ 
            filterTerms: parseTermEntries(localResult.filterTerms || ""), 
            exceptionTerms: parseTermEntries(localResult.exceptionTerms || "") 
          });
        });
      } catch (innerError) {
        resolve({ filterTerms: [], exceptionTerms: [] });
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
  }

  if (resetSession) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
  }

  // Do not hide anything on deal detail pages so users can open hidden deals
  // from the popup list and view them normally.
  if (isDealDetailsPage()) {
    hiddenCount = 0;
    hiddenDeals = [];
    hiddenDealKeys.clear();
    clearFilteredElements();
    updateBadge(0);
    return;
  }

  const { filterTerms, exceptionTerms } = await getFilterTerms();

  // If no filter terms, show everything
  if (filterTerms.length === 0) {
    hiddenCount = 0;
    hiddenDeals = []; // Reset hidden deals array
    hiddenDealKeys.clear();

    // Show all previously hidden elements
    clearFilteredElements();
    updateBadge(0);
    return;
  }

  const postings = findDealPostings();

  // Batch DOM operations for better performance
  const elementsToHide = [];
  const elementsToShow = [];
  let newlyDiscoveredUniqueDeals = 0;

  postings.forEach(({ element, title }) => {
    if (matchesFilter(title, filterTerms, exceptionTerms)) {
      const normalizedTitle = normalizeForMatch(title);
      const matchingTermEntry = findMatchingFilterTerm(normalizedTitle, filterTerms);
      const matchingTerm = matchingTermEntry ? matchingTermEntry.raw : "";
      const dealUrl = element.querySelector('a[href*="/deals/"]')?.href || "";
      const dealKey = buildDealUniqueKey(title, dealUrl);

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

  // Keep a cumulative per-page session count.
  hiddenCount = hiddenDeals.length;
  updateBadge(hiddenCount, newlyDiscoveredUniqueDeals);
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

/**
 * Observe DOM changes and refilter when new postings are added
 * More efficient observer that targets specific areas
 */
function observeChanges() {
  if (isDealDetailsPage()) return;

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
          await filterPostings();
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
    filterPostings({ fullRescan: true, resetSession: true })
      .then(() => sendResponse({ status: "filters applied" }))
      .catch((error) => {
        log("Error applying filters after change:", error);
        sendResponse({ status: "error applying filters" });
      });
  } else if (request.type === "getHiddenDeals") {
    sendResponse({ hiddenDeals: [...hiddenDeals] }); // Return a copy of the hidden deals array
  }
  return true; // Required to keep message channel open for async response
});

// Reset hidden deals when the page is reloaded, but preserve the total count
window.addEventListener('beforeunload', () => {
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        filterPostings();
        observeChanges();
      }, 1000); // Increased delay to allow more content to load
    });
  } else {
    setTimeout(() => {
      filterPostings();
      observeChanges();
    }, 1000); // Increased delay to allow more content to load
  }
}

// Start the filter
init();

// Removed periodic refiltering as mutation observer handles dynamic content
// This prevents unnecessary repeated filtering that may cause flickering




