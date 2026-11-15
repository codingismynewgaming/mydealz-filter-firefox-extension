/**
 * Keyword Dialog Script
 * Handles adding a single filter keyword
 */

const keywordInput = document.getElementById("keywordInput");
const addFilterBtn = document.getElementById("addFilterBtn");
const closeBtn = document.getElementById("closeBtn");
const statusDiv = document.getElementById("status");

const {
  FILTER_CATEGORY_STORAGE_KEY,
  CATEGORY_STATES_STORAGE_KEY,
  DEFAULT_CATEGORY_NAME,
  STATS_GROUPS_STORAGE_KEY,
  normalizeCategoryConfiguration,
  categoriesToStatisticsGroups,
  THEME_STORAGE_KEY,
  SETTINGS_UPDATED_AT_KEY,
  isPlainObject,
  getStorageArea,
  storageGet,
  storageSet,
  parseTerms,
  normalizeTerm,
  notifyMydealzTabs,
  shouldPreferLocalOverSync,
  getMessage,
  applyI18n,
} = MydealzFilterShared;

const FILTER_STORAGE_KEY = "filterTerms";
const DIALOG_STORAGE_KEYS = [
  FILTER_STORAGE_KEY,
  FILTER_CATEGORY_STORAGE_KEY,
  CATEGORY_STATES_STORAGE_KEY,
  STATS_GROUPS_STORAGE_KEY,
  SETTINGS_UPDATED_AT_KEY,
];

let statusHideTimer = null;
let isSavingKeyword = false;

function showStatus(message, type = "success") {
  clearTimeout(statusHideTimer);
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  statusHideTimer = setTimeout(() => {
    statusDiv.textContent = "";
    statusDiv.className = "status";
  }, 2000);
}

async function loadFilterState() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  const { result: syncResult, error: syncError } = syncArea
    ? await storageGet(syncArea, DIALOG_STORAGE_KEYS)
    : { result: {}, error: new Error("Sync unavailable") };
  const { result: localResult } = localArea
    ? await storageGet(localArea, DIALOG_STORAGE_KEYS)
    : { result: {} };

  const preferLocal = shouldPreferLocalOverSync(syncResult, syncError, localResult, [
    FILTER_STORAGE_KEY,
  ]);
  const primary = preferLocal ? localResult : syncResult;
  const fallback = preferLocal ? syncResult : localResult;

  const rawTerms = primary[FILTER_STORAGE_KEY] ?? fallback[FILTER_STORAGE_KEY] ?? "";
  const categoriesSource = isPlainObject(primary[FILTER_CATEGORY_STORAGE_KEY])
    ? primary[FILTER_CATEGORY_STORAGE_KEY]
    : isPlainObject(fallback[FILTER_CATEGORY_STORAGE_KEY])
    ? fallback[FILTER_CATEGORY_STORAGE_KEY]
    : null;
  const statesSource = isPlainObject(primary[CATEGORY_STATES_STORAGE_KEY])
    ? primary[CATEGORY_STATES_STORAGE_KEY]
    : isPlainObject(fallback[CATEGORY_STATES_STORAGE_KEY])
    ? fallback[CATEGORY_STATES_STORAGE_KEY]
    : null;
  const statsGroupsSource = isPlainObject(primary[STATS_GROUPS_STORAGE_KEY])
    ? primary[STATS_GROUPS_STORAGE_KEY]
    : isPlainObject(fallback[STATS_GROUPS_STORAGE_KEY])
    ? fallback[STATS_GROUPS_STORAGE_KEY]
    : {};

  return {
    filterTerms: rawTerms,
    categories: categoriesSource,
    categoryStates: statesSource,
    statisticsGroups: statsGroupsSource,
  };
}

function buildUpdatedCategoryPayload(
  categories,
  categoryStates,
  newKeyword,
  allFilters = [],
  existingStatsGroups = {}
) {
  const normalized = normalizeCategoryConfiguration(categories, categoryStates, allFilters);
  const nextCategories = Object.fromEntries(
    Object.entries(normalized.categoryData).map(([name, terms]) => [
      name,
      Array.isArray(terms) ? [...terms] : [],
    ])
  );
  const normalizedNew = normalizeTerm(newKeyword);
  const alreadyAssigned = Object.values(nextCategories).some((terms) =>
    terms.some((term) => normalizeTerm(term) === normalizedNew)
  );

  if (!alreadyAssigned) {
    nextCategories[DEFAULT_CATEGORY_NAME] = nextCategories[DEFAULT_CATEGORY_NAME] || [];
    nextCategories[DEFAULT_CATEGORY_NAME].push(newKeyword);
  }

  const nextStates = isPlainObject(normalized.categoryStates)
    ? { ...normalized.categoryStates }
    : {};
  if (!(DEFAULT_CATEGORY_NAME in nextStates)) {
    nextStates[DEFAULT_CATEGORY_NAME] = true;
  }

  return {
    [FILTER_CATEGORY_STORAGE_KEY]: nextCategories,
    [CATEGORY_STATES_STORAGE_KEY]: nextStates,
    [STATS_GROUPS_STORAGE_KEY]: categoriesToStatisticsGroups(nextCategories, existingStatsGroups),
  };
}

