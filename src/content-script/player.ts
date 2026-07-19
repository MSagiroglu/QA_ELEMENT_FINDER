import type { FailMode, AssertionConfig, AssertionOperator } from '../shared/types';
import { normalizeColor } from '../shared/types';
import { querySelectorWithShadowSupport } from '../shared/deep-dom';

const MAX_WAIT_MS = 120000;

let playing = false;
let abortController = false;

function safeSendMessage(msg: any): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(msg).catch(() => {});
    }
  } catch {}
}

export async function playSteps(steps: Array<{ action: string; target: string; value?: string; selectors?: Array<{ strategy: string; selector: string; score: number }> }>): Promise<{ stepResults: any[]; passed: boolean; duration: number }> {
  if (playing) return { stepResults: [], passed: false, duration: 0 };
  playing = true;
  abortController = false;
  const stepResults: any[] = [];
  const startTime = Date.now();

  for (let i = 0; i < steps.length; i++) {
    if (abortController) break;
    const step = steps[i];

    safeSendMessage({ type: 'PLAY_STEP', payload: { index: i, action: step.action, target: step.target } });

    try {
      const result = await executeStep(step);
      stepResults.push({ stepIndex: i, passed: result.passed, error: result.error, action: step.action, healed: result.healed });

      safeSendMessage({
        type: 'STEP_RESULT',
        payload: { stepIndex: i, passed: result.passed, error: result.error, healed: result.healed }
      });
    } catch (err: any) {
      stepResults.push({ stepIndex: i, passed: false, error: err.message, healed: false });
      safeSendMessage({
        type: 'STEP_RESULT',
        payload: { stepIndex: i, passed: false, error: err.message, healed: false }
      });
      const settings = await getPlaySettings();
      if (settings.failMode === 'stop') break;
    }

    await delay(300);
  }

  playing = false;
  const duration = Date.now() - startTime;

  safeSendMessage({
    type: 'PLAY_COMPLETE',
    payload: { passed: stepResults.every(r => r.passed), duration, total: stepResults.length, passedCount: stepResults.filter(r => r.passed).length }
  });

  return {
    stepResults,
    passed: stepResults.every(r => r.passed),
    duration
  };
}

export function stopPlaying(): void {
  abortController = true;
  playing = false;
}

async function executeStep(step: { action: string; target: string; value?: string; assertion?: { type: string; expected: string; kind: string }; selectors?: Array<{ strategy: string; selector: string; score: number }> }): Promise<{ passed: boolean; error?: string; healed?: boolean }> {
  const { element, healed } = findElementWithHealing(step.target, step.selectors || []);
  if (!element) return { passed: false, error: `Element not found: ${step.target}` };

  switch (step.action) {
    case 'click': {
      (element as HTMLElement).focus();
      (element as HTMLElement).click();
      break;
    }
    case 'fill':
    case 'type': {
      (element as HTMLElement).focus();
      const inputEl = element as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(inputEl, step.value || '');
      } else {
        inputEl.value = step.value || '';
      }
      inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
    case 'hover': {
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      break;
    }
    case 'select': {
      (element as HTMLSelectElement).value = step.value || '';
      element.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
    case 'navigate': {
      if (step.value) window.location.href = step.value;
      break;
    }
    case 'wait': {
      const ms = parseInt(step.value || '1000');
      const safeMs = Math.min(Math.max(ms, 0), MAX_WAIT_MS);
      return await waitAndCheck(safeMs, element);
    }
    case 'assert': {
      if (!element) return { passed: false, error: 'Assert element not found' };
      return executeAssertion(element, step.assertion as any, step.target, healed);
    }
    default: break;
  }

  return { passed: true, healed };
}

function findElement(selector: string): Element | null {
  if (!selector) return null;
  try {
    if (selector.startsWith('/') || selector.startsWith('(')) {
      const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue as Element | null;
    }
    if (selector.includes('>>') || selector.includes('>>>')) {
      return querySelectorWithShadowSupport(selector);
    }
    const el = document.querySelector(selector);
    if (el) return el;
    return querySelectorWithShadowSupport(selector);
  } catch {
    try { return querySelectorWithShadowSupport(selector); } catch { return null; }
  }
}

function findElementWithHealing(primarySelector: string, backupSelectors: Array<{ strategy: string; selector: string; score: number }>): { element: Element | null; healed: boolean } {
  // Try primary first
  const primary = findElement(primarySelector);
  if (primary) return { element: primary, healed: false };

  // Self-heal: try backup selectors in score order
  if (backupSelectors && backupSelectors.length > 0) {
    const sorted = [...backupSelectors].sort((a, b) => b.score - a.score);
    for (const alt of sorted) {
      if (alt.selector === primarySelector) continue;
      const el = findElement(alt.selector);
      if (el) return { element: el, healed: true };
    }
  }

  return { element: null, healed: false };
}

async function waitAndCheck(ms: number, element: Element): Promise<{ passed: boolean; error?: string }> {
  await delay(ms);
  return { passed: element.isConnected };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPlaySettings(): Promise<{ failMode: FailMode }> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise(resolve => {
        chrome.storage.local.get('settings', (result: any) => {
          resolve(result.settings || { failMode: 'stop' });
        });
      });
    }
  } catch {}
  return { failMode: 'stop' };
}

