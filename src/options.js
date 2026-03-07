const filterTermsTextarea = document.getElementById("filterTerms");
const exceptionTermsTextarea = document.getElementById("exceptionTerms");
const saveBtn = document.getElementById("saveBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFileInput");
const statusDiv = document.getElementById("status");
const optionsVersionLabel = document.getElementById("optionsVersion");
const hiddenCountSpan = document.getElementById("hiddenCount");
const autoSortCommentsCheckbox = document.getElementById("autoSortComments");
const greyOutSeenDealsCheckbox = document.getElementById("greyOutSeenDeals");
const newCategoryNameInput = document.getElementById("newCategoryName");
const createCategoryBtn = document.getElementById("createCategoryBtn");
const enableAllCategoriesBtn = document.getElementById("enableAllCategoriesBtn");
const disableAllCategoriesBtn = document.getElementById("disableAllCategoriesBtn");
const categorySummary = document.getElementById("categorySummary");
const categoriesList = document.getElementById("categoriesList");
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");
const refreshHiddenBtn = document.getElementById("refreshHiddenBtn");
const MYDEALZ_BASE_HOST = "mydealz.de";
const FILTER_STORAGE_KEYS = [
  "filterTerms",
  "exceptionTerms",
  "autoSortComments",
  "greyOutSeenDeals",
  "filterTermCategories",
  "categoryStates",
];
const BACKUP_FORMAT = "mydealz-filter-backup";
const BACKUP_SCHEMA_VERSION = 2;
const DEFAULT_CATEGORY_NAME = "Uncategorized";
const FILTER_CATEGORY_STORAGE_KEY = "filterTermCategories";
const CATEGORY_STATES_STORAGE_KEY = "categoryStates";
let currentCategoryData = { [DEFAULT_CATEGORY_NAME]: [] };
let currentCategoryStates = { [DEFAULT_CATEGORY_NAME]: true };
let currentDraggedTerm = null;

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

function normalizeCategoryName(name) {
  return (name || "").trim().replace(/\s+/g, " ");
}

function isValidCategoryName(name) {
  const normalized = normalizeCategoryName(name);
  return /^[\p{L}\p{N}\s-]{1,50}$/u.test(normalized);
}

function cloneCategoryData(categoryData) {
  return Object.fromEntries(
    Object.entries(categoryData || {}).map(([categoryName, terms]) => [
      categoryName,
      Array.isArray(terms) ? [...terms] : [],
    ])
  );
}

function cloneCategoryStates(categoryStates) {
  return { ...(categoryStates || {}) };
}

function normalizeCategoryConfiguration(rawCategories, rawStates, filterTerms) {
  const dedupedTerms = dedupeTerms(filterTerms).unique;
  const termLookup = new Map(
    dedupedTerms.map((term) => [normalizeTerm(term), term])
  );
  const assignedTerms = new Set();
  const normalizedCategories = {};

  for (const [rawCategoryName, rawTerms] of Object.entries(rawCategories || {})) {
    const candidateName = normalizeCategoryName(rawCategoryName);
    if (!candidateName) continue;

    const categoryName =
      normalizeTerm(candidateName) === normalizeTerm(DEFAULT_CATEGORY_NAME)
        ? DEFAULT_CATEGORY_NAME
        : candidateName;
    const safeTerms = Array.isArray(rawTerms) ? rawTerms : [];
    const categoryTerms = [];

    safeTerms.forEach((term) => {
      const normalized = normalizeTerm(term);
      const canonical = termLookup.get(normalized);
      if (!canonical || assignedTerms.has(normalized)) return;
      assignedTerms.add(normalized);
      categoryTerms.push(canonical);
    });

    if (!normalizedCategories[categoryName]) {
      normalizedCategories[categoryName] = categoryTerms;
    } else {
      normalizedCategories[categoryName].push(...categoryTerms);
    }
  }

  const uncategorizedTerms = dedupedTerms.filter((term) => !assignedTerms.has(normalizeTerm(term)));
  normalizedCategories[DEFAULT_CATEGORY_NAME] = normalizedCategories[DEFAULT_CATEGORY_NAME] || [];
  uncategorizedTerms.forEach((term) => {
    if (!normalizedCategories[DEFAULT_CATEGORY_NAME].some((entry) => normalizeTerm(entry) === normalizeTerm(term))) {
      normalizedCategories[DEFAULT_CATEGORY_NAME].push(term);
    }
  });

  const normalizedStates = {};
  Object.keys(normalizedCategories).forEach((categoryName) => {
    normalizedStates[categoryName] = rawStates?.[categoryName] !== false;
  });

  return {
    categoryData: normalizedCategories,
    categoryStates: normalizedStates,
  };
}

