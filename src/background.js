/**
 * Background Service Worker
 * Handles badge updates and message routing
 */

// Store hidden deals information by tab ID
const hiddenDealsInfo = new Map();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "updateBadge") {
    // Check if the sender is on mydealz.de
    if (sender.tab && sender.tab.url && sender.tab.url.includes("mydealz.de")) {
      if (request.count > 0) {
        chrome.action.setBadgeText({ text: request.count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color
      } else {
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color when on mydealz but no hidden items
      }
      // Store hidden deals info for this tab
      if (sender.tab && sender.tab.id !== undefined) {
        hiddenDealsInfo.set(sender.tab.id, request.hiddenDeals || []);
      }
      // Set the active icon since we're on mydealz.de
      if (sender.tab && sender.tab.id !== undefined) {
        chrome.action.setIcon({
          path: {
            "48": "icons/icon-48.png",
            "96": "icons/icon-96.png"
          },
          tabId: sender.tab.id
        });
      }
    } else {
      // If not on mydealz.de, hide badge and use grey icon
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
      // Set the inactive icon since we're not on mydealz.de
      if (sender.tab && sender.tab.id !== undefined) {
        chrome.action.setIcon({
          path: {
            "48": "icons/icon-48-grey.png",
            "96": "icons/icon-96-grey.png"
          },
          tabId: sender.tab.id
        });
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

// Handle tab activation to update badge and icon based on current website
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes("mydealz.de")) {
      // On mydealz.de - show green icon, potentially with count
      const deals = hiddenDealsInfo.get(tab.id) || [];
      if (deals.length > 0) {
        chrome.action.setBadgeText({ text: deals.length.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color
      } else {
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color when on mydealz
      }
      // Set the active icon
      chrome.action.setIcon({
        path: {
          "48": "icons/icon-48.png",
          "96": "icons/icon-96.png"
        },
        tabId: tab.id
      });
    } else {
      // Not on mydealz.de - show grey icon, no count
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
      // Set the inactive icon
      chrome.action.setIcon({
        path: {
          "48": "icons/icon-48-grey.png",
          "96": "icons/icon-96-grey.png"
        },
        tabId: tab.id
      });
    }
  } catch (error) {
    console.error("Error updating badge on tab activation:", error);
  }
});

// Handle tab updates to update badge and icon when URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes("mydealz.de")) {
      // On mydealz.de - show green icon, potentially with count
      const deals = hiddenDealsInfo.get(tabId) || [];
      if (deals.length > 0) {
        chrome.action.setBadgeText({ text: deals.length.toString() });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color
      } else {
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" }); // Green color when on mydealz
      }
      // Set the active icon
      chrome.action.setIcon({
        path: {
          "48": "icons/icon-48.png",
          "96": "icons/icon-96.png"
        },
        tabId: tabId
      });
    } else {
      // Not on mydealz.de - show grey icon, no count
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#808080" }); // Grey color
      // Set the inactive icon
      chrome.action.setIcon({
        path: {
          "48": "icons/icon-48-grey.png",
          "96": "icons/icon-96-grey.png"
        },
        tabId: tabId
      });
    }
  }
});

// Handle extension icon click - open popup
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes("mydealz.de")) {
    // Open the popup - the popup will fetch hidden deals directly
    chrome.action.openPopup();
  } else {
    // If not on mydealz.de, just open the popup without hidden deals
    chrome.action.openPopup();
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
