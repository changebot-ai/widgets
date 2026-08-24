import { safeStorage, resetStorageCheck } from './safe-storage';

/**
 * The availability check and the memory fallback are module-level state, so
 * every test resets them and installs its own localStorage double.
 */

function installLocalStorage(overrides: Partial<Storage> = {}): Map<string, string> {
  const backing = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => {
      backing.set(key, value);
    },
    removeItem: (key: string) => {
      backing.delete(key);
    },
    ...overrides,
  };
  return backing;
}

describe('safeStorage', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetStorageCheck();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete (global as any).localStorage;
    resetStorageCheck();
    warnSpy.mockRestore();
  });

  it('reads and writes through localStorage when it works', () => {
    const backing = installLocalStorage();

    safeStorage.setItem('key', 'value');
    expect(backing.get('key')).toBe('value');
    expect(safeStorage.getItem('key')).toBe('value');

    safeStorage.removeItem('key');
    expect(backing.has('key')).toBe(false);
    expect(safeStorage.getItem('key')).toBeNull();
  });

  it('falls back to in-memory storage when localStorage throws on every call', () => {
    installLocalStorage({
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });

    // The availability probe fails, so everything goes to memory
    safeStorage.setItem('key', 'value');
    expect(safeStorage.getItem('key')).toBe('value');

    safeStorage.removeItem('key');
    expect(safeStorage.getItem('key')).toBeNull();

    expect(warnSpy).toHaveBeenCalledWith('Changebot: localStorage unavailable, using in-memory storage');
  });

  it('does not crash when localStorage starts throwing after the probe passed', () => {
    const backing = installLocalStorage();

    // The probe passes...
    safeStorage.setItem('early', '1');
    expect(backing.get('early')).toBe('1');

    // ...then writes start failing (e.g. quota filled up mid-session).
    // The write lands in memory instead of throwing. Reads still go to the
    // working localStorage, so the memory copy is only visible once reads
    // throw too — until then the key reads as absent.
    (global as any).localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    safeStorage.setItem('late', '2');
    expect(backing.has('late')).toBe(false);
    expect(safeStorage.getItem('late')).toBeNull();

    (global as any).localStorage.getItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(safeStorage.getItem('late')).toBe('2');
  });

  it('falls back to memory when reads throw', () => {
    installLocalStorage({
      setItem: () => {
        throw new Error('SecurityError');
      },
      getItem: () => {
        throw new Error('SecurityError');
      },
    });

    safeStorage.setItem('key', 'value');
    expect(safeStorage.getItem('key')).toBe('value');
  });

  it('works when localStorage does not exist at all', () => {
    delete (global as any).localStorage;

    safeStorage.setItem('key', 'value');
    expect(safeStorage.getItem('key')).toBe('value');
  });

  it('returns null for keys that were never set', () => {
    installLocalStorage();
    expect(safeStorage.getItem('missing')).toBeNull();
  });
});
