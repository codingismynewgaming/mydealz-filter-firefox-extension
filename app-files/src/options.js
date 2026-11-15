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
const greyOutOpacityRange = document.getElementById("greyOutOpacity");
const greyOutOpacityValue = document.getElementById("greyOutOpacityValue");
const keywordShortcutInput = document.getElementById("keywordShortcut");
const newCategoryNameInput = document.getElementById("newCategoryName");
const createCategoryBtn = document.getElementById("createCategoryBtn");
const enableAllCategoriesBtn = document.getElementById("enableAllCategoriesBtn");
const disableAllCategoriesBtn = document.getElementById("disableAllCategoriesBtn");
const categorySummary = document.getElementById("categorySummary");
const categoriesList = document.getElementById("categoriesList");
const hiddenDealsList = document.getElementById("hiddenDealsList");
const noHiddenDeals = document.getElementById("noHiddenDeals");
const refreshHiddenBtn = document.getElementById("refreshHiddenBtn");
const resetSeenDealsBtn = document.getElementById("resetSeenDealsBtn");

const {
  SYNC_SETTINGS_KEYS,
  LOCAL_ONLY_SETTINGS_KEYS,
  FILTER_CATEGORY_STORAGE_KEY,
  CATEGORY_STATES_STORAGE_KEY,
  DEFAULT_CATEGORY_NAME,
  STATS_GROUPS_STORAGE_KEY,
  GREY_OUT_SEEN_DEALS_KEY,
  GREY_OUT_OPACITY_KEY,
  DEFAULT_SHORTCUT,
  SYNC_QUOTA_PER_ITEM,
  SETTINGS_UPDATED_AT_KEY,
  getMessage,
  applyI18n,
  normalizeCategoryName,
  cloneCategoryData,
  cloneCategoryStates,
  normalizeCategoryConfiguration,
  migrateLegacyStatisticsGroupsToCategories,
  categoriesToStatisticsGroups,
  isPlainObject,
  isMydealzDeUrl,
  getStorageArea,
  storageGet,
  storageSet,
  storageRemove,
  replaceStorageSafely,
  parseTerms,
  normalizeTerm,
  dedupeTerms,
  mergeUniqueTerms,
  normalizeOpacityPercent,
  triggerJsonDownload,
  autoGrowTextarea,
  setupClickToEditTextarea,
  renderHiddenDealsList,
  notifyMydealzTabs,
  pickBestMydealzDeTab,
  isFullBackupPayload,
  filterSyncBackupData,
  validateImportPayload,
  buildExportPayload,
  hasSyncQuotaRisk,
  shouldPreferLocalOverSync,
} = MydealzFilterShared;

const FILTER_STORAGE_KEYS = [...SYNC_SETTINGS_KEYS];
let currentCategoryData = { [DEFAULT_CATEGORY_NAME]: [] };
let currentCategoryStates = { [DEFAULT_CATEGORY_NAME]: true };
let currentStatsGroupsSnapshot = {};
let currentDraggedTerm = null;
let statusHideTimer = null;

function displayExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  optionsVersionLabel.textContent = getMessage(
    "versionLabel",
    [manifest.version],
    `Version ${manifest.version}`
  );
}

function setupKeyboardShortcutField() {
  const openShortcutSettingsBtn = document.getElementById("openShortcutSettingsBtn");
  if (!keywordShortcutInput) return;

  keywordShortcutInput.readOnly = true;

  loadStoredShortcutPreference().then((storedShortcut) => {
    keywordShortcutInput.value = storedShortcut;
  });

  if (chrome.commands && chrome.commands.getAll) {
    chrome.commands.getAll((commands) => {
      const command = commands.find((cmd) => cmd.name === "open-keyword-dialog");
      if (command && command.shortcut) {
        keywordShortcutInput.value = command.shortcut;
      }
    });
  }

  if (openShortcutSettingsBtn) {
    openShortcutSettingsBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "openShortcutSettings" }, (response) => {
        if (chrome.runtime.lastError || response?.status !== "opened") {
          showStatus(
            getMessage(
              "shortcutManualHint",
              [],
              "Open your browser extension shortcuts page to modify shortcuts."
            ),
            "error"
          );
        }
      });
    });
  }
}

function autoGrowKeywordTextareas() {
  autoGrowTextarea(filterTermsTextarea);
  autoGrowTextarea(exceptionTermsTextarea);
}

