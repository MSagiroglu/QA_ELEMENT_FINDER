import { extractRecordedStep } from '../shared/utils';

const SENSITIVE_PARAMS = /^(token|session|key|secret|code|access_token|api_key|auth|password|jwt)$/i;

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.test(key)) {
        parsed.searchParams.set(key, '***');
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

let recording = false;
let steps: Array<{ action: string; target: string; value?: string; timestamp: number }> = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastUrl: string = location.href;
let recorderObserver: MutationObserver | null = null;
let originalPushState: typeof history.pushState | null = null;
let lastUrlCheck: number = 0;

function onUrlChange(): void {
  if (!recording) return;
  const now = Date.now();
  if (now - lastUrlCheck < 500) return;
  lastUrlCheck = now;
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const sanitized = sanitizeUrl(location.href);
    const navStep = { action: 'navigate' as const, target: sanitized, value: sanitized, timestamp: now };
    steps.push(navStep);
    sendStepToBackground(navStep);
    notifyStep();
  }
}

export function startRecording(): void {
  if (recording) return;
  recording = true;
  steps = [];
  lastUrl = location.href;

  document.addEventListener('click', onRecordClick, true);
  document.addEventListener('change', onRecordChange, true);
  document.addEventListener('input', onRecordInput, true);
  document.addEventListener('submit', onRecordSubmit, true);

  recorderObserver = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastUrlCheck < 500) return;
    lastUrlCheck = now;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const sanitized = sanitizeUrl(location.href);
      const navStep = { action: 'navigate' as const, target: sanitized, value: sanitized, timestamp: now };
      steps.push(navStep);
      sendStepToBackground(navStep);
      notifyStep();
    }
  });
  recorderObserver.observe(document, { subtree: true, childList: true });

  originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState!.apply(this, args);
    onUrlChange();
  };
  window.addEventListener('popstate', onUrlChange);

  notifyRecordingStatus(true);
}

export function stopRecording(): { steps: any[]; url: string } {
  if (!recording) return { steps: [], url: '' };
  recording = false;

  document.removeEventListener('click', onRecordClick, true);
  document.removeEventListener('change', onRecordChange, true);
  document.removeEventListener('input', onRecordInput, true);
  document.removeEventListener('submit', onRecordSubmit, true);

  if (recorderObserver) { recorderObserver.disconnect(); recorderObserver = null; }
  if (originalPushState) { history.pushState = originalPushState; originalPushState = null; }
  window.removeEventListener('popstate', onUrlChange);

  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

  notifyRecordingStatus(false);
  const result = { steps: [...steps], url: lastUrl };
  steps = [];
  return result;
}

function onRecordClick(e: MouseEvent): void {
  if (!recording) return;
  const target = e.target as Element;
  if (!target) return;

  const tag = target.tagName.toLowerCase();
  if (tag === 'html' || tag === 'body') return;

  const step = extractRecordedStep(target, 'click');
  steps.push(step);
  sendStepToBackground(step);
  notifyStep();
}

function onRecordChange(e: Event): void {
  if (!recording) return;
  const target = e.target as HTMLInputElement;
  if (!target || !target.tagName) return;
  if (target.type === 'password') return;

  const action = target.tagName.toLowerCase() === 'select' ? 'select' : 'fill';
  const step = extractRecordedStep(target, action, target.value);
  steps.push(step);
  sendStepToBackground(step);
  notifyStep();
}

function onRecordInput(e: Event): void {
  if (!recording) return;
  const target = e.target as HTMLInputElement;
  if (!target || !target.tagName) return;
  if (target.type === 'password' || target.type === 'checkbox' || target.type === 'radio') return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const step = extractRecordedStep(target, 'fill', target.value);
    steps.push(step);
    sendStepToBackground(step);
    notifyStep();
  }, 300);
}

function onRecordSubmit(e: Event): void {
  if (!recording) return;
  const target = e.target as Element;
  if (!target) return;
  const step = extractRecordedStep(target, 'click');
  steps.push({ ...step, target: step.target + ' [type="submit"]' });
  notifyStep();
}
function sendStepToBackground(step: any): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RECORD_STEP_EVENT', payload: { step } }).catch(() => {});
    }
  } catch {}
}

function notifyStep(): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RECORD_STEP', payload: { stepCount: steps.length } });
    }
  } catch {}
}

function notifyRecordingStatus(isRecording: boolean): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: isRecording ? 'RECORD_START' : 'RECORD_STOP', payload: { stepCount: steps.length } });
    }
  } catch {}
}
