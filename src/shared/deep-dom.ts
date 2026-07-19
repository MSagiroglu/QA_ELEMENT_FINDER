export function getShadowHosts(doc: Document = document): Element[] {
  const hosts: Element[] = [];
  try {
    const all = doc.querySelectorAll('*');
    all.forEach(el => {
      if (el.shadowRoot && el.shadowRoot.mode === 'open') hosts.push(el);
    });
  } catch {}
  return hosts;
}

export function getIframes(doc: Document = document): HTMLIFrameElement[] {
  const iframes: HTMLIFrameElement[] = [];
  try {
    const all = doc.querySelectorAll('iframe');
    all.forEach(iframe => {
      try {
        if (iframe.contentDocument || iframe.contentWindow?.document) {
          iframes.push(iframe);
        }
      } catch {}
    });
  } catch {}
  return iframes;
}

export function querySelectorAllDeep(selector: string, root: Document | ShadowRoot | Element = document): Element[] {
  const results: Element[] = [];
  const roots: (Document | ShadowRoot)[] = [];

  if (root instanceof Document || root instanceof ShadowRoot) {
    roots.push(root);
  } else if (root.shadowRoot) {
    roots.push(root.shadowRoot);
  } else {
    roots.push(root.ownerDocument || document);
  }

  const visited = new Set<Node>();

  function traverse(currentRoot: Document | ShadowRoot) {
    if (visited.has(currentRoot)) return;
    visited.add(currentRoot);

    // Query in current root
    try {
      const found = currentRoot.querySelectorAll(selector);
      found.forEach(el => { if (!results.includes(el)) results.push(el); });
    } catch {}

    // Recurse into shadow hosts
    try {
      const all = currentRoot.querySelectorAll('*');
      all.forEach(el => {
        if (el.shadowRoot && el.shadowRoot.mode === 'open' && !visited.has(el.shadowRoot)) {
          traverse(el.shadowRoot);
        }
      });
    } catch {}

    // Recurse into same-origin iframes
    try {
      if (currentRoot instanceof Document) {
        const iframes = currentRoot.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && iframeDoc !== currentRoot && !visited.has(iframeDoc)) {
              traverse(iframeDoc);
            }
          } catch {}
        });
      }
    } catch {}
  }

  traverse(root instanceof Document || root instanceof ShadowRoot ? root : document);
  return results;
}

export function querySelectorDeep(selector: string, root: Document | ShadowRoot | Element = document): Element | null {
  const results = querySelectorAllDeep(selector, root);
  return results[0] || null;
}

export function getDeepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active) {
    if (active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    } else if (active instanceof HTMLIFrameElement) {
      try {
        const iframeDoc = active.contentDocument || active.contentWindow?.document;
        if (iframeDoc && iframeDoc.activeElement && iframeDoc.activeElement !== iframeDoc.body) {
          active = iframeDoc.activeElement;
        } else break;
      } catch { break; }
    } else break;
  }
  return active;
}

export function getElementShadowRoot(el: Element): ShadowRoot | null {
  let current: Node | null = el;
  while (current) {
    if (current instanceof ShadowRoot) return current;
    current = current.parentNode || (current instanceof ShadowRoot ? null : (current as Element).shadowRoot);
    if (current && current instanceof ShadowRoot) return current;
  }
  return null;
}

export function getElementIframeDocument(el: Element): Document | null {
  let current: Node | null = el;
  while (current) {
    if (current instanceof Document) {
      if (current !== document) return current;
      break;
    }
    current = current.parentNode;
  }
  return null;
}

export function findIframeForDocument(doc: Document): HTMLIFrameElement | null {
  if (doc === document) return null;
  try {
    const allIframes = document.querySelectorAll('iframe');
    for (const iframe of allIframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc === doc) return iframe;
      } catch {}
    }
  } catch {}
  return null;
}

export function findIframeForElement(el: Element): HTMLIFrameElement | null {
  const doc = getElementIframeDocument(el);
  if (!doc) return null;
  return findIframeForDocument(doc);
}

export function querySelectorWithShadowSupport(selector: string): Element | null {
  if (!selector) return null;
  try {
    if (selector.startsWith('/') || selector.startsWith('(')) {
      return document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element | null;
    }
    const el = document.querySelector(selector);
    if (el) return el;
    return querySelectorDeep(selector);
  } catch {
    try { return querySelectorDeep(selector); } catch { return null; }
  }
}

export function querySelectorAllWithShadowSupport(selector: string): Element[] {
  if (!selector) return [];
  try {
    if (selector.startsWith('/') || selector.startsWith('(')) {
      const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const elements: Element[] = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node && node.nodeType === Node.ELEMENT_NODE) elements.push(node as Element);
      }
      return elements;
    }
    const elements = Array.from(document.querySelectorAll(selector));
    const deepElements = querySelectorAllDeep(selector);
    deepElements.forEach(el => {
      if (!elements.includes(el)) elements.push(el);
    });
    return elements;
  } catch {
    return querySelectorAllDeep(selector);
  }
}

export function getClickableElements(doc: Document = document): Element[] {
  const allElements: Element[] = [];
  const visited = new Set<Node>();

  function collect(root: Document | ShadowRoot) {
    if (visited.has(root)) return;
    visited.add(root);

    const clickableSelector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="searchbox"], [role="combobox"], label, iframe, video, audio, details, summary, [onclick], [contenteditable="true"]';
    try {
      const found = root.querySelectorAll(clickableSelector);
      found.forEach(el => {
        if (el instanceof HTMLElement) {
          const style = getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null) {
            allElements.push(el);
          }
        }
      });
    } catch {}

    try {
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot && el.shadowRoot.mode === 'open' && !visited.has(el.shadowRoot)) {
          collect(el.shadowRoot);
        }
      });
    } catch {}

    if (root instanceof Document) {
      try {
        root.querySelectorAll('iframe').forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && !visited.has(iframeDoc)) collect(iframeDoc);
          } catch {}
        });
      } catch {}
    }
  }

  collect(doc);
  return allElements;
}

export function getDeepElementsByTagName(tagName: string, doc: Document = document): Element[] {
  const results: Element[] = [];
  const visited = new Set<Node>();

  function collect(root: Document | ShadowRoot) {
    if (visited.has(root)) return;
    visited.add(root);
    try {
      root.querySelectorAll(tagName).forEach(el => results.push(el));
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot && el.shadowRoot.mode === 'open') collect(el.shadowRoot);
      });
    } catch {}
    if (root instanceof Document) {
      root.querySelectorAll('iframe').forEach(iframe => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) collect(doc);
        } catch {}
      });
    }
  }

  collect(doc);
  return results;
}
