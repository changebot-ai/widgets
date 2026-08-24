import type { MockInstance, Mock } from 'vitest';
import { createAPI, ChangebotAPI } from './api';

describe('api', () => {
  let fetchMock: Mock;
  let warnSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete (global as any).fetch;
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function okResponse(body: unknown) {
    return { ok: true, json: async () => body };
  }

  describe('base URL resolution', () => {
    it('builds the standard API URL from a slug', async () => {
      fetchMock.mockResolvedValue(okResponse([]));
      const api = new ChangebotAPI('my-widget');

      await api.fetchUpdates();

      expect(fetchMock).toHaveBeenCalledWith('https://api.changebot.ai/v1/widgets/my-widget/updates', expect.anything());
    });

    it('uses an http(s) URL as-is', async () => {
      fetchMock.mockResolvedValue(okResponse([]));
      const api = new ChangebotAPI('http://localhost:3456');

      await api.fetchUpdates();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3456/updates', expect.anything());
    });
  });

  describe('fetchUpdates', () => {
    it('returns the parsed body on success', async () => {
      const updates = [{ id: 1, title: 'A' }];
      fetchMock.mockResolvedValue(okResponse(updates));
      const api = new ChangebotAPI('my-widget');

      expect(await api.fetchUpdates()).toEqual(updates);
    });

    it('returns null and warns on a non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
      const api = new ChangebotAPI('my-widget');

      expect(await api.fetchUpdates()).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns null and warns when the network fails', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const api = new ChangebotAPI('my-widget');

      expect(await api.fetchUpdates()).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('fetchUserTracking', () => {
    it('URL-encodes the userId', async () => {
      fetchMock.mockResolvedValue(okResponse({ id: 'user/1', last_seen_at: null }));
      const api = new ChangebotAPI('my-widget');

      await api.fetchUserTracking('user/1@example');

      expect(fetchMock).toHaveBeenCalledWith('https://api.changebot.ai/v1/widgets/my-widget/users/user%2F1%40example', expect.anything());
    });

    it('returns null on a non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
      const api = new ChangebotAPI('my-widget');

      expect(await api.fetchUserTracking('u')).toBeNull();
    });
  });

  describe('updateUserTracking', () => {
    it('sends timestamps as ISO strings in the PATCH body', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true }));
      const api = new ChangebotAPI('my-widget');
      const t = new Date('2025-06-01T12:00:00Z').getTime();

      const result = await api.updateUserTracking('u', { lastViewed: t, lastViewedBanner: t, lastViewedToast: t });

      expect(result).toBe(true);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.changebot.ai/v1/widgets/my-widget/users/u');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({
        last_seen_at: '2025-06-01T12:00:00.000Z',
        last_viewed_banner_at: '2025-06-01T12:00:00.000Z',
        last_viewed_toast_at: '2025-06-01T12:00:00.000Z',
      });
    });

    it('includes custom user data when provided', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true }));
      const api = new ChangebotAPI('my-widget');

      await api.updateUserTracking('u', { lastViewed: Date.now() }, { plan: 'pro' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.data).toEqual({ plan: 'pro' });
    });

    it.each([
      ['lastViewed', { lastViewed: NaN }],
      ['lastViewedBanner', { lastViewedBanner: NaN }],
      ['lastViewedToast', { lastViewedToast: NaN }],
    ])('rejects a NaN %s timestamp without calling the API', async (_name, timestamps) => {
      const api = new ChangebotAPI('my-widget');

      expect(await api.updateUserTracking('u', timestamps)).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns false on a non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
      const api = new ChangebotAPI('my-widget');

      expect(await api.updateUserTracking('u', { lastViewed: Date.now() })).toBe(false);
    });

    it('returns false when the network fails', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const api = new ChangebotAPI('my-widget');

      expect(await api.updateUserTracking('u', { lastViewed: Date.now() })).toBe(false);
    });
  });

  describe('createAPI', () => {
    it('returns a working API when a slug or URL is given', async () => {
      fetchMock.mockResolvedValue(okResponse([]));

      expect(await createAPI('my-widget').fetchUpdates()).toEqual([]);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('falls back to a NullAPI that warns and returns nothing', async () => {
      const api = createAPI();

      expect(await api.fetchUpdates()).toBeNull();
      expect(await api.fetchUserTracking('u')).toBeNull();
      expect(await api.updateUserTracking('u', { lastViewed: Date.now() })).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(3);
    });
  });
});
