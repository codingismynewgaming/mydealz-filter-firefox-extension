const filterTermsTextarea = document.getElementById("filterTerms");
const exceptionTermsTextarea = document.getElementById("exceptionTerms");
const saveBtn = document.getElementById("saveBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFileInput");
const statusDiv = document.getElementById("status");
const optionsVersionLabel = document.getElementById("optionsVersion");
const hiddenCountSpan = document.getElementById("hiddenCount");
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");
const refreshHiddenBtn = document.getElementById("refreshHiddenBtn");
const MYDEALZ_BASE_HOST = "mydealz.de";
const FILTER_STORAGE_KEYS = ["filterTerms", "exceptionTerms"];

function displayExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  optionsVersionLabel.textContent = `Version ${manifest.version}`;
}

function isMydealzDeUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === MYDEALZ_BASE_HOST || hostname.endsWith(`.${MYDEALZ_BASE_HOST}`);
  } catch {
    return false;
  }
}

function autoGrowTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
  textarea.style.overflowY = "hidden";
}

function autoGrowKeywordTextareas() {
  autoGrowTextarea(filterTermsTextarea);
  autoGrowTextarea(exceptionTermsTextarea);
}

function setupClickToEditTextarea(textarea) {
  if (!textarea) return;

  const lockTextarea = () => {
    textarea.readOnly = true;
    textarea.classList.remove("editable");
  };

  lockTextarea();

  textarea.addEventListener("pointerdown", () => {
    textarea.readOnly = false;
    textarea.classList.add("editable");
  });

  textarea.addEventListener("blur", lockTextarea);
}

function setupClickToEditKeywordFields() {
  setupClickToEditTextarea(filterTermsTextarea);
  setupClickToEditTextarea(exceptionTermsTextarea);
}

function getStorageArea(areaName) {
  return chrome.storage && chrome.storage[areaName] ? chrome.storage[areaName] : null;
}

function storageGet(area, keys) {
  return new Promise((resolve) => {
    if (!area || typeof area.get !== "function") {
      resolve({ result: {}, error: new Error("Storage area unavailable") });
      return;
    }

    area.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        resolve({ result: {}, error: new Error(chrome.runtime.lastError.message) });
        return;
      }
      resolve({ result: result || {}, error: null });
    });
  });
}

function storageSet(area, data) {
  return new Promise((resolve) => {
    if (!area || typeof area.set !== "function") {
      resolve({ error: new Error("Storage area unavailable") });
      return;
    }

    area.set(data, () => {
      if (chrome.runtime.lastError) {
        resolve({ error: new Error(chrome.runtime.lastError.message) });
        return;
      }
      resolve({ error: null });
    });
  });
}

