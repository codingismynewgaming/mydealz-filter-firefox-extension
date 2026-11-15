import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { MockElement, parseHtmlFixture } from "./dom-fixture-harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function makeMockChromeArea(initial = {}, { failSetWith = null, onRemove = null } = {}) {
  const store = { ...initial };
  return {
    _store: store,
    get(keys, cb) {
      if (keys === null || keys === undefined) {
        cb({ ...store });
        return;
      }
      const list = Array.isArray(keys) ? keys : [keys];
      const out = {};
      for (const k of list) {
        if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
      }
      cb(out);
    },
    set(data, cb) {
      if (failSetWith) {
        chromeRef.runtime.lastError = { message: failSetWith };
        cb();
        chromeRef.runtime.lastError = null;
        return;
      }
      Object.assign(store, data);
      cb();
    },
    remove(keys, cb) {
      if (onRemove) onRemove(keys);
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) delete store[k];
      cb();
    },
  };
}

const chromeRef = {
  runtime: {
    lastError: null,
    getManifest: () => ({ version: "1.0.12" }),
  },
  storage: {
    sync: makeMockChromeArea(),
    local: makeMockChromeArea(),
  },
  i18n: {
    getUILanguage: () => "de-DE",
    getMessage: (key, substitutions = []) => {
      if (key === "noHiddenDeals") return "Auf dieser Seite wurden keine Deals ausgeblendet.";
      if (key === "hiddenByTerm") return `Ausgeblendet durch: "${substitutions[0] || ""}"`;
      if (key === "dealSeenOn") return `Gesehen am ${substitutions[0] || ""}`;
      return "";
    },
  },
};

function loadSharedInVm() {
  const sharedCode = fs.readFileSync(path.join(rootDir, "app-files/src/shared.js"), "utf8");
  const sandbox = {
    chrome: chromeRef,
    console,
    Blob,
    URL,
    Set,
    Map,
    Date,
    Number,
    String,
    Array,
    Object,
    Boolean,
    Promise,
    Error,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(sharedCode, sandbox, { filename: "shared.js" });
  return sandbox.MydealzFilterShared;
}

const Shared = loadSharedInVm();

// 1. URL sanitization tests
assert.equal(Shared.getSafeHttpUrl("https://www.mydealz.de/deals/test-1"), "https://www.mydealz.de/deals/test-1");
assert.equal(Shared.getSafeHttpUrl("/deals/rel-1"), "https://www.mydealz.de/deals/rel-1");
assert.equal(Shared.getSafeHttpUrl("javascript:alert(1)"), null);
assert.equal(Shared.getSafeHttpUrl("data:text/html,<script>"), null);

// 2. Backup filtering excludes local-only keys from sync restore
const sanitizedSync = Shared.filterSyncBackupData({
  filterTerms: "Apple, Samsung",
  greyOutSeenDeals: true,
  seenDealUrls: { x: 1 },
  totalHiddenDealCount: 42,
  totalHiddenDealKeys: ["a"],
  hiddenCountsByTerm: { apple: { count: 2 } },
  autoSortComments: true,
});
assert.deepEqual(JSON.parse(JSON.stringify(sanitizedSync)), {
  filterTerms: "Apple, Samsung",
  autoSortComments: true,
});

// 3. replaceStorageSafely must NOT remove existing sync data when storage.set fails
let removeCalledOnFail = false;
const failingSyncArea = makeMockChromeArea(
  { filterTerms: "KeepExistingFilter", extraStaleKey: "old" },
  {
    failSetWith: "QuotaExceededError",
    onRemove: () => {
      removeCalledOnFail = true;
    },
  }
);
const failRes = await Shared.replaceStorageSafely(failingSyncArea, {
  filterTerms: "HugeNewFilter",
});
assert.ok(failRes.error, "Expected error when storage.set fails");
assert.equal(removeCalledOnFail, false, "Stale keys must NOT be removed when storage.set fails");
assert.equal(failingSyncArea._store.filterTerms, "KeepExistingFilter");

// 4. Unified Category <-> Statistics Group migration & roundtrip
const legacyGroups = {
  apple_group: { name: "Apple Ecosystem", terms: ["iPhone", "AirPods"], createdAt: 1700000000000 },
};
const migrated = Shared.migrateLegacyStatisticsGroupsToCategories(
  { Uncategorized: ["iPhone", "AirPods", "PS5"] },
  {},
  legacyGroups,
  ["iPhone", "AirPods", "PS5"]
);
assert.equal(migrated.migrated, true);
assert.deepEqual(Array.from(migrated.categoryData["Apple Ecosystem"]), ["iPhone", "AirPods"]);
assert.deepEqual(Array.from(migrated.categoryData.Uncategorized), ["PS5"]);
const derivedGroups = Shared.categoriesToStatisticsGroups(migrated.categoryData, legacyGroups);
assert.equal(derivedGroups.apple_group.name, "Apple Ecosystem");
assert.equal(derivedGroups.apple_group.createdAt, 1700000000000);
assert.deepEqual(Array.from(derivedGroups.apple_group.terms), ["iPhone", "AirPods"]);

// 5. i18n helper fallback & chrome.i18n translation
assert.equal(Shared.getMessage("missingKey", [], "Fallback Text"), "Fallback Text");
assert.equal(Shared.getMessage("noHiddenDeals", [], "No deals"), "Auf dieser Seite wurden keine Deals ausgeblendet.");

// 6. _locales parity checks across manifest, HTML templates, and JS scripts
const enLocale = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app-files/_locales/en/messages.json"), "utf8")
);
const deLocale = JSON.parse(
  fs.readFileSync(path.join(rootDir, "app-files/_locales/de/messages.json"), "utf8")
);
for (const key of Object.keys(enLocale)) {
  assert.ok(Object.prototype.hasOwnProperty.call(deLocale, key), `Missing DE locale key: ${key}`);
}
for (const key of Object.keys(deLocale)) {
  assert.ok(Object.prototype.hasOwnProperty.call(enLocale, key), `Missing EN locale key: ${key}`);
}

