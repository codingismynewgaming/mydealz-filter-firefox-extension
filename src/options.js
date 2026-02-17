const filterTermsTextarea = document.getElementById("filterTerms");
const exceptionTermsTextarea = document.getElementById("exceptionTerms");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const statusDiv = document.getElementById("status");
const optionsVersionLabel = document.getElementById("optionsVersion");
const hiddenCountSpan = document.getElementById("hiddenCount");
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");
const refreshHiddenBtn = document.getElementById("refreshHiddenBtn");
const MYDEALZ_BASE_HOST = "mydealz.de";

function displayExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  optionsVersionLabel.textContent = `Version ${manifest.version}`;
}

function isMyDealzUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === MYDEALZ_BASE_HOST || hostname.endsWith(`.${MYDEALZ_BASE_HOST}`);
  } catch {
    return false;
  }
}

async function loadFilterTerms() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["filterTerms", "exceptionTerms"], (result) => {
      filterTermsTextarea.value = result.filterTerms || "";
      exceptionTermsTextarea.value = result.exceptionTerms || "";
      resolve();
    });
  });
}

async function saveFilterTerms() {
  const filterTerms = filterTermsTextarea.value.trim();
  const exceptionTerms = exceptionTermsTextarea.value.trim();

  return new Promise((resolve) => {
    chrome.storage.sync.set({ filterTerms, exceptionTerms }, () => {
      resolve({ filterTerms, exceptionTerms });
    });
  });
}

function showStatus(message, type = "success") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  setTimeout(() => {
    statusDiv.textContent = "";
    statusDiv.className = "status";
  }, 3000);
}

async function notifyContentScripts() {
  try {
    const tabs = await chrome.tabs.query({});
    const myDealzTabs = tabs.filter((tab) => isMyDealzUrl(tab.url));

    for (const tab of myDealzTabs) {
      chrome.tabs.sendMessage(tab.id, { type: "filtersChanged" }, () => {
        if (chrome.runtime.lastError) {
          // Ignore tabs where content script is not ready.
        }
      });
    }
  } catch {
    // If tabs API is unavailable on this platform, settings are still saved.
  }
}

function showHiddenDealsMessage(message) {
  hiddenCountSpan.textContent = "0";
  noHiddenDeals.textContent = message;
  noHiddenDeals.style.display = "block";
  hiddenDealsList.innerHTML = "";
  hiddenDealsList.appendChild(noHiddenDeals);
}

function renderHiddenDeals(deals) {
  hiddenCountSpan.textContent = String(deals.length);
  hiddenDealsList.innerHTML = "";

  deals.forEach((deal) => {
    const dealItem = document.createElement("div");
    dealItem.className = "deal-item";

    const titleElement = document.createElement("div");
    titleElement.className = "deal-title";

    if (deal.url) {
      const link = document.createElement("a");
      link.href = deal.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = deal.title;
      titleElement.appendChild(link);
    } else {
      titleElement.textContent = deal.title;
    }

    const termElement = document.createElement("div");
    termElement.className = "deal-term";
    termElement.textContent = `Hidden by: "${deal.matchingTerm}"`;

    dealItem.appendChild(titleElement);
    dealItem.appendChild(termElement);
    hiddenDealsList.appendChild(dealItem);
  });
}

function pickBestMyDealzTab(tabs) {
  const myDealzTabs = tabs.filter((tab) => isMyDealzUrl(tab.url));
  if (myDealzTabs.length === 0) return null;

  const activeTab = myDealzTabs.find((tab) => tab.active);
  if (activeTab) return activeTab;

  return myDealzTabs
    .slice()
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
}

async function displayHiddenDeals() {
  if (!chrome.tabs || !chrome.tabs.query || !chrome.tabs.sendMessage) {
    showHiddenDealsMessage("Hidden deals preview is not available on this platform.");
    return;
  }

  try {
    const tabs = await chrome.tabs.query({});
    const tab = pickBestMyDealzTab(tabs);

    if (!tab) {
      showHiddenDealsMessage("Open a mydealz.de tab to view hidden deals.");
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "getHiddenDeals" });
      const deals = response?.hiddenDeals || [];

      if (deals.length > 0) {
        renderHiddenDeals(deals);
      } else {
        showHiddenDealsMessage("No deals have been hidden on this page.");
      }
    } catch {
      showHiddenDealsMessage("No deals have been hidden on this page.");
    }
  } catch {
    showHiddenDealsMessage("Could not load hidden deals.");
  }
}

saveBtn.addEventListener("click", async () => {
  try {
    const { filterTerms, exceptionTerms } = await saveFilterTerms();
    const filterTermCount = filterTerms
      .split(",")
      .filter((term) => term.trim().length > 0).length;
    const exceptionTermCount = exceptionTerms
      .split(",")
      .filter((term) => term.trim().length > 0).length;

    if (filterTermCount > 0 || exceptionTermCount > 0) {
      showStatus(
        `Saved ${filterTermCount} filter term(s) and ${exceptionTermCount} exception term(s).`
      );
    } else {
      showStatus("Filters cleared.");
    }

    await notifyContentScripts();
    setTimeout(() => {
      displayHiddenDeals();
    }, 1200);
  } catch {
    showStatus("Error while saving filters.", "error");
  }
});

clearBtn.addEventListener("click", async () => {
  if (filterTermsTextarea.value.trim() === "" && exceptionTermsTextarea.value.trim() === "") {
    showStatus("Already empty.");
    return;
  }

  filterTermsTextarea.value = "";
  exceptionTermsTextarea.value = "";

  await saveFilterTerms();
  showStatus("All filters cleared.");
  await notifyContentScripts();
  setTimeout(() => {
    displayHiddenDeals();
  }, 1200);
});

refreshHiddenBtn.addEventListener("click", () => {
  displayHiddenDeals();
});

async function init() {
  displayExtensionVersion();
  await loadFilterTerms();
  await displayHiddenDeals();
  setTimeout(() => filterTermsTextarea.focus(), 100);
}

init();
