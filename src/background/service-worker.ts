import { storage } from 'webextension-polyfill';

// ─── Multi-tab Recording State ───
let recordingActive = false;
let recordingSteps: any[] = [];
let recordingTabIds: Set<number> = new Set();

const devtoolsConnections = new Map<string, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'devtools') {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      devtoolsConnections.set(tabId.toString(), port);
      port.onDisconnect.addListener(() => {
        devtoolsConnections.delete(tabId.toString());
      });
    }
  }
});

function resolveTabId(message: any, sender: chrome.runtime.MessageSender): number | undefined {
  return sender.tab?.id || message.payload?.tabId;
}

function broadcastRecordingStarted(): void {
  chrome.runtime.sendMessage({ type: 'RECORD_START', payload: { stepCount: recordingSteps.length } }).catch(() => {});
}
function broadcastRecordingStopped(): void {
  chrome.runtime.sendMessage({ type: 'RECORD_STOP', payload: { stepCount: recordingSteps.length, steps: recordingSteps } }).catch(() => {});
}
function broadcastStep(): void {
  chrome.runtime.sendMessage({ type: 'RECORD_STEP', payload: { stepCount: recordingSteps.length } }).catch(() => {});
}

function sendToAllTrackedTabs(type: string, payload?: any): void {
  recordingTabIds.forEach(tabId => {
    chrome.tabs.sendMessage(tabId, { type, payload }).catch(() => {});
  });
}

// ─── Auto-inject recording into new tabs ───
chrome.tabs.onCreated.addListener((tab) => {
  if (recordingActive && tab.id) {
    recordingTabIds.add(tab.id);
    // Tab henüz yüklenmemiş olabilir, onUpdated'de tekrar dene
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (recordingActive && recordingTabIds.has(tabId) && changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING', payload: { restore: true } }).catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  recordingTabIds.delete(tabId);
});

// ─── Message Router ───
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  console.log('[Background] onMessage received:', message.type, 'from:', sender);

  if (sender.id !== chrome.runtime.id) {
    sendResponse({ success: false, error: 'Invalid sender' });
    return;
  }
  const tabId = resolveTabId(message, sender);

  switch (message.type) {
    case 'ACTIVATE_PICKER':
    case 'DEACTIVATE_PICKER':
    case 'VERIFY_SELECTOR':
    case 'CLEAR_VERIFY':
      forwardToTab(tabId, message.type, message.payload, sendResponse);
      return true;

    case 'ELEMENT_SELECTED': {
      if (tabId) {
        const port = devtoolsConnections.get(String(tabId));
        if (port) port.postMessage(message);
      }
      sendResponse({ success: true });
      break;
    }

    // ────── MULTI-TAB RECORDING ──────
    case 'START_RECORDING': {
      recordingActive = true;
      recordingSteps = [];
      recordingTabIds.clear();
      if (tabId) {
        recordingTabIds.add(tabId);
        forwardToTab(tabId, message.type, message.payload, (response: any) => {
          if (response?.success) sendResponse(response);
          else sendResponse(response || { success: false, error: 'No response from tab' });
        });
      } else {
        sendResponse({ success: false, error: 'No tab ID' });
      }
      broadcastRecordingStarted();
      return true;
    }

    case 'STOP_RECORDING': {
      recordingActive = false;
      // Send stop to ALL tracked tabs (including any that were auto-joined)
      sendToAllTrackedTabs('STOP_RECORDING_INTERNAL');
      const resultSteps = [...recordingSteps];
      recordingSteps = [];
      const tabIdSet = new Set(recordingTabIds);
      recordingTabIds.clear();
      sendResponse({ success: true, data: { steps: resultSteps, url: sender.tab?.url || '' } });
      broadcastRecordingStopped();
      break;
    }

    case 'RECORD_STEP_EVENT': {
      // Real-time step data from any content script (any tab)
      if (message.payload?.step) {
        recordingSteps.push(message.payload.step);
        // Forward to devtools for live timeline
        if (tabId) {
          const port = devtoolsConnections.get(String(tabId));
          if (port) port.postMessage({ type: 'RECORD_STEP_EVENT', payload: { step: message.payload.step, stepCount: recordingSteps.length } });
        }
      }
      broadcastStep();
      sendResponse({ success: true });
      break;
    }

    case 'RECORD_START':
    case 'RECORD_STOP':
    case 'RECORD_STEP': {
      // Forward to devtools
      if (tabId) {
        const port = devtoolsConnections.get(String(tabId));
        if (port) port.postMessage(message);
      }
      sendResponse({ success: true });
      break;
    }

    // ────── PLAYBACK ──────
    case 'PLAY_TEST':
    case 'STOP_PLAYING':
      forwardToTab(tabId, message.type, message.payload, sendResponse);
      return true;

    case 'PLAY_STEP':
    case 'STEP_RESULT':
    case 'PLAY_COMPLETE': {
      const playTabId = sender.tab?.id?.toString() || message.payload?.tabId?.toString();
      if (playTabId) {
        const port = devtoolsConnections.get(playTabId);
        if (port) port.postMessage(message);
      } else {
        chrome.runtime.sendMessage(message).catch(() => {});
      }
      sendResponse({ success: true });
      break;
    }

    case 'GET_RECORDING_TABS':
      sendResponse({ count: recordingTabIds.size, active: recordingActive });
      break;

    default:
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
  }
  return true;
});

function forwardToTab(tabId: number | undefined, type: string, payload: any, callback: (response: any) => void) {
  if (!tabId) {
    callback({ success: false, error: 'No tab ID' });
    return;
  }
  console.log('[Background] forwardToTab:', type, '→ tabId:', tabId);
  chrome.tabs.sendMessage(tabId, { type, payload }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Background] sendMessage failed:', chrome.runtime.lastError.message);
    }
    callback(response);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('QA Element Finder installed');
});
