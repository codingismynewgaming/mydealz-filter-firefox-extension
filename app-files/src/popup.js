/**
 * Popup Script
 * Handles user interactions in the popup
 */

// Main elements
const filterTermsTextarea = document.getElementById("filterTerms");
const exceptionTermsTextarea = document.getElementById("exceptionTerms");
const saveBtn = document.getElementById("saveBtn");
const statusDiv = document.getElementById("status");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const popupVersionLabel = document.getElementById("popupVersion");
const autoSortCommentsCheckbox = document.getElementById("autoSortComments");
const greyOutSeenDealsCheckbox = document.getElementById("greyOutSeenDeals");
const greyOutOpacityRange = document.getElementById("greyOutOpacity");
const greyOutOpacityValue = document.getElementById("greyOutOpacityValue");

// Tab elements
const settingsTabBtn = document.getElementById("settingsTabBtn");
const hiddenPostsTabBtn = document.getElementById("hiddenPostsTabBtn");
const statisticsTabBtn = document.getElementById("statisticsTabBtn");
const manageGroupsTabBtn = document.getElementById("manageGroupsTabBtn");
const infoTabBtn = document.getElementById("infoTabBtn");
const settingsTab = document.getElementById("settingsTab");
const hiddenPostsTab = document.getElementById("hiddenPostsTab");
const statisticsTab = document.getElementById("statisticsTab");
const manageGroupsTab = document.getElementById("manageGroupsTab");
const infoTab = document.getElementById("infoTab");
const hiddenCountSpan = document.getElementById("hiddenCount");

// Hidden deals elements
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");
const statisticsList = document.getElementById("statisticsList");
const noStatisticsData = document.getElementById("noStatisticsData");
const manageGroupsList = document.getElementById("manageGroupsList");
const noManageGroupsData = document.getElementById("noManageGroupsData");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const groupedViewBtn = document.getElementById("groupedViewBtn");
const ungroupedViewBtn = document.getElementById("ungroupedViewBtn");
const createStatsGroupBtn = document.getElementById("createStatsGroupBtn");

// Current hidden deals data
let currentHiddenDeals = [];
const MYDEALZ_BASE_HOST = "mydealz.de";
const THEME_STORAGE_KEY = "popupTheme";
const FILTER_STORAGE_KEYS = [
  "filterTerms",
  "exceptionTerms",
  "autoSortComments",
  "greyOutSeenDeals",
  "greyOutOpacityPercent",
];
const BACKUP_FORMAT = "mydealz-filter-backup";
const BACKUP_SCHEMA_VERSION = 2;
const POPUP_MAX_HEIGHT_PX = 600;
const SETTINGS_POPUP_TARGET_HEIGHT_PX = 720;
const INFO_POPUP_TARGET_HEIGHT_PX = 740;
const FILTER_STATS_STORAGE_KEY = "hiddenCountsByTerm";
const STATS_GROUPS_STORAGE_KEY = "statisticsGroups";
const STATS_VIEW_MODE_STORAGE_KEY = "statisticsViewMode";
const DEFAULT_STATS_VIEW_MODE = "ungrouped";
const GREY_OUT_OPACITY_KEY = "greyOutOpacityPercent";
const DEFAULT_GREY_OUT_OPACITY_PERCENT = 30;
let currentTheme = "light";
let currentStatisticsGroups = {};
let currentStatisticsViewMode = DEFAULT_STATS_VIEW_MODE;
let selectedStatisticTerms = new Set();
let expandedStatisticGroups = new Set();

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

