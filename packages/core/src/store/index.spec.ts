import type { Mock } from 'vitest';
import { createScopedStore, getStorageKey } from './index';

describe('getStorageKey', () => {
  it('builds a scope-only key without a userId', () => {
    expect(getStorageKey('default', 'lastViewed')).toBe('changebot:lastViewed:default');
  });

  it('appends the userId when provided', () => {
    expect(getStorageKey('app', 'lastViewedBanner', 'user-1')).toBe('changebot:lastViewedBanner:app:user-1');
  });
});

describe('loadMockUpdates (publication transformation)', () => {
  it('accepts a bare array of publications and leaves the widget null', () => {
    const { store, actions } = createScopedStore();
    actions.loadMockUpdates([{ id: 1, title: 'A', published_at: '2025-01-01T00:00:00Z', tags: [] }]);

    expect(store.state.updates).toHaveLength(1);
    expect(store.state.widget).toBeNull();
    expect(store.state.isLoading).toBe(false);
    expect(store.state.error).toBeNull();
  });

  it('converts string tags to Tag objects with the default color', () => {
    const { store, actions } = createScopedStore();
    actions.loadMockUpdates({
      publications: [{ id: 1, title: 'A', published_at: '2025-01-01T00:00:00Z', tags: ['beta', { id: 7, name: 'fix', color: '#123456' }] }],
    });

    expect(store.state.updates[0].tags).toEqual([
      { id: 0, name: 'beta', color: '#667eea' },
      { id: 7, name: 'fix', color: '#123456' },
    ]);
  });

  it('normalizes a missing or non-array tags field to an empty array', () => {
    const { store, actions } = createScopedStore();
    actions.loadMockUpdates({
      publications: [
        { id: 1, title: 'No tags', published_at: '2025-01-01T00:00:00Z' },
        { id: 2, title: 'Bad tags', published_at: '2025-01-01T00:00:00Z', tags: 'nope' as any },
      ],
    });

    expect(store.state.updates[0].tags).toEqual([]);
    expect(store.state.updates[1].tags).toEqual([]);
  });

  it('ignores a payload with no publications array', () => {
    const { store, actions } = createScopedStore();
    actions.loadMockUpdates({ widget: { title: 'T' } });

    expect(store.state.updates).toEqual([]);
  });

  it('fills widget defaults: title "Updates", null subheading, empty slug, branded true', () => {
    const { store, actions } = createScopedStore();
    actions.loadMockUpdates({ widget: {}, publications: [] });

    expect(store.state.widget).toEqual({ title: 'Updates', subheading: null, slug: '', branded: true });
  });

  it('keeps branded false when the widget says so', () => {
    const { store, actions } = createScopedStore();
    actions.loadMockUpdates({ widget: { title: 'T', branded: false }, publications: [] });

    expect(store.state.widget.branded).toBe(false);
  });
});

