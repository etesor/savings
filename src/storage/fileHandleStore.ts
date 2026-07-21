// Persists the chosen FileSystemFileHandle in IndexedDB so that on reload we can
// reconnect to the same savings file (after re-confirming permission) instead of
// asking the user to pick it every time. File handles are structured-cloneable,
// which is what makes this possible.

const DB_NAME = 'savings-app';
const STORE_NAME = 'kv';
const HANDLE_KEY = 'data-file-handle';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  try {
    return await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as FileSystemFileHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function clearHandle(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
