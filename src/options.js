const filterTermsTextarea = document.getElementById("filterTerms");
const exceptionTermsTextarea = document.getElementById("exceptionTerms");
const saveBtn = document.getElementById("saveBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFileInput");
const statusDiv = document.getElementById("status");
const optionsVersionLabel = document.getElementById("optionsVersion");
const syncStatusBadge = document.getElementById("syncStatusBadge");
const hiddenCountSpan = document.getElementById("hiddenCount");

function setSyncStatus(state, label) {
  if (!syncStatusBadge) return;

  const resolvedState = ["ok", "error", "checking"].includes(state) ? state : "checking";
  syncStatusBadge.classList.remove("ok", "error", "checking");
  syncStatusBadge.classList.add(resolvedState);

  if (label) {
    syncStatusBadge.textContent = label;
    syncStatusBadge.title = label;
    return;
  }

  if (resolvedState === "ok") {
    syncStatusBadge.textContent = "Sync: On";
    syncStatusBadge.title = "Firefox Sync is active";
  } else if (resolvedState === "error") {
    syncStatusBadge.textContent = "Sync: Off";
    syncStatusBadge.title = "Firefox Sync unavailable. Using local fallback";
  } else {
    syncStatusBadge.textContent = "Sync: ...";
    syncStatusBadge.title = "Checking Firefox Sync status";
  }
}
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");
const refreshHiddenBtn = document.getElementById("refreshHiddenBtn");
const MYDEALZ_BASE_HOST = "mydealz.de";
const FILTER_STORAGE_KEYS = ["filterTerms", "exceptionTerms"];
const BACKUP_FORMAT = "mydealz-filter-backup";
const BACKUP_SCHEMA_VERSION = 2;

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

function storageClear(area) {
  return new Promise((resolve) => {
    if (!area || typeof area.clear !== "function") {
      resolve({ error: new Error("Storage area unavailable") });
      return;
    }

    area.clear(() => {
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

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFullBackupPayload(payload) {
  return isPlainObject(payload) && isPlainObject(payload.storage);
}

function getBackupStoragePayload(payload) {
  if (!isFullBackupPayload(payload)) return {};

  const syncData = isPlainObject(payload.storage.sync) ? payload.storage.sync : {};
  const localData = isPlainObject(payload.storage.local) ? payload.storage.local : {};
  return { ...localData, ...syncData };
}

async function getStorageSnapshot() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  const { result: syncData, error: syncError } = await storageGet(syncArea, null);
  const { result: localData, error: localError } = await storageGet(localArea, null);

  return {
    syncData: isPlainObject(syncData) ? syncData : {},
    localData: isPlainObject(localData) ? localData : {},
    syncError,
    localError,
  };
}

async function buildExportPayload() {
  const manifest = chrome.runtime.getManifest();
  const { syncData, localData, syncError, localError } = await getStorageSnapshot();
  const mergedData = { ...localData, ...syncData };
  const filterTerms = parseTerms(
    typeof mergedData.filterTerms === "string" ? mergedData.filterTerms : ""
  );
  const exceptionTerms = parseTerms(
    typeof mergedData.exceptionTerms === "string" ? mergedData.exceptionTerms : ""
  );

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    version: manifest.version,
    exportedAt: new Date().toISOString(),
    filterTerms,
    exceptionTerms,
    storage: {
      local: localData,
      sync: syncData,
    },
    storageErrors: {
      local: !!localError,
      sync: !!syncError,
    },
  };
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") return "Invalid JSON structure.";

  if (isFullBackupPayload(payload)) {
    if (payload.storage.sync !== undefined && !isPlainObject(payload.storage.sync)) {
      return "storage.sync must be an object.";
    }
    if (payload.storage.local !== undefined && !isPlainObject(payload.storage.local)) {
      return "storage.local must be an object.";
    }
    return null;
  }

  // Support both array and string (legacy/alternative formats)
  const filterTerms = payload.filterTerms;
  const exceptionTerms = payload.exceptionTerms;

  const hasFilterTerms = Array.isArray(filterTerms) || typeof filterTerms === "string";
  const hasExceptionTerms = Array.isArray(exceptionTerms) || typeof exceptionTerms === "string";

  if (!hasFilterTerms && !hasExceptionTerms) {
    return "JSON must include filterTerms or exceptionTerms.";
  }

  if (Array.isArray(filterTerms) && !filterTerms.every((term) => typeof term === "string")) {
    return "filterTerms must be an array of strings.";
  }

  if (Array.isArray(exceptionTerms) && !exceptionTerms.every((term) => typeof term === "string")) {
    return "exceptionTerms must be an array of strings.";
  }

  return null;
}

async function restoreStorageBackup(payload) {
  const mergedPayload = getBackupStoragePayload(payload);
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;
  let localError = false;

  if (syncArea) {
    const { error: clearError } = await storageClear(syncArea);
    if (clearError) {
      console.error("Sync storage clear error:", clearError);
      syncError = true;
      setSyncStatus("error");
    } else {
      const { error } = await storageSet(syncArea, mergedPayload);
      if (error) {
        console.error("Sync storage restore error:", error);
        syncError = true;
        setSyncStatus("error");
      } else {
        setSyncStatus("ok");
      }
    }
  } else {
    syncError = true;
    setSyncStatus("error", "Sync: Off");
  }

  if (localArea) {
    const { error: clearError } = await storageClear(localArea);
    if (clearError) {
      console.error("Local storage clear error:", clearError);
      localError = true;
    } else {
      const { error } = await storageSet(localArea, mergedPayload);
      if (error) {
        console.error("Local storage restore error:", error);
        localError = true;
      }
    }
  } else {
    localError = true;
  }

  return {
    syncError,
    localError,
    restoredKeyCount: Object.keys(mergedPayload).length,
  };
}

async function loadFilterTerms() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let loadedFrom = "none";
  let filterTerms = "";
  let exceptionTerms = "";

  // Always try sync first for the most up-to-date data.
  if (syncArea) {
    const { result, error } = await storageGet(syncArea, FILTER_STORAGE_KEYS);
    if (!error && (result.filterTerms || result.exceptionTerms)) {
      filterTerms = result.filterTerms || "";
      exceptionTerms = result.exceptionTerms || "";
      loadedFrom = "sync";
      setSyncStatus("ok");
    } else if (error) {
      console.error("Error loading from sync storage:", error);
      setSyncStatus("error");
    }
  } else {
    setSyncStatus("error", "Sync: Off");
  }

  // Fallback to local if sync yielded nothing or failed.
  if (loadedFrom === "none" && localArea) {
    const { result } = await storageGet(localArea, FILTER_STORAGE_KEYS);
    if (result.filterTerms || result.exceptionTerms) {
      filterTerms = result.filterTerms || "";
      exceptionTerms = result.exceptionTerms || "";
      loadedFrom = "local";
    }
  }

  filterTermsTextarea.value = filterTerms;
  exceptionTermsTextarea.value = exceptionTerms;
  autoGrowKeywordTextareas();
  return { storage: loadedFrom };
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

  let syncError = false;
  let localError = false;
  let quotaExceeded = false;

  // 8KB per-item quota check for Firefox Sync
  const SYNC_QUOTA_PER_ITEM = 8192;
  if (new Blob([filterTerms]).size > SYNC_QUOTA_PER_ITEM || 
      new Blob([exceptionTerms]).size > SYNC_QUOTA_PER_ITEM) {
    console.warn("Sync quota might be exceeded for these filters.");
    quotaExceeded = true;
  }

  // Save to sync if available.
  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    if (error) {
      console.error("Sync storage error:", error);
      syncError = true;
      setSyncStatus("error");
    } else {
      setSyncStatus("ok");
    }
  } else {
    syncError = true;
    setSyncStatus("error", "Sync: Off");
  }

  // Always save to local as a reliable mirror.
  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Local storage error:", error);
      localError = true;
    }
  }

  return {
    filterTerms,
    exceptionTerms,
    storage: !syncError ? "sync" : "local",
    syncError,
    localError,
    quotaExceeded,
    filterDuplicates: dedupedFilters.duplicates,
    exceptionDuplicates: dedupedExceptions.duplicates,
  };
}

