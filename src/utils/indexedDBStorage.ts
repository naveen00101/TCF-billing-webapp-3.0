export class IndexedDBStorage {
  private static dbName = "TCF_POS_DATABASE";
  private static storeName = "key_value_store";
  private static version = 1;
  private static db: IDBDatabase | null = null;
  private static isMemoryFallback = false;
  private static memoryCache: { [key: string]: any } = {};

  public static async init(): Promise<void> {
    if (this.db) return;

    // Request persistent storage to prevent browser from auto-evicting data
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist().catch(() => {});
      }
    } catch (e) {
      console.warn("[IndexedDB] Storage persistence request failed:", e);
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };

        request.onsuccess = (event: any) => {
          this.db = event.target.result;
          this.isMemoryFallback = false;
          console.log("[IndexedDB] Initialized successfully.");
          resolve();
        };

        request.onerror = (event: any) => {
          console.warn("[IndexedDB] Failed to open database, falling back to memory/localStorage:", event.target.error);
          this.isMemoryFallback = true;
          resolve();
        };
      } catch (err) {
        console.warn("[IndexedDB] Exception opening database, falling back to memory/localStorage:", err);
        this.isMemoryFallback = true;
        resolve();
      }
    });
  }

  public static async getItem<T>(key: string, defaultValue: T): Promise<T> {
    await this.init();

    if (this.isMemoryFallback) {
      // Try local storage as fallback before memory cache
      try {
        const localVal = localStorage.getItem(key);
        if (localVal) {
          return JSON.parse(localVal) as T;
        }
      } catch {}
      return this.memoryCache[key] !== undefined ? this.memoryCache[key] : defaultValue;
    }

    return new Promise((resolve) => {
      try {
        if (!this.db) {
          resolve(defaultValue);
          return;
        }

        const transaction = this.db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined ? request.result : defaultValue);
        };

        request.onerror = () => {
          resolve(defaultValue);
        };
      } catch (e) {
        console.warn(`[IndexedDB] Error reading key "${key}":`, e);
        resolve(defaultValue);
      }
    });
  }

  public static async setItem<T>(key: string, value: T): Promise<void> {
    await this.init();

    if (this.isMemoryFallback) {
      this.memoryCache[key] = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      return;
    }

    return new Promise((resolve) => {
      try {
        if (!this.db) {
          resolve();
          return;
        }

        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (e) => {
          console.warn(`[IndexedDB] Error writing key "${key}":`, e);
          resolve();
        };
      } catch (e) {
        console.warn(`[IndexedDB] Exception writing key "${key}":`, e);
        resolve();
      }
    });
  }

  public static async removeItem(key: string): Promise<void> {
    await this.init();

    if (this.isMemoryFallback) {
      delete this.memoryCache[key];
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }

    return new Promise((resolve) => {
      try {
        if (!this.db) {
          resolve();
          return;
        }

        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      } catch (e) {
        console.warn(`[IndexedDB] Exception removing key "${key}":`, e);
        resolve();
      }
    });
  }
}
