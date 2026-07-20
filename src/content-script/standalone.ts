import { activatePicker, deactivatePicker } from './element-picker';
import { startRecording, stopRecording } from './recorder';
import { playSteps, stopPlaying } from './player';
import { highlightSelector, clearVerifyOverlay } from './selector-verify';

function safeChromeRuntimeSendMessage(msg: any): Promise<any> {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      return chrome.runtime.sendMessage(msg).catch(() => {});
    }
  } catch {}
  return Promise.resolve();
}

window.addEventListener('message', async (event: MessageEvent) => {
  if (event.data?.source === 'qa-extension-page') {
    const msg = event.data;
    let response: any;

    switch (msg.command) {
      case 'ACTIVATE_PICKER':
        activatePicker((element: Element) => {
          const tag = element.tagName.toLowerCase();
          const id = element.id;
          const classes = Array.from(element.classList);
          const attrs: Record<string, string> = {};
          element.getAttributeNames().forEach(name => { attrs[name] = element.getAttribute(name) || ''; });
          safeChromeRuntimeSendMessage({
            type: 'ELEMENT_SELECTED',
            payload: { tagName: tag, id, classes, attributes: attrs, text: element.textContent?.trim().slice(0, 100) }
          });
        });
        response = { success: true };
        break;

      case 'DEACTIVATE_PICKER':
        deactivatePicker();
        response = { success: true };
        break;

      case 'START_RECORDING':
        startRecording();
        response = { success: true };
        break;

      case 'STOP_RECORDING':
        response = { success: true, data: stopRecording() };
        break;

      case 'PLAY_TEST':
        response = { success: true, data: await playSteps(msg.payload.steps) };
        break;

      case 'PING':
        response = { success: true, data: 'pong' };
        break;

      case 'STOP_PLAYING':
        stopPlaying();
        response = { success: true };
        break;

      case 'VERIFY_SELECTOR': {
        const results = highlightSelector(msg.payload.selector, msg.payload.type || 'css');
        response = { success: true, data: results };
        break;
      }

      case 'CLEAR_VERIFY':
        clearVerifyOverlay();
        response = { success: true };
        break;

      default:
        response = await safeChromeRuntimeSendMessage({ type: msg.command, payload: msg.payload }).then(() => ({
          success: true
        })).catch(() => ({
          success: false, error: 'Unknown command'
        }));
    }

    window.postMessage({ source: 'qa-extension-content', id: msg.id, response }, '*');
  }
});

// ─── chrome.runtime.onMessage bridge (background → content script) ───
// background service worker chrome.tabs.sendMessage() ile mesaj gönderdiğinde
// bu listener devreye girer. window.postMessage bridge'i sadece popup panel için çalışır.
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response?: any) => void) => {
  switch (message.type) {
    case 'ACTIVATE_PICKER':
      activatePicker((element: Element) => {
        const tag = element.tagName.toLowerCase();
        const id = element.id;
        const classes = Array.from(element.classList);
        const attrs: Record<string, string> = {};
        element.getAttributeNames().forEach(name => { attrs[name] = element.getAttribute(name) || ''; });
        safeChromeRuntimeSendMessage({
          type: 'ELEMENT_SELECTED',
          payload: { tagName: tag, id, classes, attributes: attrs, text: element.textContent?.trim().slice(0, 100) }
        });
      });
      sendResponse({ success: true });
      break;

    case 'DEACTIVATE_PICKER':
      deactivatePicker();
      sendResponse({ success: true });
      break;

    case 'START_RECORDING':
      startRecording();
      sendResponse({ success: true });
      break;

    case 'STOP_RECORDING_INTERNAL':
      stopRecording();
      sendResponse({ success: true });
      break;

    case 'STOP_RECORDING': {
      const result = stopRecording();
      sendResponse({ success: true, data: result });
      break;
    }

    case 'PLAY_TEST': {
      playSteps(message.payload.steps).then(result => {
        sendResponse({ success: true, data: result });
      });
      return true;
    }

    case 'STOP_PLAYING':
      stopPlaying();
      sendResponse({ success: true });
      break;

    case 'VERIFY_SELECTOR': {
      const results = highlightSelector(message.payload.selector, message.payload.type || 'css');
      sendResponse({ success: true, data: results });
      break;
    }

    case 'CLEAR_VERIFY':
      clearVerifyOverlay();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true;
});

safeChromeRuntimeSendMessage({ type: 'CONTENT_SCRIPT_READY' });
