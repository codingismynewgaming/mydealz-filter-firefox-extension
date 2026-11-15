/**
 * Minimal dependency-free HTML fixture parser and DOM query harness for Node tests.
 */

function parseAttributes(rawAttrs) {
  const attrs = {};
  const regex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = regex.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = value;
  }
  return attrs;
}

class MockClassList {
  constructor(element) {
    this.element = element;
  }

  _getSet() {
    const raw = this.element.getAttribute("class") || "";
    return new Set(raw.split(/\s+/).filter(Boolean));
  }

  _saveSet(set) {
    if (set.size === 0) {
      this.element.removeAttribute("class");
    } else {
      this.element.setAttribute("class", Array.from(set).join(" "));
    }
  }

  add(...names) {
    const set = this._getSet();
    names.forEach((n) => set.add(n));
    this._saveSet(set);
  }

  remove(...names) {
    const set = this._getSet();
    names.forEach((n) => set.delete(n));
    this._saveSet(set);
  }

  contains(name) {
    return this._getSet().has(name);
  }

  toggle(name, force) {
    const has = this.contains(name);
    const shouldAdd = force !== undefined ? Boolean(force) : !has;
    if (shouldAdd) this.add(name);
    else this.remove(name);
    return shouldAdd;
  }
}

export class MockElement {
  constructor(tagName, attrs = {}) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this._attrs = { ...attrs };
    this._children = [];
    this._text = "";
    this.parentElement = null;
    this.isConnected = true;
    this.style = {};
    this.classList = new MockClassList(this);
    this._listeners = {};
    this._value = attrs.value ?? "";
    this.selected = Object.prototype.hasOwnProperty.call(attrs, "selected");
  }

  get id() {
    return this._attrs.id || "";
  }

  set id(val) {
    this._attrs.id = String(val);
  }

  get href() {
    return this._attrs.href || "";
  }

  get value() {
    if (this.tagName === "SELECT") {
      if (this._value) return this._value;
      const selectedOpt = this.options.find((opt) => opt.selected);
      return selectedOpt ? selectedOpt.value : this.options[0]?.value || "";
    }
    return this._value;
  }

  set value(val) {
    this._value = String(val);
    if (this.tagName === "SELECT") {
      this.options.forEach((opt) => {
        opt.selected = opt.value === this._value;
      });
    }
  }

  get options() {
    return this.querySelectorAll("option");
  }

  get children() {
    return this._children.filter((node) => node.nodeType === 1);
  }

  get previousElementSibling() {
    if (!this.parentElement) return null;
    const siblings = this.parentElement.children;
    const idx = siblings.indexOf(this);
    return idx > 0 ? siblings[idx - 1] : null;
  }

  get textContent() {
    if (this._children.length === 0) return this._text;
    return this._text + this._children.map((c) => c.textContent).join("");
  }

  set textContent(val) {
    this._text = String(val ?? "");
    this._children = [];
  }

  get label() {
    return this._attrs.label || this.textContent;
  }

  getAttribute(name) {
    const key = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(this._attrs, key) ? this._attrs[key] : null;
  }

  setAttribute(name, value) {
    this._attrs[name.toLowerCase()] = String(value);
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this._attrs, name.toLowerCase());
  }

  removeAttribute(name) {
    delete this._attrs[name.toLowerCase()];
  }

  appendChild(child) {
    child.parentElement = this;
    child.isConnected = this.isConnected;
    this._children.push(child);
    return child;
  }

  dispatchEvent(ev) {
    const type = ev?.type || ev;
    (this._listeners[type] || []).forEach((fn) => fn(ev));
    return true;
  }

  blur() {}

  matches(selector) {
    return selector
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .some((part) => matchesComplexSelector(this, part));
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (cur.matches(selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const seen = new Set();
    const selectors = selector
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const walk = (node) => {
      for (const child of node.children) {
        for (const sel of selectors) {
          if (matchesComplexSelector(child, sel, this) && !seen.has(child)) {
            seen.add(child);
            results.push(child);
            break;
          }
        }
        walk(child);
      }
    };

    walk(this);
    return results;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

function matchesSimpleToken(element, token) {
  let remaining = token.trim();
  if (!remaining) return false;

  const tagMatch = remaining.match(/^([a-zA-Z0-9_-]+)/);
  if (tagMatch) {
    if (element.tagName !== tagMatch[1].toUpperCase()) return false;
    remaining = remaining.slice(tagMatch[1].length);
  }

  while (remaining.length > 0) {
    if (remaining.startsWith("#")) {
      const m = remaining.match(/^#([a-zA-Z0-9_-]+)/);
      if (!m || element.id !== m[1]) return false;
      remaining = remaining.slice(m[0].length);
    } else if (remaining.startsWith(".")) {
      const m = remaining.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!m || !element.classList.contains(m[1])) return false;
      remaining = remaining.slice(m[0].length);
    } else if (remaining.startsWith("[")) {
      const m = remaining.match(/^\[([^\]]+)\]/);
      if (!m) return false;
      const expr = m[1].trim();
      const opMatch = expr.match(/^([a-zA-Z0-9_-]+)\s*(\*=|\^=|=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))$/);
      if (opMatch) {
        const attrName = opMatch[1].toLowerCase();
        const op = opMatch[2];
        const expected = opMatch[3] ?? opMatch[4] ?? opMatch[5] ?? "";
        const actual = element.getAttribute(attrName);
        if (actual === null) return false;
        if (op === "=" && actual !== expected) return false;
        if (op === "*=" && !actual.includes(expected)) return false;
        if (op === "^=" && !actual.startsWith(expected)) return false;
      } else {
        if (!element.hasAttribute(expr.toLowerCase())) return false;
      }
      remaining = remaining.slice(m[0].length);
    } else {
      return false;
    }
  }

  return true;
}

function matchesComplexSelector(element, selector, scopeRoot = null) {
  let normalized = selector.trim();
  if (normalized.startsWith(":scope >")) {
    const inner = normalized.slice(":scope >".length).trim();
    return Boolean(scopeRoot && element.parentElement === scopeRoot && matchesSimpleToken(element, inner));
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  if (!matchesSimpleToken(element, parts[parts.length - 1])) return false;

  let ancestor = element.parentElement;
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];
    if (part === ">") continue;
    while (ancestor && !matchesSimpleToken(ancestor, part)) {
      ancestor = ancestor.parentElement;
    }
    if (!ancestor) return false;
    ancestor = ancestor.parentElement;
  }

  return true;
}

