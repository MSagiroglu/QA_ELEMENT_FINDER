import { extractQuickSelector } from '../shared/utils';

let pickerActive = false;
let hoveredElement: Element | null = null;
let overlayContainer: HTMLDivElement | null = null;
let tooltipElement: HTMLDivElement | null = null;
let callback: ((element: Element) => void) | null = null;

export function activatePicker(onPick: (element: Element) => void): void {
  if (pickerActive) return;
  pickerActive = true;
  callback = onPick;
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
  removeOverlay();
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
}

function removeOverlay(): void {
  overlayContainer?.remove();
  tooltipElement?.remove();
  overlayContainer = null;
  tooltipElement = null;
}

function onMouseOver(e: MouseEvent): void {
  if (!pickerActive) return;
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

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    deactivatePicker();
  }
}

