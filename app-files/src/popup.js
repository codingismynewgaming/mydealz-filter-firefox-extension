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

// Hidden deals and statistics elements
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
const statisticsToolbar = document.querySelector(".statistics-toolbar");

const {
  THEME_STORAGE_KEY,
  FILTER_CATEGORY_STORAGE_KEY,
  CATEGORY_STATES_STORAGE_KEY,
  DEFAULT_CATEGORY_NAME,
  STATS_GROUPS_STORAGE_KEY,
  STATS_VIEW_MODE_STORAGE_KEY,
  DEFAULT_STATS_VIEW_MODE,
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
  parseTerms,
  normalizeTerm,
  dedupeTerms,
  normalizeOpacityPercent,
  triggerJsonDownload,
  autoGrowTextarea,
  setupClickToEditTextarea,
  renderHiddenDealsList,
  notifyMydealzTabs,
  buildExportPayload,
  shouldPreferLocalOverSync,
} = MydealzFilterShared;

const SYNC_POPUP_SETTINGS_KEYS = [
  "filterTerms",
  "exceptionTerms",
  "autoSortComments",
  GREY_OUT_OPACITY_KEY,
  FILTER_CATEGORY_STORAGE_KEY,
  CATEGORY_STATES_STORAGE_KEY,
  STATS_GROUPS_STORAGE_KEY,
  STATS_VIEW_MODE_STORAGE_KEY,
  SETTINGS_UPDATED_AT_KEY,
];
const POPUP_MAX_HEIGHT_PX = 600;
const SETTINGS_POPUP_TARGET_HEIGHT_PX = 580;
const INFO_POPUP_TARGET_HEIGHT_PX = 580;
const FILTER_STATS_STORAGE_KEY = "hiddenCountsByTerm";

let currentHiddenDeals = [];
let currentTheme = "light";
let currentCategoryData = { [DEFAULT_CATEGORY_NAME]: [] };
let currentCategoryStates = { [DEFAULT_CATEGORY_NAME]: true };
let currentStatisticsGroups = {};
let currentStatisticsViewMode = DEFAULT_STATS_VIEW_MODE;
let selectedStatisticTerms = new Set();
let expandedStatisticGroups = new Set();
let statusHideTimer = null;
let inlineGroupCreateForm = null;

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

function getGroupedTermsSet(groups) {
  return new Set(
    Object.values(groups).flatMap((group) => group.terms.map((term) => normalizeTerm(term)))
  );
}

async function loadStatisticsGroups(availableTerms = []) {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");
  const groupKeys = [
    FILTER_CATEGORY_STORAGE_KEY,
    CATEGORY_STATES_STORAGE_KEY,
    STATS_GROUPS_STORAGE_KEY,
    STATS_VIEW_MODE_STORAGE_KEY,
    SETTINGS_UPDATED_AT_KEY,
  ];

  const { result: syncResult, error: syncError } = syncArea
    ? await storageGet(syncArea, groupKeys)
    : { result: {}, error: new Error("Sync unavailable") };
  const { result: localResult } = localArea
    ? await storageGet(localArea, groupKeys)
    : { result: {} };

  const preferLocal = shouldPreferLocalOverSync(syncResult, syncError, localResult, [
    FILTER_CATEGORY_STORAGE_KEY,
    CATEGORY_STATES_STORAGE_KEY,
    STATS_GROUPS_STORAGE_KEY,
  ]);
  const primary = preferLocal ? localResult : syncResult;
  const fallback = preferLocal ? syncResult : localResult;

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
  const rawGroups = isPlainObject(primary[STATS_GROUPS_STORAGE_KEY])
    ? primary[STATS_GROUPS_STORAGE_KEY]
    : isPlainObject(fallback[STATS_GROUPS_STORAGE_KEY])
    ? fallback[STATS_GROUPS_STORAGE_KEY]
    : {};
  const rawViewMode =
    primary[STATS_VIEW_MODE_STORAGE_KEY] ?? fallback[STATS_VIEW_MODE_STORAGE_KEY] ?? null;

  const categoryConfig = migrateLegacyStatisticsGroupsToCategories(
    rawCategories,
    rawStates,
    rawGroups,
    availableTerms
  );
  currentCategoryData = categoryConfig.categoryData;
  currentCategoryStates = categoryConfig.categoryStates;
  currentStatisticsGroups = categoriesToStatisticsGroups(currentCategoryData, rawGroups);

  const hasGroups = Object.keys(currentStatisticsGroups).length > 0;
  currentStatisticsViewMode =
    rawViewMode === "grouped" || rawViewMode === "ungrouped"
      ? rawViewMode
      : hasGroups
      ? "grouped"
      : "ungrouped";

  if (categoryConfig.migrated || (hasGroups && !rawViewMode)) {
    await persistStatisticsGroups();
  }
}