async function loadCategoryConfigurationForTerms(filterTerms) {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let rawCategories = {};
  let rawStates = {};

  if (syncArea) {
    const { result, error } = await storageGet(syncArea, [
      FILTER_CATEGORY_STORAGE_KEY,
      CATEGORY_STATES_STORAGE_KEY,
    ]);
    if (!error) {
      rawCategories = isPlainObject(result[FILTER_CATEGORY_STORAGE_KEY])
        ? result[FILTER_CATEGORY_STORAGE_KEY]
        : {};
      rawStates = isPlainObject(result[CATEGORY_STATES_STORAGE_KEY])
        ? result[CATEGORY_STATES_STORAGE_KEY]
        : {};
    }
  }

  if (Object.keys(rawCategories).length === 0 && localArea) {
    const { result } = await storageGet(localArea, [
      FILTER_CATEGORY_STORAGE_KEY,
      CATEGORY_STATES_STORAGE_KEY,
    ]);
    rawCategories = isPlainObject(result[FILTER_CATEGORY_STORAGE_KEY])
      ? result[FILTER_CATEGORY_STORAGE_KEY]
      : {};
    rawStates = isPlainObject(result[CATEGORY_STATES_STORAGE_KEY])
      ? result[CATEGORY_STATES_STORAGE_KEY]
      : {};
  }

  return normalizeCategoryConfiguration(rawCategories, rawStates, filterTerms);
}

async function persistCategoryConfiguration(categoryData, categoryStates) {
  currentCategoryData = cloneCategoryData(categoryData);
  currentCategoryStates = cloneCategoryStates(categoryStates);
  const payload = {
    [FILTER_CATEGORY_STORAGE_KEY]: currentCategoryData,
    [CATEGORY_STATES_STORAGE_KEY]: currentCategoryStates,
  };

  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    syncError = !!error;
    if (error) {
      console.error("Sync storage error while saving categories:", error);
    }
  } else {
    syncError = true;
  }

  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Local storage error while saving categories:", error);
    }
  }

  renderCategoryGroups();
  await notifyContentScripts();
  return { syncError };
}

function updateCategorySummary() {
  const categories = Object.keys(currentCategoryData);
  const activeCount = categories.filter((categoryName) => currentCategoryStates[categoryName] !== false).length;
  categorySummary.textContent = `${activeCount} of ${categories.length} categories active`;
}

