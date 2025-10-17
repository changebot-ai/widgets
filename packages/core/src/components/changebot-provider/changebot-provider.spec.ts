import { newSpecPage } from '@stencil/core/testing';
import { ChangebotProvider } from './changebot-provider';
import { updatesStore } from '../../store';

describe('changebot-provider', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    // Reset store state before each test
    updatesStore.state.updates = [];
    updatesStore.state.isLoading = false;
    updatesStore.state.error = null;
    updatesStore.state.isOpen = false;
    updatesStore.state.newUpdatesCount = 0;
    updatesStore.state.lastViewed = null;

    // Mock fetch to prevent real network requests
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ updates: [] }),
    } as Response);
  });

  afterEach(() => {
    // Clean up any listeners
    document.removeEventListener('changebot:context-request', () => {});
    document.removeEventListener('changebot:action', () => {});
    // Restore fetch mock
    fetchMock.mockRestore();
  });

  it('renders', async () => {
    const page = await newSpecPage({
      components: [ChangebotProvider],
      html: `<changebot-provider></changebot-provider>`,
    });
    // Component has no shadow DOM and renders only a slot
    expect(page.root.tagName.toLowerCase()).toBe('changebot-provider');
  });

  it('accepts url prop', async () => {
    const page = await newSpecPage({
      components: [ChangebotProvider],
      html: `<changebot-provider url="https://api.example.com/updates"></changebot-provider>`,
    });
    expect(page.rootInstance.url).toBe('https://api.example.com/updates');
  });

  it('accepts slug prop', async () => {
    const page = await newSpecPage({
      components: [ChangebotProvider],
      html: `<changebot-provider slug="example-team"></changebot-provider>`,
    });
    expect(page.rootInstance.slug).toBe('example-team');
  });

  it('accepts scope prop with default value', async () => {
    const page = await newSpecPage({
      components: [ChangebotProvider],
      html: `<changebot-provider></changebot-provider>`,
    });
    expect(page.rootInstance.scope).toBe('default');
  });

  it('accepts custom scope prop', async () => {
    const page = await newSpecPage({
      components: [ChangebotProvider],
      html: `<changebot-provider scope="custom-scope"></changebot-provider>`,
    });
    expect(page.rootInstance.scope).toBe('custom-scope');
  });

  it('accepts pollInterval prop', async () => {
    const page = await newSpecPage({
      components: [ChangebotProvider],
      html: `<changebot-provider poll-interval="60000"></changebot-provider>`,
    });
    expect(page.rootInstance.pollInterval).toBe(60000);
  });

  describe('context request handling', () => {
    it('responds to changebot:context-request events', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      const mockCallback = jest.fn();
      const event = new CustomEvent('changebot:context-request', {
        detail: {
          callback: mockCallback,
          scope: 'default'
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      // Verify callback was called with services (scoped store, not global)
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          store: expect.objectContaining({
            state: expect.any(Object),
            onChange: expect.any(Function)
          }),
          actions: expect.objectContaining({
            loadUpdates: expect.any(Function),
            openDisplay: expect.any(Function),
            closeDisplay: expect.any(Function),
            toggleDisplay: expect.any(Function)
          }),
          config: {
            url: undefined,
            slug: undefined,
            scope: 'default',
            pollInterval: undefined
          }
        })
      );
    });

    it('only responds to matching scope in context requests', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider scope="custom-scope"></changebot-provider>`,
      });

      const mockCallback = jest.fn();
      const event = new CustomEvent('changebot:context-request', {
        detail: {
          callback: mockCallback,
          scope: 'different-scope'
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('responds to unscoped context requests when scope is default', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      const mockCallback = jest.fn();
      const event = new CustomEvent('changebot:context-request', {
        detail: {
          callback: mockCallback
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      expect(mockCallback).toHaveBeenCalled();
    });

    it('stops propagation of handled context requests', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      const propagationSpy = jest.fn();
      document.addEventListener('changebot:context-request', propagationSpy);

      const mockCallback = jest.fn();
      const event = new CustomEvent('changebot:context-request', {
        detail: {
          callback: mockCallback,
          scope: 'default'
        },
        bubbles: true,
        composed: true
      });

      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      page.root.dispatchEvent(event);
      await page.waitForChanges();

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('action handling', () => {
    it('handles changebot:action events', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      // Spy on the provider's scoped store actions
      const actionSpy = jest.spyOn((page.rootInstance as any).scopedStore.actions, 'toggleDisplay').mockImplementation(() => {});

      const event = new CustomEvent('changebot:action', {
        detail: {
          type: 'toggleDisplay',
          scope: 'default'
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      expect(actionSpy).toHaveBeenCalled();
      actionSpy.mockRestore();
    });

    it('handles action with payload', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      // Spy on the provider's scoped store actions
      const actionSpy = jest.spyOn((page.rootInstance as any).scopedStore.actions, 'markViewed').mockImplementation(() => {});
      const testTimestamp = new Date().toISOString();

      const event = new CustomEvent('changebot:action', {
        detail: {
          type: 'markViewed',
          payload: testTimestamp,
          scope: 'default'
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      expect(actionSpy).toHaveBeenCalledWith(testTimestamp);
      actionSpy.mockRestore();
    });

    it('only handles actions for matching scope', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider scope="custom-scope"></changebot-provider>`,
      });

      // Spy on the provider's scoped store actions
      const actionSpy = jest.spyOn((page.rootInstance as any).scopedStore.actions, 'toggleDisplay').mockImplementation(() => {});

      const event = new CustomEvent('changebot:action', {
        detail: {
          type: 'toggleDisplay',
          scope: 'different-scope'
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      expect(actionSpy).not.toHaveBeenCalled();
      actionSpy.mockRestore();
    });
  });

  describe('componentWillLoad lifecycle', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('loads updates on mount when slug is provided', async () => {
      await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test-team"></changebot-provider>`,
      });

      // Verify fetch was called with the correct URL
      expect(fetchMock).toHaveBeenCalledWith(
        'https://app.changebot.ai/api/v1/widgets/test-team/updates',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
    });

    it('loads updates on mount when url is provided', async () => {
      await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider url="https://api.example.com/updates"></changebot-provider>`,
      });

      // Verify fetch was called with the correct URL
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/updates',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
    });

    it('does not load updates when neither slug nor url provided', async () => {
      // Clear any previous fetch calls
      fetchMock.mockClear();

      await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      // Verify fetch was not called
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('polling functionality', () => {
    it('accepts pollInterval prop', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test-team" poll-interval="5000"></changebot-provider>`,
      });

      expect(page.rootInstance.pollInterval).toBe(5000);

      // Verify a timer was set
      expect(page.rootInstance.pollTimer).toBeDefined();

      // Clean up
      if (page.rootInstance.pollTimer) {
        clearInterval(page.rootInstance.pollTimer);
      }
    });

    it('cleans up polling on disconnect', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test-team" poll-interval="5000"></changebot-provider>`,
      });

      await page.waitForChanges();

      const timer = page.rootInstance.pollTimer;
      expect(timer).toBeDefined();

      // Disconnect the component
      page.rootInstance.disconnectedCallback();

      // Timer should be cleared
      expect(page.rootInstance.pollTimer).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('handles load errors gracefully', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      let errorResolve;
      const errorPromise = new Promise(resolve => { errorResolve = resolve; });
      fetchMock.mockImplementation(() => {
        errorResolve();
        return Promise.reject(new Error('Network error'));
      });

      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test-team"></changebot-provider>`,
      });

      await page.waitForChanges();
      await errorPromise;

      // Error is logged by the store's loadUpdates
      expect(warnSpy).toHaveBeenCalledWith(
        '⚠️ Changebot widget: Could not load updates. Widget functionality will continue to work.',
        expect.objectContaining({
          error: 'Network error',
          slug: 'test-team'
        })
      );
      warnSpy.mockRestore();
    });

    it('handles invalid action types gracefully', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider></changebot-provider>`,
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const event = new CustomEvent('changebot:action', {
        detail: {
          type: 'invalidAction',
          scope: 'default'
        },
        bubbles: true,
        composed: true
      });

      document.dispatchEvent(event);
      await page.waitForChanges();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown action type:', 'invalidAction');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('cleanup on disconnect', () => {
    it('clears timer on disconnect', async () => {
      const page = await newSpecPage({
        components: [ChangebotProvider],
        html: `<changebot-provider slug="test-team" poll-interval="5000"></changebot-provider>`,
      });

      const timer = page.rootInstance.pollTimer;
      expect(timer).toBeDefined();

      // Disconnect the component
      page.rootInstance.disconnectedCallback();

      expect(page.rootInstance.pollTimer).toBeUndefined();
    });
  });
});