async function persistStatisticsGroups({ notifyTabs = false } = {}) {
  const availableTerms = dedupeTerms(parseTerms(filterTermsTextarea.value)).unique;
  const normalized = normalizeCategoryConfiguration(
    currentCategoryData,
    currentCategoryStates,
    availableTerms
  );
  currentCategoryData = normalized.categoryData;
  currentCategoryStates = normalized.categoryStates;
  currentStatisticsGroups = categoriesToStatisticsGroups(
    currentCategoryData,
    currentStatisticsGroups
  );

  const payload = {
    [FILTER_CATEGORY_STORAGE_KEY]: currentCategoryData,
    [CATEGORY_STATES_STORAGE_KEY]: currentCategoryStates,
    [STATS_GROUPS_STORAGE_KEY]: currentStatisticsGroups,
    [STATS_VIEW_MODE_STORAGE_KEY]: currentStatisticsViewMode,
    [SETTINGS_UPDATED_AT_KEY]: Date.now(),
  };
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  if (syncArea) {
    const { error } = await storageSet(syncArea, payload);
    if (error) {
      console.error("Error saving categories/groups to sync storage:", error);
    }
  }

  if (localArea) {
    const { error } = await storageSet(localArea, payload);
    if (error) {
      console.error("Error saving categories/groups to local storage:", error);
    }
  }

  if (notifyTabs) {
    await notifyContentScripts();
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

function detectSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function displayExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  if (popupVersionLabel) {
    popupVersionLabel.textContent = getMessage(
      "versionLabel",
      [manifest.version],
      `Version ${manifest.version}`
    );
  }
}

function updateThemeToggleLabel() {
  themeToggleBtn.textContent =
    currentTheme === "dark"
      ? getMessage("themeLight", [], "Light")
      : getMessage("themeDark", [], "Dark");
  themeToggleBtn.title =
    currentTheme === "dark"
      ? getMessage("themeSwitchToLight", [], "Switch to light mode")
      : getMessage("themeSwitchToDark", [], "Switch to dark mode");
}

function applyTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeToggleLabel();
}

async function getStoredThemePreference() {
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

async function loadThemePreference() {
  const storedTheme = await getStoredThemePreference();
  const initialTheme = storedTheme || detectSystemTheme();
  applyTheme(initialTheme);
  return initialTheme;
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
  const updatedAt = Date.now();
  const syncPayload = {
    autoSortComments: autoSortCommentsCheckbox.checked,
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
      console.error("Error saving toggle preferences to sync storage:", error);
    }
  } else {
    syncError = true;
  }

  if (localArea) {
    const { error } = await storageSet(localArea, localPayload);
    localError = !!error;
    if (error) {
      console.error("Error saving toggle preferences to local storage:", error);
    }
  } else {
    localError = true;
  }

  await notifyContentScripts();
  return { syncError, localError };
}

async function loadFilterTerms() {
  const syncArea = getStorageArea("sync");
  const localArea = getStorageArea("local");

  const { result: syncResult, error: syncError } = syncArea
    ? await storageGet(syncArea, [...SYNC_POPUP_SETTINGS_KEYS, GREY_OUT_SEEN_DEALS_KEY])
    : { result: {}, error: new Error("Sync unavailable") };
  const { result: localResult } = localArea
    ? await storageGet(localArea, [...SYNC_POPUP_SETTINGS_KEYS, GREY_OUT_SEEN_DEALS_KEY])
    : { result: {} };

  const preferLocal = shouldPreferLocalOverSync(syncResult, syncError, localResult, [
    "filterTerms",
    "exceptionTerms",
    "autoSortComments",
    GREY_OUT_OPACITY_KEY,
  ]);
  const primary = preferLocal ? localResult : syncResult;
  const fallback = preferLocal ? syncResult : localResult;

  const filterTerms = primary.filterTerms ?? fallback.filterTerms ?? "";
  const exceptionTerms = primary.exceptionTerms ?? fallback.exceptionTerms ?? "";
  autoSortCommentsCheckbox.checked =
    typeof primary.autoSortComments === "boolean"
      ? primary.autoSortComments
      : fallback.autoSortComments === true;

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
  const rawGroups = isPlainObject(primary[STATS_GROUPS_STORAGE_KEY])
    ? primary[STATS_GROUPS_STORAGE_KEY]
    : isPlainObject(fallback[STATS_GROUPS_STORAGE_KEY])
    ? fallback[STATS_GROUPS_STORAGE_KEY]
    : {};
  const categoryConfig = migrateLegacyStatisticsGroupsToCategories(
    rawCategories,
    rawStates,
    rawGroups,
    parseTerms(filterTerms)
  );
  currentCategoryData = categoryConfig.categoryData;
  currentCategoryStates = categoryConfig.categoryStates;
  currentStatisticsGroups = categoriesToStatisticsGroups(currentCategoryData, rawGroups);

  return { filterTerms, exceptionTerms, storage: preferLocal ? "local" : "sync" };
}

