/**
 * Background Service Worker
 * Handles badge updates and message routing
 */

// Store hidden deals information by tab ID
const hiddenDealsInfo = new Map();
const MYDEALZ_BASE_HOST = "mydealz.de";

function isMyDealzUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === MYDEALZ_BASE_HOST || hostname.endsWith(`.${MYDEALZ_BASE_HOST}`);
  } catch {
    return false;
  }
}

function setTabActionState(tabId, isMyDealz, hiddenCount = 0) {
  if (tabId === undefined || tabId === null) return;

  if (isMyDealz) {
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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "updateBadge") {
    if (sender.tab && sender.tab.id !== undefined) {
      const isMyDealzTab = isMyDealzUrl(sender.tab.url);
      if (isMyDealzTab) {
        hiddenDealsInfo.set(sender.tab.id, request.hiddenDeals || []);
      } else {
        hiddenDealsInfo.delete(sender.tab.id);
      }
      setTabActionState(sender.tab.id, isMyDealzTab, request.count || 0);
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
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const isMyDealzTab = isMyDealzUrl(tab.url);
    const deals = isMyDealzTab ? hiddenDealsInfo.get(tab.id) || [] : [];
    setTabActionState(tab.id, isMyDealzTab, deals.length);
  } catch (error) {
    console.error("Error updating badge on tab activation:", error);
  }
});

// Handle tab updates to update badge and icon when URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const isMyDealzTab = isMyDealzUrl(tab.url);
    if (!isMyDealzTab) {
      hiddenDealsInfo.delete(tabId);
    }
    const deals = isMyDealzTab ? hiddenDealsInfo.get(tabId) || [] : [];
    setTabActionState(tabId, isMyDealzTab, deals.length);
  }
});

// Initialize badge when extension is loaded
chrome.runtime.onInstalled.addListener(() => {
  // Set default badge to grey with no text
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
});

// Ensure badge is cleared on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
});

// Clean up hidden deals info when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  hiddenDealsInfo.delete(tabId);
});