function compareValues(actual: string | number, operator: AssertionOperator, expected: string): boolean {
  const numActual = typeof actual === 'number' ? actual : parseFloat(actual);
  const numExpected = parseFloat(expected);
  const hasNums = !isNaN(numActual) && !isNaN(numExpected);

  switch (operator) {
    case 'eq': return String(actual).trim().toLowerCase() === expected.trim().toLowerCase();
    case 'neq': return String(actual).trim().toLowerCase() !== expected.trim().toLowerCase();
    case 'gt': return hasNums && numActual > numExpected;
    case 'gte': return hasNums && numActual >= numExpected;
    case 'lt': return hasNums && numActual < numExpected;
    case 'lte': return hasNums && numActual <= numExpected;
    case 'contains': return String(actual).toLowerCase().includes(expected.toLowerCase());
    case 'not-contains': return !String(actual).toLowerCase().includes(expected.toLowerCase());
    case 'matches': try { return new RegExp(expected, 'i').test(String(actual)); } catch { return false; }
    case 'approx': return hasNums && Math.abs(numActual - numExpected) / Math.max(numExpected, 1) <= 0.1;
    case 'color-eq': return normalizeColor(String(actual)) === normalizeColor(expected);
    default: return false;
  }
}

function executeAssertion(element: Element, assertion: AssertionConfig, targetSelector: string, healed?: boolean): { passed: boolean; error?: string; healed?: boolean } {
  if (!assertion) return { passed: false, error: 'No assertion config', healed: false };

  const type = assertion.type;
  const operator = assertion.operator || 'eq';
  const expected = assertion.expected || '';
  const prop = assertion.property || '';

  switch (type) {
    // ─── Visibility ───
    case 'visible': {
      const isVisible = element.isConnected && (element as HTMLElement).offsetParent !== null;
      return { passed: compareValues(isVisible ? 'true' : 'false', operator, expected || 'true'), healed };
    }
    case 'not-visible': {
      const isInvisible = !element.isConnected || (element as HTMLElement).offsetParent === null;
      return { passed: isInvisible, healed };
    }

    // ─── Existence ───
    case 'exists':
      return { passed: element.isConnected, healed };
    case 'not-exists':
      return { passed: !element.isConnected, healed };

    // ─── Text ───
    case 'text':
    case 'not-text':
    case 'contains-text':
    case 'not-contains-text': {
      const actualText = element.textContent?.trim() || '';
      const passed = compareValues(actualText, operator, expected);
      return { passed, error: passed ? undefined : `Text: got "${actualText.slice(0, 80)}"`, healed };
    }

    // ─── Value ───
    case 'value':
    case 'not-value': {
      const actualValue = (element as HTMLInputElement).value || '';
      return { passed: compareValues(actualValue, operator, expected), error: `Value: got "${actualValue}"`, healed };
    }

    // ─── Attribute ───
    case 'attribute':
    case 'not-attribute': {
      const attrValue = element.getAttribute(prop) || '';
      return { passed: compareValues(attrValue, operator, expected), error: `Attr ${prop}: got "${attrValue}"`, healed };
    }

    // ─── CSS Property ───
    case 'css-property': {
      if (!prop) return { passed: false, error: 'No CSS property specified', healed: false };
      const style = getComputedStyle(element);
      const actualValue = style.getPropertyValue(prop).trim();
      return { passed: compareValues(actualValue, operator, expected), error: `CSS ${prop}: got "${actualValue}"`, healed };
    }

    // ─── CSS Color ───
    case 'css-color': {
      if (!prop) return { passed: false, error: 'No color property specified', healed: false };
      const style = getComputedStyle(element);
      const raw = style.getPropertyValue(prop).trim();
      const actualColor = normalizeColor(raw);
      const expectedColor = normalizeColor(expected);
      return { passed: actualColor === expectedColor, error: `Color ${prop}: got ${raw} (normalized: ${actualColor})`, healed };
    }

    // ─── Dimension ───
    case 'dimension': {
      const rect = element.getBoundingClientRect();
      const actualValue = prop === 'height' ? rect.height : rect.width;
      return { passed: compareValues(actualValue, operator, expected), error: `${prop}: got ${actualValue}px`, healed };
    }

    // ─── Position ───
    case 'position': {
      const rect = element.getBoundingClientRect();
      const posMap: Record<string, number> = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
      const actualValue = posMap[prop] ?? NaN;
      if (isNaN(actualValue)) return { passed: false, error: `Unknown position: ${prop}`, healed: false };
      return { passed: compareValues(actualValue, operator, expected), error: `${prop}: got ${actualValue}px`, healed };
    }

    // ─── State ───
    case 'state': {
      const input = element as HTMLInputElement;
      const stateMap: Record<string, boolean> = {
        disabled: (element as HTMLInputElement).disabled,
        enabled: !(element as HTMLInputElement).disabled,
        checked: input.type === 'checkbox' || input.type === 'radio' ? input.checked : false,
        unchecked: input.type === 'checkbox' || input.type === 'radio' ? !input.checked : true,
        focused: document.activeElement === element,
        readonly: (element as HTMLInputElement).readOnly,
        required: (element as HTMLInputElement).required,
        selected: (element as HTMLOptionElement).selected,
        indeterminate: (input as any).indeterminate || false,
      };
      const actualState = stateMap[prop] ? 'true' : 'false';
      return { passed: compareValues(actualState, operator, expected), error: `State ${prop}: ${actualState}`, healed };
    }

    // ─── Count ───
    case 'count': {
      try {
        const count = document.querySelectorAll(targetSelector).length;
        return { passed: compareValues(count, operator, expected), error: `Count: ${count}`, healed };
      } catch {
        return { passed: false, error: 'Count query failed', healed: false };
      }
    }

    // ─── Class ───
    case 'class':
    case 'not-class': {
      const hasClass = element.classList.contains(expected);
      const passed = type === 'class' ? hasClass : !hasClass;
      return { passed, error: passed ? undefined : `Class "${expected}": ${hasClass ? 'present' : 'missing'}`, healed };
    }

    default:
      return { passed: false, error: `Unknown assertion: ${type}`, healed: false };
  }
}
