export type MessageType =
  | 'PICK_ELEMENT' | 'ELEMENT_SELECTED'
  | 'RECORD_START' | 'RECORD_STOP' | 'RECORD_STEP'
  | 'EXECUTE_STEP' | 'STEP_RESULT'
  | 'PLAY_TEST' | 'PLAY_STEP' | 'PLAY_COMPLETE'
  | 'GET_PAGE_ELEMENTS' | 'PAGE_ELEMENTS'
  | 'EXPORT_TEST' | 'IMPORT_TEST';

export interface ExtensionMessage {
  type: MessageType;
  payload: unknown;
  source?: 'popup' | 'devtools' | 'content' | 'background';
}

export function sendMessage(type: MessageType, payload: unknown = {}): Promise<unknown> {
  return chrome.runtime.sendMessage({ type, payload } as ExtensionMessage);
}

export function onMessage(callback: (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => void): () => void {
  const handler = (msg: ExtensionMessage, sender: chrome.runtime.MessageSender, _sendResponse: (response?: unknown) => void) => {
    callback(msg, sender);
  };
  chrome.runtime.onMessage.addListener(handler);
  return () => chrome.runtime.onMessage.removeListener(handler);
}

export function sendToTab(tabId: number, type: MessageType, payload: unknown = {}): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, { type, payload } as ExtensionMessage);
}