describe('newUpdatesCount calculation', () => {
  const at = (iso: string) => new Date(iso).getTime();

  function storeWith(publications: any[]) {
    const scoped = createScopedStore();
    scoped.actions.loadMockUpdates({ publications });
    return scoped;
  }

  it('is 0 while lastViewed is null', () => {
    const { store } = storeWith([{ id: 1, title: 'A', published_at: '2025-06-01T00:00:00Z', tags: [] }]);
    expect(store.state.newUpdatesCount).toBe(0);
  });

  it('counts only updates published strictly after lastViewed', () => {
    const { store, actions } = storeWith([
      { id: 1, title: 'Older', published_at: '2025-01-01T00:00:00Z', tags: [] },
      { id: 2, title: 'Boundary', published_at: '2025-03-01T00:00:00Z', tags: [] },
      { id: 3, title: 'Newer', published_at: '2025-06-01T00:00:00Z', tags: [] },
    ]);

    actions.markViewed(at('2025-03-01T00:00:00Z'));

    // The boundary update (published_at === lastViewed) does not count
    expect(store.state.newUpdatesCount).toBe(1);
  });

  it('skips updates with missing or invalid published_at', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { store, actions } = storeWith([
        { id: 1, title: 'No date', tags: [] },
        { id: 2, title: 'Garbage date', published_at: 'not-a-date', tags: [] },
        { id: 3, title: 'Valid', published_at: '2025-06-01T00:00:00Z', tags: [] },
      ]);

      actions.markViewed(at('2025-01-01T00:00:00Z'));

      expect(store.state.newUpdatesCount).toBe(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('recalculates when updates arrive after lastViewed is set', () => {
    const { store, actions } = createScopedStore();
    actions.markViewed(at('2025-01-01T00:00:00Z'));
    expect(store.state.newUpdatesCount).toBe(0);

    actions.loadMockUpdates({ publications: [{ id: 1, title: 'A', published_at: '2025-06-01T00:00:00Z', tags: [] }] });
    expect(store.state.newUpdatesCount).toBe(1);
  });

  it('markAllViewed resets the count to 0', () => {
    const { store, actions } = storeWith([{ id: 1, title: 'A', published_at: '2025-06-01T00:00:00Z', tags: [] }]);
    actions.markViewed(at('2025-01-01T00:00:00Z'));
    expect(store.state.newUpdatesCount).toBe(1);

    actions.markAllViewed();
    expect(store.state.newUpdatesCount).toBe(0);
  });
});

describe('display actions', () => {
  it('open, close, and toggle drive isOpen', () => {
    const { store, actions } = createScopedStore();

    actions.openDisplay();
    expect(store.state.isOpen).toBe(true);

    actions.closeDisplay();
    expect(store.state.isOpen).toBe(false);

    actions.toggleDisplay();
    expect(store.state.isOpen).toBe(true);
    actions.toggleDisplay();
    expect(store.state.isOpen).toBe(false);
  });
});

describe('loadUpdates', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  function okResponse(body: unknown) {
    return {
      ok: true,
      json: async () => body,
    };
  }

  it('builds the API URL from a slug', async () => {
    fetchMock.mockResolvedValue(okResponse({ publications: [] }));
    const { actions } = createScopedStore();

    await actions.loadUpdates('my-widget');

    expect(fetchMock).toHaveBeenCalledWith('https://api.changebot.ai/v1/widgets/my-widget/updates', expect.objectContaining({ method: 'GET' }));
  });

  it('appends /updates to a baseUrl, stripping a trailing slash', async () => {
    fetchMock.mockResolvedValue(okResponse({ publications: [] }));
    const { actions } = createScopedStore();

    await actions.loadUpdates(undefined, 'http://localhost:3456/');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3456/updates', expect.anything());
  });

  it('prefers the slug when both slug and baseUrl are given', async () => {
    fetchMock.mockResolvedValue(okResponse({ publications: [] }));
    const { actions } = createScopedStore();

    await actions.loadUpdates('my-widget', 'http://localhost:3456');

    expect(fetchMock).toHaveBeenCalledWith('https://api.changebot.ai/v1/widgets/my-widget/updates', expect.anything());
  });

  it('sets an error when neither slug nor baseUrl is given', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { store, actions } = createScopedStore();

      await actions.loadUpdates();

      expect(store.state.error).toBe('Either slug or baseUrl must be provided');
      expect(store.state.isLoading).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('stores updates and widget metadata from a successful response', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        widget: { title: 'News', slug: 'news' },
        publications: [{ id: 1, title: 'A', published_at: '2025-06-01T00:00:00Z', tags: [] }],
      }),
    );
    const { store, actions } = createScopedStore();

    await actions.loadUpdates('news');

    expect(store.state.updates).toHaveLength(1);
    expect(store.state.widget.title).toBe('News');
    expect(store.state.isLoading).toBe(false);
    expect(store.state.error).toBeNull();
  });

  it('records an error on a non-ok response and stops loading', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      fetchMock.mockResolvedValue({ ok: false, statusText: 'Internal Server Error' });
      const { store, actions } = createScopedStore();

      await actions.loadUpdates('broken');

      expect(store.state.error).toBe('Failed to fetch updates: Internal Server Error');
      expect(store.state.isLoading).toBe(false);
      expect(store.state.updates).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('records an error when the network fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const { store, actions } = createScopedStore();

      await actions.loadUpdates('offline');

      expect(store.state.error).toBe('Failed to fetch');
      expect(store.state.isLoading).toBe(false);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('treats an abort as a non-error: no error state, loading stops', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' }));
    const { store, actions } = createScopedStore();

    await actions.loadUpdates('aborted');

    expect(store.state.error).toBeNull();
    expect(store.state.isLoading).toBe(false);
  });

  it('passes the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(okResponse({ publications: [] }));
    const { actions } = createScopedStore();
    const controller = new AbortController();

    await actions.loadUpdates('my-widget', undefined, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal }));
  });
});