function normalizeOpacityPercent(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return DEFAULT_GREY_OUT_OPACITY_PERCENT;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function updateGreyOutOpacityUI(value) {
  const normalized = normalizeOpacityPercent(value);
  if (greyOutOpacityRange) {
    greyOutOpacityRange.value = `${normalized}`;
  }
  if (greyOutOpacityValue) {
    greyOutOpacityValue.textContent = `${normalized}%`;
  }
  return normalized;
}

function getGreyOutOpacityPercent() {
  if (!greyOutOpacityRange) return DEFAULT_GREY_OUT_OPACITY_PERCENT;
  return normalizeOpacityPercent(greyOutOpacityRange.value);
}

function updatePopupSizingForHiddenCount(hiddenCount) {
  const availableViewportHeight =
    window.screen?.availHeight || window.innerHeight || POPUP_MAX_HEIGHT_PX;
  const maxPopupHeight = Math.min(POPUP_MAX_HEIGHT_PX, Math.floor(availableViewportHeight * 0.8));
  const safeMaxPopupHeight = Math.max(360, maxPopupHeight);

  const desiredPopupHeight = 360 + Math.min(hiddenCount, 12) * 22;
  const finalPopupHeight = Math.min(desiredPopupHeight, safeMaxPopupHeight);
  document.body.style.maxHeight = `${safeMaxPopupHeight}px`;
  document.body.style.height = `${finalPopupHeight}px`;

  const listDesiredHeight = 180 + hiddenCount * 52;
  const listMaxHeight = Math.max(200, finalPopupHeight - 220);
  const finalListHeight = Math.min(listDesiredHeight, listMaxHeight);
  hiddenDealsList.style.maxHeight = `${finalListHeight}px`;
  hiddenDealsList.style.overflowY = listDesiredHeight > listMaxHeight ? "auto" : "hidden";
}

function updatePopupSizingForStatisticsCount(statCount) {
  const availableViewportHeight =
    window.screen?.availHeight || window.innerHeight || POPUP_MAX_HEIGHT_PX;
  const maxPopupHeight = Math.min(POPUP_MAX_HEIGHT_PX, Math.floor(availableViewportHeight * 0.8));
  const safeMaxPopupHeight = Math.max(360, maxPopupHeight);

  const desiredPopupHeight = 360 + Math.min(statCount, 12) * 20;
  const finalPopupHeight = Math.min(desiredPopupHeight, safeMaxPopupHeight);
  document.body.style.maxHeight = `${safeMaxPopupHeight}px`;
  document.body.style.height = `${finalPopupHeight}px`;

  const listDesiredHeight = 170 + statCount * 46;
  const listMaxHeight = Math.max(190, finalPopupHeight - 210);
  const finalListHeight = Math.min(listDesiredHeight, listMaxHeight);
  statisticsList.style.maxHeight = `${finalListHeight}px`;
  statisticsList.style.overflowY = listDesiredHeight > listMaxHeight ? "auto" : "hidden";
}

function applyFixedPopupHeight(targetHeight) {
  const availableViewportHeight =
    window.screen?.availHeight || window.innerHeight || POPUP_MAX_HEIGHT_PX;
  const maxPopupHeight = Math.min(POPUP_MAX_HEIGHT_PX, Math.floor(availableViewportHeight * 0.8));
  const safeMaxPopupHeight = Math.max(420, maxPopupHeight);
  const finalPopupHeight = Math.min(targetHeight, safeMaxPopupHeight);

  document.body.style.maxHeight = `${safeMaxPopupHeight}px`;
  document.body.style.height = `${finalPopupHeight}px`;
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

function buildStatisticsGroupId(name) {
  const slug = normalizeTerm(name)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `group-${Date.now()}`;
}

function normalizeStatisticsGroups(rawGroups, availableTerms = []) {
  const normalizedAvailableTerms = new Set(availableTerms.map((term) => normalizeTerm(term)));
  const assignedTerms = new Set();
  const normalizedGroups = {};

  Object.entries(rawGroups || {}).forEach(([groupId, group]) => {
    if (!groupId || !group || typeof group !== "object") return;
    const groupName = typeof group.name === "string" ? group.name.trim() : "";
    if (!groupName) return;
    const groupTerms = Array.isArray(group.terms) ? group.terms : [];
    const filteredTerms = [];

    groupTerms.forEach((term) => {
      const normalized = normalizeTerm(term);
      if (!normalizedAvailableTerms.has(normalized) || assignedTerms.has(normalized)) return;
      assignedTerms.add(normalized);
      filteredTerms.push(term);
    });

    if (filteredTerms.length === 0) return;
    normalizedGroups[groupId] = {
      name: groupName,
      terms: filteredTerms,
      createdAt: Number.isInteger(group.createdAt) ? group.createdAt : Date.now(),
    };
  });

  return normalizedGroups;
}

function getGroupedTermsSet(groups) {
  return new Set(
    Object.values(groups).flatMap((group) => group.terms.map((term) => normalizeTerm(term)))
  );
}

async function loadStatisticsGroups(availableTerms = []) {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let rawGroups = {};
  let rawViewMode = null;

  if (syncArea) {
    const { result, error } = await storageGet(syncArea, [
      STATS_GROUPS_STORAGE_KEY,
      STATS_VIEW_MODE_STORAGE_KEY,
    ]);
    if (!error) {
      rawGroups = isPlainObject(result[STATS_GROUPS_STORAGE_KEY]) ? result[STATS_GROUPS_STORAGE_KEY] : {};
      rawViewMode = result[STATS_VIEW_MODE_STORAGE_KEY];
    }
  }

  if (Object.keys(rawGroups).length === 0 && localArea) {
    const { result } = await storageGet(localArea, [
      STATS_GROUPS_STORAGE_KEY,
      STATS_VIEW_MODE_STORAGE_KEY,
    ]);
    rawGroups = isPlainObject(result[STATS_GROUPS_STORAGE_KEY]) ? result[STATS_GROUPS_STORAGE_KEY] : {};
    if (!rawViewMode) rawViewMode = result[STATS_VIEW_MODE_STORAGE_KEY];
  }

  currentStatisticsGroups = normalizeStatisticsGroups(rawGroups, availableTerms);
  const hasGroups = Object.keys(currentStatisticsGroups).length > 0;
  currentStatisticsViewMode =
    rawViewMode === "grouped" || rawViewMode === "ungrouped"
      ? rawViewMode
      : hasGroups
      ? "grouped"
      : DEFAULT_STATS_VIEW_MODE;

  if (hasGroups && currentStatisticsViewMode !== "grouped" && !rawViewMode) {
    currentStatisticsViewMode = "grouped";
    await persistStatisticsGroups();
  }
}

async function persistStatisticsGroups() {
  const payload = {
    [STATS_GROUPS_STORAGE_KEY]: currentStatisticsGroups,
    [STATS_VIEW_MODE_STORAGE_KEY]: currentStatisticsViewMode,
  };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    if (error) {
      console.error("Error saving statistics groups to sync storage:", error);
    }
  }

  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Error saving statistics groups to local storage:", error);
    }
  }
}