const manifestText = fs.readFileSync(path.join(rootDir, "app-files/manifest.json"), "utf8");
for (const m of manifestText.matchAll(/__MSG_([a-zA-Z0-9_]+)__/g)) {
  assert.ok(enLocale[m[1]] && deLocale[m[1]], `Missing manifest i18n key: ${m[1]}`);
}

for (const htmlFile of ["popup.html", "options.html", "keyword-dialog.html"]) {
  const htmlText = fs.readFileSync(path.join(rootDir, "app-files/src", htmlFile), "utf8");
  assert.ok(!htmlText.includes("window.prompt("), `${htmlFile} must not call window.prompt`);
  for (const m of htmlText.matchAll(/data-i18n(?:-[a-z-]+)?="([a-zA-Z0-9_]+)"/g)) {
    assert.ok(enLocale[m[1]] && deLocale[m[1]], `Missing ${htmlFile} i18n key: ${m[1]}`);
  }
}

for (const jsFile of ["shared.js", "popup.js", "options.js", "keyword-dialog.js", "content-script.js"]) {
  const jsText = fs.readFileSync(path.join(rootDir, "app-files/src", jsFile), "utf8");
  assert.ok(!jsText.includes("window.prompt("), `${jsFile} must not call window.prompt`);
  assert.ok(!jsText.includes('chrome.tabs.create({ url: "about:addons"'), `${jsFile} must not open about:addons`);
  for (const m of jsText.matchAll(/(?:getMessage|getI18nMessage)\(\s*"([a-zA-Z0-9_]+)"/g)) {
    assert.ok(enLocale[m[1]] && deLocale[m[1]], `Missing ${jsFile} i18n key: ${m[1]}`);
  }
}

// 7. Verify GitHub button points to /issues & both content-script copies are byte-identical
const popupHtml = fs.readFileSync(path.join(rootDir, "app-files/src/popup.html"), "utf8");
const githubMatches = popupHtml.match(/https:\/\/github\.com\/codingismynewgaming[^"']*/g) || [];
assert.ok(githubMatches.length >= 2);
for (const url of githubMatches) {
  assert.equal(url, "https://github.com/codingismynewgaming/mydealz-filter-firefox-extension/issues");
}

const csCode = fs.readFileSync(path.join(rootDir, "app-files/src/content-script.js"), "utf8");
const rootCsCode = fs.readFileSync(path.join(rootDir, "content-script.js"), "utf8");
const sha = (txt) => crypto.createHash("sha256").update(txt, "utf8").digest("hex");
assert.equal(sha(csCode), sha(rootCsCode), "app-files/src/content-script.js and root content-script.js must match");
assert.ok(!csCode.includes("HELPFUL_COMMENTS_ENDPOINT"));
assert.ok(!csCode.includes("fetchHelpfulComments"));

// 8. HTML fixture tests for content-script.js
function createContentScriptSandbox(fixtureHtml) {
  const body = parseHtmlFixture(fixtureHtml);
  const sandbox = {
    chrome: {
      runtime: { lastError: null, onMessage: { addListener() {} }, sendMessage() {} },
      storage: {
        sync: makeMockChromeArea(),
        local: makeMockChromeArea(),
        onChanged: { addListener() {} },
      },
      i18n: chromeRef.i18n,
    },
    window: {
      location: { href: "https://www.mydealz.de/heisseste", pathname: "/heisseste" },
      addEventListener() {},
      dispatchEvent() {},
      innerHeight: 900,
      scrollY: 0,
    },
    document: {
      readyState: "loading",
      cookie: "",
      title: "mydealz.de",
      documentElement: { clientHeight: 900, scrollHeight: 2000, style: { setProperty() {} } },
      addEventListener() {},
      getElementById: (id) => body.querySelector(`#${id}`),
      querySelector: (sel) => body.querySelector(sel),
      querySelectorAll: (sel) => body.querySelectorAll(sel),
      head: { appendChild() {} },
      createElement: (tag) => new MockElement(tag),
    },
    Node: { ELEMENT_NODE: 1 },
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    Event: class { constructor(type) { this.type = type; } },
    KeyboardEvent: class {},
    fetch: async () => {
      throw new Error("Unexpected network fetch in content-script test");
    },
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    setTimeout,
    clearTimeout,
    console,
    URL,
    Blob,
    Set,
    Map,
    RegExp,
    Promise,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Date,
  };
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(csCode, sandbox, { filename: "content-script.js" });
  return { sandbox, body };
}

const standardHtml = fs.readFileSync(path.join(__dirname, "fixtures/deal-card-standard.html"), "utf8");
const shortTitleHtml = fs.readFileSync(path.join(__dirname, "fixtures/deal-card-short-title.html"), "utf8");
const voucherHtml = fs.readFileSync(path.join(__dirname, "fixtures/deal-card-voucher.html"), "utf8");
const commentSortHtml = fs.readFileSync(path.join(__dirname, "fixtures/comment-sort-select.html"), "utf8");

{
  const { sandbox } = createContentScriptSandbox(
    `${standardHtml}\n${shortTitleHtml}\n${voucherHtml}`
  );
  const postings = sandbox.findDealPostings();
  const titles = postings.map((p) => p.title);

  assert.deepEqual(Array.from(titles), [
    "Apple iPhone 16 Pro 256GB",
    "LEGO",
    "VPN",
    "Saturn 20% Rabatt Gutschein",
  ]);

  // Verify noise badge container alone yields empty title
  const voucherBody = parseHtmlFixture(voucherHtml);
  const noiseCard = voucherBody.querySelector(".noise-badge-card");
  assert.ok(noiseCard);
  assert.equal(sandbox.findTitleInElement(noiseCard), "");

  // Verify keyword matching on short titles and vouchers
  const filters = sandbox.parseTermEntries("LEGO, VPN, Saturn");
  const exceptions = sandbox.parseTermEntries("Duplo");
  assert.equal(sandbox.getFilterMatch("LEGO", filters, exceptions).matched, true);
  assert.equal(sandbox.getFilterMatch("VPN", filters, exceptions).matched, true);
  assert.equal(sandbox.getFilterMatch("Saturn 20% Rabatt Gutschein", filters, exceptions).matched, true);
  assert.equal(sandbox.getFilterMatch("LEGO Duplo", filters, exceptions).matched, false);

  // Verify category enable/disable state filtering
  const activeOnly = sandbox.getActiveFilterTermsFromCategories(
    filters,
    { Toys: ["LEGO"], Software: ["VPN"], Uncategorized: ["Saturn"] },
    { Toys: false, Software: true, Uncategorized: true }
  );
  assert.deepEqual(
    Array.from(activeOnly, (entry) => entry.raw),
    ["VPN", "Saturn"]
  );
}

{
  const { sandbox, body } = createContentScriptSandbox(commentSortHtml);
  const select = body.querySelector("select");
  const firedEvents = [];
  select._listeners.input = [(ev) => firedEvents.push(ev.type)];
  select._listeners.change = [(ev) => firedEvents.push(ev.type)];

  const sorted = await sandbox.tryApplyHelpfulCommentSortViaDom();
  assert.equal(sorted, true);
  assert.equal(select.value, "helpful");
  assert.deepEqual(firedEvents, ["input", "change"]);
}

// 6. Verify i18n locale key parity & HTML data-i18n references
{
  const enMessages = JSON.parse(
    fs.readFileSync(path.join(rootDir, "app-files/_locales/en/messages.json"), "utf8")
  );
  const deMessages = JSON.parse(
    fs.readFileSync(path.join(rootDir, "app-files/_locales/de/messages.json"), "utf8")
  );
  const enKeys = Object.keys(enMessages).sort();
  const deKeys = Object.keys(deMessages).sort();
  assert.deepEqual(deKeys, enKeys, "en and de locale keys must match");

  const htmlFiles = [
    "app-files/src/popup.html",
    "app-files/src/options.html",
    "app-files/src/keyword-dialog.html",
  ];
  const attrRegex = /data-i18n(?:-[a-z-]+)?="([^"]+)"/g;
  for (const relHtml of htmlFiles) {
    const html = fs.readFileSync(path.join(rootDir, relHtml), "utf8");
    let match;
    while ((match = attrRegex.exec(html)) !== null) {
      const key = match[1];
      assert.ok(enMessages[key], `Missing EN locale key "${key}" referenced in ${relHtml}`);
      assert.ok(deMessages[key], `Missing DE locale key "${key}" referenced in ${relHtml}`);
    }
  }
}

// 7. Verify Edge Service Worker execution + background.js cross-browser handlers
{
  const createdTabs = [];
  const badgeCalls = [];
  const iconCalls = [];
  const onMessageListeners = [];
  const onCommandListeners = [];

  const swChrome = {
    runtime: {
      lastError: null,
      getURL: (rel) => `chrome-extension://test/${rel}`,
      onMessage: { addListener: (fn) => onMessageListeners.push(fn) },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
    },
    tabs: {
      query: async () => [],
      get: async () => ({ id: 1, url: "https://www.mydealz.de/" }),
      create: async (opts) => {
        createdTabs.push(opts);
        return { id: 99 };
      },
      sendMessage: () => {},
      onActivated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
    },
    windows: {
      create: async () => {},
      update: async () => {},
    },
    action: {
      setBadgeText: (arg) => badgeCalls.push(arg),
      setBadgeBackgroundColor: () => {},
      setIcon: (arg) => iconCalls.push(arg),
    },
    commands: {
      onCommand: { addListener: (fn) => onCommandListeners.push(fn) },
    },
    storage: {
      sync: makeMockChromeArea(),
      local: makeMockChromeArea(),
    },
  };

  const swSandbox = {
    chrome: swChrome,
    navigator: { userAgent: "Mozilla/5.0 Edg/130.0.0.0" },
    console,
    URL,
    Map,
    Set,
    Promise,
    Error,
    Number,
    Array,
    Object,
    String,
    Boolean,
    setTimeout,
    clearTimeout,
    importScripts: (...scripts) => {
      for (const rel of scripts) {
        const resolved = path.join(rootDir, "app-files/src", rel.replace(/^\.\//, ""));
        const code = fs.readFileSync(resolved, "utf8");
        vm.runInContext(code, swSandbox, { filename: rel });
      }
    },
  };
  swSandbox.globalThis = swSandbox;
  swSandbox.self = swSandbox;
  vm.createContext(swSandbox);

  const swEntry = fs.readFileSync(path.join(rootDir, "edge/src/background-sw.js"), "utf8");
  vm.runInContext(swEntry, swSandbox, { filename: "background-sw.js" });

  assert.equal(onMessageListeners.length, 1);
  assert.equal(onCommandListeners.length, 1);

  const msgResponse = await new Promise((resolve) => {
    onMessageListeners[0]({ type: "openShortcutSettings" }, {}, resolve);
  });
  assert.equal(msgResponse.status, "opened");
  assert.equal(createdTabs[0]?.url, "edge://extensions/shortcuts");

  const badgeResponse = await new Promise((resolve) => {
    onMessageListeners[0](
      { type: "updateBadge", count: 3, hiddenDeals: [{ title: "Test" }] },
      { tab: { id: 7, url: "https://www.mydealz.de/heisseste" } },
      resolve
    );
  });
  assert.equal(badgeResponse.status, "badge updated");
  assert.equal(badgeCalls.at(-1)?.text, "3");
  assert.equal(iconCalls.at(-1)?.path?.["128"], "icons/icon-128.png");
}

// 8. Verify keyword-dialog category & statisticsGroups sync helper even on fresh state
{
  const kwHtml = fs.readFileSync(path.join(rootDir, "app-files/src/keyword-dialog.html"), "utf8");
  const kwDoc = parseHtmlFixture(kwHtml);
  const kwCode = fs.readFileSync(path.join(rootDir, "app-files/src/keyword-dialog.js"), "utf8");
  const kwSandbox = {
    document: {
      getElementById: (id) => {
        const el = kwDoc.querySelector(`#${id}`);
        if (el && typeof el.addEventListener !== "function") {
          el.addEventListener = (type, fn) => {
            el._listeners[type] = el._listeners[type] || [];
            el._listeners[type].push(fn);
          };
          el.focus = () => {};
        }
        return el;
      },
      addEventListener: () => {},
      documentElement: new MockElement("html"),
    },
    window: {
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
      close: () => {},
    },
    MydealzFilterShared: Shared,
    chrome: chromeRef,
    console,
    setTimeout,
    clearTimeout,
    Object,
    Array,
    Set,
    Date,
    Error,
    Promise,
  };
  kwSandbox.globalThis = kwSandbox;
  vm.runInNewContext(kwCode, kwSandbox, { filename: "keyword-dialog.js" });

  const payload = kwSandbox.buildUpdatedCategoryPayload(null, null, "Temu", ["Temu"], {});
  assert.deepEqual(Array.from(payload.filterTermCategories.Uncategorized), ["Temu"]);
  assert.equal(payload.categoryStates.Uncategorized, true);
  assert.ok(payload.statisticsGroups);
}

// 9. Verify Firefox & Edge manifest + AMO metadata consistency
{
  const ffManifest = JSON.parse(
    fs.readFileSync(path.join(rootDir, "app-files/manifest.json"), "utf8")
  );
  const edgeManifest = JSON.parse(
    fs.readFileSync(path.join(rootDir, "edge/manifest.json"), "utf8")
  );
  assert.equal(ffManifest.version, edgeManifest.version);
  assert.equal(edgeManifest.background?.service_worker, "src/background-sw.js");
  assert.equal(edgeManifest.background?.scripts, undefined);
  assert.equal(edgeManifest.browser_specific_settings, undefined);
  for (const iconRel of Object.values(edgeManifest.icons || {})) {
    assert.ok(
      fs.existsSync(path.join(rootDir, "app-files", iconRel)),
      `Missing icon referenced in edge/manifest.json: ${iconRel}`
    );
  }

  const amoMetaPath = path.join(rootDir, "internals/amo-metadata.json");
  if (fs.existsSync(amoMetaPath)) {
    const amoMeta = JSON.parse(fs.readFileSync(amoMetaPath, "utf8"));
    for (const [locale, summary] of Object.entries(amoMeta.summary || {})) {
      assert.ok(summary.length > 0 && summary.length <= 250, `AMO summary ${locale} exceeds 250 chars`);
    }
    assert.equal(amoMeta.support_email, undefined);
    assert.match(amoMeta.support_url?.["en-US"] || "", /\/issues$/);
  }
}

console.log("ALL_FIXTURE_AND_UNIT_TESTS_PASSED");