function renderCategoryGroups() {
  categoriesList.innerHTML = "";
  updateCategorySummary();

  Object.entries(currentCategoryData).forEach(([categoryName, terms]) => {
    const categoryGroup = document.createElement("section");
    categoryGroup.className = "category-group";
    if (currentCategoryStates[categoryName] === false) {
      categoryGroup.classList.add("is-disabled");
    }
    categoryGroup.dataset.categoryName = categoryName;

    const header = document.createElement("div");
    header.className = "category-header";

    const titleRow = document.createElement("div");
    titleRow.className = "category-title-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = currentCategoryStates[categoryName] !== false;
    checkbox.addEventListener("change", async () => {
      currentCategoryStates[categoryName] = checkbox.checked;
      await persistCategoryConfiguration(currentCategoryData, currentCategoryStates);
      showStatus(
        `${categoryName} ${checkbox.checked ? "enabled" : "disabled"}.`,
        "success"
      );
    });

    const title = document.createElement("span");
    title.className = "category-label";
    title.textContent = categoryName;

    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = `${terms.length} term${terms.length === 1 ? "" : "s"}`;

    titleRow.appendChild(checkbox);
    titleRow.appendChild(title);
    titleRow.appendChild(count);

    const actions = document.createElement("div");
    actions.className = "category-actions";

    if (categoryName !== DEFAULT_CATEGORY_NAME) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-secondary";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        const movedTerms = currentCategoryData[categoryName] || [];
        currentCategoryData[DEFAULT_CATEGORY_NAME] = [
          ...(currentCategoryData[DEFAULT_CATEGORY_NAME] || []),
          ...movedTerms,
        ];
        delete currentCategoryData[categoryName];
        delete currentCategoryStates[categoryName];
        const normalized = normalizeCategoryConfiguration(
          currentCategoryData,
          currentCategoryStates,
          dedupeTerms(parseTerms(filterTermsTextarea.value)).unique
        );
        await persistCategoryConfiguration(normalized.categoryData, normalized.categoryStates);
        showStatus(`Deleted category ${categoryName}.`, "success");
      });
      actions.appendChild(deleteBtn);
    }

    header.appendChild(titleRow);
    header.appendChild(actions);

    const termContainer = document.createElement("div");
    termContainer.className = "category-terms";

    const setDropTargetState = (isActive) => {
      categoryGroup.classList.toggle("is-drop-target", isActive);
    };

    termContainer.addEventListener("dragover", (event) => {
      event.preventDefault();
      setDropTargetState(true);
    });
    termContainer.addEventListener("dragleave", () => {
      setDropTargetState(false);
    });
    termContainer.addEventListener("drop", async (event) => {
      event.preventDefault();
      setDropTargetState(false);
      if (!currentDraggedTerm) return;
      const { term, fromCategory } = currentDraggedTerm;
      if (!term || !fromCategory || fromCategory === categoryName) return;

      currentCategoryData[fromCategory] = (currentCategoryData[fromCategory] || []).filter(
        (entry) => normalizeTerm(entry) !== normalizeTerm(term)
      );
      currentCategoryData[categoryName] = [...(currentCategoryData[categoryName] || []), term];
      const normalized = normalizeCategoryConfiguration(
        currentCategoryData,
        currentCategoryStates,
        dedupeTerms(parseTerms(filterTermsTextarea.value)).unique
      );
      await persistCategoryConfiguration(normalized.categoryData, normalized.categoryStates);
      showStatus(`Moved "${term}" to ${categoryName}.`, "success");
    });

    if (terms.length === 0) {
      const emptyText = document.createElement("p");
      emptyText.className = "category-empty";
      emptyText.textContent = "Drop filter terms here.";
      termContainer.appendChild(emptyText);
    } else {
      terms.forEach((term) => {
        const chip = document.createElement("span");
        chip.className = "term-chip";
        chip.textContent = term;
        chip.draggable = true;
        chip.addEventListener("dragstart", () => {
          currentDraggedTerm = { term, fromCategory: categoryName };
          chip.classList.add("is-dragging");
        });
        chip.addEventListener("dragend", () => {
          currentDraggedTerm = null;
          chip.classList.remove("is-dragging");
          document.querySelectorAll(".category-group.is-drop-target").forEach((entry) => {
            entry.classList.remove("is-drop-target");
          });
        });
        termContainer.appendChild(chip);
      });
    }

    categoryGroup.appendChild(header);
    categoryGroup.appendChild(termContainer);
    categoriesList.appendChild(categoryGroup);
  });
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
    } else {
      const { error } = await storageSet(syncArea, mergedPayload);
      if (error) {
        console.error("Sync storage restore error:", error);
        syncError = true;
      }
    }
  } else {
    syncError = true;
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
    } else if (error) {
      console.error("Error loading from sync storage:", error);
    }
    if (!error) {
      autoSortCommentsCheckbox.checked = result.autoSortComments === true;
      greyOutSeenDealsCheckbox.checked = result.greyOutSeenDeals === true;
    }
  }

  // Fallback to local if sync yielded nothing or failed.
  if (loadedFrom === "none" && localArea) {
    const { result } = await storageGet(localArea, FILTER_STORAGE_KEYS);
    if (result.filterTerms || result.exceptionTerms) {
      filterTerms = result.filterTerms || "";
      exceptionTerms = result.exceptionTerms || "";
      loadedFrom = "local";
    }
    autoSortCommentsCheckbox.checked = result.autoSortComments === true;
    greyOutSeenDealsCheckbox.checked = result.greyOutSeenDeals === true;
  }

  filterTermsTextarea.value = filterTerms;
  exceptionTermsTextarea.value = exceptionTerms;
  autoGrowKeywordTextareas();
  const categoryConfig = await loadCategoryConfigurationForTerms(parseTerms(filterTerms));
  currentCategoryData = categoryConfig.categoryData;
  currentCategoryStates = categoryConfig.categoryStates;
  renderCategoryGroups();
  return { storage: loadedFrom };
}