function updateStatisticsViewButtons() {
  groupedViewBtn.classList.toggle("is-active", currentStatisticsViewMode === "grouped");
  ungroupedViewBtn.classList.toggle("is-active", currentStatisticsViewMode === "ungrouped");
}

function updateCreateGroupButton() {
  createStatsGroupBtn.disabled = selectedStatisticTerms.size < 2;
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

function isMydealzDeUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === MYDEALZ_BASE_HOST || hostname.endsWith(`.${MYDEALZ_BASE_HOST}`);
  } catch {
    return false;
  }
}

function detectSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function displayExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  if (popupVersionLabel) {
    popupVersionLabel.textContent = `Version ${manifest.version}`;
  }
}

function updateThemeToggleLabel() {
  themeToggleBtn.textContent = currentTheme === "dark" ? "Light" : "Dark";
  themeToggleBtn.title =
    currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

function applyTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeToggleLabel();
}

async function loadThemePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([THEME_STORAGE_KEY], (syncResult) => {
      let storedTheme = syncResult[THEME_STORAGE_KEY];
      if (storedTheme === "dark" || storedTheme === "light") {
        applyTheme(storedTheme);
        resolve(storedTheme);
        return;
      }

      chrome.storage.local.get([THEME_STORAGE_KEY], (localResult) => {
        storedTheme = localResult[THEME_STORAGE_KEY];
        const initialTheme =
          storedTheme === "dark" || storedTheme === "light"
            ? storedTheme
            : detectSystemTheme();
        applyTheme(initialTheme);
        resolve(initialTheme);
      });
    });
  });
}

async function saveThemePreference(theme) {
  const payload = { [THEME_STORAGE_KEY]: theme };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    if (error) {
      console.error("Error saving popup theme to sync storage:", error);
    }
  }

  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Error saving popup theme to local storage:", error);
    }
  }
}