function updateSubtitleTotalHidden(totalHiddenDealCount) {
  const subtitleElement = document.querySelector(".header .subtitle");
  if (!subtitleElement) return;
  subtitleElement.textContent = getMessage(
    "popupSubtitleWithTotal",
    [String(totalHiddenDealCount)],
    `Hide postings by keywords • Total hidden: ${totalHiddenDealCount}`
  );
}

async function loadAndDisplayTotalHiddenCount() {
  const localArea = getStorageArea("local");
  if (localArea) {
    const { result, error } = await storageGet(localArea, ["totalHiddenDealCount"]);
    if (!error && Number.isInteger(result.totalHiddenDealCount)) {
      updateSubtitleTotalHidden(result.totalHiddenDealCount);
      return { totalHiddenDealCount: result.totalHiddenDealCount };
    }
  }

  const syncArea = getStorageArea("sync");
  if (syncArea) {
    const { result, error } = await storageGet(syncArea, ["totalHiddenDealCount"]);
    if (!error && Number.isInteger(result.totalHiddenDealCount)) {
      updateSubtitleTotalHidden(result.totalHiddenDealCount);
      return { totalHiddenDealCount: result.totalHiddenDealCount };
    }
  }

  updateSubtitleTotalHidden(0);
  return { totalHiddenDealCount: 0 };
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
  currentStatisticsGroups = categoriesToStatisticsGroups(
    currentCategoryData,
    currentStatisticsGroups
  );
  const updatedAt = Date.now();

  const syncPayload = {
    filterTerms,
    exceptionTerms,
    autoSortComments: autoSortCommentsCheckbox.checked,
    [GREY_OUT_OPACITY_KEY]: getGreyOutOpacityPercent(),
    [FILTER_CATEGORY_STORAGE_KEY]: currentCategoryData,
    [CATEGORY_STATES_STORAGE_KEY]: currentCategoryStates,
    [STATS_GROUPS_STORAGE_KEY]: currentStatisticsGroups,
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

function showStatus(message, type = "success") {
  clearTimeout(statusHideTimer);
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  statusHideTimer = setTimeout(() => {
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

async function notifyContentScripts() {
  await notifyMydealzTabs({ type: "filtersChanged" });
  await loadAndDisplayTotalHiddenCount();
}

function showHiddenDealsPlaceholder(message) {
  renderHiddenDealsList(hiddenDealsList, hiddenCountSpan, noHiddenDeals, [], message);
  updatePopupSizingForHiddenCount(0);
}

async function displayHiddenDeals() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && isMydealzDeUrl(tab.url)) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "getHiddenDeals" });
        currentHiddenDeals = Array.isArray(response?.hiddenDeals) ? response.hiddenDeals : [];
        renderHiddenDealsList(
          hiddenDealsList,
          hiddenCountSpan,
          noHiddenDeals,
          currentHiddenDeals,
          getMessage("noHiddenDeals", [], "No deals have been hidden on this page.")
        );
        updatePopupSizingForHiddenCount(currentHiddenDeals.length);
      } catch (sendError) {
        console.error("Error getting hidden deals from content script:", sendError);
        showHiddenDealsPlaceholder(
          getMessage("noHiddenDeals", [], "No deals have been hidden on this page.")
        );
      }
    } else {
      showHiddenDealsPlaceholder(
        getMessage("visitMydealzHiddenDeals", [], "Visit mydealz.de to see hidden deals.")
      );
    }

    await loadAndDisplayTotalHiddenCount();
  } catch (error) {
    console.error("Error getting active tab:", error);
    showHiddenDealsPlaceholder(
      getMessage("noHiddenDeals", [], "No deals have been hidden on this page.")
    );
    await loadAndDisplayTotalHiddenCount();
  }
}

