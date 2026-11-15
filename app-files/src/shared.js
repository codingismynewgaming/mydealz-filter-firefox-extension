/**
 * Shared constants and helper functions for extension UI pages and background script.
 */
(function (globalScope) {
  const MYDEALZ_BASE_HOST = "mydealz.de";
  const MYDEALZ_TAB_PATTERNS = ["*://mydealz.de/*", "*://*.mydealz.de/*"];
  const GITHUB_ISSUES_URL =
    "https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/issues";

  const SYNC_SETTINGS_KEYS = [
    "keywordShortcut",
    "filterTerms",
    "exceptionTerms",
    "autoSortComments",
    "greyOutOpacityPercent",
    "filterTermCategories",
    "categoryStates",
  ];
  const LOCAL_ONLY_SETTINGS_KEYS = ["greyOutSeenDeals"];
  const ALL_SETTINGS_KEYS = [...SYNC_SETTINGS_KEYS, ...LOCAL_ONLY_SETTINGS_KEYS];
  const LOCAL_STATE_KEYS = [
    "seenDealUrls",
    "totalHiddenDealCount",
    "totalHiddenDealKeys",
    "hiddenCountsByTerm",
  ];
  const LOCAL_ONLY_BACKUP_KEYS = new Set([...LOCAL_ONLY_SETTINGS_KEYS, ...LOCAL_STATE_KEYS]);

  const FILTER_CATEGORY_STORAGE_KEY = "filterTermCategories";
  const CATEGORY_STATES_STORAGE_KEY = "categoryStates";
  const DEFAULT_CATEGORY_NAME = "Uncategorized";
  const STATS_GROUPS_STORAGE_KEY = "statisticsGroups";
  const STATS_VIEW_MODE_STORAGE_KEY = "statisticsViewMode";
  const DEFAULT_STATS_VIEW_MODE = "grouped";
  const GREY_OUT_SEEN_DEALS_KEY = "greyOutSeenDeals";
  const GREY_OUT_OPACITY_KEY = "greyOutOpacityPercent";
  const DEFAULT_GREY_OUT_OPACITY_PERCENT = 30;
  const THEME_STORAGE_KEY = "popupTheme";
  const DEFAULT_SHORTCUT = "Ctrl+Shift+K";
  const SYNC_QUOTA_PER_ITEM = 8192;
  const SETTINGS_UPDATED_AT_KEY = "settingsUpdatedAt";

  const BACKUP_FORMAT = "mydealz-filter-backup";
  const BACKUP_SCHEMA_VERSION = 2;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
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

  function getSafeHttpUrl(url) {
    if (typeof url !== "string" || !url.trim()) return null;
    try {
      const parsed = new URL(url, "https://www.mydealz.de");
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.href;
      }
      return null;
    } catch {
      return null;
    }
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

  function storageRemove(area, keys) {
    return new Promise((resolve) => {
      if (!area || typeof area.remove !== "function") {
        resolve({ error: new Error("Storage area unavailable") });
        return;
      }

      area.remove(keys, () => {
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

  /**
   * Write targetKeys first and remove stale keys afterwards so a failed write never wipes existing data.
   */
  async function replaceStorageSafely(area, targetData) {
    if (!area) {
      return { error: new Error("Storage area unavailable") };
    }

    const { result: existingData, error: readError } = await storageGet(area, null);
    if (readError) {
      return { error: readError };
    }

    const safeTarget = isPlainObject(targetData) ? targetData : {};
    if (Object.keys(safeTarget).length > 0) {
      const { error: setError } = await storageSet(area, safeTarget);
      if (setError) {
        return { error: setError };
      }
    }

    const staleKeys = Object.keys(existingData || {}).filter(
      (key) => !Object.prototype.hasOwnProperty.call(safeTarget, key)
    );
    if (staleKeys.length > 0) {
      const { error: removeError } = await storageRemove(area, staleKeys);
      if (removeError) {
        return { error: removeError };
      }
    }

    return { error: null };
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

  function normalizeOpacityPercent(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return DEFAULT_GREY_OUT_OPACITY_PERCENT;
    return Math.min(100, Math.max(0, Math.round(parsed)));
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

  function autoGrowTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY = "hidden";
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

  function getMessage(key, substitutions, fallback = "") {
    try {
      if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
        const translated = chrome.i18n.getMessage(key, substitutions);
        if (translated) return translated;
      }
    } catch {
      // Fall back cleanly outside extension contexts (e.g. unit tests).
    }
    return fallback;
  }

  function applyI18n(root = typeof document !== "undefined" ? document : null) {
    if (!root) return;
    try {
      if (
        typeof document !== "undefined" &&
        document.documentElement &&
        typeof chrome !== "undefined" &&
        chrome.i18n &&
        typeof chrome.i18n.getUILanguage === "function"
      ) {
        const uiLang = chrome.i18n.getUILanguage();
        if (uiLang) {
          document.documentElement.lang = uiLang.split("-")[0];
        }
      }
    } catch {
      // Ignore unavailable UI language lookup.
    }

    root.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const message = getMessage(key);
      if (message) element.textContent = message;
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      const message = getMessage(key);
      if (message) element.setAttribute("placeholder", message);
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.getAttribute("data-i18n-aria-label");
      const message = getMessage(key);
      if (message) element.setAttribute("aria-label", message);
    });

    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.getAttribute("data-i18n-title");
      const message = getMessage(key);
      if (message) element.setAttribute("title", message);
    });
  }

  function normalizeCategoryName(name) {
    return typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 50) : "";
  }

  function buildGroupIdFromCategoryName(name) {
    const slug = normalizeTerm(name)
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return slug || `group-${Date.now()}`;
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
    const dedupedTerms = dedupeTerms(filterTerms || []).unique;
    const termLookup = new Map(dedupedTerms.map((term) => [normalizeTerm(term), term]));
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
      if (
        !normalizedCategories[DEFAULT_CATEGORY_NAME].some(
          (entry) => normalizeTerm(entry) === normalizeTerm(term)
        )
      ) {
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

  function migrateLegacyStatisticsGroupsToCategories(rawCategories, rawStates, rawStatsGroups, filterTerms) {
    const base = normalizeCategoryConfiguration(rawCategories, rawStates, filterTerms);
    if (!isPlainObject(rawStatsGroups) || Object.keys(rawStatsGroups).length === 0) {
      return { ...base, migrated: false };
    }

    const nextCategories = cloneCategoryData(base.categoryData);
    const nextStates = cloneCategoryStates(base.categoryStates);
    const assignedInNamedCategory = new Set();

    Object.entries(nextCategories).forEach(([categoryName, terms]) => {
      if (normalizeTerm(categoryName) === normalizeTerm(DEFAULT_CATEGORY_NAME)) return;
      terms.forEach((term) => assignedInNamedCategory.add(normalizeTerm(term)));
    });

    let migrated = false;
    Object.values(rawStatsGroups).forEach((group) => {
      if (!group || typeof group !== "object") return;
      const groupName = normalizeCategoryName(group.name);
      if (!groupName || normalizeTerm(groupName) === normalizeTerm(DEFAULT_CATEGORY_NAME)) return;
      const groupTerms = Array.isArray(group.terms) ? group.terms : [];
      const candidateTerms = groupTerms.filter(
        (term) => !assignedInNamedCategory.has(normalizeTerm(term))
      );
      if (candidateTerms.length === 0) return;

      const existingKey = Object.keys(nextCategories).find(
        (name) => normalizeTerm(name) === normalizeTerm(groupName)
      );
      const targetName = existingKey || groupName;
      nextCategories[targetName] = nextCategories[targetName] || [];
      candidateTerms.forEach((term) => {
        const normalized = normalizeTerm(term);
        if (assignedInNamedCategory.has(normalized)) return;
        assignedInNamedCategory.add(normalized);
        nextCategories[targetName].push(term);
        nextCategories[DEFAULT_CATEGORY_NAME] = (nextCategories[DEFAULT_CATEGORY_NAME] || []).filter(
          (entry) => normalizeTerm(entry) !== normalized
        );
        migrated = true;
      });
      if (!(targetName in nextStates)) {
        nextStates[targetName] = true;
      }
    });

    if (!migrated) {
      return { ...base, migrated: false };
    }

    const normalized = normalizeCategoryConfiguration(nextCategories, nextStates, filterTerms);
    return { ...normalized, migrated: true };
  }

  function categoriesToStatisticsGroups(categoryData, existingStatsGroups = {}) {
    const groups = {};
    const existingByNormalizedName = new Map();
    Object.entries(existingStatsGroups || {}).forEach(([groupId, group]) => {
      if (group && typeof group.name === "string") {
        existingByNormalizedName.set(normalizeTerm(group.name), { groupId, ...group });
      }
    });

    const usedIds = new Set();
    Object.entries(categoryData || {}).forEach(([categoryName, terms]) => {
      if (normalizeTerm(categoryName) === normalizeTerm(DEFAULT_CATEGORY_NAME)) return;
      const safeTerms = Array.isArray(terms) ? [...terms] : [];
      if (safeTerms.length === 0) return;

      const existing = existingByNormalizedName.get(normalizeTerm(categoryName));
      const baseId = existing?.groupId || buildGroupIdFromCategoryName(categoryName);
      let groupId = baseId;
      let suffix = 2;
      while (usedIds.has(groupId)) {
        groupId = `${baseId}-${suffix}`;
        suffix++;
      }
      usedIds.add(groupId);

      groups[groupId] = {
        name: categoryName,
        terms: safeTerms,
        createdAt: Number.isInteger(existing?.createdAt) ? existing.createdAt : Date.now(),
      };
    });

    return groups;
  }

  function renderHiddenDealsList(container, countElement, emptyElement, deals, emptyMessage) {
    const safeDeals = Array.isArray(deals) ? deals : [];
    if (countElement) {
      countElement.textContent = String(safeDeals.length);
    }
    if (!container) return;

    container.innerHTML = "";

    if (safeDeals.length === 0) {
      if (emptyElement) {
        emptyElement.textContent =
          emptyMessage || getMessage("noHiddenDeals", [], "No deals have been hidden on this page.");
        emptyElement.style.display = "block";
        container.appendChild(emptyElement);
      }
      return;
    }

    safeDeals.forEach((deal) => {
      const dealItem = document.createElement("div");
      dealItem.className = "deal-item";

      const titleElement = document.createElement("div");
      titleElement.className = "deal-title";

      const safeUrl = getSafeHttpUrl(deal?.url);
      if (safeUrl) {
        const link = document.createElement("a");
        link.href = safeUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = deal.title || safeUrl;
        titleElement.appendChild(link);
      } else {
        titleElement.textContent = deal?.title || "";
      }

      const termElement = document.createElement("div");
      termElement.className = "deal-term";
      const termValue = deal?.matchingTerm || "";
      termElement.textContent = getMessage(
        "hiddenByTerm",
        [termValue],
        `Hidden by: "${termValue}"`
      );

      dealItem.appendChild(titleElement);
      dealItem.appendChild(termElement);
      container.appendChild(dealItem);
    });
  }

  function sendMessageToTabSafe(tabId, message) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, response: null, error: chrome.runtime.lastError.message });
            return;
          }
          resolve({ ok: true, response: response || null, error: null });
        });
      } catch (error) {
        resolve({ ok: false, response: null, error: error?.message || "sendMessage failed" });
      }
    });
  }

  async function notifyMydealzTabs(message) {
    if (!chrome.tabs || typeof chrome.tabs.query !== "function") {
      return [];
    }

    try {
      const tabs = await chrome.tabs.query({ url: MYDEALZ_TAB_PATTERNS });
      return Promise.all(
        tabs
          .filter((tab) => tab && tab.id !== undefined)
          .map((tab) => sendMessageToTabSafe(tab.id, message))
      );
    } catch {
      return [];
    }
  }

  function pickBestMydealzDeTab(tabs) {
    const mydealzDeTabs = (tabs || []).filter((tab) => isMydealzDeUrl(tab.url));
    if (mydealzDeTabs.length === 0) return null;

    const activeTab = mydealzDeTabs.find((tab) => tab.active);
    if (activeTab) return activeTab;

    return mydealzDeTabs
      .slice()
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }

  function isFullBackupPayload(payload) {
    return isPlainObject(payload) && isPlainObject(payload.storage);
  }

  function filterSyncBackupData(rawData) {
    if (!isPlainObject(rawData)) return {};
    const filtered = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (LOCAL_ONLY_BACKUP_KEYS.has(key)) continue;
      filtered[key] = value;
    }
    return filtered;
  }

  function validateImportPayload(payload) {
    if (!isPlainObject(payload)) return "Invalid JSON structure.";

    if (isFullBackupPayload(payload)) {
      if (payload.storage.sync !== undefined && !isPlainObject(payload.storage.sync)) {
        return "storage.sync must be an object.";
      }
      if (payload.storage.local !== undefined && !isPlainObject(payload.storage.local)) {
        return "storage.local must be an object.";
      }
      return null;
    }

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

  function hasSyncQuotaRisk(data) {
    if (!isPlainObject(data)) return false;
    for (const [key, value] of Object.entries(data)) {
      const serialized = JSON.stringify(value);
      const byteSize = new Blob([key, serialized === undefined ? "" : serialized]).size;
      if (byteSize > SYNC_QUOTA_PER_ITEM) {
        return true;
      }
    }
    return false;
  }

  function shouldPreferLocalOverSync(syncResult, syncError, localResult, probeKeys) {
    if (syncError) return true;
    const syncTs = Number(syncResult?.[SETTINGS_UPDATED_AT_KEY]) || 0;
    const localTs = Number(localResult?.[SETTINGS_UPDATED_AT_KEY]) || 0;
    if (localTs > syncTs) return true;

    const keys = Array.isArray(probeKeys) ? probeKeys : [];
    const syncHasAnyKey = keys.some((key) =>
      Object.prototype.hasOwnProperty.call(syncResult || {}, key)
    );
    if (syncHasAnyKey) return false;

    return keys.some((key) =>
      Object.prototype.hasOwnProperty.call(localResult || {}, key)
    );
  }

  globalScope.MydealzFilterShared = {
    MYDEALZ_BASE_HOST,
    MYDEALZ_TAB_PATTERNS,
    GITHUB_ISSUES_URL,
    SYNC_SETTINGS_KEYS,
    LOCAL_ONLY_SETTINGS_KEYS,
    ALL_SETTINGS_KEYS,
    LOCAL_STATE_KEYS,
    FILTER_CATEGORY_STORAGE_KEY,
    CATEGORY_STATES_STORAGE_KEY,
    DEFAULT_CATEGORY_NAME,
    STATS_GROUPS_STORAGE_KEY,
    STATS_VIEW_MODE_STORAGE_KEY,
    DEFAULT_STATS_VIEW_MODE,
    GREY_OUT_SEEN_DEALS_KEY,
    GREY_OUT_OPACITY_KEY,
    DEFAULT_GREY_OUT_OPACITY_PERCENT,
    THEME_STORAGE_KEY,
    DEFAULT_SHORTCUT,
    SYNC_QUOTA_PER_ITEM,
    SETTINGS_UPDATED_AT_KEY,
    BACKUP_FORMAT,
    BACKUP_SCHEMA_VERSION,
    getMessage,
    applyI18n,
    normalizeCategoryName,
    buildGroupIdFromCategoryName,
    cloneCategoryData,
    cloneCategoryStates,
    normalizeCategoryConfiguration,
    migrateLegacyStatisticsGroupsToCategories,
    categoriesToStatisticsGroups,
    isPlainObject,
    isMydealzDeUrl,
    getSafeHttpUrl,
    getStorageArea,
    storageGet,
    storageSet,
    storageRemove,
    storageClear,
    replaceStorageSafely,
    parseTerms,
    normalizeTerm,
    dedupeTerms,
    mergeUniqueTerms,
    normalizeOpacityPercent,
    getExportFilename,
    triggerJsonDownload,
    autoGrowTextarea,
    setupClickToEditTextarea,
    renderHiddenDealsList,
    sendMessageToTabSafe,
    notifyMydealzTabs,
    pickBestMydealzDeTab,
    isFullBackupPayload,
    filterSyncBackupData,
    validateImportPayload,
    getStorageSnapshot,
    buildExportPayload,
    hasSyncQuotaRisk,
    shouldPreferLocalOverSync,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