async function saveTogglePreferences() {
  const payload = {
    autoSortComments: autoSortCommentsCheckbox.checked,
    greyOutSeenDeals: greyOutSeenDealsCheckbox.checked,
    [GREY_OUT_OPACITY_KEY]: getGreyOutOpacityPercent(),
  };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    syncError = !!error;
    if (error) {
      console.error("Error saving toggle preferences to sync storage:", error);
    }
  } else {
    syncError = true;
  }

  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Error saving toggle preferences to local storage:", error);
    }
  }

  await notifyContentScripts();
  return { syncError };
}

/**
 * Load saved filter terms and exception terms from storage
 */
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
      console.error("Error loading terms from sync storage:", error);
    }
    if (!error) {
      autoSortCommentsCheckbox.checked = result.autoSortComments === true;
      greyOutSeenDealsCheckbox.checked = result.greyOutSeenDeals === true;
      updateGreyOutOpacityUI(result[GREY_OUT_OPACITY_KEY]);
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
    updateGreyOutOpacityUI(result[GREY_OUT_OPACITY_KEY]);
  }

  filterTermsTextarea.value = filterTerms;
  exceptionTermsTextarea.value = exceptionTerms;
  autoGrowKeywordTextareas();
  return { filterTerms, exceptionTerms, storage: loadedFrom };
}

/**
 * Load and display the total hidden deal count from storage
 */
async function loadAndDisplayTotalHiddenCount() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["totalHiddenDealCount"], (result) => {
      const updateSubtitle = (totalHiddenDealCount) => {
        const subtitleElement = document.querySelector(".header .subtitle");
        if (subtitleElement) {
          const originalSubtitle = "Hide postings by keywords";
          if (!subtitleElement.textContent.includes("Total hidden:")) {
            subtitleElement.textContent = `${originalSubtitle} • Total hidden: ${totalHiddenDealCount}`;
          } else {
            subtitleElement.textContent = subtitleElement.textContent.replace(
              /Total hidden: \d+/,
              `Total hidden: ${totalHiddenDealCount}`
            );
          }
        }

        resolve({ totalHiddenDealCount });
      };

      if (Number.isInteger(result.totalHiddenDealCount)) {
        updateSubtitle(result.totalHiddenDealCount);
        return;
      }

      chrome.storage.sync.get(["totalHiddenDealCount"], (syncResult) => {
        updateSubtitle(
          Number.isInteger(syncResult.totalHiddenDealCount)
            ? syncResult.totalHiddenDealCount
            : 0
        );
      });
    });
  });
}

/**
 * Save filter terms and exception terms to storage
 */
async function saveFilterTerms() {
  const dedupedFilters = dedupeTerms(parseTerms(filterTermsTextarea.value));
  const dedupedExceptions = dedupeTerms(parseTerms(exceptionTermsTextarea.value));
  const filterTerms = dedupedFilters.unique.join(", ");
  const exceptionTerms = dedupedExceptions.unique.join(", ");
  const payload = {
    filterTerms,
    exceptionTerms,
    autoSortComments: autoSortCommentsCheckbox.checked,
    greyOutSeenDeals: greyOutSeenDealsCheckbox.checked,
    [GREY_OUT_OPACITY_KEY]: getGreyOutOpacityPercent(),
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

  return {
    filterTerms,
    exceptionTerms,
    autoSortComments: payload.autoSortComments,
    greyOutSeenDeals: payload.greyOutSeenDeals,
    greyOutOpacityPercent: payload[GREY_OUT_OPACITY_KEY],
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
    `Exported full backup (${syncKeys} sync key(s), ${localKeys} local key(s)).`,
    "success"
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

    if (hiddenPostsTab.classList.contains("active")) {
      displayHiddenDeals();
    } else if (statisticsTab.classList.contains("active")) {
      displayFilterStatistics();
    } else if (manageGroupsTab.classList.contains("active")) {
      renderManageGroupsTab();
    }

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

function openOptionsPageForImport() {
  const fallbackUrl =
    chrome.runtime && typeof chrome.runtime.getURL === "function"
      ? chrome.runtime.getURL("src/options.html")
      : "src/options.html";

  const openFallbackTab = () => {
    if (chrome.tabs && typeof chrome.tabs.create === "function") {
      chrome.tabs.create({ url: fallbackUrl });
      return;
    }
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  };

  if (chrome.runtime && typeof chrome.runtime.openOptionsPage === "function") {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        openFallbackTab();
      }
    });
    return;
  }

  openFallbackTab();
}

