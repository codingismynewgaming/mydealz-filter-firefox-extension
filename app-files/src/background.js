/**
 * Background Service Worker
 * Handles badge updates and message routing
 */

const hiddenDealsInfo = new Map();
const BADGE_RESYNC_MAX_ATTEMPTS = 4;
const BADGE_RESYNC_RETRY_DELAY_MS = 350;
const KEYWORD_DIALOG_PATH = "src/keyword-dialog.html";

const { isMydealzDeUrl, getStorageArea, storageSet } = MydealzFilterShared;

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
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "96": "icons/icon-96.png",
        "128": "icons/icon-128.png",
      },
      tabId,
    });
    return;
  }

  chrome.action.setBadgeText({ tabId, text: "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#808080" });
  chrome.action.setIcon({
    path: {
      "16": "icons/icon-16-grey.png",
      "32": "icons/icon-32-grey.png",
      "48": "icons/icon-48-grey.png",
      "96": "icons/icon-96-grey.png",
      "128": "icons/icon-128-grey.png",
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

async function setShortcutPreference(shortcut) {
  const payload = { customShortcut: shortcut, keywordShortcut: shortcut };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  if (syncArea) {
    await storageSet(syncArea, payload);
  }
  if (localArea) {
    await storageSet(localArea, payload);
  }
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
    } catch {
      if (attempt < BADGE_RESYNC_MAX_ATTEMPTS) {
        setTimeout(() => {
          syncTabActionState(tabId, attempt + 1);
        }, BADGE_RESYNC_RETRY_DELAY_MS);
        return;
      }

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || typeof request.type !== "string") {
    return false;
  }

  if (request.type === "updateKeyboardShortcut") {
    if (chrome.commands && chrome.commands.update) {
      chrome.commands.update(
        {
          name: "open-keyword-dialog",
          shortcut: request.shortcut,
        },
        async () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to update keyboard shortcut:", chrome.runtime.lastError);
            sendResponse({
              status: "error",
              message: chrome.runtime.lastError.message,
              saved: false,
            });
            return;
          }

          await setShortcutPreference(request.shortcut);
          sendResponse({ status: "success", shortcut: request.shortcut, saved: true });
        }
      );
      return true;
    }

    setShortcutPreference(request.shortcut).then(() => {
      sendResponse({
        status: "saved",
        message: "Shortcut saved (commands.update not available)",
        saved: true,
      });
    });
    return true;
  }

  if (request.type === "openShortcutSettings") {
    (async () => {
      if (chrome.commands && typeof chrome.commands.openShortcutSettings === "function") {
        try {
          await chrome.commands.openShortcutSettings();
          sendResponse({ status: "opened" });
          return;
        } catch (error) {
          console.warn("openShortcutSettings failed:", error);
        }
      }

      try {
        const shortcutsUrl =
          typeof navigator !== "undefined" && /Edg\//.test(navigator.userAgent)
            ? "edge://extensions/shortcuts"
            : "chrome://extensions/shortcuts";
        await chrome.tabs.create({ url: shortcutsUrl });
        sendResponse({ status: "opened" });
      } catch (error) {
        sendResponse({
          status: "unsupported",
          message: error?.message || "Could not open shortcut settings.",
        });
      }
    })();
    return true;
  }

  if (request.type === "updateBadge") {
    if (sender.tab && sender.tab.id !== undefined) {
      const isMydealzDeTab = isMydealzDeUrl(sender.tab.url);
      if (isMydealzDeTab) {
        hiddenDealsInfo.set(
          sender.tab.id,
          Array.isArray(request.hiddenDeals) ? request.hiddenDeals : []
        );
      } else {
        hiddenDealsInfo.delete(sender.tab.id);
      }
      const safeCount = Number.isInteger(request.count) ? request.count : 0;
      setTabActionState(sender.tab.id, isMydealzDeTab, safeCount);
    }
    sendResponse({ status: "badge updated" });
    return false;
  }

  return false;
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  syncTabActionState(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    syncTabActionState(tabId);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#808080" });
  syncAllTabsActionState();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({ color: "#808080" });
  syncAllTabsActionState();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  hiddenDealsInfo.delete(tabId);
});

async function openOrFocusKeywordDialog() {
  const dialogUrl = chrome.runtime.getURL(KEYWORD_DIALOG_PATH);
  try {
    const existingTabs = await chrome.tabs.query({ url: dialogUrl });
    const existingTab = existingTabs.find((tab) => tab && tab.windowId !== undefined);
    if (existingTab) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
      if (existingTab.id !== undefined) {
        await chrome.tabs.update(existingTab.id, { active: true });
      }
      return;
    }
  } catch (error) {
    console.warn("Could not query existing keyword dialog windows:", error);
  }

  chrome.windows.create({
    url: KEYWORD_DIALOG_PATH,
    type: "popup",
    width: 400,
    height: 300,
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-keyword-dialog") {
    openOrFocusKeywordDialog();
  }
});