async function handleExportFilters() {
  const payload = await buildExportPayload();
  const syncKeys = Object.keys(payload.storage.sync || {}).length;
  const localKeys = Object.keys(payload.storage.local || {}).length;

  if (syncKeys === 0 && localKeys === 0) {
    showStatus("Nothing to export yet.", "error");
    return;
  }

  triggerJsonDownload(payload);
  showStatus(
    `Exported full backup (${syncKeys} sync key(s), ${localKeys} local key(s)).`
  );
}

async function handleImportFilters(file) {
  if (!file) {
    console.warn("[mydealz Filter] No file selected for import.");
    return;
  }

  showStatus("Reading file...", "success");
  console.log("[mydealz Filter] Starting import for file:", file.name, file.type, file.size);

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsText(file);
    });
  };

  let parsedPayload;
  try {
    const fileContent = await readFileAsText(file);
    console.log("[mydealz Filter] File content read successfully. Length:", fileContent.length);
    parsedPayload = JSON.parse(fileContent);
  } catch (err) {
    console.error("[mydealz Filter] Error reading or parsing JSON:", err);
    showStatus("Import failed: invalid JSON file.", "error");
    return;
  }

  console.log("[mydealz Filter] Validating payload structure...");
  const validationError = validateImportPayload(parsedPayload);
  if (validationError) {
    console.error("[mydealz Filter] Validation error:", validationError);
    showStatus(`Import failed: ${validationError}`, "error");
    return;
  }

  if (isFullBackupPayload(parsedPayload)) {
    try {
      const { syncError, localError, restoredKeyCount } = await restoreStorageBackup(parsedPayload);
      await loadFilterTerms();
      await notifyContentScripts();
      setTimeout(() => {
        displayHiddenDeals();
      }, 1200);

      let suffix = "";
      if (syncError && localError) suffix = " (Sync + local restore issues)";
      else if (syncError) suffix = " (Sync issue)";
      else if (localError) suffix = " (Local issue)";

      showStatus(
        `Imported full backup (${restoredKeyCount} key(s)).${suffix}`,
        syncError || localError ? "error" : "success"
      );
      return;
    } catch (err) {
      console.error("[mydealz Filter] Full backup restore failed:", err);
      showStatus("Import failed while restoring full backup.", "error");
      return;
    }
  }

  try {
    const importedFilterTerms = Array.isArray(parsedPayload.filterTerms)
      ? parsedPayload.filterTerms
      : typeof parsedPayload.filterTerms === "string"
      ? parseTerms(parsedPayload.filterTerms)
      : [];
    const importedExceptionTerms = Array.isArray(parsedPayload.exceptionTerms)
      ? parsedPayload.exceptionTerms
      : typeof parsedPayload.exceptionTerms === "string"
      ? parseTerms(parsedPayload.exceptionTerms)
      : [];

    console.log("[mydealz Filter] Parsed terms:", {
      filters: importedFilterTerms.length,
      exceptions: importedExceptionTerms.length
    });

    const existingFilterTerms = parseTerms(filterTermsTextarea.value);
    const existingExceptionTerms = parseTerms(exceptionTermsTextarea.value);

    console.log("[mydealz Filter] Merging with existing terms...");
    const mergedFilters = mergeUniqueTerms(existingFilterTerms, importedFilterTerms);
    const mergedExceptions = mergeUniqueTerms(existingExceptionTerms, importedExceptionTerms);

    console.log("[mydealz Filter] Merge results:", {
      filters: mergedFilters.importedCount,
      exceptions: mergedExceptions.importedCount,
      skipped: mergedFilters.skippedCount + mergedExceptions.skippedCount
    });

    filterTermsTextarea.value = mergedFilters.merged.join(", ");
    exceptionTermsTextarea.value = mergedExceptions.merged.join(", ");
    autoGrowKeywordTextareas();

    console.log("[mydealz Filter] Saving merged terms to storage...");
    const { syncError, quotaExceeded } = await saveFilterTerms();
    console.log("[mydealz Filter] Save completed.", { syncError, quotaExceeded });
    
    await notifyContentScripts();

    setTimeout(() => {
      displayHiddenDeals();
    }, 1200);

    const importedTotal = mergedFilters.importedCount + mergedExceptions.importedCount;
    const skippedTotal = mergedFilters.skippedCount + mergedExceptions.skippedCount;
    
    let syncSuffix = "";
    if (syncError) syncSuffix = " Saved locally (Sync issue).";
    else if (quotaExceeded) syncSuffix = " (Quota warning)";

    if (importedTotal === 0) {
      showStatus(
        `No new terms found. ${skippedTotal} duplicates skipped.${syncSuffix}`,
        syncError ? "error" : "success"
      );
    } else {
      showStatus(
        `Imported ${importedTotal} terms, ${skippedTotal} skipped.${syncSuffix}`,
        syncError ? "error" : "success"
      );
    }
    console.log("[mydealz Filter] Import process finished successfully.");
  } catch (err) {
    console.error("[mydealz Filter] Unexpected import logic error:", err);
    showStatus("Import failed due to an internal error.", "error");
  }
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
      quotaExceeded,
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

    let syncSuffix = "";
    if (syncError) syncSuffix = " Saved locally (Sync issue).";
    else if (quotaExceeded) syncSuffix = " (Quota warning)";

    if (uniqueDuplicateLabels.length > 0) {
      showStatus(`Saved. Skipped duplicate terms: ${uniqueDuplicateLabels.join(", ")}${syncSuffix}`, syncError ? "error" : "success");
    } else if (filterTermCount > 0 || exceptionTermCount > 0) {
      showStatus(
        `Saved ${filterTermCount} filter term(s) and ${exceptionTermCount} exception term(s).${syncSuffix}`, syncError ? "error" : "success"
      );
    } else {
      showStatus(`Filters cleared.${syncSuffix}`, syncError ? "error" : "success");
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
  importFileInput.value = "";
  if (typeof importFileInput.showPicker === "function") {
    try {
      importFileInput.showPicker();
      return;
    } catch {
      // Fallback for browsers that block showPicker in extension contexts.
    }
  }
  importFileInput.click();
});

importFileInput.addEventListener("change", async (event) => {
  const fileList = event && event.target ? event.target.files : null;
  const file = fileList && fileList.length > 0 ? fileList[0] : null;
  await handleImportFilters(file);
  if (event && event.target) {
    event.target.value = "";
  }
});

refreshHiddenBtn.addEventListener("click", () => {
  displayHiddenDeals();
});

async function init() {
  displayExtensionVersion();
  setSyncStatus("checking");
  setupClickToEditKeywordFields();
  await loadFilterTerms();
  autoGrowKeywordTextareas();
  filterTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  exceptionTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  await displayHiddenDeals();
}

init();
