import type { TrackGeometry } from "../types/track";

const DB_NAME = "color-the-map-geometries";
const STORE_NAME = "geometries";
const DB_VERSION = 1;

class GeometryCacheImpl {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private available = true;

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn(
            "IndexedDB unavailable, caching disabled:",
            request.error,
          );
          this.available = false;
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.available = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "track_id" });
          }
        };
      } catch (error) {
        console.warn("IndexedDB initialization failed:", error);
        this.available = false;
        resolve();
      }
    });

    return this.initPromise;
  }

  async getGeometry(trackId: number): Promise<TrackGeometry | null> {
    await this.init();

    if (!this.available || !this.db) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(trackId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.warn("Error reading from cache:", request.error);
          resolve(null);
        };
      } catch (error) {
        console.warn("Cache read error:", error);
        resolve(null);
      }
    });
  }

  async setGeometry(geometry: TrackGeometry): Promise<void> {
    await this.init();

    if (!this.available || !this.db) {
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(geometry);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn("Error writing to cache:", request.error);
          resolve();
        };
      } catch (error) {
        console.warn("Cache write error:", error);
        resolve();
      }
    });
  }

  async getGeometries(trackIds: number[]): Promise<TrackGeometry[]> {
    await this.init();

    if (!this.available || !this.db || trackIds.length === 0) {
      return [];
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const results: TrackGeometry[] = [];
        let pending = trackIds.length;

        trackIds.forEach((trackId) => {
          const request = store.get(trackId);
          request.onsuccess = () => {
            if (request.result) {
              results.push(request.result);
            }
            pending--;
            if (pending === 0) {
              resolve(results);
            }
          };
          request.onerror = () => {
            console.warn("Error reading track from cache:", request.error);
            pending--;
            if (pending === 0) {
              resolve(results);
            }
          };
        });
      } catch (error) {
        console.warn("Cache batch read error:", error);
        resolve([]);
      }
    });
  }

  async setGeometries(geometries: TrackGeometry[]): Promise<void> {
    await this.init();

    if (!this.available || !this.db || geometries.length === 0) {
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        geometries.forEach((geometry) => {
          store.put(geometry);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          console.warn("Error writing batch to cache:", transaction.error);
          resolve();
        };
      } catch (error) {
        console.warn("Cache batch write error:", error);
        resolve();
      }
    });
  }

  async clearCache(): Promise<void> {
    await this.init();

    if (!this.available || !this.db) {
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn("Error clearing cache:", request.error);
          resolve();
        };
      } catch (error) {
        console.warn("Cache clear error:", error);
        resolve();
      }
    });
  }
}

export const geometryCache = new GeometryCacheImpl();
