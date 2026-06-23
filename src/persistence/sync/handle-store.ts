/**
 * Remembers the linked sync folder across reloads. A `FileSystemDirectoryHandle`
 * is structured-cloneable, so we persist it (with this device's chosen file
 * name) in IndexedDB and restore it on startup — the user no longer re-picks the
 * folder every refresh. IndexedDB is per-browser-profile and not cloud-synced,
 * so the file name stored here is what gives this device its stable, distinct
 * identity in the folder. See ADR 0013.
 */
export interface LinkedFolder {
  handle: FileSystemDirectoryHandle;
  fileName: string;
}

const DB_NAME = 'wlog-sync';
const STORE = 'kv';
const KEY = 'linked-folder';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLinkedFolder(): Promise<LinkedFolder | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as LinkedFolder | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function setLinkedFolder(record: LinkedFolder): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Forget the linked folder (drops the handle + this device's file name). */
export async function clearLinkedFolder(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