function closeInlineGroupCreateForm() {
  if (inlineGroupCreateForm) {
    inlineGroupCreateForm.remove();
    inlineGroupCreateForm = null;
  }
}

function openInlineGroupCreateForm() {
  closeInlineGroupCreateForm();
  const selectedTerms = Array.from(selectedStatisticTerms);
  if (selectedTerms.length < 2 || !statisticsToolbar) return;

  const form = document.createElement("form");
  form.className = "inline-edit-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "inline-text-input";
  input.maxLength = 50;
  input.placeholder = getMessage("groupNamePlaceholder", [], "Category / group name...");
  input.setAttribute("aria-label", getMessage("groupNamePlaceholder", [], "Category / group name..."));

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "submit";
  confirmBtn.className = "btn btn-primary";
  confirmBtn.textContent = getMessage("createLabel", [], "Create");

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = getMessage("cancelLabel", [], "Cancel");
  cancelBtn.addEventListener("click", closeInlineGroupCreateForm);

  form.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeInlineGroupCreateForm();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const groupName = normalizeCategoryName(input.value);
    if (!groupName || !/^[\p{L}\p{N}\s-]{1,50}$/u.test(groupName)) {
      input.focus();
      return;
    }

    if (normalizeTerm(groupName) === normalizeTerm(DEFAULT_CATEGORY_NAME)) {
      showStatus("Reserved category name.", "error");
      input.focus();
      return;
    }

    const existingCategoryKey = Object.keys(currentCategoryData).find(
      (entry) => normalizeTerm(entry) === normalizeTerm(groupName)
    );
    const targetName = existingCategoryKey || groupName;

    const groupedTerms = getGroupedTermsSet(currentStatisticsGroups);
    const availableSelection = selectedTerms.filter(
      (term) => !groupedTerms.has(normalizeTerm(term))
    );
    if (availableSelection.length < 2 && !existingCategoryKey) {
      showStatus("Select at least 2 ungrouped terms.", "error");
      closeInlineGroupCreateForm();
      return;
    }

    const selectionSet = new Set(availableSelection.map((term) => normalizeTerm(term)));
    Object.keys(currentCategoryData).forEach((categoryName) => {
      currentCategoryData[categoryName] = (currentCategoryData[categoryName] || []).filter(
        (term) => !selectionSet.has(normalizeTerm(term))
      );
    });
    currentCategoryData[targetName] = [
      ...(currentCategoryData[targetName] || []),
      ...availableSelection,
    ];
    currentCategoryStates[targetName] = true;

    currentStatisticsViewMode = "grouped";
    selectedStatisticTerms.clear();
    closeInlineGroupCreateForm();

    await persistStatisticsGroups({ notifyTabs: true });
    const createdEntry = Object.entries(currentStatisticsGroups).find(
      ([, group]) => normalizeTerm(group.name) === normalizeTerm(targetName)
    );
    if (createdEntry) {
      expandedStatisticGroups.add(createdEntry[0]);
    }
    await displayFilterStatistics();
    if (manageGroupsTab.classList.contains("active")) {
      await renderManageGroupsTab();
    }
    showStatus(`Created group ${targetName}.`, "success");
  });

  form.appendChild(input);
  form.appendChild(confirmBtn);
  form.appendChild(cancelBtn);
  statisticsToolbar.appendChild(form);
  inlineGroupCreateForm = form;
  input.focus();
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
    noStatisticsData.textContent = getMessage(
      "statsAddTermsFirst",
      [],
      "Add filter terms in Settings to view statistics."
    );
    noStatisticsData.style.display = "block";
    updatePopupSizingForStatisticsCount(0);
    return;
  }

  const localArea = getStorageArea("local");
  let storedStats = {};
  if (localArea) {
    const { result, error } = await storageGet(localArea, [FILTER_STATS_STORAGE_KEY]);
    if (
      !error &&
      result[FILTER_STATS_STORAGE_KEY] &&
      typeof result[FILTER_STATS_STORAGE_KEY] === "object"
    ) {
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
    noStatisticsData.textContent = getMessage(
      "statsNoData",
      [],
      "No statistics yet. Browse mydealz.de to build filter insights."
    );
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
    countLabel.textContent = getMessage(
      "statsHiddenCount",
      [String(entry.count)],
      `${entry.count} hidden`
    );

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
      const categoryEnabled = currentCategoryStates[entry.group.name] !== false;
      const statRow = document.createElement("div");
      statRow.className = `stats-item is-group${categoryEnabled ? "" : " is-disabled"}`;

      const activeToggle = document.createElement("input");
      activeToggle.className = "stats-selector";
      activeToggle.type = "checkbox";
      activeToggle.checked = categoryEnabled;
      activeToggle.title = entry.group.name;
      activeToggle.setAttribute("aria-label", entry.group.name);
      activeToggle.addEventListener("change", async () => {
        currentCategoryStates[entry.group.name] = activeToggle.checked;
        await persistStatisticsGroups({ notifyTabs: true });
        await displayFilterStatistics();
        showStatus(
          getMessage(
            activeToggle.checked ? "categoryEnabledStatus" : "categoryDisabledStatus",
            [entry.group.name],
            `${entry.group.name} ${activeToggle.checked ? "enabled" : "disabled"}.`
          ),
          "success"
        );
      });

      const rank = document.createElement("span");
      rank.className = "stats-rank";
      rank.textContent = `${index + 1}`;

      const termLabel = document.createElement("span");
      termLabel.className = "stats-term";
      termLabel.textContent = entry.group.name;

      const metaLabel = document.createElement("span");
      metaLabel.className = "stats-meta";
      metaLabel.textContent = getMessage(
        "statsTermCount",
        [String(entry.members.length)],
        `${entry.members.length} terms`
      );

      const countLabel = document.createElement("span");
      countLabel.className = "stats-count";
      countLabel.textContent = getMessage(
        "statsHiddenCount",
        [String(entry.count)],
        `${entry.count} hidden`
      );

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "stats-group-toggle";
      toggleBtn.type = "button";
      const expanded = expandedStatisticGroups.has(entry.groupId);
      toggleBtn.textContent = expanded
        ? getMessage("hideLabel", [], "Hide")
        : getMessage("showLabel", [], "Show");
      toggleBtn.addEventListener("click", () => {
        if (expandedStatisticGroups.has(entry.groupId)) expandedStatisticGroups.delete(entry.groupId);
        else expandedStatisticGroups.add(entry.groupId);
        displayFilterStatistics();
      });

      statRow.appendChild(activeToggle);
      statRow.appendChild(rank);
      statRow.appendChild(termLabel);
      statRow.appendChild(metaLabel);
      statRow.appendChild(countLabel);
      statRow.appendChild(toggleBtn);
      statisticsList.appendChild(statRow);
      visibleRowCount++;

      if (expanded) {
        entry.members.forEach((member, memberIndex) => {
          renderSelectableRow(member, memberIndex, true);
        });
      }
    });

    rankedStats
      .filter((entry) => !groupedTerms.has(entry.normalizedKey))
      .forEach((entry, index) => renderSelectableRow(entry, index, false));
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

  const namedCategoryEntries = Object.entries(currentCategoryData).filter(
    ([categoryName]) => normalizeTerm(categoryName) !== normalizeTerm(DEFAULT_CATEGORY_NAME)
  );
  if (namedCategoryEntries.length === 0) {
    noManageGroupsData.style.display = "block";
    return;
  }

  noManageGroupsData.style.display = "none";
  namedCategoryEntries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([categoryName, categoryTerms]) => {
      const safeTerms = Array.isArray(categoryTerms) ? categoryTerms : [];
      const card = document.createElement("section");
      card.className = "group-card";

      const header = document.createElement("div");
      header.className = "group-card-header";

      const title = document.createElement("div");
      title.className = "group-card-title";
      title.textContent = `${categoryName} (${safeTerms.length})`;

      const actions = document.createElement("div");
      actions.className = "group-card-actions";

      const renameBtn = document.createElement("button");
      renameBtn.className = "btn btn-secondary";
      renameBtn.type = "button";
      renameBtn.textContent = getMessage("renameLabel", [], "Rename");
      renameBtn.addEventListener("click", () => {
        header.innerHTML = "";
        const renameForm = document.createElement("form");
        renameForm.className = "inline-edit-row";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "inline-text-input";
        input.maxLength = 50;
        input.value = categoryName;
        input.setAttribute("aria-label", getMessage("renameLabel", [], "Rename"));

        const saveNameBtn = document.createElement("button");
        saveNameBtn.type = "submit";
        saveNameBtn.className = "btn btn-primary";
        saveNameBtn.textContent = getMessage("saveLabel", [], "Save");

        const cancelNameBtn = document.createElement("button");
        cancelNameBtn.type = "button";
        cancelNameBtn.className = "btn btn-secondary";
        cancelNameBtn.textContent = getMessage("cancelLabel", [], "Cancel");
        cancelNameBtn.addEventListener("click", () => {
          renderManageGroupsTab();
        });

        renameForm.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            renderManageGroupsTab();
          }
        });

        renameForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const nextName = normalizeCategoryName(input.value);
          if (!nextName || !/^[\p{L}\p{N}\s-]{1,50}$/u.test(nextName)) {
            input.focus();
            return;
          }
          if (normalizeTerm(nextName) === normalizeTerm(DEFAULT_CATEGORY_NAME)) {
            showStatus("Reserved category name.", "error");
            input.focus();
            return;
          }
          const collision = Object.keys(currentCategoryData).some(
            (existing) =>
              normalizeTerm(existing) === normalizeTerm(nextName) &&
              normalizeTerm(existing) !== normalizeTerm(categoryName)
          );
          if (collision) {
            showStatus("Category already exists.", "error");
            input.focus();
            return;
          }

          if (nextName !== categoryName) {
            const nextData = cloneCategoryData(currentCategoryData);
            const nextStates = cloneCategoryStates(currentCategoryStates);
            nextData[nextName] = nextData[categoryName] || [];
            nextStates[nextName] = nextStates[categoryName] !== false;
            delete nextData[categoryName];
            delete nextStates[categoryName];
            currentCategoryData = nextData;
            currentCategoryStates = nextStates;
            await persistStatisticsGroups({ notifyTabs: true });
          }
          await renderManageGroupsTab();
          if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
        });

        renameForm.appendChild(input);
        renameForm.appendChild(saveNameBtn);
        renameForm.appendChild(cancelNameBtn);
        header.appendChild(renameForm);
        input.focus();
        input.select();
      });

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
        await persistStatisticsGroups({ notifyTabs: true });
        await renderManageGroupsTab();
        if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
      });

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      header.appendChild(title);
      header.appendChild(actions);

      const termsWrap = document.createElement("div");
      termsWrap.className = "group-card-terms";

      safeTerms.forEach((term) => {
        const chip = document.createElement("span");
        chip.className = "group-term-chip";
        chip.textContent = term;

        const removeBtn = document.createElement("button");
        removeBtn.className = "group-term-remove";
        removeBtn.type = "button";
        removeBtn.textContent = "x";
        removeBtn.addEventListener("click", async () => {
          currentCategoryData[categoryName] = (currentCategoryData[categoryName] || []).filter(
            (entry) => normalizeTerm(entry) !== normalizeTerm(term)
          );
          currentCategoryData[DEFAULT_CATEGORY_NAME] = [
            ...(currentCategoryData[DEFAULT_CATEGORY_NAME] || []),
            term,
          ];
          await persistStatisticsGroups({ notifyTabs: true });
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
      placeholder.textContent =
        ungroupedTerms.length > 0
          ? getMessage("addUngroupedTermPlaceholder", [], "Add ungrouped term...")
          : getMessage("noUngroupedTermsLeft", [], "No ungrouped terms left");
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
      addBtn.textContent = getMessage("addTermLabel", [], "Add Term");
      addBtn.disabled = ungroupedTerms.length === 0;
      addBtn.addEventListener("click", async () => {
        if (!addSelect.value) return;
        const nextTerm = addSelect.value;
        currentCategoryData[DEFAULT_CATEGORY_NAME] = (
          currentCategoryData[DEFAULT_CATEGORY_NAME] || []
        ).filter((entry) => normalizeTerm(entry) !== normalizeTerm(nextTerm));
        currentCategoryData[categoryName] = [...(currentCategoryData[categoryName] || []), nextTerm];
        await persistStatisticsGroups({ notifyTabs: true });
        await renderManageGroupsTab();
        if (statisticsTab.classList.contains("active")) await displayFilterStatistics();
        showStatus(`Added "${nextTerm}" to ${categoryName}.`, "success");
      });

      addRow.appendChild(addSelect);
      addRow.appendChild(addBtn);

      card.appendChild(header);
      card.appendChild(termsWrap);
      card.appendChild(addRow);
      manageGroupsList.appendChild(card);
    });
}

function switchTab(tabName) {
  closeInlineGroupCreateForm();
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (tabName === "settings") {
    settingsTab.classList.add("active");
    settingsTabBtn.classList.add("active");
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
  } else if (tabName === "statistics") {
    statisticsTab.classList.add("active");
    statisticsTabBtn.classList.add("active");
    displayFilterStatistics();
  } else if (tabName === "hiddenPosts") {
    hiddenPostsTab.classList.add("active");
    hiddenPostsTabBtn.classList.add("active");
    displayHiddenDeals();
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
      showStatus("✗ Error saving filters to sync and local storage", "error");
      return;
    }

    const filterTermCount = parseTerms(filterTerms).length;
    const exceptionTermCount = parseTerms(exceptionTerms).length;
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
      showStatus(
        `✓ Saved ${filterTermCount} filter term(s) and ${exceptionTermCount} exception term(s)!${syncSuffix}`,
        syncError ? "error" : "success"
      );
    } else {
      showStatus(`✓ Filters cleared${syncSuffix}`, syncError ? "error" : "success");
    }

    await notifyContentScripts();

    if (hiddenPostsTab.classList.contains("active")) {
      await displayHiddenDeals();
    } else if (statisticsTab.classList.contains("active")) {
      await displayFilterStatistics();
    } else if (manageGroupsTab.classList.contains("active")) {
      await renderManageGroupsTab();
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

settingsTabBtn.addEventListener("click", () => {
  switchTab("settings");
});

hiddenPostsTabBtn.addEventListener("click", () => {
  switchTab("hiddenPosts");
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

createStatsGroupBtn.addEventListener("click", () => {
  openInlineGroupCreateForm();
});

async function setupKeyboardShortcutPopup() {
  const keywordShortcutPopup = document.getElementById("keywordShortcutPopup");
  const openShortcutSettingsPopupBtn = document.getElementById("openShortcutSettingsPopupBtn");

  if (!keywordShortcutPopup) return;
  keywordShortcutPopup.readOnly = true;

  let shortcutSet = false;
  if (chrome.commands && chrome.commands.getAll) {
    const commands = await new Promise((resolve) => {
      chrome.commands.getAll((list) => resolve(Array.isArray(list) ? list : []));
    });
    const command = commands.find((cmd) => cmd.name === "open-keyword-dialog");
    if (command && command.shortcut) {
      keywordShortcutPopup.value = command.shortcut;
      shortcutSet = true;
    }
  }

  if (!shortcutSet) {
    const syncArea = getStorageArea("sync");
    const localArea = getStorageArea("local");
    const syncRes = syncArea
      ? await storageGet(syncArea, ["keywordShortcut", "customShortcut"])
      : { result: {} };
    const localRes = localArea
      ? await storageGet(localArea, ["keywordShortcut", "customShortcut"])
      : { result: {} };
    keywordShortcutPopup.value =
      syncRes.result.keywordShortcut ||
      syncRes.result.customShortcut ||
      localRes.result.keywordShortcut ||
      localRes.result.customShortcut ||
      DEFAULT_SHORTCUT;
  }

  if (openShortcutSettingsPopupBtn) {
    openShortcutSettingsPopupBtn.addEventListener("click", () => {
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

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.totalHiddenDealCount) {
      const nextCount = changes.totalHiddenDealCount.newValue;
      if (Number.isInteger(nextCount)) {
        updateSubtitleTotalHidden(nextCount);
      }
    }
  });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async (e) => {
  const storedTheme = await getStoredThemePreference();
  if (!storedTheme) {
    applyTheme(e.matches ? "dark" : "light");
  }
});

async function init() {
  applyI18n();
  displayExtensionVersion();
  await loadThemePreference();
  setupClickToEditKeywordFields();
  await setupKeyboardShortcutPopup();
  await loadFilterTerms();
  autoGrowKeywordTextareas();
  filterTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  exceptionTermsTextarea.addEventListener("input", autoGrowKeywordTextareas);
  switchTab("hiddenPosts");
  await loadAndDisplayTotalHiddenCount();
}

init();
