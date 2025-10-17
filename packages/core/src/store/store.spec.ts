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
      expect(store.state.isOpen).toBe(false);
      expect(store.state.mode).toBe('drawer-right');
      expect(store.state.newUpdatesCount).toBe(0);
      expect(store.state.isLoading).toBe(false);
      expect(store.state.error).toBeNull();
    });

    it('should use config values for display settings', () => {
      const configWithDisplay: StoreConfig = {
        ...mockConfig,
        mode: 'modal'
      };

      const store = createWidgetStore(configWithDisplay);

      expect(store.state.mode).toBe('modal');
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
            id: 1,
            title: 'Update 1',
            content: 'Description 1',
            display_date: '2024-01-01',
            published_at: '2024-01-01T00:00:00Z',
            expires_on: null,
            highlight_target: null,
            hosted_url: null,
            tags: [{ id: 1, name: 'feature', color: '#00ff00' }]
          },
          {
            id: 2,
            title: 'Update 2',
            content: 'Description 2',
            display_date: '2024-01-02',
            published_at: '2024-01-02T00:00:00Z',
            expires_on: null,
            highlight_target: null,
            hosted_url: null,
            tags: [{ id: 2, name: 'bugfix', color: '#ff0000' }]
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
      it('should open display', () => {
        const store = createWidgetStore(mockConfig);
        store.actions.openDisplay();

        expect(store.state.isOpen).toBe(true);
      });

      it('should close display', () => {
        const store = createWidgetStore(mockConfig);
        store.state.isOpen = true;

        store.actions.closeDisplay();

        expect(store.state.isOpen).toBe(false);
      });

      it('should toggle display', () => {
        const store = createWidgetStore(mockConfig);

        store.actions.toggleDisplay();
        expect(store.state.isOpen).toBe(true);

        store.actions.toggleDisplay();
        expect(store.state.isOpen).toBe(false);
      });
    });

    describe('setMode', () => {
      it('should change mode and close display', () => {
        const store = createWidgetStore(mockConfig);
        store.state.isOpen = true;

        store.actions.setMode('modal');

        expect(store.state.mode).toBe('modal');
        expect(store.state.isOpen).toBe(false);
      });

      it('should change mode to drawer-left', () => {
        const store = createWidgetStore(mockConfig);

        store.actions.setMode('drawer-left');

        expect(store.state.mode).toBe('drawer-left');
      });
    });
  });

  describe('reactive updates', () => {
    it('should calculate newUpdatesCount when updates change', () => {
      const store = createWidgetStore(mockConfig);
      store.state.lastViewed = new Date('2024-01-02').getTime();

      const updates: Update[] = [
        {
          id: 1,
          title: 'Old Update',
          content: 'Old',
          display_date: '2024-01-01',
          published_at: '2024-01-01T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
        },
        {
          id: 2,
          title: 'New Update 1',
          content: 'New',
          display_date: '2024-01-03',
          published_at: '2024-01-03T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
        },
        {
          id: 3,
          title: 'New Update 2',
          content: 'New',
          display_date: '2024-01-04',
          published_at: '2024-01-04T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
        }
      ];

      store.state.updates = updates;

      expect(store.state.newUpdatesCount).toBe(2);
    });

    it('should calculate newUpdatesCount when lastViewed changes', () => {
      const updates: Update[] = [
        {
          id: 1,
          title: 'Update 1',
          content: 'Desc 1',
          display_date: '2024-01-01',
          published_at: '2024-01-01T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
        },
        {
          id: 2,
          title: 'Update 2',
          content: 'Desc 2',
          display_date: '2024-01-03',
          published_at: '2024-01-03T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
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
          id: 1,
          title: 'Update 1',
          content: 'Desc 1',
          display_date: '2024-01-01',
          published_at: '2024-01-01T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
        },
        {
          id: 2,
          title: 'Update 2',
          content: 'Desc 2',
          display_date: '2024-01-02',
          published_at: '2024-01-02T00:00:00Z',
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: []
        }
      ];

      store.state.updates = updates;
      expect(store.state.newUpdatesCount).toBe(2);
    });
  });
});