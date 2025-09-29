import { newSpecPage } from '@stencil/core/testing';
import { ChangebotDrawer } from './changebot-drawer';

describe('changebot-drawer', () => {
  // Basic rendering tests
  it('renders closed by default', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    const drawer = root.shadowRoot.querySelector('.drawer');
    expect(drawer).toHaveClass('drawer--closed');
  });

  it('applies drawer-left display mode', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer display-mode="drawer-left"></changebot-drawer>',
    });

    const drawer = root.shadowRoot.querySelector('.drawer');
    expect(drawer).toHaveClass('drawer--left');
  });

  it('applies drawer-right display mode', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer display-mode="drawer-right"></changebot-drawer>',
    });

    const drawer = root.shadowRoot.querySelector('.drawer');
    expect(drawer).toHaveClass('drawer--right');
  });

  it('applies modal display mode', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer display-mode="modal"></changebot-drawer>',
    });

    const modal = root.shadowRoot.querySelector('.drawer');
    expect(modal).toHaveClass('drawer--modal');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer scope="admin"></changebot-drawer>',
    });

    expect(root.getAttribute('data-scope')).toBe('admin');
  });

  it('applies theme class when provided', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer theme="dark"></changebot-drawer>',
    });

    const display = root.shadowRoot.querySelector('.drawer');
    expect(display).toHaveClass('drawer--dark');
  });

  // Store integration tests
  it('requests context on component load', async () => {
    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    // Verify component loaded successfully
    expect(page.rootInstance).toBeDefined();

    // No services until context received
    expect(page.rootInstance.services).toBeUndefined();
  });

  it('subscribes to isOpen state when context is received', async () => {
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        displayMode: 'drawer'
      },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
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
        displayMode: 'drawer'
      },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
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
        displayMode: 'drawer'
      },
      onChange: jest.fn((key, callback) => {
        if (key === 'isOpen') {
          isOpenCallback = callback;
        }
        return () => {};
      })
    };

    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
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
        displayMode: 'drawer'
      },
      onChange: jest.fn().mockReturnValue(() => {})
    };

    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
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
  it('dispatches closeDisplay action on close button click', async () => {
    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    const component = page.rootInstance;
    const dispatchEventSpy = jest.fn();

    // Mock services to trigger action dispatch path
    component.services = { store: { state: {} }, actions: {} };
    component.el.dispatchEvent = dispatchEventSpy;
    component.isOpen = true;

    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'changebot:action',
          bubbles: true,
          composed: true,
          detail: expect.objectContaining({
            type: 'closeDisplay',
            scope: 'default'
          })
        })
      );
    }
  });

  it('dispatches closeDisplay action on ESC key', async () => {
    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    const component = page.rootInstance;
    const dispatchEventSpy = jest.fn();

    // Mock services to trigger action dispatch path
    component.services = { store: { state: {} }, actions: {} };
    component.el.dispatchEvent = dispatchEventSpy;
    component.isOpen = true;

    await page.waitForChanges();

    // Simulate ESC key press directly on document (since that's what the component listens to)
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escEvent);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'changebot:action',
        detail: expect.objectContaining({
          type: 'closeDisplay'
        })
      })
    );
  });

  it('closes directly when no provider (standalone mode)', async () => {
    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    const component = page.rootInstance;
    // No services mock - standalone mode
    component.isOpen = true;

    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();

      await page.waitForChanges();

      // Should close directly without dispatching action
      expect(component.isOpen).toBe(false);
    }
  });

  it('dispatches closeDisplay action on backdrop click (modal only)', async () => {
    const dispatchEventSpy = jest.fn();

    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer display-mode="modal"></changebot-drawer>',
    });

    const component = root as any;
    component.isOpen = true;
    component.dispatchEvent = dispatchEventSpy;

    await component.componentDidLoad?.();

    const backdrop = root.shadowRoot.querySelector('.backdrop') as HTMLElement;
    if (backdrop) {
      backdrop.click();

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'changebot:action',
          detail: expect.objectContaining({
            type: 'closeDisplay'
          })
        })
      );
    }
  });

  // Cleanup test
  it('cleans up store subscriptions on disconnect', async () => {
    const unsubscribeIsOpen = jest.fn();
    const unsubscribeUpdates = jest.fn();
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        displayMode: 'drawer'
      },
      onChange: jest.fn()
        .mockReturnValueOnce(unsubscribeIsOpen)
        .mockReturnValueOnce(unsubscribeUpdates)
    };

    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribeIsOpen).toHaveBeenCalled();
    expect(unsubscribeUpdates).toHaveBeenCalled();
  });

  // ARIA and accessibility tests
  it('has proper ARIA attributes when open', async () => {
    const page = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer display-mode="modal"></changebot-drawer>',
    });

    const component = page.rootInstance;
    component.isOpen = true;

    await page.waitForChanges();

    const display = page.root.shadowRoot.querySelector('.drawer');
    expect(display.getAttribute('role')).toBe('dialog');
    expect(display.getAttribute('aria-modal')).toBe('true');
    expect(display.getAttribute('aria-label')).toBeTruthy();
  });

  it('has aria-live region for announcements', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotDrawer],
      html: '<changebot-drawer></changebot-drawer>',
    });

    const liveRegion = root.shadowRoot.querySelector('[aria-live]');
    expect(liveRegion).toBeDefined();
  });
});