/**
 * Notify content scripts about filter change
 */
async function notifyContentScripts() {
  const tabs = await chrome.tabs.query({
    url: ["*://mydealz.de/*", "*://*.mydealz.de/*"],
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

    if (tab && isMydealzDeUrl(tab.url)) {
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
          updatePopupSizingForHiddenCount(currentHiddenDeals.length);
        } else {
          // Update the hidden count in the tab button
          hiddenCountSpan.textContent = '0';

          // Show default message when no hidden deals
          noHiddenDeals.textContent = "No deals have been hidden on this page.";
          noHiddenDeals.style.display = "block";
          hiddenDealsList.innerHTML = '';
          hiddenDealsList.appendChild(noHiddenDeals);
          updatePopupSizingForHiddenCount(0);
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
        updatePopupSizingForHiddenCount(0);
      }
    } else {
      // Update the hidden count in the tab button
      hiddenCountSpan.textContent = '0';

      // Show default message when not on mydealz.de
      noHiddenDeals.textContent = "Visit mydealz.de to see hidden deals.";
      noHiddenDeals.style.display = "block";
      hiddenDealsList.innerHTML = '';
      hiddenDealsList.appendChild(noHiddenDeals);
      updatePopupSizingForHiddenCount(0);
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
    updatePopupSizingForHiddenCount(0);
    
    // Update the total hidden count display
    await loadAndDisplayTotalHiddenCount();
  }
}

async function displayFilterStatistics() {
  const dedupedFilterTerms = dedupeTerms(parseTerms(filterTermsTextarea.value)).unique;
  statisticsList.innerHTML = "";
  selectedStatisticTerms.forEach((term) => {
    if (!dedupedFilterTerms.some((entry) => normalizeTerm(entry) === normalizeTerm(term))) {
      selectedStatisticTerms.delete(term);
    }
  });
  updateCreateGroupButton();

  if (dedupedFilterTerms.length === 0) {
    noStatisticsData.textContent = "Add filter terms in Settings to view statistics.";
    noStatisticsData.style.display = "block";
    updatePopupSizingForStatisticsCount(0);
    return;
  }

  const localArea = getStorageArea("local");
  let storedStats = {};
  if (localArea) {
    const { result, error } = await storageGet(localArea, [FILTER_STATS_STORAGE_KEY]);
    if (!error && result[FILTER_STATS_STORAGE_KEY] && typeof result[FILTER_STATS_STORAGE_KEY] === "object") {
      storedStats = result[FILTER_STATS_STORAGE_KEY];
    }
  }

  await loadStatisticsGroups(dedupedFilterTerms);
  updateStatisticsViewButtons();

  const rankedStats = dedupedFilterTerms
    .map((term) => {
      const normalizedKey = normalizeTerm(term);
      const rawEntry = storedStats[normalizedKey];
      const count = Number.isInteger(rawEntry?.count) ? rawEntry.count : 0;
      return { term, count, normalizedKey };
    })
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));

  if (!rankedStats.some((entry) => entry.count > 0)) {
    noStatisticsData.textContent = "No statistics yet. Browse mydealz.de to build filter insights.";
    noStatisticsData.style.display = "block";
    updatePopupSizingForStatisticsCount(0);
    return;
  }

  noStatisticsData.style.display = "none";
  const groupedTerms = getGroupedTermsSet(currentStatisticsGroups);
  let visibleRowCount = 0;

  const renderSelectableRow = (entry, index, isChild = false) => {
    const statRow = document.createElement("div");
    statRow.className = `stats-item is-selectable${isChild ? " is-child" : ""}`;

    const rank = document.createElement("span");
    rank.className = "stats-rank";
    rank.textContent = `${index + 1}`;

    const selector = document.createElement("input");
    selector.className = "stats-selector";
    selector.type = "checkbox";
    selector.checked = selectedStatisticTerms.has(entry.term);
    selector.addEventListener("change", () => {
      if (selector.checked) selectedStatisticTerms.add(entry.term);
      else selectedStatisticTerms.delete(entry.term);
      updateCreateGroupButton();
    });

    const termLabel = document.createElement("span");
    termLabel.className = "stats-term";
    termLabel.textContent = entry.term;

    const countLabel = document.createElement("span");
    countLabel.className = "stats-count";
    countLabel.textContent = `${entry.count} hidden`;

    statRow.appendChild(rank);
    statRow.appendChild(selector);
    statRow.appendChild(termLabel);
    statRow.appendChild(countLabel);
    statisticsList.appendChild(statRow);
    visibleRowCount++;
  };

  if (currentStatisticsViewMode === "grouped" && Object.keys(currentStatisticsGroups).length > 0) {
    const groupedEntries = Object.entries(currentStatisticsGroups)
      .map(([groupId, group]) => {
        const members = rankedStats.filter((entry) =>
          group.terms.some((term) => normalizeTerm(term) === entry.normalizedKey)
        );
        const count = members.reduce((sum, entry) => sum + entry.count, 0);
        return { groupId, group, count, members };
      })
      .sort((a, b) => b.count - a.count || a.group.name.localeCompare(b.group.name));

    groupedEntries.forEach((entry, index) => {
      const statRow = document.createElement("div");
      statRow.className = "stats-item is-group";

      const rank = document.createElement("span");
      rank.className = "stats-rank";
      rank.textContent = `${index + 1}`;

      const termLabel = document.createElement("span");
      termLabel.className = "stats-term";
      termLabel.textContent = entry.group.name;

      const metaLabel = document.createElement("span");
      metaLabel.className = "stats-meta";
      metaLabel.textContent = `${entry.members.length} terms`;

      const countLabel = document.createElement("span");
      countLabel.className = "stats-count";
      countLabel.textContent = `${entry.count} hidden`;

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "stats-group-toggle";
      toggleBtn.type = "button";
      const expanded = expandedStatisticGroups.has(entry.groupId);
      toggleBtn.textContent = expanded ? "Hide" : "Show";
      toggleBtn.addEventListener("click", () => {
        if (expandedStatisticGroups.has(entry.groupId)) expandedStatisticGroups.delete(entry.groupId);
        else expandedStatisticGroups.add(entry.groupId);
        displayFilterStatistics();
      });

      statRow.appendChild(rank);
      statRow.appendChild(termLabel);
      statRow.appendChild(metaLabel);
      statRow.appendChild(countLabel);
      statRow.appendChild(toggleBtn);
      statisticsList.appendChild(statRow);
      visibleRowCount++;

      if (expanded) {
        entry.members.forEach((member, memberIndex) => {
          renderSelectableRow(member, memberIndex + 1, true);
        });
      }
    });

    rankedStats
      .filter((entry) => !groupedTerms.has(entry.normalizedKey))
      .forEach((entry, index) => renderSelectableRow(entry, index + 1, false));
  } else {
    rankedStats.forEach((entry, index) => renderSelectableRow(entry, index));
  }

  updatePopupSizingForStatisticsCount(visibleRowCount);
}

