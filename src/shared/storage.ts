import { openDB, type IDBPDatabase } from 'idb';
import type { PageModel, Test, AppSettings } from './types';

const DB_NAME = 'qa-element-finder';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pageModels')) {
          db.createObjectStore('pageModels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tests')) {
          db.createObjectStore('tests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function initDB(): Promise<void> {
  try {
    await getDB();
  } catch (err) {
    console.error('initDB failed:', err);
  }
}

export async function savePageModel(model: PageModel): Promise<void> {
  try {
    const db = await getDB();
    await db.put('pageModels', { ...model, id: model.id || generateId(), savedAt: Date.now() });
  } catch (err) {
    console.error('savePageModel failed:', err);
  }
}

export async function getPageModels(): Promise<PageModel[]> {
  try {
    const db = await getDB();
    return db.getAll('pageModels');
  } catch (err) {
    console.error('getPageModels failed:', err);
    return [];
  }
}

export async function deletePageModel(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('pageModels', id);
  } catch (err) {
    console.error('deletePageModel failed:', err);
  }
}

export async function saveTest(test: Test): Promise<void> {
  try {
    const db = await getDB();
    await db.put('tests', { ...test, id: test.id || generateId(), savedAt: Date.now() });
  } catch (err) {
    console.error('saveTest failed:', err);
  }
}

export async function getTests(): Promise<Test[]> {
  try {
    const db = await getDB();
    return db.getAll('tests');
  } catch (err) {
    console.error('getTests failed:', err);
    return [];
  }
}

export async function deleteTest(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('tests', id);
  } catch (err) {
    console.error('deleteTest failed:', err);
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  framework: 'playwright-ts' as const,
  timeout: 5000,
  debounceMs: 300,
  failMode: 'stop' as const,
  maskPasswords: true,
  indentSpaces: 2,
  screenshotEveryStep: false,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await getDB();
    const stored = await db.get('settings', 'app');
    return stored ? { ...DEFAULT_SETTINGS, ...stored.value } : DEFAULT_SETTINGS;
  } catch (err) {
    console.error('getSettings failed:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const db = await getDB();
    const current = await getSettings();
    const merged = { ...current, ...settings };
    await db.put('settings', { key: 'app', value: merged });
  } catch (err) {
    console.error('saveSettings failed:', err);
  }
}
