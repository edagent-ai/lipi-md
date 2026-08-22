/**
 * A tiny promise wrapper over IndexedDB, with a localStorage fallback for
 * browsers that block IDB (Safari private browsing, some embedded webviews).
 * Kept in-tree rather than pulled from npm so the shipped dependency graph
 * stays 100% MIT.
 */

const DB_NAME = 'lipi-md';
const DB_VERSION = 1;

export type StoreName = 'docs' | 'kv';
const STORES: StoreName[] = ['docs', 'kv'];

let dbPromise: Promise<IDBDatabase> | null = null;
let fallback = false;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    }).catch((err) => {
      fallback = true;
      throw err;
    });
  }
  return dbPromise;
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

/* ---------------------------- localStorage shim --------------------------- */

const lsKey = (store: StoreName, key: string) => `lipi.${store}.${key}`;

const shim = {
  get<T>(store: StoreName, key: string): T | undefined {
    try {
      const raw = localStorage.getItem(lsKey(store, key));
      return raw == null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  },
  set(store: StoreName, key: string, value: unknown) {
    try {
      localStorage.setItem(lsKey(store, key), JSON.stringify(value));
    } catch {
      /* quota exceeded — nothing useful to do */
    }
  },
  del(store: StoreName, key: string) {
    try {
      localStorage.removeItem(lsKey(store, key));
    } catch {
      /* ignore */
    }
  },
  all<T>(store: StoreName): T[] {
    const out: T[] = [];
    try {
      const prefix = `lipi.${store}.`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) {
          const raw = localStorage.getItem(k);
          if (raw != null) out.push(JSON.parse(raw) as T);
        }
      }
    } catch {
      /* ignore */
    }
    return out;
  },
};

/* -------------------------------- public API ------------------------------ */

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  if (fallback) return shim.get<T>(store, key);
  try {
    return await tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
  } catch {
    fallback = true;
    return shim.get<T>(store, key);
  }
}

export async function idbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  if (fallback) return shim.set(store, key, value);
  try {
    await tx(store, 'readwrite', (s) => s.put(value, key));
  } catch {
    fallback = true;
    shim.set(store, key, value);
  }
}

export async function idbDel(store: StoreName, key: string): Promise<void> {
  if (fallback) return shim.del(store, key);
  try {
    await tx(store, 'readwrite', (s) => s.delete(key));
  } catch {
    fallback = true;
    shim.del(store, key);
  }
}

export async function idbAll<T>(store: StoreName): Promise<T[]> {
  if (fallback) return shim.all<T>(store);
  try {
    return await tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
  } catch {
    fallback = true;
    return shim.all<T>(store);
  }
}

/** True once we have fallen back to localStorage (surfaced in Settings). */
export const usingFallback = () => fallback;
