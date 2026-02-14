/**
 * Popup Script
 * Handles user interactions in the popup
 */

// Main elements
const filterTermsTextarea = document.getElementById("filterTerms");
const exceptionTermsTextarea = document.getElementById("exceptionTerms");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const statusDiv = document.getElementById("status");

// Tab elements
const settingsTabBtn = document.getElementById("settingsTabBtn");
const hiddenPostsTabBtn = document.getElementById("hiddenPostsTabBtn");
const settingsTab = document.getElementById("settingsTab");
const hiddenPostsTab = document.getElementById("hiddenPostsTab");
const hiddenCountSpan = document.getElementById("hiddenCount");

// Hidden deals elements
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");

// Current hidden deals data
let currentHiddenDeals = [];

/**
 * Load saved filter terms and exception terms from storage
 */
async function loadFilterTerms() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["filterTerms", "exceptionTerms"], (result) => {
      const filterTerms = result.filterTerms || "";
      const exceptionTerms = result.exceptionTerms || "";

      filterTermsTextarea.value = filterTerms;
      exceptionTermsTextarea.value = exceptionTerms;

      resolve({ filterTerms, exceptionTerms });
    });
  });
}

/**
 * Load and display the total hidden deal count from storage
 */
async function loadAndDisplayTotalHiddenCount() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["totalHiddenDealCount"], (result) => {
      const totalHiddenDealCount = result.totalHiddenDealCount || 0;
      
      // Find the subtitle element and append the count information
      const subtitleElement = document.querySelector('.header .subtitle');
      if (subtitleElement) {
        // Remove any existing count information
        const originalSubtitle = "Hide postings by keywords";
        
        // Only update if we're adding new information
        if (!subtitleElement.textContent.includes("Total hidden:")) {
          subtitleElement.textContent = `${originalSubtitle} • Total hidden: ${totalHiddenDealCount}`;
        } else {
          // If already present, just update the number
          subtitleElement.textContent = subtitleElement.textContent.replace(
            /Total hidden: \d+/, 
            `Total hidden: ${totalHiddenDealCount}`
          );
        }
      }
      
      resolve({ totalHiddenDealCount });
    });
  });
}

/**
 * Save filter terms and exception terms to storage
 */
async function saveFilterTerms() {
  const filterTerms = filterTermsTextarea.value.trim();
  const exceptionTerms = exceptionTermsTextarea.value.trim();

  return new Promise((resolve) => {
    chrome.storage.sync.set({ 
      filterTerms: filterTerms,
      exceptionTerms: exceptionTerms
    }, () => {
      resolve({ filterTerms, exceptionTerms });
    });
  });
}

/**
 * Show status message
 */
function showStatus(message, type = "success") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusDiv.textContent = "";
    statusDiv.className = "status";
  }, 3000);
}

/**
 * Notify content scripts about filter change
 */
async function notifyContentScripts() {
  const tabs = await chrome.tabs.query({
    url: "*://www.mydealz.de/*",
  });

  for (const tab of tabs) {
    chrome.tabs.sendMessage(
      tab.id,
      { type: "filtersChanged" },
      (response) => {
        // Ignore errors if content script is not loaded yet
        if (chrome.runtime.lastError) {
          console.log("Content script not loaded on tab:", tab.id);
        }
      }
    );
  }
  
  // Update the total hidden count display after notifying content scripts
  setTimeout(async () => {
    await loadAndDisplayTotalHiddenCount();
  }, 1500); // Give content scripts time to update the counts
}

/**
 * Display hidden deals in the popup
 */