function setupClickToEditKeywordFields() {
  setupClickToEditTextarea(filterTermsTextarea);
  setupClickToEditTextarea(exceptionTermsTextarea);
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
  if (!greyOutOpacityRange) return normalizeOpacityPercent(undefined);
  return normalizeOpacityPercent(greyOutOpacityRange.value);
}

function isSyncSettingsEmpty(settings) {
  return !(
    settings?.filterTerms ||
    settings?.exceptionTerms ||
    settings?.autoSortComments === true ||
    (typeof settings?.[GREY_OUT_OPACITY_KEY] === "number" &&
      Number.isFinite(settings[GREY_OUT_OPACITY_KEY])) ||
    (isPlainObject(settings?.[FILTER_CATEGORY_STORAGE_KEY]) &&
      Object.keys(settings[FILTER_CATEGORY_STORAGE_KEY]).length > 0) ||
    (isPlainObject(settings?.[CATEGORY_STATES_STORAGE_KEY]) &&
      Object.keys(settings[CATEGORY_STATES_STORAGE_KEY]).length > 0) ||
    settings?.keywordShortcut
  );
}

async function migrateLocalSettingsToSyncIfNeeded() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  if (!syncArea || !localArea) return false;

  const { result: syncSettings, error: syncError } = await storageGet(syncArea, FILTER_STORAGE_KEYS);
  if (syncError || !isSyncSettingsEmpty(syncSettings)) return false;

  const { result: localSettings, error: localError } = await storageGet(localArea, FILTER_STORAGE_KEYS);
  if (localError || isSyncSettingsEmpty(localSettings)) return false;

  const { error } = await storageSet(syncArea, {
    ...localSettings,
    [SETTINGS_UPDATED_AT_KEY]: Date.now(),
  });
  if (error) {
    console.error("Sync storage error while migrating settings from local:", error);
    return false;
  }

  return true;
}

function isValidCategoryName(name) {
  const normalized = normalizeCategoryName(name);
  return /^[\p{L}\p{N}\s-]{1,50}$/u.test(normalized);
}

async function persistCategoryConfiguration(categoryData, categoryStates) {
  currentCategoryData = cloneCategoryData(categoryData);
  currentCategoryStates = cloneCategoryStates(categoryStates);
  currentStatsGroupsSnapshot = categoriesToStatisticsGroups(
    currentCategoryData,
    currentStatsGroupsSnapshot
  );
  const payload = {
    [FILTER_CATEGORY_STORAGE_KEY]: currentCategoryData,
    [CATEGORY_STATES_STORAGE_KEY]: currentCategoryStates,
    [STATS_GROUPS_STORAGE_KEY]: currentStatsGroupsSnapshot,
    [SETTINGS_UPDATED_AT_KEY]: Date.now(),
  };

  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;
  let localError = false;

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
    localError = !!error;
    if (error) {
      console.error("Local storage error while saving categories:", error);
    }
  } else {
    localError = true;
  }

  renderCategoryGroups();
  await notifyContentScripts();
  return { syncError, localError };
}

