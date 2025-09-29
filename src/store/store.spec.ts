import { createWidgetStore } from './index';
import { StoreConfig, Update } from '../types';

describe('createWidgetStore', () => {
  let mockConfig: StoreConfig;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockConfig = {
      endpoint: 'https://api.test/updates',
      persistLastViewed: false
    };

    // Mock localStorage
    originalLocalStorage = global.localStorage;
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default state', () => {
      const store = createWidgetStore(mockConfig);

      expect(store.state.updates).toEqual([]);
      expect(store.state.lastViewed).toBeNull();
      expect(store.state.isDrawerOpen).toBe(false);
      expect(store.state.isModalOpen).toBe(false);
      expect(store.state.displayMode).toBe('drawer');
      expect(store.state.drawerPosition).toBe('right');
      expect(store.state.newUpdatesCount).toBe(0);
      expect(store.state.isLoading).toBe(false);
      expect(store.state.error).toBeNull();
    });

    it('should use config values for display settings', () => {
      const configWithDisplay: StoreConfig = {
        ...mockConfig,
        displayMode: 'modal',
        drawerPosition: 'left'
      };

      const store = createWidgetStore(configWithDisplay);

      expect(store.state.displayMode).toBe('modal');
      expect(store.state.drawerPosition).toBe('left');
    });

    it('should load lastViewed from localStorage when persistLastViewed is true', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('1234567890');

      const configWithPersist: StoreConfig = {
        ...mockConfig,
        persistLastViewed: true
      };

      const store = createWidgetStore(configWithPersist);

      expect(localStorage.getItem).toHaveBeenCalledWith('changebot_lastViewed');
      expect(store.state.lastViewed).toBe(1234567890);
    });
  });

  describe('actions', () => {
    describe('loadUpdates', () => {
      it('should fetch and set updates successfully', async () => {
        const mockUpdates: Update[] = [
          {
            id: '1',
            title: 'Update 1',
            description: 'Description 1',
            date: '2024-01-01',
            tags: [{ text: 'feature', color: '#00ff00' }]
          },
          {
            id: '2',
            title: 'Update 2',
            description: 'Description 2',
            date: '2024-01-02',
            tags: [{ text: 'bugfix', color: '#ff0000' }]
          }
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockUpdates
        });

        const store = createWidgetStore(mockConfig);
        await store.actions.loadUpdates();

        expect(fetch).toHaveBeenCalledWith(mockConfig.endpoint);
        expect(store.state.updates).toEqual(mockUpdates);
        expect(store.state.isLoading).toBe(false);
        expect(store.state.error).toBeNull();
      });

      it('should handle fetch errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found'
        });

        const store = createWidgetStore(mockConfig);
        await store.actions.loadUpdates();

        expect(store.state.error).toBe('Failed to fetch updates: Not Found');
        expect(store.state.isLoading).toBe(false);
        expect(store.state.updates).toEqual([]);
      });

      it('should handle network errors', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const store = createWidgetStore(mockConfig);
        await store.actions.loadUpdates();

        expect(store.state.error).toBe('Network error');
        expect(store.state.isLoading).toBe(false);
      });
    });

    describe('markAllViewed', () => {
      it('should set lastViewed to current timestamp', () => {
        const store = createWidgetStore(mockConfig);
        const before = Date.now();

        store.actions.markAllViewed();

        const after = Date.now();
        expect(store.state.lastViewed).toBeGreaterThanOrEqual(before);
        expect(store.state.lastViewed).toBeLessThanOrEqual(after);
      });

      it('should save to localStorage when persistLastViewed is true', () => {
        const configWithPersist: StoreConfig = {
          ...mockConfig,
          persistLastViewed: true
        };

        const store = createWidgetStore(configWithPersist);
        store.actions.markAllViewed();

        expect(localStorage.setItem).toHaveBeenCalledWith(
          'changebot_lastViewed',
          expect.any(String)
        );
      });
    });

    describe('display actions', () => {
      it('should open drawer when displayMode is drawer', () => {
        const store = createWidgetStore(mockConfig);
        store.actions.openDisplay();

        expect(store.state.isDrawerOpen).toBe(true);
        expect(store.state.isModalOpen).toBe(false);
      });

      it('should open modal when displayMode is modal', () => {
        const store = createWidgetStore({ ...mockConfig, displayMode: 'modal' });
        store.actions.openDisplay();

        expect(store.state.isModalOpen).toBe(true);
        expect(store.state.isDrawerOpen).toBe(false);
      });

      it('should close all displays', () => {
        const store = createWidgetStore(mockConfig);
        store.state.isDrawerOpen = true;
        store.state.isModalOpen = true;

        store.actions.closeDisplay();

        expect(store.state.isDrawerOpen).toBe(false);
        expect(store.state.isModalOpen).toBe(false);
      });

      it('should toggle drawer display', () => {
        const store = createWidgetStore(mockConfig);

        store.actions.toggleDisplay();
        expect(store.state.isDrawerOpen).toBe(true);

        store.actions.toggleDisplay();
        expect(store.state.isDrawerOpen).toBe(false);
      });

      it('should toggle modal display', () => {
        const store = createWidgetStore({ ...mockConfig, displayMode: 'modal' });

        store.actions.toggleDisplay();
        expect(store.state.isModalOpen).toBe(true);

        store.actions.toggleDisplay();
        expect(store.state.isModalOpen).toBe(false);
      });
    });

    describe('setDisplayMode', () => {
      it('should change display mode and close displays', () => {
        const store = createWidgetStore(mockConfig);
        store.state.isDrawerOpen = true;

        store.actions.setDisplayMode('modal');

        expect(store.state.displayMode).toBe('modal');
        expect(store.state.isDrawerOpen).toBe(false);
        expect(store.state.isModalOpen).toBe(false);
      });
    });

    describe('setDrawerPosition', () => {
      it('should update drawer position', () => {
        const store = createWidgetStore(mockConfig);

        store.actions.setDrawerPosition('left');
        expect(store.state.drawerPosition).toBe('left');

        store.actions.setDrawerPosition('right');
        expect(store.state.drawerPosition).toBe('right');
      });
    });
  });

  describe('reactive updates', () => {
    it('should calculate newUpdatesCount when updates change', () => {
      const store = createWidgetStore(mockConfig);
      store.state.lastViewed = new Date('2024-01-02').getTime();

      const updates: Update[] = [
        {
          id: '1',
          title: 'Old Update',
          description: 'Old',
          date: '2024-01-01'
        },
        {
          id: '2',
          title: 'New Update 1',
          description: 'New',
          date: '2024-01-03'
        },
        {
          id: '3',
          title: 'New Update 2',
          description: 'New',
          date: '2024-01-04'
        }
      ];

      store.state.updates = updates;

      expect(store.state.newUpdatesCount).toBe(2);
    });

    it('should calculate newUpdatesCount when lastViewed changes', () => {
      const updates: Update[] = [
        {
          id: '1',
          title: 'Update 1',
          description: 'Desc 1',
          date: '2024-01-01'
        },
        {
          id: '2',
          title: 'Update 2',
          description: 'Desc 2',
          date: '2024-01-03'
        }
      ];

      const store = createWidgetStore(mockConfig);
      store.state.updates = updates;

      expect(store.state.newUpdatesCount).toBe(2); // All are new when lastViewed is null

      store.state.lastViewed = new Date('2024-01-02').getTime();
      expect(store.state.newUpdatesCount).toBe(1); // Only one update after Jan 2
    });

    it('should return all updates as new when lastViewed is null', () => {
      const store = createWidgetStore(mockConfig);

      const updates: Update[] = [
        {
          id: '1',
          title: 'Update 1',
          description: 'Desc 1',
          date: '2024-01-01'
        },
        {
          id: '2',
          title: 'Update 2',
          description: 'Desc 2',
          date: '2024-01-02'
        }
      ];

      store.state.updates = updates;
      expect(store.state.newUpdatesCount).toBe(2);
    });
  });
});