export function parseHtmlFixture(html) {
  const root = new MockElement("BODY");
  const stack = [root];
  const voidTags = new Set(["input", "img", "br", "hr", "meta", "link"]);
  const tokenRegex = /(<\/?[a-zA-Z0-9_-]+(?:\s+[^>]*)?>)|([^<]+)/g;
  let match;

  while ((match = tokenRegex.exec(html)) !== null) {
    const [, tagToken, textToken] = match;
    const current = stack[stack.length - 1];

    if (textToken !== undefined) {
      if (textToken.trim().length > 0) {
        current._text += textToken;
      }
      continue;
    }

    if (tagToken.startsWith("</")) {
      const closingTag = tagToken.slice(2, -1).trim().toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === closingTag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const inner = tagToken.slice(1, -1).trim();
    const selfClosing = inner.endsWith("/");
    const cleanInner = selfClosing ? inner.slice(0, -1).trim() : inner;
    const spaceIdx = cleanInner.search(/\s/);
    const tagName = spaceIdx === -1 ? cleanInner : cleanInner.slice(0, spaceIdx);
    const rawAttrs = spaceIdx === -1 ? "" : cleanInner.slice(spaceIdx + 1);
    const element = new MockElement(tagName, parseAttributes(rawAttrs));

    current.appendChild(element);
    if (!selfClosing && !voidTags.has(tagName.toLowerCase())) {
      stack.push(element);
    }
  }

  return root;
}
