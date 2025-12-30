import { newSpecPage } from '@stencil/core/testing';
import { ChangebotProvider } from './changebot-provider';

// Mock fetch globally
global.fetch = jest.fn();

describe('changebot-provider', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    localStorage.clear();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('User Data Parsing', () => {
    it('parseUserData returns null when userData is not provided', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test" />',
        autoApplyChanges: true,
      });

      const component = page.rootInstance;
      const result = component.parseUserData();

      expect(result).toBeNull();
    });

    it('parseUserData returns parsed object for valid JSON', async () => {
      const userData = JSON.stringify({ email: 'user@example.com', name: 'Test User' });
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test" user-data='${userData}' />`,
        autoApplyChanges: true,
      });

      const component = page.rootInstance;
      const result = component.parseUserData();

      expect(result).toEqual({ email: 'user@example.com', name: 'Test User' });
    });

    it('parseUserData returns null and logs error for invalid JSON', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test" user-data="invalid-json" />',
        autoApplyChanges: true,
      });

      const component = page.rootInstance;
      const result = component.parseUserData();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid userData JSON'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('User Tracking API', () => {
    it('fetchUserTracking constructs correct URL with slug', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: null }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: '2024-01-01T00:00:00.000Z' }),
      });

      const component = page.rootInstance;
      await component.fetchUserTracking();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.changebot.ai/v1/widgets/test-widget/users/user-123',
        expect.objectContaining({
          method: 'GET',
          headers: { Accept: 'application/json' },
          mode: 'cors',
        }),
      );
    });

    it('updateUserTracking sends PATCH request with timestamp', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: null }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const component = page.rootInstance;
      const timestamp = Date.now();
      await component.updateUserTracking(timestamp);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.changebot.ai/v1/widgets/test-widget/users/user-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining(new Date(timestamp).toISOString()),
        }),
      );
    });

    it('updateUserTracking includes userData when provided', async () => {
      const userData = JSON.stringify({ email: 'user@example.com' });

      // Mock both user tracking and updates API calls
      (global.fetch as jest.Mock).mockImplementation(url => {
        if (url.includes('/users/')) {
          // User tracking API
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'user-123', last_seen_at: null }),
          });
        }
        // Updates API - return empty result
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test-widget" user-id="user-123" user-data='${userData}' />`,
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const component = page.rootInstance;
      const timestamp = Date.now();
      const parsedData = component.parseUserData();
      await component.updateUserTracking(timestamp, parsedData);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.data).toEqual({ email: 'user@example.com' });
    });
  });

  describe('fetchLastSeen', () => {
    it('fetches from API when userId is provided and cache is expired', async () => {
      const mockTimestamp = '2024-01-01T00:00:00.000Z';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: mockTimestamp }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      // Set cache to expired (31 minutes ago)
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      page.win.localStorage.setItem('changebot:lastApiSync:default:user-123', thirtyOneMinutesAgo.toString());
      page.win.localStorage.setItem('changebot:lastViewed:default:user-123', '1234567890');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: mockTimestamp }),
      });

      const component = page.rootInstance;
      const result = component.fetchLastSeen();

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result).toBe(1234567890); // Returns localStorage value immediately
      expect(global.fetch).toHaveBeenCalled(); // But triggers background sync
    });

    it('reads from localStorage when no userId is provided', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" />',
        autoApplyChanges: true,
      });

      // Set localStorage AFTER creating the page
      page.win.localStorage.setItem('changebot:lastViewed:default', '1234567890');

      // Manually call hydrateLastViewed to reload from localStorage
      const component = page.rootInstance;
      await component.hydrateLastViewed();

      await page.waitForChanges();

      // Value should have been loaded from localStorage
      expect(component.scopedStore.store.state.lastViewed).toBe(1234567890);

      // Now manually call fetchLastSeen() - should read from localStorage again
      (global.fetch as jest.Mock).mockClear();
      const result = component.fetchLastSeen();

      expect(result).toBe(1234567890);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('falls back to localStorage when API fails', async () => {
      // Mock: user tracking API fails, but updates API succeeds
      (global.fetch as jest.Mock).mockImplementation(url => {
        if (url.includes('/users/')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      // Set localStorage AFTER page creation
      page.win.localStorage.setItem('changebot:lastViewed:default:user-123', '1234567890');

      // Manually call hydrateLastViewed to load from localStorage
      const component = page.rootInstance;
      await component.hydrateLastViewed();

      await page.waitForChanges();

      const result = component.scopedStore.store.state.lastViewed;

      expect(result).toBe(1234567890);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Error fetching user tracking data'), expect.any(String));
    });

    it('sets current time when API returns null last_seen_at', async () => {
      let callCount = 0;
      // Mock: user tracking GET returns null, PATCH succeeds, updates API succeeds
      (global.fetch as jest.Mock).mockImplementation(url => {
        callCount++;
        if (url.includes('/users/')) {
          if (callCount === 1) {
            // First call: GET returns null
            return Promise.resolve({
              ok: true,
              json: async () => ({ id: 'user-123', last_seen_at: null }),
            });
          }
          // Second call: PATCH succeeds
          return Promise.resolve({ ok: true });
        }
        // Updates API
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const beforeTime = Date.now();

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();

      const afterTime = Date.now();
      const component = page.rootInstance;
      const result = component.scopedStore.store.state.lastViewed;

      expect(result).toBeGreaterThanOrEqual(beforeTime);
      expect(result).toBeLessThanOrEqual(afterTime);
    });

    it('updates localStorage with API value', async () => {
      const mockTimestamp = '2024-01-01T00:00:00.000Z';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: mockTimestamp }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();

      const stored = localStorage.getItem('changebot:lastViewed:default:user-123');
      expect(stored).toBe(new Date(mockTimestamp).getTime().toString());
    });
  });

  describe('setLastViewed', () => {
    it('updates localStorage when no userId is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ widget: {}, publications: [] }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      const component = page.rootInstance;
      const timestamp = Date.now();
      await component.setLastViewed(timestamp);

      const stored = localStorage.getItem('changebot:lastViewed:default');
      expect(stored).toBe(timestamp.toString());
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('updates both localStorage and API when userId is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: null }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const component = page.rootInstance;
      const timestamp = Date.now();
      await component.setLastViewed(timestamp);

      const stored = localStorage.getItem('changebot:lastViewed:default:user-123');
      expect(stored).toBe(timestamp.toString());
      expect(global.fetch).toHaveBeenCalled();
    });

    it('continues gracefully when API fails but localStorage is updated', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: null }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();
      (global.fetch as jest.Mock).mockClear();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const component = page.rootInstance;
      const timestamp = Date.now();
      await component.setLastViewed(timestamp);

      const stored = localStorage.getItem('changebot:lastViewed:default:user-123');
      expect(stored).toBe(timestamp.toString());
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Error updating user tracking data'), expect.any(String));
    });
  });

  describe('Integration with component lifecycle', () => {
    it('calls fetchLastSeen on component load', async () => {
      // Mock updates API to return empty result
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" />',
        autoApplyChanges: true,
      });

      // Set localStorage AFTER page creation
      page.win.localStorage.setItem('changebot:lastViewed:default', '1234567890');

      // Manually call hydrateLastViewed to load from localStorage
      const component = page.rootInstance;
      await component.hydrateLastViewed();

      await page.waitForChanges();

      expect(component.scopedStore.store.state.lastViewed).toBe(1234567890);
    });

    it('uses API for user tracking when userId is provided', async () => {
      const mockTimestamp = '2024-01-01T00:00:00.000Z';

      // Mock both user tracking and updates APIs
      (global.fetch as jest.Mock).mockImplementation(url => {
        if (url.includes('/users/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'user-123', last_seen_at: mockTimestamp }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();

      const component = page.rootInstance;
      expect(component.scopedStore.store.state.lastViewed).toBe(new Date(mockTimestamp).getTime());
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('API Caching', () => {
    it('shouldSyncWithApi returns true when no cache exists', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      // Clear the cache that was created during component load
      page.win.localStorage.removeItem('changebot:lastApiSync:default:user-123');

      const component = page.rootInstance;
      const result = component.shouldSyncWithApi();

      expect(result).toBe(true);
    });

    it('shouldSyncWithApi returns false when cache is fresh (< 30 min)', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      // Set cache timestamp to 10 minutes ago
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      page.win.localStorage.setItem('changebot:lastApiSync:default:user-123', tenMinutesAgo.toString());

      const component = page.rootInstance;
      const result = component.shouldSyncWithApi();

      expect(result).toBe(false);
    });

    it('shouldSyncWithApi returns true when cache is expired (> 30 min)', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      // Set cache timestamp to 31 minutes ago
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      page.win.localStorage.setItem('changebot:lastApiSync:default:user-123', thirtyOneMinutesAgo.toString());

      const component = page.rootInstance;
      const result = component.shouldSyncWithApi();

      expect(result).toBe(true);
    });

    it('fetchLastSeen skips GET request when cache is fresh', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();

      // Set cache timestamp to 10 minutes ago and localStorage value
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      page.win.localStorage.setItem('changebot:lastApiSync:default:user-123', tenMinutesAgo.toString());
      page.win.localStorage.setItem('changebot:lastViewed:default:user-123', '1234567890');

      (global.fetch as jest.Mock).mockClear();

      const component = page.rootInstance;
      const result = component.fetchLastSeen();

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(result).toBe(1234567890);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetchLastSeen makes GET request when cache is expired', async () => {
      const mockTimestamp = '2024-01-01T00:00:00.000Z';

      (global.fetch as jest.Mock).mockImplementation(url => {
        if (url.includes('/users/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'user-123', last_seen_at: mockTimestamp }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();

      // Set cache timestamp to 31 minutes ago
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      page.win.localStorage.setItem('changebot:lastApiSync:default:user-123', thirtyOneMinutesAgo.toString());
      page.win.localStorage.setItem('changebot:lastViewed:default:user-123', '1234567890');

      (global.fetch as jest.Mock).mockClear();

      const component = page.rootInstance;
      component.fetchLastSeen();

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('syncFromApi updates lastApiSync timestamp after successful sync', async () => {
      const mockTimestamp = '2024-01-01T00:00:00.000Z';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', last_seen_at: mockTimestamp }),
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      const beforeSync = Date.now();

      const component = page.rootInstance;
      await component.syncFromApi();

      const afterSync = Date.now();

      const stored = page.win.localStorage.getItem('changebot:lastApiSync:default:user-123');
      expect(stored).toBeTruthy();

      const storedTimestamp = parseInt(stored, 10);
      expect(storedTimestamp).toBeGreaterThanOrEqual(beforeSync);
      expect(storedTimestamp).toBeLessThanOrEqual(afterSync);
    });

    it('panel opening does not trigger GET request', async () => {
      (global.fetch as jest.Mock).mockImplementation(url => {
        if (url.includes('/users/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'user-123', last_seen_at: null }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ widget: {}, publications: [] }),
        });
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: '<changebot-provider slug="test-widget" user-id="user-123" />',
        autoApplyChanges: true,
      });

      await page.waitForChanges();

      // Set fresh cache to prevent GET on page load
      page.win.localStorage.setItem('changebot:lastApiSync:default:user-123', Date.now().toString());

      (global.fetch as jest.Mock).mockClear();

      // Mock PATCH response
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const component = page.rootInstance;
      await component.markAsViewed();

      await page.waitForChanges();

      // Should have exactly 1 PATCH call, no GET calls
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });
});
