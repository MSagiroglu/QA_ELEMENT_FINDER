import { querySelectorAllWithShadowSupport } from '../shared/deep-dom';

let verifyOverlayContainer: HTMLDivElement | null = null;
let verifyBadgeContainer: HTMLDivElement | null = null;

export function clearVerifyOverlay(): void {
  verifyOverlayContainer?.remove();
  verifyOverlayContainer = null;
  verifyBadgeContainer?.remove();
  verifyBadgeContainer = null;
  const labelEls = document.querySelectorAll('.__qa_verify_label');
  labelEls.forEach(el => el.remove());
  const highlighted = document.querySelectorAll('.__qa_verify_highlight');
  highlighted.forEach(el => el.classList.remove('__qa_verify_highlight'));
  document.getElementById('__qa_verify_style')?.remove();
}

export function highlightSelector(selector: string, type: string): { matchCount: number; selector: string } {
  clearVerifyOverlay();
  if (!selector.trim()) return { matchCount: 0, selector };

  let elements: Element[] = [];

  if (type === 'xpath' || selector.startsWith('/') || selector.startsWith('(')) {
    try {
      const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node && node.nodeType === Node.ELEMENT_NODE) elements.push(node as Element);
      }
    } catch {
      return { matchCount: 0, selector };
    }
  } else {
    try {
      elements = querySelectorAllWithShadowSupport(selector);
    } catch {
      return { matchCount: 0, selector };
    }
  }

  if (elements.length === 0) return { matchCount: 0, selector };

  const style = document.createElement('style');
  style.id = '__qa_verify_style__';
  style.textContent = `
    .__qa_verify_highlight {
      outline: 3px solid #3B82F6 !important;
      outline-offset: 2px !important;
      background: rgba(59, 130, 246, 0.1) !important;
      transition: all 0.2s ease;
    }
  `;
  document.head.appendChild(style);

  elements.forEach((el) => {
    el.classList.add('__qa_verify_highlight');
  });

  verifyBadgeContainer = document.createElement('div');
  verifyBadgeContainer.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
    background: #1A2332; color: #E5E7E6; font: 12px/1.4 sans-serif;
    padding: 10px 16px; border-radius: 8px; border: 1px solid #3B82F6;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    display: flex; align-items: center; gap: 8px;
  `;
  verifyBadgeContainer.innerHTML = `
    <span style="background:#3B82F6;color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">${elements.length}</span>
    <span>element${elements.length !== 1 ? 's' : ''} matched <code style="color:#60A5FA;font-family:monospace;font-size:11px;margin-left:4px;">${selector.slice(0, 60)}</code></span>
    <button id="__qa_verify_close" style="background:transparent;border:1px solid #3B4A6A;color:#94A3B8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;">✕ Clear</button>
  `;
  document.body.appendChild(verifyBadgeContainer);

  verifyBadgeContainer.querySelector('#__qa_verify_close')?.addEventListener('click', clearVerifyOverlay);

  return { matchCount: elements.length, selector };
}
