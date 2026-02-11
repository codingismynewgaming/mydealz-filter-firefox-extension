/**
 * Background Service Worker
 * Handles badge updates and message routing
 */

// Store hidden deals information by tab ID
const hiddenDealsInfo = new Map();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "updateBadge") {
    if (request.count > 0) {
      chrome.action.setBadgeText({ text: request.count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color
      // Store hidden deals info for this tab
      if (sender.tab && sender.tab.id !== undefined) {
        hiddenDealsInfo.set(sender.tab.id, request.hiddenDeals || []);
      }
    } else {
      chrome.action.setBadgeText({ text: "" });
      // Clear hidden deals info for this tab
      if (sender.tab && sender.tab.id !== undefined) {
        hiddenDealsInfo.delete(sender.tab.id);
      }
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

// Handle extension icon click - open popup
chrome.action.onClicked.addListener(async (tab) => {
  // Open the popup - the popup will fetch hidden deals directly
  chrome.action.openPopup();
});

// Initialize badge when extension is loaded
chrome.runtime.onInstalled.addListener(() => {
  // Set default badge
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color
});

// Ensure badge is cleared on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

// Clean up hidden deals info when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  hiddenDealsInfo.delete(tabId);
});
