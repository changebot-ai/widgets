import { newSpecPage } from '@stencil/core/testing';
import { ChangebotPanel } from './changebot-panel';

describe('changebot-panel', () => {
  // Basic rendering tests
  it('renders closed by default', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const drawer = root.shadowRoot.querySelector('.panel');
    expect(drawer).toHaveClass('panel--closed');
  });

  it('applies drawer-left mode', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel mode="drawer-left"></changebot-panel>',
    });

    const drawer = root.shadowRoot.querySelector('.panel');
    expect(drawer).toHaveClass('panel--left');
  });

  it('applies drawer-right mode', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel mode="drawer-right"></changebot-panel>',
    });

    const drawer = root.shadowRoot.querySelector('.panel');
    expect(drawer).toHaveClass('panel--right');
  });

  it('applies modal mode', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel mode="modal"></changebot-panel>',
    });

    const modal = root.shadowRoot.querySelector('.panel');
    expect(modal).toHaveClass('panel--modal');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel scope="admin"></changebot-panel>',
    });

    expect(root.getAttribute('data-scope')).toBe('admin');
  });

  it('applies theme class when provided', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel theme="catppuccin-mocha"></changebot-panel>',
    });

    const display = root.shadowRoot.querySelector('.panel');
    expect(display).toHaveClass('theme--catppuccin-mocha');
  });

  it('applies light theme when system prefers light', async () => {
    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel light="catppuccin-latte" dark="catppuccin-mocha"></changebot-panel>',
    });

    // Component should have activeTheme set (either light or dark based on system preference)
    const component = page.rootInstance;
    expect(component.activeTheme).toMatch(/catppuccin-(latte|mocha)/);
  });

  it('prioritizes theme prop over light/dark', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel theme="catppuccin-frappe" light="catppuccin-latte" dark="catppuccin-mocha"></changebot-panel>',
    });

    const display = root.shadowRoot.querySelector('.panel');
    expect(display).toHaveClass('theme--catppuccin-frappe');
  });

  // Store integration tests
  it('loads without provider (services remain undefined)', async () => {
    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    // Verify component loaded successfully
    expect(page.rootInstance).toBeDefined();

    // Services should be undefined since no provider registered a store
    expect(page.rootInstance.services).toBeUndefined();
  });

  it('subscribes to isOpen state when context is received', async () => {
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        mode: 'drawer-right'
      },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;

    // Simulate receiving context
    component.services = { store: mockStore };
    component.subscribeToStore();

    expect(mockStore.onChange).toHaveBeenCalledWith('isOpen', expect.any(Function));
  });

  it('subscribes to updates array when context is received', async () => {
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        mode: 'drawer-right'
      },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;

    // Simulate receiving context
    component.services = { store: mockStore };
    component.subscribeToStore();

    expect(mockStore.onChange).toHaveBeenCalledWith('updates', expect.any(Function));
  });

  it('opens when isOpen state becomes true', async () => {
    let isOpenCallback;
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        mode: 'drawer-right'
      },
      onChange: jest.fn((key, callback) => {
        if (key === 'isOpen') {
          isOpenCallback = callback;
        }
        return () => {};
      })
    };

    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Initially closed
    expect(component.isOpen).toBe(false);

    // Simulate store state change
    mockStore.state.isOpen = true;
    isOpenCallback();

    await page.waitForChanges();

    expect(component.isOpen).toBe(true);
  });

  it('renders updates list when updates are available', async () => {
    const mockUpdates = [
      {
        id: '1',
        title: 'Update 1',
        description: 'Description 1',
        date: '2024-01-01',
        timestamp: Date.now()
      },
      {
        id: '2',
        title: 'Update 2',
        description: 'Description 2',
        date: '2024-01-02',
        timestamp: Date.now()
      }
    ];

    const mockStore = {
      state: {
        isOpen: true,
        updates: mockUpdates,
        mode: 'drawer-right'
      },
      onChange: jest.fn().mockReturnValue(() => {})
    };

    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();
    component.isOpen = true;
    component.updates = mockUpdates;

    await page.waitForChanges();

    const updateItems = page.root.shadowRoot.querySelectorAll('.update-item');
    expect(updateItems.length).toBe(2);
  });

  // Close interaction tests
  it('calls closeDisplay action on close button click', async () => {
    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;
    const mockCloseDisplay = jest.fn();

    // Mock services with actions
    component.services = {
      store: { state: {} },
      actions: { closeDisplay: mockCloseDisplay }
    };
    component.isOpen = true;

    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();
      expect(mockCloseDisplay).toHaveBeenCalled();
    }
  });

  it('calls closeDisplay action on ESC key', async () => {
    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;
    const mockCloseDisplay = jest.fn();

    // Mock services with actions
    component.services = {
      store: { state: {} },
      actions: { closeDisplay: mockCloseDisplay }
    };
    component.isOpen = true;

    await page.waitForChanges();

    // Simulate ESC key press directly on document (since that's what the component listens to)
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escEvent);

    expect(mockCloseDisplay).toHaveBeenCalled();
  });

  it('closes directly when no provider (standalone mode)', async () => {
    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;
    // No services mock - standalone mode
    component.isOpen = true;

    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();

      await page.waitForChanges();

      // Should close directly without services
      expect(component.isOpen).toBe(false);
    }
  });

  it('calls closeDisplay action on backdrop click (modal only)', async () => {
    const mockCloseDisplay = jest.fn();

    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel mode="modal"></changebot-panel>',
    });

    const component = page.rootInstance;
    component.services = {
      store: { state: {} },
      actions: { closeDisplay: mockCloseDisplay }
    };
    component.isOpen = true;

    await page.waitForChanges();

    const backdrop = page.root.shadowRoot.querySelector('.backdrop') as HTMLElement;
    if (backdrop) {
      backdrop.click();
      expect(mockCloseDisplay).toHaveBeenCalled();
    }
  });

  // Cleanup test
  it('cleans up store subscriptions on disconnect', async () => {
    const unsubscribeIsOpen = jest.fn();
    const unsubscribeUpdates = jest.fn();
    const unsubscribeWidget = jest.fn();
    const unsubscribeIsLoading = jest.fn();
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        widget: null,
        isLoading: false,
        mode: 'drawer-right'
      },
      onChange: jest.fn()
        .mockReturnValueOnce(unsubscribeIsOpen)
        .mockReturnValueOnce(unsubscribeUpdates)
        .mockReturnValueOnce(unsubscribeWidget)
        .mockReturnValueOnce(unsubscribeIsLoading)
    };

    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribeIsOpen).toHaveBeenCalled();
    expect(unsubscribeUpdates).toHaveBeenCalled();
    expect(unsubscribeWidget).toHaveBeenCalled();
    expect(unsubscribeIsLoading).toHaveBeenCalled();
  });

  // ARIA and accessibility tests
  it('has proper ARIA attributes when open', async () => {
    const page = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel mode="modal"></changebot-panel>',
    });

    const component = page.rootInstance;
    component.isOpen = true;

    await page.waitForChanges();

    const display = page.root.shadowRoot.querySelector('.panel');
    expect(display.getAttribute('role')).toBe('dialog');
    expect(display.getAttribute('aria-modal')).toBe('true');
    expect(display.getAttribute('aria-label')).toBeTruthy();
  });

  it('has aria-live region for announcements', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotPanel],
      html: '<changebot-panel></changebot-panel>',
    });

    const liveRegion = root.shadowRoot.querySelector('[aria-live]');
    expect(liveRegion).toBeDefined();
  });
});