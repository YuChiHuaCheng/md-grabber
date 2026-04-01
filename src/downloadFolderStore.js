const DB_NAME = 'md-grabber-settings';
const STORE_NAME = 'download-folder';
const HANDLE_KEY = 'default-folder-handle';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function runStoreOperation(mode, operation) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    operation(store, resolve, reject);

    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction failed'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction aborted'));
    };
  }));
}

export function saveDefaultFolderHandle(handle) {
  return runStoreOperation('readwrite', (store, resolve, reject) => {
    const request = store.put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save folder handle'));
  });
}

export function loadDefaultFolderHandle() {
  return runStoreOperation('readonly', (store, resolve, reject) => {
    const request = store.get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Failed to load folder handle'));
  });
}

export function clearDefaultFolderHandle() {
  return runStoreOperation('readwrite', (store, resolve, reject) => {
    const request = store.delete(HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to clear folder handle'));
  });
}
