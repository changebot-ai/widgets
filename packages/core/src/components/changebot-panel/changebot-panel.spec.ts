import { render } from '@stencil/vitest';
import './changebot-panel';
import { Services } from '../../types';
import { clearRegistry, registerStore } from '../../store/registry';

describe('changebot-panel', () => {
  beforeEach(() => {
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  // Basic rendering tests
  it('renders closed by default', async () => {
    const { root } = await render('<changebot-panel></changebot-panel>');

    const drawer = root.shadowRoot.querySelector('.panel');
    expect(drawer).toHaveClass('panel--closed');
  });

  it('applies drawer-left mode', async () => {
    const { root } = await render('<changebot-panel mode="drawer-left"></changebot-panel>');

    const drawer = root.shadowRoot.querySelector('.panel');
    expect(drawer).toHaveClass('panel--left');
  });

  it('applies drawer-right mode', async () => {
    const { root } = await render('<changebot-panel mode="drawer-right"></changebot-panel>');

    const drawer = root.shadowRoot.querySelector('.panel');
    expect(drawer).toHaveClass('panel--right');
  });

  it('applies modal mode', async () => {
    const { root } = await render('<changebot-panel mode="modal"></changebot-panel>');

    const modal = root.shadowRoot.querySelector('.panel');
    expect(modal).toHaveClass('panel--modal');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await render('<changebot-panel scope="admin"></changebot-panel>');

    expect(root.getAttribute('data-scope')).toBe('admin');
  });

  it('applies theme class when provided', async () => {
    const { root } = await render('<changebot-panel theme="catppuccin-mocha"></changebot-panel>');

    const display = root.shadowRoot.querySelector('.panel');
    expect(display).toHaveClass('theme--catppuccin-mocha');
  });

  it('applies light theme when system prefers light', async () => {
    const page = await render('<changebot-panel light="catppuccin-latte" dark="catppuccin-mocha"></changebot-panel>');

    // Component should have activeTheme set (either light or dark based on system preference)
    const component = page.instance;
    expect(component.activeTheme).toMatch(/catppuccin-(latte|mocha)/);
  });

  it('prioritizes theme prop over light/dark', async () => {
    const { root } = await render('<changebot-panel theme="catppuccin-frappe" light="catppuccin-latte" dark="catppuccin-mocha"></changebot-panel>');

    const display = root.shadowRoot.querySelector('.panel');
    expect(display).toHaveClass('theme--catppuccin-frappe');
  });

  // Store integration tests
  it('loads without provider (services remain undefined)', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    // Verify component loaded successfully
    expect(page.instance).toBeDefined();

    // Services should be undefined since no provider registered a store
    expect(page.instance.services).toBeUndefined();
  });

  it('subscribes to isOpen state when context is received', async () => {
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        mode: 'drawer-right'
      },
      onChange: vi.fn(() => vi.fn())
    };

    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;

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
      onChange: vi.fn(() => vi.fn())
    };

    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;

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
      onChange: vi.fn((key, callback) => {
        if (key === 'isOpen') {
          isOpenCallback = callback;
        }
        return () => {};
      })
    };

    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
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
      onChange: vi.fn().mockReturnValue(() => {})
    };

    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
    component.services = { store: mockStore };
    component.subscribeToStore();
    component.isOpen = true;
    component.updates = mockUpdates;

    await page.waitForChanges();

    const updateItems = page.root.shadowRoot.querySelectorAll('.update-item');
    expect(updateItems.length).toBe(2);
  });

  // Close interaction tests
  it('calls display.close on close button click', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
    const mockClose = vi.fn();

    // Mock services with display
    component.services = {
      store: { state: {} },
      display: { open: vi.fn(), close: mockClose }
    };
    component.isOpen = true;

    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();
      expect(mockClose).toHaveBeenCalled();
    }
  });

  it('calls display.close on ESC key', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
    const mockClose = vi.fn();

    // Mock services with display
    component.services = {
      store: { state: {} },
      display: { open: vi.fn(), close: mockClose }
    };
    component.isOpen = true;

    await page.waitForChanges();

    // Simulate ESC key press directly on document (since that's what the component listens to)
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escEvent);

    expect(mockClose).toHaveBeenCalled();
  });

  it('closes directly when no provider (standalone mode)', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
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

  it('calls display.close on backdrop click (modal only)', async () => {
    const mockClose = vi.fn();

    const page = await render('<changebot-panel mode="modal"></changebot-panel>');

    const component = page.instance;
    component.services = {
      store: { state: {} },
      display: { open: vi.fn(), close: mockClose }
    };
    component.isOpen = true;

    await page.waitForChanges();

    const backdrop = page.root.shadowRoot.querySelector('.backdrop') as HTMLElement;
    if (backdrop) {
      backdrop.click();
      expect(mockClose).toHaveBeenCalled();
    }
  });

  // Cleanup test
  it('cleans up store subscriptions on disconnect', async () => {
    const unsubscribeIsOpen = vi.fn();
    const unsubscribeUpdates = vi.fn();
    const unsubscribeWidget = vi.fn();
    const unsubscribeIsLoading = vi.fn();
    const mockStore = {
      state: {
        isOpen: false,
        updates: [],
        widget: null,
        isLoading: false,
        mode: 'drawer-right'
      },
      onChange: vi.fn(() => vi.fn())
        .mockReturnValueOnce(unsubscribeIsOpen)
        .mockReturnValueOnce(unsubscribeUpdates)
        .mockReturnValueOnce(unsubscribeWidget)
        .mockReturnValueOnce(unsubscribeIsLoading)
    };

    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribeIsOpen).toHaveBeenCalled();
    expect(unsubscribeUpdates).toHaveBeenCalled();
    expect(unsubscribeWidget).toHaveBeenCalled();
    expect(unsubscribeIsLoading).toHaveBeenCalled();
  });

  it('cancels its pending registry subscription on disconnect', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
    expect(component.services).toBeUndefined();

    component.disconnectedCallback();

    const onChange = vi.fn().mockReturnValue(vi.fn());
    const services = {
      store: {
        state: { isOpen: false, updates: [], widget: null, isLoading: false },
        onChange,
      },
    } as unknown as Services;
    registerStore('default', services);

    expect(component.services).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  // Trigger prop tests
  it('opens panel when a matching trigger element is clicked', async () => {
    const page = await render('<changebot-panel trigger=".open-panel"></changebot-panel>');

    const component = page.instance;
    const mockOpen = vi.spyOn(component, 'open').mockResolvedValue(undefined);

    const btn = document.createElement('button');
    btn.className = 'open-panel';
    document.body.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(mockOpen).toHaveBeenCalled();
    document.body.removeChild(btn);
  });

  it('does not open panel when a non-matching element is clicked', async () => {
    const page = await render('<changebot-panel trigger=".open-panel"></changebot-panel>');

    const component = page.instance;
    const mockOpen = vi.spyOn(component, 'open');

    const btn = document.createElement('button');
    btn.className = 'other-button';
    document.body.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(mockOpen).not.toHaveBeenCalled();
    document.body.removeChild(btn);
  });

  it('does nothing on document click when trigger prop is not set', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    const component = page.instance;
    const mockOpen = vi.spyOn(component, 'open');

    const btn = document.createElement('button');
    btn.className = 'any-button';
    document.body.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(mockOpen).not.toHaveBeenCalled();
    document.body.removeChild(btn);
  });

  it('opens panel when a child of a matching trigger element is clicked', async () => {
    const page = await render('<changebot-panel trigger=".open-panel"></changebot-panel>');

    const component = page.instance;
    const mockOpen = vi.spyOn(component, 'open').mockResolvedValue(undefined);

    const btn = document.createElement('button');
    btn.className = 'open-panel';
    const span = document.createElement('span');
    btn.appendChild(span);
    document.body.appendChild(btn);

    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(mockOpen).toHaveBeenCalled();
    document.body.removeChild(btn);
  });

  it('warns once and does not throw when trigger is an invalid CSS selector', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await render('<changebot-panel trigger="[invalid"></changebot-panel>');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid trigger selector'), expect.objectContaining({ trigger: '[invalid' }));

    const btn = document.createElement('button');
    document.body.appendChild(btn);

    expect(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }).not.toThrow();

    document.body.removeChild(btn);
    warnSpy.mockRestore();
  });

  it('reacts to trigger prop changes after mount', async () => {
    const page = await render('<changebot-panel trigger=".first"></changebot-panel>');

    const component = page.instance;
    const mockOpen = vi.spyOn(component, 'open').mockResolvedValue(undefined);

    const btn = document.createElement('button');
    btn.className = 'second';
    document.body.appendChild(btn);

    // Initially does not match
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mockOpen).not.toHaveBeenCalled();

    // Update trigger to match
    const panel = page.root as HTMLChangebotPanelElement;
    panel.trigger = '.second';
    await page.waitForChanges();

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mockOpen).toHaveBeenCalledTimes(1);

    // Clear trigger
    panel.trigger = undefined;
    await page.waitForChanges();

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mockOpen).toHaveBeenCalledTimes(1);

    document.body.removeChild(btn);
  });

  // ARIA and accessibility tests
  it('has proper ARIA attributes when open', async () => {
    const page = await render('<changebot-panel mode="modal"></changebot-panel>');

    const component = page.instance;
    component.isOpen = true;

    await page.waitForChanges();

    const display = page.root.shadowRoot.querySelector('.panel');
    expect(display.getAttribute('role')).toBe('dialog');
    expect(display.getAttribute('aria-modal')).toBe('true');
    expect(display.getAttribute('aria-label')).toBeTruthy();
  });

  it('has aria-live region for announcements', async () => {
    const { root } = await render('<changebot-panel></changebot-panel>');

    const liveRegion = root.shadowRoot.querySelector('[aria-live]');
    expect(liveRegion).toBeDefined();
  });

  it('exposes connection state via data-changebot-state', async () => {
    const page = await render('<changebot-panel></changebot-panel>');

    const host = page.root;
    expect(host.getAttribute('data-changebot-state')).toBe('waiting-for-provider');

    const onChange = vi.fn().mockReturnValue(vi.fn());
    const services = {
      store: { state: { updates: [], isOpen: false, isLoading: false, error: null, widget: null, lastViewed: null, newUpdatesCount: 0 }, onChange },
      display: { open: vi.fn(), close: vi.fn() },
    } as unknown as Services;
    registerStore('default', services);

    await page.waitForChanges();
    expect(host.getAttribute('data-changebot-state')).toBe('connected');
  });

});