function updateCategorySummary() {
  const categories = Object.keys(currentCategoryData);
  const activeCount = categories.filter(
    (categoryName) => currentCategoryStates[categoryName] !== false
  ).length;
  categorySummary.textContent = getMessage(
    "categorySummary",
    [String(activeCount), String(categories.length)],
    `${activeCount} of ${categories.length} categories active`
  );
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
      const { syncError, localError } = await persistCategoryConfiguration(
        currentCategoryData,
        currentCategoryStates
      );
      if (syncError && localError) {
        showStatus("Error saving category state.", "error");
        return;
      }
      showStatus(
        `${categoryName} ${checkbox.checked ? "enabled" : "disabled"}.${
          syncError ? " Saved locally." : ""
        }`,
        syncError ? "error" : "success"
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
      deleteBtn.textContent = getMessage("deleteLabel", [], "Delete");
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
      emptyText.textContent = getMessage("dropTermsHint", [], "Drop filter terms here.");
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

async function restoreStorageBackup(payload) {
  const rawSync = isPlainObject(payload.storage?.sync) ? payload.storage.sync : {};
  const rawLocal = isPlainObject(payload.storage?.local) ? payload.storage.local : {};

  const localPayload =
    Object.keys(rawLocal).length > 0 ? { ...rawLocal } : { ...rawSync };
  const syncCandidate =
    Object.keys(rawSync).length > 0
      ? filterSyncBackupData(rawSync)
      : filterSyncBackupData(rawLocal);

  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;
  let localError = false;

  if (localArea) {
    const { error } = await replaceStorageSafely(localArea, localPayload);
    if (error) {
      console.error("Local storage restore error:", error);
      localError = true;
    }
  } else {
    localError = true;
  }

  if (syncArea) {
    if (hasSyncQuotaRisk(syncCandidate)) {
      console.warn("Skipping sync restore because one or more items exceed Firefox Sync quota.");
      syncError = true;
    } else {
      const { error } = await replaceStorageSafely(syncArea, syncCandidate);
      if (error) {
        console.error("Sync storage restore error:", error);
        syncError = true;
      }
    }
  } else {
    syncError = true;
  }

  const restoredKeyCount = new Set([
    ...Object.keys(localPayload),
    ...Object.keys(syncCandidate),
  ]).size;

  return {
    syncError,
    localError,
    restoredKeyCount,
  };
}

async function loadFilterTerms() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  await migrateLocalSettingsToSyncIfNeeded();

  const probeKeys = [...FILTER_STORAGE_KEYS, STATS_GROUPS_STORAGE_KEY, SETTINGS_UPDATED_AT_KEY];
  const { result: syncResult, error: syncError } = syncArea
    ? await storageGet(syncArea, probeKeys)
    : { result: {}, error: new Error("Sync unavailable") };
  const { result: localResult } = localArea
    ? await storageGet(localArea, [...probeKeys, ...LOCAL_ONLY_SETTINGS_KEYS])
    : { result: {} };

  const preferLocal = shouldPreferLocalOverSync(
    syncResult,
    syncError,
    localResult,
    FILTER_STORAGE_KEYS
  );
  const primary = preferLocal ? localResult : syncResult;
  const fallback = preferLocal ? syncResult : localResult;

  const filterTerms = primary.filterTerms ?? fallback.filterTerms ?? "";
  const exceptionTerms = primary.exceptionTerms ?? fallback.exceptionTerms ?? "";
  autoSortCommentsCheckbox.checked =
    typeof primary.autoSortComments === "boolean"
      ? primary.autoSortComments
      : fallback.autoSortComments === true;

  if (primary.keywordShortcut || fallback.keywordShortcut) {
    keywordShortcutInput.value = primary.keywordShortcut || fallback.keywordShortcut;
  }

  const opacityValue =
    typeof primary[GREY_OUT_OPACITY_KEY] === "number"
      ? primary[GREY_OUT_OPACITY_KEY]
      : fallback[GREY_OUT_OPACITY_KEY];
  updateGreyOutOpacityUI(opacityValue);

  greyOutSeenDealsCheckbox.checked =
    typeof localResult[GREY_OUT_SEEN_DEALS_KEY] === "boolean"
      ? localResult[GREY_OUT_SEEN_DEALS_KEY]
      : syncResult[GREY_OUT_SEEN_DEALS_KEY] === true;

  filterTermsTextarea.value = filterTerms;
  exceptionTermsTextarea.value = exceptionTerms;
  autoGrowKeywordTextareas();

  const rawCategories = isPlainObject(primary[FILTER_CATEGORY_STORAGE_KEY])
    ? primary[FILTER_CATEGORY_STORAGE_KEY]
    : isPlainObject(fallback[FILTER_CATEGORY_STORAGE_KEY])
    ? fallback[FILTER_CATEGORY_STORAGE_KEY]
    : {};
  const rawStates = isPlainObject(primary[CATEGORY_STATES_STORAGE_KEY])
    ? primary[CATEGORY_STATES_STORAGE_KEY]
    : isPlainObject(fallback[CATEGORY_STATES_STORAGE_KEY])
    ? fallback[CATEGORY_STATES_STORAGE_KEY]
    : {};
  const rawStatsGroups = isPlainObject(primary[STATS_GROUPS_STORAGE_KEY])
    ? primary[STATS_GROUPS_STORAGE_KEY]
    : isPlainObject(fallback[STATS_GROUPS_STORAGE_KEY])
    ? fallback[STATS_GROUPS_STORAGE_KEY]
    : {};

  const categoryConfig = migrateLegacyStatisticsGroupsToCategories(
    rawCategories,
    rawStates,
    rawStatsGroups,
    parseTerms(filterTerms)
  );
  currentCategoryData = categoryConfig.categoryData;
  currentCategoryStates = categoryConfig.categoryStates;
  currentStatsGroupsSnapshot = categoriesToStatisticsGroups(currentCategoryData, rawStatsGroups);
  renderCategoryGroups();

  if (categoryConfig.migrated) {
    await persistCategoryConfiguration(currentCategoryData, currentCategoryStates);
  }

  return { storage: preferLocal ? "local" : "sync" };
}

async function loadStoredShortcutPreference() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  if (syncArea) {
    const { result, error } = await storageGet(syncArea, ["keywordShortcut", "customShortcut"]);
    if (!error && (result.keywordShortcut || result.customShortcut)) {
      return result.keywordShortcut || result.customShortcut;
    }
  }

  if (localArea) {
    const { result } = await storageGet(localArea, ["keywordShortcut", "customShortcut"]);
    if (result.keywordShortcut || result.customShortcut) {
      return result.keywordShortcut || result.customShortcut;
    }
  }

  return DEFAULT_SHORTCUT;
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
  currentStatsGroupsSnapshot = categoriesToStatisticsGroups(
    currentCategoryData,
    currentStatsGroupsSnapshot
  );

  const updatedAt = Date.now();
  const syncPayload = {
    filterTerms,
    exceptionTerms,
    autoSortComments: autoSortCommentsCheckbox.checked,
    keywordShortcut: keywordShortcutInput.value.trim() || DEFAULT_SHORTCUT,
    [GREY_OUT_OPACITY_KEY]: getGreyOutOpacityPercent(),
    [FILTER_CATEGORY_STORAGE_KEY]: currentCategoryData,
    [CATEGORY_STATES_STORAGE_KEY]: currentCategoryStates,
    [STATS_GROUPS_STORAGE_KEY]: currentStatsGroupsSnapshot,
    [SETTINGS_UPDATED_AT_KEY]: updatedAt,
  };
  const localPayload = {
    ...syncPayload,
    [GREY_OUT_SEEN_DEALS_KEY]: greyOutSeenDealsCheckbox.checked,
  };

  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  filterTermsTextarea.value = filterTerms;
  exceptionTermsTextarea.value = exceptionTerms;
  autoGrowKeywordTextareas();

  let syncError = false;
  let localError = false;
  let quotaExceeded = false;

  if (
    new Blob([filterTerms]).size > SYNC_QUOTA_PER_ITEM ||
    new Blob([exceptionTerms]).size > SYNC_QUOTA_PER_ITEM
  ) {
    console.warn("Sync quota might be exceeded for these filters.");
    quotaExceeded = true;
  }

  if (syncArea) {
    const { error } = await storageSet(syncArea, syncPayload);
    if (error) {
      console.error("Sync storage error:", error);
      syncError = true;
    }
  } else {
    syncError = true;
  }

  if (localArea) {
    const { error } = await storageSet(localArea, localPayload);
    if (error) {
      console.error("Local storage error:", error);
      localError = true;
    }
  } else {
    localError = true;
  }

  renderCategoryGroups();

  return {
    filterTerms,
    exceptionTerms,
    autoSortComments: syncPayload.autoSortComments,
    greyOutSeenDeals: localPayload[GREY_OUT_SEEN_DEALS_KEY],
    greyOutOpacityPercent: syncPayload[GREY_OUT_OPACITY_KEY],
    storage: !syncError ? "sync" : "local",
    syncError,
    localError,
    quotaExceeded,
    filterDuplicates: dedupedFilters.duplicates,
    exceptionDuplicates: dedupedExceptions.duplicates,
  };
}

