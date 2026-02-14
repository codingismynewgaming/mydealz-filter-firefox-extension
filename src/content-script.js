/**
 * Content Script for myDealz Filter - Optimized for mydealz.de structure
 * This script runs on mydealz.de pages and filters postings based on keywords
 */

const DEBUG = false; // Set to true for console logging

// Store the hidden count and details
let hiddenCount = 0;
let hiddenDeals = []; // Track hidden deals with details
const hiddenDealKeys = new Set(); // Prevent duplicate hidden deals within one page session

// Store the total count of hidden deals across sessions
let totalHiddenDealCount = 0;

/**
 * Debug logging helper
 */
function log(...args) {
  if (DEBUG) console.log("[myDealz Filter]", ...args);
}

/**
 * Load the total hidden deal count from storage
 */
async function loadTotalHiddenDealCount() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["totalHiddenDealCount"], (result) => {
      totalHiddenDealCount = result.totalHiddenDealCount || 0;
      log("Loaded total hidden deal count from storage:", totalHiddenDealCount);
      resolve(totalHiddenDealCount);
    });
  });
}


/**
 * Get filter terms and exception terms from storage
 */
async function getFilterTerms() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(["filterTerms", "exceptionTerms"], (result) => {
        // Check for errors
        if (chrome.runtime.lastError) {
          log("Error retrieving filter terms:", chrome.runtime.lastError);
          resolve({ filterTerms: [], exceptionTerms: [] });
          return;
        }

        const filterTerms = result.filterTerms || "";
        const exceptionTerms = result.exceptionTerms || "";
        
        // Split by comma and trim whitespace for filter terms
        const filterTermsList = filterTerms
          .split(",")
          .map((term) => term.trim().toLowerCase())
          .filter((term) => term.length > 0);
          
        // Split by comma and trim whitespace for exception terms
        const exceptionTermsList = exceptionTerms
          .split(",")
          .map((term) => term.trim().toLowerCase())
          .filter((term) => term.length > 0);
          
        resolve({ filterTerms: filterTermsList, exceptionTerms: exceptionTermsList });
      });
    } catch (error) {
      log("Exception getting filter terms:", error);
      resolve({ filterTerms: [], exceptionTerms: [] });
    }
  });
}

/**
 * Check if a title matches any filter term but excludes terms that also contain exception terms
 * Uses optimized matching with early termination
 */
function matchesFilter(title, filterTerms, exceptionTerms) {
  if (!title || filterTerms.length === 0) return false;

  // Convert title to lowercase once for all comparisons
  const lowerTitle = title.toLowerCase();

  // First check if the title contains any exception terms
  if (exceptionTerms && exceptionTerms.length > 0) {
    for (const exceptionTerm of exceptionTerms) {
      if (lowerTitle.includes(exceptionTerm.toLowerCase())) {
        // If it contains an exception term, don't filter it even if it contains filter terms
        return false;
      }
    }
  }

  // Use a more efficient loop with early termination to check filter terms
  for (const term of filterTerms) {
    if (lowerTitle.includes(term)) {
      return true; // Early return on first match
    }
  }

  return false;
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
    ".cept-tt",                      // Mydealz specific class for titles
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

  // Try class-based selectors specific to mydealz
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
 * Optimized for myDealz's actual HTML structure
 */
function findDealPostings() {
  const postings = [];

  // MyDealz specific selectors (in order of preference)
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

  const { filterTerms, exceptionTerms } = await getFilterTerms();

  // If no filter terms, show everything
  if (filterTerms.length === 0) {
    hiddenCount = 0;
    hiddenDeals = []; // Reset hidden deals array
    hiddenDealKeys.clear();

    // Show all previously hidden elements
    document.querySelectorAll('[data-mydealz-filtered="true"]').forEach(el => {
      el.style.display = "";
      el.removeAttribute("data-mydealz-filtered");
      el.removeAttribute("data-filter-term"); // Remove filter term attribute
      el.removeAttribute("data-mydealz-counted"); // Remove counted attribute as well
    });
    updateBadge(0);
    return;
  }

  const postings = findDealPostings();

  // Batch DOM operations for better performance
  const elementsToHide = [];
  const elementsToShow = [];
  let newHiddenCount = 0;

  postings.forEach(({ element, title }) => {
    if (matchesFilter(title, filterTerms, exceptionTerms)) {
      // Find which term matched (among filter terms, not exception terms)
      const matchingTerm = filterTerms.find(term => title.toLowerCase().includes(term));
      const dealUrl = element.querySelector('a[href*="/deals/"]')?.href || "";
      const dealKey = `${dealUrl || title.toLowerCase()}|${matchingTerm}`;

      if (!hiddenDealKeys.has(dealKey)) {
        hiddenDealKeys.add(dealKey);
        hiddenDeals.push({ title, url: dealUrl, matchingTerm });
        newHiddenCount++;
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
  updateBadge(hiddenCount, newHiddenCount);
}

/**
 * Update the badge count in the extension icon
 */
async function updateBadge(currentCount, newHiddenCount = 0) {
  try {
    // Update the total hidden deal count by the number of newly hidden deals
    if (newHiddenCount > 0) {
      totalHiddenDealCount += newHiddenCount;
    }
    
    // Save both counts to storage in a single operation
    const storageUpdate = {
      hiddenDealCount: currentCount,
      totalHiddenDealCount: totalHiddenDealCount
    };
    
    chrome.storage.sync.set(storageUpdate, () => {
      if (chrome.runtime.lastError) {
        log("Error saving hidden deal counts to storage:", chrome.runtime.lastError);
      } else {
        log("Saved hidden deal counts to storage - current:", currentCount, "total:", totalHiddenDealCount);
      }
    });

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
  document.querySelectorAll('[data-mydealz-filtered="true"]').forEach(el => {
    el.style.display = "";
    el.removeAttribute("data-mydealz-filtered");
    el.removeAttribute("data-filter-term");
    el.removeAttribute("data-mydealz-counted"); // Remove the counted attribute as well
  });
});

// Initialize and start the filter
async function init() {
  // Load the total hidden deal count from storage
  await loadTotalHiddenDealCount();
  
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