function parseTerms(rawTerms) {
  return (rawTerms || "")
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function normalizeTerm(term) {
  return (term || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mergeUniqueTerms(existingTerms, importedTerms) {
  const merged = [...existingTerms];
  const seen = new Set(existingTerms.map((term) => normalizeTerm(term)));
  let importedCount = 0;
  let skippedCount = 0;

  for (const term of importedTerms) {
    const normalized = normalizeTerm(term);
    if (!normalized) {
      skippedCount++;
      continue;
    }

    if (seen.has(normalized)) {
      skippedCount++;
      continue;
    }

    seen.add(normalized);
    merged.push(term.trim());
    importedCount++;
  }

  return { merged, importedCount, skippedCount };
}

function dedupeTerms(terms) {
  const unique = [];
  const seen = new Set();
  const duplicates = [];

  for (const term of terms) {
    const normalized = normalizeTerm(term);
    if (!normalized) continue;

    if (seen.has(normalized)) {
      duplicates.push(term);
      continue;
    }

    seen.add(normalized);
    unique.push(term.trim());
  }

  return { unique, duplicates };
}

function highlightDuplicateFields(filterDuplicates, exceptionDuplicates) {
  const hasFilterDuplicates = filterDuplicates.length > 0;
  const hasExceptionDuplicates = exceptionDuplicates.length > 0;

  filterTermsTextarea.classList.toggle("has-duplicates", hasFilterDuplicates);
  exceptionTermsTextarea.classList.toggle("has-duplicates", hasExceptionDuplicates);

  if (hasFilterDuplicates || hasExceptionDuplicates) {
    setTimeout(() => {
      filterTermsTextarea.classList.remove("has-duplicates");
      exceptionTermsTextarea.classList.remove("has-duplicates");
    }, 3500);
  }
}

function getExportFilename() {
  const datePart = new Date().toISOString().slice(0, 10);
  return `mydealz-de-filter-settings-${datePart}.json`;
}

function triggerJsonDownload(payload) {
  const fileBlob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const blobUrl = URL.createObjectURL(fileBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = getExportFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

function buildExportPayload() {
  const manifest = chrome.runtime.getManifest();
  const filterTerms = parseTerms(filterTermsTextarea.value);
  const exceptionTerms = parseTerms(exceptionTermsTextarea.value);

  return {
    version: manifest.version,
    exportedAt: new Date().toISOString(),
    filterTerms,
    exceptionTerms,
  };
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") return "Invalid JSON structure.";

  const hasFilterTerms = Array.isArray(payload.filterTerms);
  const hasExceptionTerms = Array.isArray(payload.exceptionTerms);
  if (!hasFilterTerms && !hasExceptionTerms) {
    return "JSON must include filterTerms or exceptionTerms arrays.";
  }

  if (hasFilterTerms && !payload.filterTerms.every((term) => typeof term === "string")) {
    return "filterTerms must be an array of strings.";
  }

  if (
    hasExceptionTerms &&
    !payload.exceptionTerms.every((term) => typeof term === "string")
  ) {
    return "exceptionTerms must be an array of strings.";
  }

  return null;
}

async function loadFilterTerms() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  if (syncArea) {
    const { result, error } = await storageGet(syncArea, FILTER_STORAGE_KEYS);
    if (!error) {
      filterTermsTextarea.value = result.filterTerms || "";
      exceptionTermsTextarea.value = result.exceptionTerms || "";
      autoGrowKeywordTextareas();
      return { storage: "sync" };
    }
  }

  if (localArea) {
    const { result } = await storageGet(localArea, FILTER_STORAGE_KEYS);
    filterTermsTextarea.value = result.filterTerms || "";
    exceptionTermsTextarea.value = result.exceptionTerms || "";
    autoGrowKeywordTextareas();
    return { storage: "local" };
  }

  filterTermsTextarea.value = "";
  exceptionTermsTextarea.value = "";
  autoGrowKeywordTextareas();
  return { storage: "none" };
}

async function saveFilterTerms() {
  const dedupedFilters = dedupeTerms(parseTerms(filterTermsTextarea.value));
  const dedupedExceptions = dedupeTerms(parseTerms(exceptionTermsTextarea.value));
  const filterTerms = dedupedFilters.unique.join(", ");
  const exceptionTerms = dedupedExceptions.unique.join(", ");
  const payload = { filterTerms, exceptionTerms };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  filterTermsTextarea.value = filterTerms;
  exceptionTermsTextarea.value = exceptionTerms;
  autoGrowKeywordTextareas();

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    if (!error) {
      return {
        filterTerms,
        exceptionTerms,
        storage: "sync",
        syncError: false,
        filterDuplicates: dedupedFilters.duplicates,
        exceptionDuplicates: dedupedExceptions.duplicates,
      };
    }
  }

  if (localArea) {
    await storageSet(localArea, payload);
    return {
      filterTerms,
      exceptionTerms,
      storage: "local",
      syncError: true,
      filterDuplicates: dedupedFilters.duplicates,
      exceptionDuplicates: dedupedExceptions.duplicates,
    };
  }

  return {
    filterTerms,
    exceptionTerms,
    storage: "none",
    syncError: true,
    filterDuplicates: dedupedFilters.duplicates,
    exceptionDuplicates: dedupedExceptions.duplicates,
  };
}

async function handleExportFilters() {
  const payload = buildExportPayload();
  if (payload.filterTerms.length === 0 && payload.exceptionTerms.length === 0) {
    showStatus("Nothing to export yet.", "error");
    return;
  }

  triggerJsonDownload(payload);
  showStatus(
    `Exported ${payload.filterTerms.length} filter and ${payload.exceptionTerms.length} exception terms.`
  );
}

async function handleImportFilters(file) {
  if (!file) return;

  let parsedPayload;
  try {
    const fileContent = await file.text();
    parsedPayload = JSON.parse(fileContent);
  } catch {
    showStatus("Import failed: invalid JSON file.", "error");
    return;
  }

  const validationError = validateImportPayload(parsedPayload);
  if (validationError) {
    showStatus(`Import failed: ${validationError}`, "error");
    return;
  }

  const importedFilterTerms = Array.isArray(parsedPayload.filterTerms)
    ? parsedPayload.filterTerms
    : [];
  const importedExceptionTerms = Array.isArray(parsedPayload.exceptionTerms)
    ? parsedPayload.exceptionTerms
    : [];

  const existingFilterTerms = parseTerms(filterTermsTextarea.value);
  const existingExceptionTerms = parseTerms(exceptionTermsTextarea.value);

  const mergedFilters = mergeUniqueTerms(existingFilterTerms, importedFilterTerms);
  const mergedExceptions = mergeUniqueTerms(existingExceptionTerms, importedExceptionTerms);

  filterTermsTextarea.value = mergedFilters.merged.join(", ");
  exceptionTermsTextarea.value = mergedExceptions.merged.join(", ");
  autoGrowKeywordTextareas();

  const { syncError } = await saveFilterTerms();
  await notifyContentScripts();
  setTimeout(() => {
    displayHiddenDeals();
  }, 1200);

  const importedTotal = mergedFilters.importedCount + mergedExceptions.importedCount;
  const skippedTotal = mergedFilters.skippedCount + mergedExceptions.skippedCount;
  const syncSuffix = syncError ? " Saved locally due to sync issue." : "";

  if (importedTotal === 0) {
    showStatus(`No new terms imported. Skipped ${skippedTotal} duplicates.${syncSuffix}`, "error");
    return;
  }

  showStatus(
    `Imported ${importedTotal} terms, skipped ${skippedTotal} duplicates.${syncSuffix}`,
    syncError ? "error" : "success"
  );
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
    const mydealzDeTabs = tabs.filter((tab) => isMydealzDeUrl(tab.url));

    for (const tab of mydealzDeTabs) {
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

function pickBestMydealzDeTab(tabs) {
  const mydealzDeTabs = tabs.filter((tab) => isMydealzDeUrl(tab.url));
  if (mydealzDeTabs.length === 0) return null;

  const activeTab = mydealzDeTabs.find((tab) => tab.active);
  if (activeTab) return activeTab;

  return mydealzDeTabs
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
    const tab = pickBestMydealzDeTab(tabs);

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
    const {
      filterTerms,
      exceptionTerms,
      syncError,
      filterDuplicates,
      exceptionDuplicates,
    } = await saveFilterTerms();
    const filterTermCount = filterTerms
      .split(",")
      .filter((term) => term.trim().length > 0).length;
    const exceptionTermCount = exceptionTerms
      .split(",")
      .filter((term) => term.trim().length > 0).length;
    const duplicateTerms = [...filterDuplicates, ...exceptionDuplicates];
    const uniqueDuplicateLabels = Array.from(new Set(duplicateTerms.map((term) => term.trim())));

    highlightDuplicateFields(filterDuplicates, exceptionDuplicates);

    if (syncError) {
      showStatus("Saved locally. Firefox Sync is currently unavailable.", "error");
    } else if (uniqueDuplicateLabels.length > 0) {
      showStatus(`Saved. Skipped duplicate terms: ${uniqueDuplicateLabels.join(", ")}`);
    } else if (filterTermCount > 0 || exceptionTermCount > 0) {
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

exportBtn.addEventListener("click", async () => {
  await handleExportFilters();
});

importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  await handleImportFilters(file);
  event.target.value = "";
});

refreshHiddenBtn.addEventListener("click", () => {
  displayHiddenDeals();
});

async function init() {
  displayExtensionVersion();
  setupClickToEditKeywordFields();
  await loadFilterTerms();
  autoGrowKeywordTextareas();
  filterTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  exceptionTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  await displayHiddenDeals();
}

init();


