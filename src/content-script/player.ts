import type { FailMode } from '../shared/types';

const MAX_WAIT_MS = 60000;

let playing = false;
let abortController = false;

function safeSendMessage(msg: any): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(msg).catch(() => {});
    }
  } catch {}
}

export async function playSteps(steps: Array<{ action: string; target: string; value?: string }>): Promise<{ stepResults: any[]; passed: boolean; duration: number }> {
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
      stepResults.push({ stepIndex: i, passed: result.passed, error: result.error, action: step.action });

      safeSendMessage({
        type: 'STEP_RESULT',
        payload: { stepIndex: i, passed: result.passed, error: result.error }
      });
    } catch (err: any) {
      stepResults.push({ stepIndex: i, passed: false, error: err.message });
      safeSendMessage({
        type: 'STEP_RESULT',
        payload: { stepIndex: i, passed: false, error: err.message }
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

async function executeStep(step: { action: string; target: string; value?: string; assertion?: { type: string; expected: string; kind: string } }): Promise<{ passed: boolean; error?: string }> {
  const element = findElement(step.target);
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
      const assertion = step.assertion;
      if (!assertion) return { passed: false, error: 'No assertion type specified' };
      switch (assertion.type) {
        case 'visible':
          return { passed: element.isConnected && (element as HTMLElement).offsetParent !== null };
        case 'text':
          return { passed: element.textContent?.trim() === assertion.expected };
        case 'attribute': {
          const eqIdx = assertion.expected.indexOf('=');
          if (eqIdx > 0) {
            const attrName = assertion.expected.slice(0, eqIdx);
            const attrValue = assertion.expected.slice(eqIdx + 1);
            return { passed: element.getAttribute(attrName) === attrValue };
          }
          return { passed: element.hasAttribute(assertion.expected) };
        }
        case 'value':
          return { passed: (element as HTMLInputElement).value === assertion.expected };
        case 'exists':
          return { passed: element.isConnected };
        default:
          return { passed: false, error: `Unknown assertion type: ${assertion.type}` };
      }
    }
    default: break;
  }

  return { passed: true };
}

function findElement(selector: string): Element | null {
  if (!selector) return null;
  try {
    if (selector.startsWith('/') || selector.startsWith('(')) {
      const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue as Element | null;
    }
    return document.querySelector(selector);
  } catch {
    return null;
  }
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