async function saveTogglePreferences() {
  const updatedAt = Date.now();
  const syncPayload = {
    autoSortComments: autoSortCommentsCheckbox.checked,
    keywordShortcut: keywordShortcutInput.value.trim() || DEFAULT_SHORTCUT,
    [GREY_OUT_OPACITY_KEY]: getGreyOutOpacityPercent(),
    [SETTINGS_UPDATED_AT_KEY]: updatedAt,
  };
  const localPayload = {
    ...syncPayload,
    [GREY_OUT_SEEN_DEALS_KEY]: greyOutSeenDealsCheckbox.checked,
  };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  let syncError = false;
  let localError = false;

  if (syncArea) {
    const { error } = await storageSet(syncArea, syncPayload);
    syncError = !!error;
    if (error) {
      console.error("Sync storage error while saving toggle preferences:", error);
    }
  } else {
    syncError = true;
  }

  if (localArea) {
    const { error } = await storageSet(localArea, localPayload);
    localError = !!error;
    if (error) {
      console.error("Local storage error while saving toggle preferences:", error);
    }
  } else {
    localError = true;
  }

  await notifyContentScripts();
  return { syncError, localError };
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
  showStatus(`Exported full backup (${syncKeys} sync key(s), ${localKeys} local key(s)).`);
}

