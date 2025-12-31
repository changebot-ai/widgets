/**
 * Safe localStorage wrapper with in-memory fallback.
 * Handles environments where localStorage is unavailable:
 * - Safari private browsing mode
 * - Restricted iframes
 * - Disabled cookies/storage
 */

// In-memory fallback storage
const memoryStorage = new Map<string, string>();

// Cache the availability check
let localStorageAvailable: boolean | null = null;

/**
 * Check if localStorage is available (result is cached).
 */
function isLocalStorageAvailable(): boolean {
  if (localStorageAvailable !== null) {
    return localStorageAvailable;
  }

  try {
    const testKey = '__changebot_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    localStorageAvailable = true;
  } catch {
    localStorageAvailable = false;
    console.warn('Changebot: localStorage unavailable, using in-memory storage');
  }

  return localStorageAvailable;
}

/**
 * Safe storage API matching localStorage interface.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    if (isLocalStorageAvailable()) {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }
    return memoryStorage.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // Fall through to memory storage
      }
    }
    memoryStorage.set(key, value);
  },

  removeItem(key: string): void {
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        // Fall through to memory storage
      }
    }
    memoryStorage.delete(key);
  },
};

/**
 * Reset storage availability check (for testing).
 */
export function resetStorageCheck(): void {
  localStorageAvailable = null;
  memoryStorage.clear();
}