async function renderManageGroupsTab() {
  const availableTerms = dedupeTerms(parseTerms(filterTermsTextarea.value)).unique;
  await loadStatisticsGroups(availableTerms);
  manageGroupsList.innerHTML = "";
  const groupedTerms = getGroupedTermsSet(currentStatisticsGroups);
  const ungroupedTerms = availableTerms.filter((term) => !groupedTerms.has(normalizeTerm(term)));

  const groupEntries = Object.entries(currentStatisticsGroups);
  if (groupEntries.length === 0) {
    noManageGroupsData.style.display = "block";
    return;
  }

  noManageGroupsData.style.display = "none";
  groupEntries
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .forEach(([groupId, group]) => {
      const card = document.createElement("section");
      card.className = "group-card";

      const header = document.createElement("div");
      header.className = "group-card-header";

      const title = document.createElement("div");
      title.className = "group-card-title";
      title.textContent = `${group.name} (${group.terms.length})`;

      const actions = document.createElement("div");
      actions.className = "group-card-actions";

      const renameBtn = document.createElement("button");
      renameBtn.className = "btn btn-secondary";
      renameBtn.type = "button";
      renameBtn.textContent = "Rename";
      renameBtn.addEventListener("click", async () => {
        const nextName = window.prompt("Rename group", group.name);
        if (!nextName || !nextName.trim()) return;
        currentStatisticsGroups[groupId].name = nextName.trim();
        await persistStatisticsGroups();
        await renderManageGroupsTab();
        if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-secondary";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        delete currentStatisticsGroups[groupId];
        if (Object.keys(currentStatisticsGroups).length === 0) {
          currentStatisticsViewMode = DEFAULT_STATS_VIEW_MODE;
        }
        await persistStatisticsGroups();
        await renderManageGroupsTab();
        if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
      });

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      header.appendChild(title);
      header.appendChild(actions);

      const termsWrap = document.createElement("div");
      termsWrap.className = "group-card-terms";

      group.terms.forEach((term) => {
        const chip = document.createElement("span");
        chip.className = "group-term-chip";
        chip.textContent = term;

        const removeBtn = document.createElement("button");
        removeBtn.className = "group-term-remove";
        removeBtn.type = "button";
        removeBtn.textContent = "x";
        removeBtn.addEventListener("click", async () => {
          currentStatisticsGroups[groupId].terms = currentStatisticsGroups[groupId].terms.filter(
            (entry) => normalizeTerm(entry) !== normalizeTerm(term)
          );
          if (currentStatisticsGroups[groupId].terms.length === 0) {
            delete currentStatisticsGroups[groupId];
          }
          if (Object.keys(currentStatisticsGroups).length === 0) {
            currentStatisticsViewMode = DEFAULT_STATS_VIEW_MODE;
          }
          await persistStatisticsGroups();
          await renderManageGroupsTab();
          if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
        });

        chip.appendChild(removeBtn);
        termsWrap.appendChild(chip);
      });

      const addRow = document.createElement("div");
      addRow.className = "group-card-add";

      const addSelect = document.createElement("select");
      addSelect.className = "group-add-select";

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = ungroupedTerms.length > 0 ? "Add ungrouped term..." : "No ungrouped terms left";
      addSelect.appendChild(placeholder);

      ungroupedTerms.forEach((term) => {
        const option = document.createElement("option");
        option.value = term;
        option.textContent = term;
        addSelect.appendChild(option);
      });

      const addBtn = document.createElement("button");
      addBtn.className = "btn btn-secondary";
      addBtn.type = "button";
      addBtn.textContent = "Add Term";
      addBtn.disabled = ungroupedTerms.length === 0;
      addBtn.addEventListener("click", async () => {
        if (!addSelect.value) return;
        const nextTerm = addSelect.value;
        currentStatisticsGroups[groupId].terms.push(nextTerm);
        currentStatisticsGroups = normalizeStatisticsGroups(currentStatisticsGroups, availableTerms);
        await persistStatisticsGroups();
        await renderManageGroupsTab();
        if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
        showStatus(`Added "${nextTerm}" to ${group.name}.`, "success");
      });

      addRow.appendChild(addSelect);
      addRow.appendChild(addBtn);

      card.appendChild(header);
      card.appendChild(termsWrap);
      card.appendChild(addRow);
      manageGroupsList.appendChild(card);
    });
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
    applyFixedPopupHeight(SETTINGS_POPUP_TARGET_HEIGHT_PX);
    requestAnimationFrame(() => {
      autoGrowKeywordTextareas();
    });
  } else if (tabName === "info") {
    infoTab.classList.add("active");
    infoTabBtn.classList.add("active");
    applyFixedPopupHeight(INFO_POPUP_TARGET_HEIGHT_PX);
  } else if (tabName === "manageGroups") {
    manageGroupsTab.classList.add("active");
    manageGroupsTabBtn.classList.add("active");
    renderManageGroupsTab();
    applyFixedPopupHeight(SETTINGS_POPUP_TARGET_HEIGHT_PX);
  } else if (tabName === 'statistics') {
    statisticsTab.classList.add('active');
    statisticsTabBtn.classList.add('active');
    displayFilterStatistics();
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
      showStatus(
        `⚠ Skipped duplicates: ${uniqueDuplicateLabels.join(", ")}${syncSuffix}`,
        syncError ? "error" : "success"
      );
    } else if (filterTermCount > 0 || exceptionTermCount > 0) {
      showStatus(`✓ Saved ${filterTermCount} filter term(s) and ${exceptionTermCount} exception term(s)!${syncSuffix}`, syncError ? "error" : "success");
    } else {
      showStatus(`✓ Filters cleared${syncSuffix}`, syncError ? "error" : "success");
    }

    // Notify content scripts about the change
    await notifyContentScripts();

    // Refresh hidden deals after saving filters
    if (hiddenPostsTab.classList.contains('active')) {
      displayHiddenDeals();
    } else if (statisticsTab.classList.contains("active")) {
      displayFilterStatistics();
    } else if (manageGroupsTab.classList.contains("active")) {
      renderManageGroupsTab();
    }
  } catch (error) {
    console.error("Error saving filters:", error);
    showStatus("✗ Error saving filters", "error");
  }
});

