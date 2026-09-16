// Tiny promise-wrapper around IndexedDB used as Haolio's local database.
// Everything stays on the user's machine; there is no network access anywhere.

const DB_NAME = 'haolio';
const DB_VERSION = 1;
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open local database'));
  });
}

// In-memory fallback (tests / environments without IndexedDB).
const memory = new Map<string, unknown>();
let useMemory = typeof indexedDB === 'undefined';

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Local database request failed'));
  });
}

export async function dbGet<T>(key: string): Promise<T | undefined> {
  if (useMemory) return memory.get(key) as T | undefined;
  try {
    return await withStore<T>('readonly', (s) => s.get(key) as IDBRequest<T>);
  } catch {
    useMemory = true;
    return memory.get(key) as T | undefined;
  }
}

export async function dbSet(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  if (useMemory) return;
  try {
    await withStore('readwrite', (s) => s.put(value, key) as IDBRequest<IDBValidKey>);
  } catch {
    useMemory = true;
  }
}

export async function dbDelete(key: string): Promise<void> {
  memory.delete(key);
  if (useMemory) return;
  try {
    await withStore('readwrite', (s) => s.delete(key) as unknown as IDBRequest<undefined>);
  } catch {
    useMemory = true;
  }
}

/** Test helper: wipe the in-memory fallback store. */
export function __resetDbForTests(): void {
  memory.clear();
  useMemory = true;
}
