/**
 * Background Service Worker
 * Handles badge updates and message routing
 */

// Store hidden deals information by tab ID
const hiddenDealsInfo = new Map();
const MYDEALZ_BASE_HOST = "mydealz.de";
const BADGE_RESYNC_MAX_ATTEMPTS = 4;
const BADGE_RESYNC_RETRY_DELAY_MS = 350;

function isMydealzDeUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === MYDEALZ_BASE_HOST || hostname.endsWith(`.${MYDEALZ_BASE_HOST}`);
  } catch {
    return false;
  }
}

function setTabActionState(tabId, isMydealzDe, hiddenCount = 0) {
  if (tabId === undefined || tabId === null) return;

  if (isMydealzDe) {
    chrome.action.setBadgeText({
      tabId,
      text: hiddenCount > 0 ? hiddenCount.toString() : "",
    });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#4CAF50" });
    chrome.action.setIcon({
      path: {
        "48": "icons/icon-48.png",
        "96": "icons/icon-96.png",
      },
      tabId,
    });
    return;
  }

  chrome.action.setBadgeText({ tabId, text: "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#808080" });
  chrome.action.setIcon({
    path: {
      "48": "icons/icon-48-grey.png",
      "96": "icons/icon-96-grey.png",
    },
    tabId,
  });
}

function requestHiddenDealsFromTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "getHiddenDeals" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const hiddenDeals = Array.isArray(response?.hiddenDeals) ? response.hiddenDeals : [];
      resolve(hiddenDeals);
    });
  });
}

async function syncTabActionState(tabId, attempt = 0) {
  if (tabId === undefined || tabId === null) return;

  try {
    const tab = await chrome.tabs.get(tabId);
    const isMydealzDeTab = isMydealzDeUrl(tab.url);

    if (!isMydealzDeTab) {
      hiddenDealsInfo.delete(tabId);
      setTabActionState(tabId, false, 0);
      return;
    }

    try {
      const deals = await requestHiddenDealsFromTab(tabId);
      hiddenDealsInfo.set(tabId, deals);
      setTabActionState(tabId, true, deals.length);
    } catch (error) {
      if (attempt < BADGE_RESYNC_MAX_ATTEMPTS) {
        setTimeout(() => {
          syncTabActionState(tabId, attempt + 1);
        }, BADGE_RESYNC_RETRY_DELAY_MS);
        return;
      }

      // Fallback to last known per-tab state when content script is not reachable.
      const cachedDeals = hiddenDealsInfo.get(tabId) || [];
      setTabActionState(tabId, true, cachedDeals.length);
    }
  } catch (error) {
    console.error("Error syncing tab action state:", error);
  }
}

async function syncAllTabsActionState() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id === undefined) continue;
      syncTabActionState(tab.id);
    }
  } catch (error) {
    console.error("Error syncing all tab action states:", error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "updateBadge") {
    if (sender.tab && sender.tab.id !== undefined) {
      const isMydealzDeTab = isMydealzDeUrl(sender.tab.url);
      if (isMydealzDeTab) {
        hiddenDealsInfo.set(sender.tab.id, Array.isArray(request.hiddenDeals) ? request.hiddenDeals : []);
      } else {
        hiddenDealsInfo.delete(sender.tab.id);
      }
      const safeCount = Number.isInteger(request.count) ? request.count : 0;
      setTabActionState(sender.tab.id, isMydealzDeTab, safeCount);
    }
    sendResponse({ status: "badge updated" });
  } else if (request.type === "getHiddenDeals") {
    // Send back the hidden deals for this tab
    let deals = [];
    if (sender.tab && sender.tab.id !== undefined) {
      deals = hiddenDealsInfo.get(sender.tab.id) || [];
    }
    sendResponse({ hiddenDeals: deals });
  }
  return true; // Required to keep message channel open for async response
});

// Handle tab activation to update badge and icon based on current website
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  syncTabActionState(activeInfo.tabId);
});

// Handle tab updates to update badge and icon when URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    syncTabActionState(tabId);
  }
});

// Initialize badge when extension is loaded
chrome.runtime.onInstalled.addListener(() => {
  // Set default badge to grey with no text
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
  syncAllTabsActionState();
});

// Ensure badge is cleared on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
  syncAllTabsActionState();
});

// Clean up hidden deals info when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  hiddenDealsInfo.delete(tabId);
});