async function saveFilterState(filterTerms, categoryPayload) {
  const payload = {
    [FILTER_STORAGE_KEY]: filterTerms,
    ...categoryPayload,
    [SETTINGS_UPDATED_AT_KEY]: Date.now(),
  };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  let syncError = null;
  let localError = null;

  if (syncArea) {
    const res = await storageSet(syncArea, payload);
    syncError = res.error;
    if (syncError) {
      console.error("Sync storage error:", syncError);
    }
  } else {
    syncError = new Error("Sync unavailable");
  }

  if (localArea) {
    const res = await storageSet(localArea, payload);
    localError = res.error;
    if (localError) {
      console.error("Local storage error:", localError);
    }
  } else if (syncError) {
    localError = new Error("Local unavailable");
  }

  if (syncError && localError) {
    return { error: localError, storage: "none" };
  }

  return { error: null, storage: syncError ? "local" : "sync" };
}

async function addKeyword(closeAfter = false) {
  if (isSavingKeyword) return;

  const keyword = keywordInput.value.trim();
  if (!keyword) {
    showStatus(getMessage("keywordDialogEnterTerm", [], "Please enter a keyword."), "error");
    return;
  }

  isSavingKeyword = true;
  addFilterBtn.disabled = true;
  keywordInput.disabled = true;

  try {
    const state = await loadFilterState();
    const existingFilters = parseTerms(state.filterTerms);

    const normalizedNew = normalizeTerm(keyword);
    const isDuplicate = existingFilters.some((term) => normalizeTerm(term) === normalizedNew);

    if (isDuplicate) {
      showStatus(
        getMessage("keywordDialogDuplicate", [keyword], `"${keyword}" is already in your filter list.`),
        "error"
      );
      keywordInput.value = "";
      keywordInput.focus();
      return;
    }

    const allFilters = [...existingFilters, keyword];
    const categoryPayload = buildUpdatedCategoryPayload(
      state.categories,
      state.categoryStates,
      keyword,
      allFilters,
      state.statisticsGroups
    );
    const result = await saveFilterState(allFilters.join(", "), categoryPayload);

    if (result.error) {
      showStatus(getMessage("keywordDialogSaveError", [], "Error saving keyword."), "error");
      return;
    }

    await notifyMydealzTabs({ type: "filtersChanged" });
    const doneMessage =
      result.storage === "local"
        ? getMessage("keywordDialogSavedLocal", [keyword], `Added "${keyword}" locally (sync error).`)
        : getMessage("keywordDialogAdded", [keyword], `Added "${keyword}" to filters.`);
    showStatus(doneMessage, result.storage === "local" ? "error" : "success");

    if (closeAfter) {
      setTimeout(() => {
        window.close();
      }, 300);
    } else {
      keywordInput.value = "";
      keywordInput.focus();
    }
  } finally {
    isSavingKeyword = false;
    addFilterBtn.disabled = false;
    keywordInput.disabled = false;
    if (!closeAfter) {
      keywordInput.focus();
    }
  }
}

addFilterBtn.addEventListener("click", () => {
  addKeyword(false);
});

closeBtn.addEventListener("click", () => {
  window.close();
});

keywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addKeyword(true);
  }
});

function detectSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

async function getStoredTheme() {
  const syncArea = getStorageArea("sync");
  if (syncArea) {
    const { result, error } = await storageGet(syncArea, [THEME_STORAGE_KEY]);
    if (!error && (result[THEME_STORAGE_KEY] === "dark" || result[THEME_STORAGE_KEY] === "light")) {
      return result[THEME_STORAGE_KEY];
    }
  }

  const localArea = getStorageArea("local");
  if (localArea) {
    const { result, error } = await storageGet(localArea, [THEME_STORAGE_KEY]);
    if (!error && (result[THEME_STORAGE_KEY] === "dark" || result[THEME_STORAGE_KEY] === "light")) {
      return result[THEME_STORAGE_KEY];
    }
  }

  return null;
}

async function loadTheme() {
  const storedTheme = await getStoredTheme();
  const theme = storedTheme || detectSystemTheme();
  applyTheme(theme);
  return theme;
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async (e) => {
  const storedTheme = await getStoredTheme();
  if (!storedTheme) {
    applyTheme(e.matches ? "dark" : "light");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
  loadTheme();
  keywordInput.focus();
});