function buildSaveStatusSuffix({ syncError, localError, quotaExceeded }) {
  if (syncError && localError) return " (Save failed!)";
  if (syncError) return " Saved locally (Sync issue).";
  if (quotaExceeded) return " (Quota warning)";
  return "";
}

async function handleImportFilters(file) {
  if (!file) return;

  showStatus("Reading file...", "success");

  const readFileAsText = (targetFile) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsText(targetFile);
    });

  let parsedPayload;
  try {
    const fileContent = await readFileAsText(file);
    parsedPayload = JSON.parse(fileContent);
  } catch (err) {
    console.error("[mydealz Filter] Error reading or parsing JSON:", err);
    showStatus("Import failed: invalid JSON file.", "error");
    return;
  }

  const validationError = validateImportPayload(parsedPayload);
  if (validationError) {
    showStatus(`Import failed: ${validationError}`, "error");
    return;
  }

  if (isFullBackupPayload(parsedPayload)) {
    try {
      const { syncError, localError, restoredKeyCount } = await restoreStorageBackup(parsedPayload);
      await loadFilterTerms();
      await notifyContentScripts();
      await displayHiddenDeals();

      let suffix = "";
      if (syncError && localError) suffix = " (Sync + local restore issues)";
      else if (syncError) suffix = " (Sync issue - restored locally)";
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

    const existingFilterTerms = parseTerms(filterTermsTextarea.value);
    const existingExceptionTerms = parseTerms(exceptionTermsTextarea.value);

    const mergedFilters = mergeUniqueTerms(existingFilterTerms, importedFilterTerms);
    const mergedExceptions = mergeUniqueTerms(existingExceptionTerms, importedExceptionTerms);

    filterTermsTextarea.value = mergedFilters.merged.join(", ");
    exceptionTermsTextarea.value = mergedExceptions.merged.join(", ");
    autoGrowKeywordTextareas();

    const { syncError, localError, quotaExceeded } = await saveFilterTerms();
    if (syncError && localError) {
      showStatus("Import failed: could not write to local or sync storage.", "error");
      return;
    }

    await notifyContentScripts();
    await displayHiddenDeals();

    const importedTotal = mergedFilters.importedCount + mergedExceptions.importedCount;
    const skippedTotal = mergedFilters.skippedCount + mergedExceptions.skippedCount;
    const syncSuffix = buildSaveStatusSuffix({ syncError, localError, quotaExceeded });

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
  } catch (err) {
    console.error("[mydealz Filter] Unexpected import logic error:", err);
    showStatus("Import failed due to an internal error.", "error");
  }
}

function showStatus(message, type = "success") {
  clearTimeout(statusHideTimer);
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  statusHideTimer = setTimeout(() => {
    statusDiv.textContent = "";
    statusDiv.className = "status";
  }, 3000);
}

async function notifyContentScripts() {
  await notifyMydealzTabs({ type: "filtersChanged" });
}

function showHiddenDealsMessage(message) {
  renderHiddenDealsList(hiddenDealsList, hiddenCountSpan, noHiddenDeals, [], message);
}

async function displayHiddenDeals() {
  if (!chrome.tabs || !chrome.tabs.query || !chrome.tabs.sendMessage) {
    showHiddenDealsMessage(
      getMessage("hiddenDealsUnavailable", [], "Hidden deals preview is not available on this platform.")
    );
    return;
  }

  try {
    const tabs = await chrome.tabs.query({});
    const tab = pickBestMydealzDeTab(tabs);

    if (!tab) {
      showHiddenDealsMessage(
        getMessage("openTabHiddenDeals", [], "Open a mydealz.de tab to view hidden deals.")
      );
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "getHiddenDeals" });
      const deals = response?.hiddenDeals || [];
      renderHiddenDealsList(
        hiddenDealsList,
        hiddenCountSpan,
        noHiddenDeals,
        deals,
        getMessage("noHiddenDeals", [], "No deals have been hidden on this page.")
      );
    } catch {
      showHiddenDealsMessage(
        getMessage("noHiddenDeals", [], "No deals have been hidden on this page.")
      );
    }
  } catch {
    showHiddenDealsMessage(getMessage("hiddenDealsLoadError", [], "Could not load hidden deals."));
  }
}

