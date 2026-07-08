// In-memory fallbacks if localStorage or sessionStorage throws a SecurityError/access denied
const memoryStorage: Record<string, string> = {};
const memorySessionStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`localStorage.getItem failed for key "${key}", using memory fallback.`, e);
    }
    return key in memoryStorage ? memoryStorage[key] : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`localStorage.setItem failed for key "${key}", using memory fallback.`, e);
    }
    memoryStorage[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`localStorage.removeItem failed for key "${key}", using memory fallback.`, e);
    }
    delete memoryStorage[key];
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn('localStorage.clear failed, using memory fallback.', e);
    }
    for (const key in memoryStorage) {
      delete memoryStorage[key];
    }
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`sessionStorage.getItem failed for key "${key}", using memory fallback.`, e);
    }
    return key in memorySessionStorage ? memorySessionStorage[key] : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`sessionStorage.setItem failed for key "${key}", using memory fallback.`, e);
    }
    memorySessionStorage[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`sessionStorage.removeItem failed for key "${key}", using memory fallback.`, e);
    }
    delete memorySessionStorage[key];
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
        return;
      }
    } catch (e) {
      console.warn('sessionStorage.clear failed, using memory fallback.', e);
    }
    for (const key in memorySessionStorage) {
      delete memorySessionStorage[key];
    }
  }
};
