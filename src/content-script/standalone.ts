import { activatePicker, deactivatePicker } from './element-picker';
import { startRecording, stopRecording } from './recorder';
import { playSteps, stopPlaying } from './player';

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

safeChromeRuntimeSendMessage({ type: 'CONTENT_SCRIPT_READY' });