async function displayHiddenDeals() {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (tab && tab.url && tab.url.includes("mydealz.de")) {
      // Request hidden deals from the content script on the current tab
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "getHiddenDeals" });
        currentHiddenDeals = response?.hiddenDeals || [];

        if (currentHiddenDeals && currentHiddenDeals.length > 0) {
          // Update the hidden count in the tab button
          hiddenCountSpan.textContent = currentHiddenDeals.length;

          // Clear the list
          hiddenDealsList.innerHTML = '';

          // Add each hidden deal to the list
          currentHiddenDeals.forEach(deal => {
            const dealItem = document.createElement('div');
            dealItem.className = 'deal-item';

            const titleElement = document.createElement('div');
            titleElement.className = 'deal-title';

            if (deal.url) {
              const link = document.createElement('a');
              link.href = deal.url;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.textContent = deal.title;
              titleElement.appendChild(link);
            } else {
              titleElement.textContent = deal.title;
            }

            const termElement = document.createElement('div');
            termElement.className = 'deal-term';
            termElement.textContent = `Hidden by: "${deal.matchingTerm}"`;

            dealItem.appendChild(titleElement);
            dealItem.appendChild(termElement);
            hiddenDealsList.appendChild(dealItem);
          });
        } else {
          // Update the hidden count in the tab button
          hiddenCountSpan.textContent = '0';

          // Show default message when no hidden deals
          noHiddenDeals.textContent = "No deals have been hidden on this page.";
          noHiddenDeals.style.display = "block";
          hiddenDealsList.innerHTML = '';
          hiddenDealsList.appendChild(noHiddenDeals);
        }
      } catch (sendError) {
        // Content script may not be loaded yet or tab may not be ready
        console.error("Error getting hidden deals from content script:", sendError);
        // Update the hidden count in the tab button
        hiddenCountSpan.textContent = '0';

        // Show default message when no hidden deals
        noHiddenDeals.textContent = "No deals have been hidden on this page.";
        noHiddenDeals.style.display = "block";
        hiddenDealsList.innerHTML = '';
        hiddenDealsList.appendChild(noHiddenDeals);
      }
    } else {
      // Update the hidden count in the tab button
      hiddenCountSpan.textContent = '0';

      // Show default message when not on mydealz.de
      noHiddenDeals.textContent = "Visit mydealz.de to see hidden deals.";
      noHiddenDeals.style.display = "block";
      hiddenDealsList.innerHTML = '';
      hiddenDealsList.appendChild(noHiddenDeals);
    }
    
    // Update the total hidden count display
    await loadAndDisplayTotalHiddenCount();
  } catch (error) {
    console.error("Error getting active tab:", error);
    // Update the hidden count in the tab button
    hiddenCountSpan.textContent = '0';

    // Show default message when no hidden deals
    noHiddenDeals.textContent = "No deals have been hidden on this page.";
    noHiddenDeals.style.display = "block";
    hiddenDealsList.innerHTML = '';
    hiddenDealsList.appendChild(noHiddenDeals);
    
    // Update the total hidden count display
    await loadAndDisplayTotalHiddenCount();
  }
}

/**
 * Switch to the specified tab
 */
function switchTab(tabName) {
  // Remove active class from all tabs and buttons
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to the selected tab and button
  if (tabName === 'settings') {
    settingsTab.classList.add('active');
    settingsTabBtn.classList.add('active');
  } else if (tabName === 'hiddenPosts') {
    hiddenPostsTab.classList.add('active');
    hiddenPostsTabBtn.classList.add('active');
    
    // Refresh hidden deals when switching to this tab
    displayHiddenDeals();
  }
}

/**
 * Save button click handler
 */
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
      showStatus(`✓ Saved ${filterTermCount} filter term(s) and ${exceptionTermCount} exception term(s)!`, "success");
    } else {
      showStatus("✓ Filters cleared", "success");
    }

    // Notify content scripts about the change
    await notifyContentScripts();

    // Refresh hidden deals after saving filters
    if (hiddenPostsTab.classList.contains('active')) {
      displayHiddenDeals();
    }
  } catch (error) {
    console.error("Error saving filters:", error);
    showStatus("✗ Error saving filters", "error");
  }
});

/**
 * Clear button click handler
 */
clearBtn.addEventListener("click", async () => {
  if (filterTermsTextarea.value.trim() === "" && exceptionTermsTextarea.value.trim() === "") {
    showStatus("Already empty", "success");
    return;
  }

  filterTermsTextarea.value = "";
  exceptionTermsTextarea.value = "";
  await saveFilterTerms();
  showStatus("✓ All filters cleared", "success");
  await notifyContentScripts();

  // Refresh hidden deals after clearing filters
  if (hiddenPostsTab.classList.contains('active')) {
    displayHiddenDeals();
  }
});

/**
 * Tab button event listeners
 */
settingsTabBtn.addEventListener('click', () => {
  switchTab('settings');
});

hiddenPostsTabBtn.addEventListener('click', () => {
  switchTab('hiddenPosts');
});

/**
 * Initialize popup by loading saved filters and setting up tabs
 */
async function init() {
  // Load the filter terms and exception terms
  await loadFilterTerms();

  // Focus on the filter terms textarea for better UX
  setTimeout(() => {
    filterTermsTextarea.focus();
  }, 100);

  // Set up initial tab state - start with settings tab
  switchTab('settings');

  // Load hidden deals data to update the count
  await displayHiddenDeals();

  // Load and display the total hidden deal count
  await loadAndDisplayTotalHiddenCount();
}

// Initialize the popup
init();