exportBtn.addEventListener("click", async () => {
  await handleExportFilters();
});

importBtn.addEventListener("click", () => {
  showStatus("Opening Options page for JSON import...", "success");
  openOptionsPageForImport();
});

themeToggleBtn.addEventListener("click", async () => {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  await saveThemePreference(nextTheme);
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

if (greyOutOpacityRange) {
  greyOutOpacityRange.addEventListener("input", () => {
    updateGreyOutOpacityUI(greyOutOpacityRange.value);
  });

  greyOutOpacityRange.addEventListener("change", async () => {
    const { syncError } = await saveTogglePreferences();
    const percent = getGreyOutOpacityPercent();
    showStatus(
      `Grey-out opacity set to ${percent}%.${syncError ? " Saved locally." : ""}`,
      syncError ? "error" : "success"
    );
  });
}

/**
 * Tab button event listeners
 */
settingsTabBtn.addEventListener('click', () => {
  switchTab('settings');
});

hiddenPostsTabBtn.addEventListener('click', () => {
  switchTab('hiddenPosts');
});

statisticsTabBtn.addEventListener("click", () => {
  switchTab("statistics");
});

manageGroupsTabBtn.addEventListener("click", () => {
  switchTab("manageGroups");
});

infoTabBtn.addEventListener("click", () => {
  switchTab("info");
});

groupedViewBtn.addEventListener("click", async () => {
  currentStatisticsViewMode = "grouped";
  await persistStatisticsGroups();
  await displayFilterStatistics();
});

ungroupedViewBtn.addEventListener("click", async () => {
  currentStatisticsViewMode = "ungrouped";
  await persistStatisticsGroups();
  await displayFilterStatistics();
});

createStatsGroupBtn.addEventListener("click", async () => {
  const selectedTerms = Array.from(selectedStatisticTerms);
  if (selectedTerms.length < 2) return;

  const groupName = window.prompt("Name your statistics group");
  if (!groupName || !groupName.trim()) return;

  const nextGroupIdBase = buildStatisticsGroupId(groupName);
  let nextGroupId = nextGroupIdBase;
  let duplicateIndex = 2;
  while (currentStatisticsGroups[nextGroupId]) {
    nextGroupId = `${nextGroupIdBase}-${duplicateIndex}`;
    duplicateIndex++;
  }

  const groupedTerms = getGroupedTermsSet(currentStatisticsGroups);
  const availableSelection = selectedTerms.filter((term) => !groupedTerms.has(normalizeTerm(term)));
  if (availableSelection.length < 2) {
    showStatus("Select at least 2 ungrouped terms.", "error");
    return;
  }

  currentStatisticsGroups[nextGroupId] = {
    name: groupName.trim(),
    terms: availableSelection,
    createdAt: Date.now(),
  };
  currentStatisticsViewMode = "grouped";
  selectedStatisticTerms.clear();
  expandedStatisticGroups.add(nextGroupId);
  await persistStatisticsGroups();
  await displayFilterStatistics();
  if (manageGroupsTab.classList.contains("active")) {
    await renderManageGroupsTab();
  }
  showStatus(`Created group ${groupName.trim()}.`, "success");
});

/**
 * Initialize popup by loading saved filters and setting up tabs
 */
async function init() {
  displayExtensionVersion();
  await loadThemePreference();
  setupClickToEditKeywordFields();

  // Load the filter terms and exception terms
  await loadFilterTerms();
  autoGrowKeywordTextareas();
  filterTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  exceptionTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);

  // Set up initial tab state - start with hidden posts for quicker feedback.
  switchTab('hiddenPosts');

  // Ensure total hidden count is displayed.
  await loadAndDisplayTotalHiddenCount();
}

// Initialize the popup
init();