saveBtn.addEventListener("click", async () => {
  try {
    const {
      filterTerms,
      exceptionTerms,
      syncError,
      localError,
      quotaExceeded,
      filterDuplicates,
      exceptionDuplicates,
    } = await saveFilterTerms();

    if (syncError && localError) {
      showStatus("Error: Could not save to sync or local storage.", "error");
      return;
    }

    const filterTermCount = parseTerms(filterTerms).length;
    const exceptionTermCount = parseTerms(exceptionTerms).length;
    const duplicateTerms = [...filterDuplicates, ...exceptionDuplicates];
    const uniqueDuplicateLabels = Array.from(new Set(duplicateTerms.map((term) => term.trim())));

    highlightDuplicateFields(filterDuplicates, exceptionDuplicates);
    const syncSuffix = buildSaveStatusSuffix({ syncError, localError, quotaExceeded });

    if (uniqueDuplicateLabels.length > 0) {
      showStatus(
        `Saved. Skipped duplicate terms: ${uniqueDuplicateLabels.join(", ")}${syncSuffix}`,
        syncError ? "error" : "success"
      );
    } else if (filterTermCount > 0 || exceptionTermCount > 0) {
      showStatus(
        `Saved ${filterTermCount} filter term(s) and ${exceptionTermCount} exception term(s).${syncSuffix}`,
        syncError ? "error" : "success"
      );
    } else {
      showStatus(`Filters cleared.${syncSuffix}`, syncError ? "error" : "success");
    }

    await notifyContentScripts();
    await displayHiddenDeals();
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

resetSeenDealsBtn.addEventListener("click", async () => {
  if (
    !confirm(
      getMessage(
        "resetSeenDealsConfirm",
        [],
        "Are you sure you want to clear your 'seen deals' history? All deals will look 'new' again."
      )
    )
  ) {
    return;
  }

  const localArea = getStorageArea("local");
  if (!localArea) {
    showStatus("Local storage unavailable.", "error");
    return;
  }

  const { error } = await storageRemove(localArea, "seenDealUrls");
  if (error) {
    showStatus("Error resetting seen deals cache.", "error");
    return;
  }

  showStatus(getMessage("resetSeenDealsDone", [], "Seen deals history cleared!"), "success");
  await notifyMydealzTabs({ type: "seenDealsReset" });
});

createCategoryBtn.addEventListener("click", async () => {
  const categoryName = normalizeCategoryName(newCategoryNameInput.value);
  if (!isValidCategoryName(categoryName)) {
    showStatus(
      "Category names must be 1-50 chars and use letters, numbers, spaces, or hyphens.",
      "error"
    );
    return;
  }

  if (
    Object.keys(currentCategoryData).some(
      (entry) => normalizeTerm(entry) === normalizeTerm(categoryName)
    )
  ) {
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
  const { syncError, localError } = await saveTogglePreferences();
  if (syncError && localError) {
    showStatus("Error saving auto-sort preference.", "error");
    return;
  }
  showStatus(
    `Auto-sort comments ${autoSortCommentsCheckbox.checked ? "enabled" : "disabled"}.${
      syncError ? " Saved locally." : ""
    }`,
    syncError ? "error" : "success"
  );
});

greyOutSeenDealsCheckbox.addEventListener("change", async () => {
  const { localError } = await saveTogglePreferences();
  if (localError) {
    showStatus("Error saving seen-deals preference.", "error");
    return;
  }
  showStatus(
    `Grey out seen deals ${greyOutSeenDealsCheckbox.checked ? "enabled" : "disabled"}.`,
    "success"
  );
});

if (greyOutOpacityRange) {
  greyOutOpacityRange.addEventListener("input", () => {
    updateGreyOutOpacityUI(greyOutOpacityRange.value);
  });

  greyOutOpacityRange.addEventListener("change", async () => {
    const { syncError, localError } = await saveTogglePreferences();
    if (syncError && localError) {
      showStatus("Error saving opacity preference.", "error");
      return;
    }
    const percent = getGreyOutOpacityPercent();
    showStatus(
      `Grey-out opacity set to ${percent}%.${syncError ? " Saved locally." : ""}`,
      syncError ? "error" : "success"
    );
  });
}

async function init() {
  applyI18n();
  setupKeyboardShortcutField();
  displayExtensionVersion();
  setupClickToEditKeywordFields();
  await loadFilterTerms();
  autoGrowKeywordTextareas();
  filterTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  exceptionTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  await displayHiddenDeals();
}

init();
