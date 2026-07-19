import { extractQuickSelector } from '../shared/utils';
import { getClickableElements } from '../shared/deep-dom';

let pickerActive = false;
let hoveredElement: Element | null = null;
let overlayContainer: HTMLDivElement | null = null;
let tooltipElement: HTMLDivElement | null = null;
let statusBar: HTMLDivElement | null = null;
let callback: ((element: Element) => void) | null = null;
let keyboardMode = false;
let keyboardIndex = -1;
let keyboardElements: Element[] = [];
let filterTag: string | null = null;

const FILTER_KEYS: Record<string, string | null> = {
  '1': 'button',
  '2': 'input',
  '3': 'a',
  '4': 'checkbox',
  '5': 'select',
  '6': 'textarea',
  '7': 'img',
  '8': 'heading',
  '9': null,
};
const FILTER_LABELS: Record<string, string> = {
  button: 'Buttons',
  input: 'Inputs',
  a: 'Links',
  checkbox: 'Checkbox/Radio',
  select: 'Dropdowns',
  textarea: 'Textareas',
  img: 'Images',
  heading: 'Headings',
  all: 'All Elements',
};

export function activatePicker(onPick: (element: Element) => void): void {
  if (pickerActive) return;
  pickerActive = true;
  callback = onPick;
  keyboardMode = false;
  keyboardElements = [];
  keyboardIndex = -1;
  filterTag = null;
  createOverlay();
  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

export function deactivatePicker(): void {
  if (!pickerActive) return;
  pickerActive = false;
  callback = null;
  keyboardMode = false;
  keyboardElements = [];
  filterTag = null;
  removeOverlay();
  clearKeyboardHighlight();
  document.removeEventListener('mouseover', onMouseOver, true);
  document.removeEventListener('mouseout', onMouseOut, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeyDown, true);
}

function createOverlay(): void {
  if (overlayContainer) return;
  overlayContainer = document.createElement('div');
  overlayContainer.id = '__qa_element_finder_overlay__';
  overlayContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;pointer-events:none;';
  document.body.appendChild(overlayContainer);

  tooltipElement = document.createElement('div');
  tooltipElement.id = '__qa_element_finder_tooltip__';
  tooltipElement.style.cssText = `
    position: fixed; z-index: 2147483647; pointer-events: none;
    background: #1A2332; color: #E5E7E6; font: 12px/1.4 monospace;
    padding: 6px 10px; border-radius: 4px; border: 1px solid #4A90D9;
    max-width: 400px; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; display: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(tooltipElement);

  statusBar = document.createElement('div');
  statusBar.id = '__qa_element_finder_status__';
  statusBar.style.cssText = `
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    z-index: 2147483647; pointer-events: none;
    background: rgba(15, 23, 42, 0.92); color: #94A3B8;
    font: 11px/1.3 monospace;
    padding: 6px 14px; border-radius: 6px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    display: none; text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    max-width: 90%;
  `;
  document.body.appendChild(statusBar);
}

function removeOverlay(): void {
  overlayContainer?.remove();
  tooltipElement?.remove();
  statusBar?.remove();
  overlayContainer = null;
  tooltipElement = null;
  statusBar = null;
}

function updateStatusBar(): void {
  if (!statusBar) return;
  if (!keyboardMode) {
    statusBar.style.display = 'none';
    return;
  }
  const total = keyboardElements.length;
  const current = keyboardIndex + 1;
  const filterLabel = filterTag ? FILTER_LABELS[filterTag] || filterTag : 'All';
  statusBar.textContent = `[${current}/${total}] Filter: ${filterLabel}  |  ↑↓ Navigate  ↵ Select  Esc Exit  C Copy  S Stress`;
  statusBar.style.display = 'block';
}

function onMouseOver(e: MouseEvent): void {
  if (!pickerActive) return;
  if (keyboardMode) {
    keyboardMode = false;
    clearKeyboardHighlight();
    keyboardElements = [];
    if (statusBar) statusBar.style.display = 'none';
  }
  const target = e.target as Element;
  if (target === overlayContainer || target === tooltipElement) return;
  hoveredElement = target;

  if (overlayContainer) {
    overlayContainer.style.outline = '2px solid #6EE7B7';
    overlayContainer.style.outlineOffset = '-2px';
    overlayContainer.style.boxShadow = 'inset 0 0 0 1px rgba(110, 231, 183, 0.3)';
  }

  if (tooltipElement) {
    if ((target as HTMLInputElement).type === 'password') {
      tooltipElement.textContent = 'input[type="password"]';
      tooltipElement.style.display = 'block';
      tooltipElement.style.left = Math.min(e.clientX + 12, window.innerWidth - 410) + 'px';
      tooltipElement.style.top = e.clientY + 12 + 'px';
      return;
    }
    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const cls = Array.from(target.classList).slice(0, 3).join('.');
    const primarySelector = extractQuickSelector(target);
    tooltipElement.textContent = `${tag}${id}${cls ? '.' + cls : ''} | ${primarySelector || 'no unique selector'}`;
    tooltipElement.style.display = 'block';

    let x = e.clientX + 12;
    let y = e.clientY + 12;
    if (x + 400 > window.innerWidth) x = window.innerWidth - 410;
    if (y + 30 > window.innerHeight) y = e.clientY - 40;
    tooltipElement.style.left = x + 'px';
    tooltipElement.style.top = y + 'px';
  }
}

function onMouseOut(e: MouseEvent): void {
  if (!pickerActive) return;
  hoveredElement = null;
  if (overlayContainer) {
    overlayContainer.style.outline = 'none';
    overlayContainer.style.boxShadow = 'none';
  }
  if (tooltipElement) tooltipElement.style.display = 'none';
}

function onClick(e: MouseEvent): void {
  if (!pickerActive) return;
  e.preventDefault();
  e.stopPropagation();
  const target = e.target as Element;
  if (target && callback) {
    callback(target);
  }
  deactivatePicker();
}

function getInteractableElements(): Element[] {
  const all = getClickableElements();
  if (!filterTag) return all;
  if (filterTag === 'checkbox') return all.filter(el => {
    const t = el.tagName.toLowerCase();
    return t === 'input' && (el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio';
  });
  if (filterTag === 'heading') return all.filter(el => /^h[1-6]$/.test(el.tagName.toLowerCase()));
  return all.filter(el => el.tagName.toLowerCase() === filterTag);
}

function clearKeyboardHighlight(): void {
  keyboardElements.forEach(el => {
    (el as HTMLElement).style.outline = '';
  });
  if (overlayContainer) {
    overlayContainer.style.outline = 'none';
    overlayContainer.style.boxShadow = 'none';
  }
}

function highlightKeyboardElement(index: number): void {
  clearKeyboardHighlight();
  if (index < 0 || index >= keyboardElements.length) return;
  const el = keyboardElements[index] as HTMLElement;
  el.style.outline = '3px solid #3B82F6';
  el.style.outlineOffset = '2px';
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  hoveredElement = el;
  if (tooltipElement) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = Array.from(el.classList).slice(0, 3).join('.');
    const primarySelector = extractQuickSelector(el);
    tooltipElement.textContent = `${tag}${id}${cls ? '.' + cls : ''} | ${primarySelector || 'no unique selector'} (${index + 1}/${keyboardElements.length})`;
    tooltipElement.style.display = 'block';
    const rect = el.getBoundingClientRect();
    tooltipElement.style.left = Math.min(rect.left, window.innerWidth - 410) + 'px';
    tooltipElement.style.top = rect.bottom + 8 + 'px';
  }
  if (overlayContainer) {
    overlayContainer.style.outline = '2px solid #60A5FA';
    overlayContainer.style.outlineOffset = '-2px';
    overlayContainer.style.boxShadow = 'inset 0 0 0 1px rgba(96, 165, 250, 0.3)';
  }
  updateStatusBar();
}

function copySelectorToClipboard(): void {
  if (!keyboardMode || keyboardIndex < 0 || keyboardIndex >= keyboardElements.length) return;
  const el = keyboardElements[keyboardIndex] as HTMLElement;
  const selector = extractQuickSelector(el);
  if (!selector) return;
  navigator.clipboard.writeText(selector).then(() => {
    if (tooltipElement) {
      tooltipElement.textContent = `✓ Copied: ${selector}`;
      tooltipElement.style.display = 'block';
      const rect = el.getBoundingClientRect();
      tooltipElement.style.left = Math.min(rect.left, window.innerWidth - 410) + 'px';
      tooltipElement.style.top = rect.bottom + 8 + 'px';
      setTimeout(() => {
        if (tooltipElement) {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const cls = Array.from(el.classList).slice(0, 3).join('.');
          const primarySelector = extractQuickSelector(el);
          tooltipElement.textContent = `${tag}${id}${cls ? '.' + cls : ''} | ${primarySelector || 'no unique selector'} (${keyboardIndex + 1}/${keyboardElements.length})`;
        }
      }, 1200);
    }
  }).catch(() => {});
}

function runStressTestOnElement(): void {
  if (!keyboardMode || keyboardIndex < 0 || keyboardIndex >= keyboardElements.length) return;
  import('../shared/selector-engine').then(({ checkSelectorResilience }) => {
    const el = keyboardElements[keyboardIndex];
    const result = checkSelectorResilience(el);
    const strong = result.uniqueWithoutId && result.uniqueWithoutClass && result.semanticOnly;
    const weak = result.uniqueWithoutId || result.uniqueWithoutClass || result.semanticOnly;
    const overall = strong ? 'strong' : weak ? 'weak' : 'failed';
    const lines = [
      `🛡️ Stress Test Results:`,
      `  Without ID:       ${result.uniqueWithoutId ? '✅ Unique' : '❌ Not unique'}`,
      `  Without Classes:  ${result.uniqueWithoutClass ? '✅ Unique' : '❌ Not unique'}`,
      `  Semantic Only:    ${result.semanticOnly ? '✅ Unique' : '❌ Not unique'}`,
      `  Overall:          ${overall === 'strong' ? '✅ Strong' : overall === 'weak' ? '⚠️ Weak' : '❌ Failed'}`,
    ];
    if (tooltipElement) {
      tooltipElement.textContent = lines.join(' | ');
      tooltipElement.style.display = 'block';
      tooltipElement.style.whiteSpace = 'pre-wrap';
      tooltipElement.style.maxWidth = '420px';
      const rect = el.getBoundingClientRect();
      tooltipElement.style.left = Math.min(rect.left, window.innerWidth - 430) + 'px';
      tooltipElement.style.top = rect.bottom + 8 + 'px';
      setTimeout(() => {
        if (tooltipElement) {
          tooltipElement.style.whiteSpace = 'nowrap';
          tooltipElement.style.maxWidth = '400px';
        }
      }, 4000);
    }
  });
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (keyboardMode) {
      keyboardMode = false;
      clearKeyboardHighlight();
      keyboardElements = [];
      if (statusBar) statusBar.style.display = 'none';
    } else {
      deactivatePicker();
    }
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation();
    if (!keyboardMode) {
      keyboardMode = true;
      filterTag = null;
      keyboardElements = getInteractableElements();
      keyboardIndex = e.shiftKey ? keyboardElements.length - 1 : 0;
    } else {
      if (!filterTag) {
        filterTag = null;
        keyboardElements = getInteractableElements();
      }
      keyboardIndex += e.shiftKey ? -1 : 1;
      if (keyboardIndex < 0) keyboardIndex = keyboardElements.length - 1;
      if (keyboardIndex >= keyboardElements.length) keyboardIndex = 0;
    }
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    const step = e.key === 'ArrowDown' ? 1 : -1;
    if (!keyboardMode) {
      keyboardMode = true;
      keyboardElements = getInteractableElements();
      keyboardIndex = step === 1 ? 0 : keyboardElements.length - 1;
    } else {
      keyboardIndex += step;
      if (keyboardIndex < 0) keyboardIndex = keyboardElements.length - 1;
      if (keyboardIndex >= keyboardElements.length) keyboardIndex = 0;
    }
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    const step = e.key === 'ArrowDown' ? 5 : -5;
    if (!keyboardMode) {
      keyboardMode = true;
      keyboardElements = getInteractableElements();
      keyboardIndex = step > 0 ? Math.min(4, keyboardElements.length - 1) : Math.max(0, keyboardElements.length - 5);
    } else {
      keyboardIndex += step;
      if (keyboardIndex < 0) keyboardIndex = 0;
      if (keyboardIndex >= keyboardElements.length) keyboardIndex = keyboardElements.length - 1;
    }
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if (e.key === 'PageUp') {
    e.preventDefault();
    e.stopPropagation();
    if (!keyboardMode) {
      keyboardMode = true;
      keyboardElements = getInteractableElements();
      keyboardIndex = 0;
    } else {
      keyboardIndex = Math.max(0, keyboardIndex - 10);
    }
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if (e.key === 'PageDown') {
    e.preventDefault();
    e.stopPropagation();
    if (!keyboardMode) {
      keyboardMode = true;
      keyboardElements = getInteractableElements();
      keyboardIndex = 0;
    } else {
      keyboardIndex = Math.min(keyboardElements.length - 1, keyboardIndex + 10);
    }
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if (e.key === 'Home') {
    e.preventDefault();
    e.stopPropagation();
    if (!keyboardMode) {
      keyboardMode = true;
      keyboardElements = getInteractableElements();
    }
    keyboardIndex = 0;
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if (e.key === 'End') {
    e.preventDefault();
    e.stopPropagation();
    if (!keyboardMode) {
      keyboardMode = true;
      keyboardElements = getInteractableElements();
    }
    keyboardIndex = keyboardElements.length - 1;
    highlightKeyboardElement(keyboardIndex);
    return;
  }

  if (e.key === 'c' && !e.ctrlKey && !e.metaKey && keyboardMode) {
    e.preventDefault();
    e.stopPropagation();
    copySelectorToClipboard();
    return;
  }

  if (e.key === 's' && !e.ctrlKey && !e.metaKey && keyboardMode) {
    e.preventDefault();
    e.stopPropagation();
    runStressTestOnElement();
    return;
  }

  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    keyboardMode = true;
    const newFilter = FILTER_KEYS[e.key];
    filterTag = newFilter === undefined ? filterTag : newFilter;
    keyboardElements = getInteractableElements();
    keyboardIndex = 0;
    clearKeyboardHighlight();
    if (keyboardElements.length > 0) {
      highlightKeyboardElement(keyboardIndex);
    } else {
      if (tooltipElement) {
        const label = filterTag ? FILTER_LABELS[filterTag] || filterTag : 'All Elements';
        tooltipElement.textContent = `⚠️ No ${label.toLowerCase()} found on this page`;
        tooltipElement.style.display = 'block';
        tooltipElement.style.left = '12px';
        tooltipElement.style.top = '12px';
        setTimeout(() => { if (tooltipElement) tooltipElement.style.display = 'none'; }, 2000);
      }
      if (statusBar) {
        const label = filterTag ? FILTER_LABELS[filterTag] || filterTag : 'All';
        statusBar.textContent = `[0/0] Filter: ${label} — no matches`;
        statusBar.style.display = 'block';
      }
    }
    return;
  }

  if (e.key === 'Enter' && keyboardMode && keyboardIndex >= 0 && keyboardIndex < keyboardElements.length) {
    e.preventDefault();
    e.stopPropagation();
    const el = keyboardElements[keyboardIndex];
    if (el && callback) {
      callback(el);
    }
    deactivatePicker();
    return;
  }
}