async function saveFilterTerms() {
  const dedupedFilters = dedupeTerms(parseTerms(filterTermsTextarea.value));
  const dedupedExceptions = dedupeTerms(parseTerms(exceptionTermsTextarea.value));
  const filterTerms = dedupedFilters.unique.join(", ");
  const exceptionTerms = dedupedExceptions.unique.join(", ");
  const normalizedCategoryConfig = normalizeCategoryConfiguration(
    currentCategoryData,
    currentCategoryStates,
    dedupedFilters.unique
  );
  currentCategoryData = normalizedCategoryConfig.categoryData;
  currentCategoryStates = normalizedCategoryConfig.categoryStates;
  const payload = {
    filterTerms,
    exceptionTerms,
    autoSortComments: autoSortCommentsCheckbox.checked,
    greyOutSeenDeals: greyOutSeenDealsCheckbox.checked,
    [FILTER_CATEGORY_STORAGE_KEY]: currentCategoryData,
    [CATEGORY_STATES_STORAGE_KEY]: currentCategoryStates,
  };

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
    }
  } else {
    syncError = true;
  }

  // Always save to local as a reliable mirror.
  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Local storage error:", error);
      localError = true;
    }
  }

  renderCategoryGroups();

  return {
    filterTerms,
    exceptionTerms,
    autoSortComments: payload.autoSortComments,
    greyOutSeenDeals: payload.greyOutSeenDeals,
    storage: !syncError ? "sync" : "local",
    syncError,
    localError,
    quotaExceeded,
    filterDuplicates: dedupedFilters.duplicates,
    exceptionDuplicates: dedupedExceptions.duplicates,
  };
}

async function saveTogglePreferences() {
  const payload = {
    autoSortComments: autoSortCommentsCheckbox.checked,
    greyOutSeenDeals: greyOutSeenDealsCheckbox.checked,
  };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    syncError = !!error;
    if (error) {
      console.error("Sync storage error while saving toggle preferences:", error);
    }
  } else {
    syncError = true;
  }

  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Local storage error while saving toggle preferences:", error);
    }
  }

  await notifyContentScripts();
  return { syncError };
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

createCategoryBtn.addEventListener("click", async () => {
  const categoryName = normalizeCategoryName(newCategoryNameInput.value);
  if (!isValidCategoryName(categoryName)) {
    showStatus("Category names must be 1-50 chars and use letters, numbers, spaces, or hyphens.", "error");
    return;
  }

  if (Object.keys(currentCategoryData).some((entry) => normalizeTerm(entry) === normalizeTerm(categoryName))) {
    showStatus("Category already exists.", "error");
    return;
  }

  currentCategoryData[categoryName] = [];
  currentCategoryStates[categoryName] = true;
  await persistCategoryConfiguration(currentCategoryData, currentCategoryStates);
  newCategoryNameInput.value = "";
  showStatus(`Created category ${categoryName}.`, "success");
});

enableAllCategoriesBtn.addEventListener("click", async () => {
  Object.keys(currentCategoryData).forEach((categoryName) => {
    currentCategoryStates[categoryName] = true;
  });
  await persistCategoryConfiguration(currentCategoryData, currentCategoryStates);
  showStatus("All categories enabled.", "success");
});

disableAllCategoriesBtn.addEventListener("click", async () => {
  Object.keys(currentCategoryData).forEach((categoryName) => {
    currentCategoryStates[categoryName] = false;
  });
  await persistCategoryConfiguration(currentCategoryData, currentCategoryStates);
  showStatus("All categories disabled.", "success");
});

newCategoryNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createCategoryBtn.click();
  }
});

autoSortCommentsCheckbox.addEventListener("change", async () => {
  const { syncError } = await saveTogglePreferences();
  showStatus(
    `Auto-sort comments ${autoSortCommentsCheckbox.checked ? "enabled" : "disabled"}.${
      syncError ? " Saved locally." : ""
    }`,
    syncError ? "error" : "success"
  );
});

greyOutSeenDealsCheckbox.addEventListener("change", async () => {
  const { syncError } = await saveTogglePreferences();
  showStatus(
    `Grey out seen deals ${greyOutSeenDealsCheckbox.checked ? "enabled" : "disabled"}.${
      syncError ? " Saved locally." : ""
    }`,
    syncError ? "error" : "success"
  );
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
