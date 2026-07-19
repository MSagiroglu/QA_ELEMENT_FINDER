import type { SelectorSet, PageElement } from './types';

export function generateUniqueSelectors(el: Element): SelectorSet[] {
  const results: SelectorSet[] = [];

  const dataAttrs = getDataAttributeSelector(el);
  if (dataAttrs) results.push(dataAttrs);

  const roleSel = getRoleSelector(el);
  if (roleSel) results.push(roleSel);

  const textSel = getTextSelector(el);
  if (textSel) results.push(textSel);

  const cssSel = getSemanticCSSSelector(el);
  if (cssSel) results.push(cssSel);

  const complexSel = getComplexCSSSelector(el);
  if (complexSel) results.push(complexSel);

  const xpathSel = getXPathSelector(el);
  if (xpathSel) results.push(xpathSel);

  return results
    .map(s => verifyUniqueness(s, el.ownerDocument!))
    .filter(s => s.matchCount === 1)
    .sort((a, b) => b.score - a.score);
}

function getDataAttributeSelector(el: Element): SelectorSet | null {
  const attrs = ['data-testid', 'data-test-id', 'data-cy', 'data-qa', 'data-test'];
  for (const attr of attrs) {
    const val = el.getAttribute(attr);
    if (val) {
      return { strategy: 'data-attribute', selector: `[${attr}="${val}"]`, score: 100, matchCount: 0 };
    }
  }
  return null;
}

function getRoleSelector(el: Element): SelectorSet | null {
  const role = el.getAttribute('role');
  const name = getAccessibleName(el);
  if (role) {
    const base = name ? `[role="${role}"][aria-label="${name}"]` : `[role="${role}"]`;
    return { strategy: 'role', selector: base, score: 80, matchCount: 0 };
  }
  const tag = el.tagName.toLowerCase();
  const semanticTags = ['button', 'a', 'input', 'select', 'textarea', 'nav', 'header', 'footer', 'main'];
  if (semanticTags.includes(tag) && name) {
    return { strategy: 'role', selector: `${tag}[aria-label="${name}"]`, score: 75, matchCount: 0 };
  }
  return null;
}

function getAccessibleName(el: Element): string | null {
  return el.getAttribute('aria-label')
    || el.getAttribute('aria-labelledby')
    || el.textContent?.trim().slice(0, 60) || null;
}

function getTextSelector(el: Element): SelectorSet | null {
  const text = el.textContent?.trim();
  if (!text || text.length > 60 || text.length < 2) return null;
  const tag = el.tagName.toLowerCase();
  if (['button', 'a', 'label', 'span', 'h1','h2','h3','h4','h5','h6','p','li','td','th'].includes(tag)) {
    const result: SelectorSet & { __textContent?: string } = { strategy: 'text', selector: tag, score: 60, matchCount: 0 };
    result.__textContent = text;
    return result;
  }
  return null;
}

function isGeneratedClass(className: string): boolean {
  return className.startsWith('css-') ||
    className.startsWith('_') ||
    className.startsWith('ng-') ||
    /^[a-z]{1}[0-9a-z]{5,}$/i.test(className) ||
    /.*-hash$/.test(className) ||
    /^\[.*\]$/.test(className);
}

function getSemanticCSSSelector(el: Element): SelectorSet | null {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== current.ownerDocument?.documentElement) {
    const tag = current.tagName.toLowerCase();
    const id = current.id;
    if (id) {
      parts.unshift(`#${CSS.escape(id)}`);
      break;
    }

    const classes = Array.from(current.classList)
      .filter(c => !isGeneratedClass(c) && c.length > 1)
      .slice(0, 2);

    let selector = tag;
    if (current === el && classes.length > 0) {
      selector += '.' + classes.map(c => CSS.escape(c)).join('.');
    }

    const parentEl: Element | null = current.parentElement;
    if (parentEl) {
      const tagName = current.tagName;
      const siblings = Array.from(parentEl.children).filter((s): s is Element => s instanceof Element && s.tagName === tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current as HTMLElement) + 1;
        selector += `:nth-child(${idx})`;
      }
    }

    parts.unshift(selector);
    current = parentEl;

    if (parts.length >= 4) break;
  }

  if (parts.length === 0) return null;
  return { strategy: 'css', selector: parts.join(' > '), score: 40, matchCount: 0 };
}

function getComplexCSSSelector(el: Element): SelectorSet | null {
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;

  while (current && current !== current.ownerDocument?.documentElement && depth < 6) {
    const tag = current.tagName.toLowerCase();
    const parentEl: Element | null = current.parentElement;

    let selector = tag;
    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter((s): s is Element => s instanceof Element && s.tagName === tag);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current as HTMLElement) + 1;
        selector += `:nth-child(${idx})`;
      }
    }

    parts.unshift(selector);
    current = parentEl;
    depth++;
  }

  return { strategy: 'css', selector: parts.join(' > '), score: 20, matchCount: 0 };
}

function getXPathSelector(el: Element): SelectorSet | null {
  const parts: string[] = [];
  let current: Node | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== (current.ownerDocument?.documentElement)) {
    const elm = current as Element;
    let idx = 1;
    let sibling: Node | null = elm.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === elm.tagName) idx++;
      sibling = sibling.previousSibling;
    }
    parts.unshift(`${elm.tagName.toLowerCase()}[${idx}]`);
    current = elm.parentNode;
  }

  return { strategy: 'xpath', selector: '/' + parts.join('/'), score: 20, matchCount: 0 };
}

function verifyUniqueness(sel: SelectorSet, doc: Document): SelectorSet {
  try {
    let count = 0;
    if (sel.strategy === 'xpath') {
      const result = doc.evaluate(sel.selector, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      count = result.snapshotLength;
    } else if (sel.strategy === 'text') {
      const textContent = (sel as any).__textContent as string;
      const tag = sel.selector;
      const elements = doc.querySelectorAll(tag);
      count = Array.from(elements).filter(el => el.textContent?.trim() === textContent).length;
    } else {
      count = doc.querySelectorAll(sel.selector).length;
    }
    const result = { ...sel, matchCount: count };
    delete (result as any).__textContent;
    return result;
  } catch {
    return { ...sel, matchCount: 999 };
  }
}

export function getBestSelector(el: Element): SelectorSet | null {
  const selectors = generateUniqueSelectors(el);
  return selectors[0] ?? null;
}

export function extractPageElement(el: Element): PageElement {
  const selectors = generateUniqueSelectors(el);
  const attrs: Record<string, string> = {};
  for (const attr of el.getAttributeNames().slice(0, 10)) {
    attrs[attr] = el.getAttribute(attr) || '';
  }
  return {
    name: el.getAttribute('data-testid') || el.id || el.tagName.toLowerCase(),
    tagName: el.tagName.toLowerCase(),
    selectors,
    attributes: attrs,
    text: el.textContent?.trim().slice(0, 100),
  };
}

export function queryElement(selectorSet: SelectorSet, doc: Document = document): Element | null {
  try {
    if (selectorSet.strategy === 'xpath') {
      const result = doc.evaluate(selectorSet.selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue as Element | null;
    }
    return doc.querySelector(selectorSet.selector);
  } catch {
    return null;
  }
}
