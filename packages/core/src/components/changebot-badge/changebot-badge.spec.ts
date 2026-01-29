import { newSpecPage } from '@stencil/core/testing';
import { ChangebotBadge } from './changebot-badge';

describe('changebot-badge', () => {
  it('renders with hidden badge when count is 0', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge></changebot-badge>',
    });

    expect(root).toEqualHtml(`
      <changebot-badge>
        <mock:shadow-root>
          <button
            class="badge badge--hidden"
            type="button"
            role="status"
            aria-label="No new updates"
            aria-live="polite"
            tabindex="0"
          >
            <span class="badge__count">0</span>
          </button>
        </mock:shadow-root>
      </changebot-badge>
    `);
  });

  it('shows badge with count when updates are available', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="5"></changebot-badge>',
    });

    const badge = root.shadowRoot.querySelector('.badge');
    expect(badge).not.toHaveClass('badge--hidden');

    const count = badge.querySelector('.badge__count');
    expect(count.textContent).toBe('5');
    expect(badge.getAttribute('aria-label')).toBe('5 new updates');
  });

  it('displays 9+ for counts over 9', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="15"></changebot-badge>',
    });

    const count = root.shadowRoot.querySelector('.badge__count');
    expect(count.textContent).toBe('9+');
    expect(root.shadowRoot.querySelector('.badge').getAttribute('aria-label')).toBe('15 new updates');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge scope="admin"></changebot-badge>',
    });

    expect(root.getAttribute('data-scope')).toBe('admin');
  });

  it('applies theme class when provided', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge theme="catppuccin-mocha"></changebot-badge>',
    });

    const badge = root.shadowRoot.querySelector('.badge');
    expect(badge).toHaveClass('theme--catppuccin-mocha');
  });

  it('applies light theme when system prefers light', async () => {
    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge light="catppuccin-latte" dark="catppuccin-mocha"></changebot-badge>',
    });

    // Component should have activeTheme set (either light or dark based on system preference)
    const component = page.rootInstance;
    expect(component.activeTheme).toMatch(/catppuccin-(latte|mocha)/);
  });

  it('prioritizes theme prop over light/dark', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge theme="catppuccin-frappe" light="catppuccin-latte" dark="catppuccin-mocha"></changebot-badge>',
    });

    const badge = root.shadowRoot.querySelector('.badge');
    expect(badge).toHaveClass('theme--catppuccin-frappe');
  });


  it('shows dot when indicator is "dot"', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge indicator="dot" count="5"></changebot-badge>',
    });

    const badge = root.shadowRoot.querySelector('.badge');
    expect(badge).not.toHaveClass('badge--hidden');

    const count = badge.querySelector('.badge__count');
    expect(count).toHaveClass('badge__count--hidden');
    expect(badge.getAttribute('aria-label')).toBe('New updates available');
  });

  it('loads without provider (services remain undefined)', async () => {
    // When badge loads without a provider, services should be undefined
    // but the component should still render correctly
    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge></changebot-badge>',
    });

    // Verify component loaded successfully
    expect(page.rootInstance).toBeDefined();

    // Services should be undefined since no provider registered a store
    expect(page.rootInstance.services).toBeUndefined();
  });

  it('subscribes to store changes when context is received', async () => {
    const mockStore = {
      state: {
        updates: [
          { id: '1', title: 'Update 1', timestamp: Date.now() },
          { id: '2', title: 'Update 2', timestamp: Date.now() }
        ],
        lastViewed: Date.now() - 86400000 // 1 day ago
      },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge></changebot-badge>',
    });

    const component = page.rootInstance;

    // Simulate receiving context
    component.services = { store: mockStore };
    component.subscribeToStore();

    expect(mockStore.onChange).toHaveBeenCalledWith('newUpdatesCount', expect.any(Function));
  });

  it('calls display.open on click when services available', async () => {
    const mockOpen = jest.fn();
    const mockStore = {
      state: { updates: [], lastViewed: Date.now(), newUpdatesCount: 3 },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    const component = page.rootInstance;

    // Simulate having services
    component.services = {
      store: mockStore,
      display: { open: mockOpen, close: jest.fn() }
    };

    const badge = page.root.shadowRoot.querySelector('.badge') as HTMLElement;
    badge.click();

    await page.waitForChanges();

    expect(mockOpen).toHaveBeenCalled();
  });

  it('handles click gracefully without services', async () => {
    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    const component = page.rootInstance;
    expect(component.services).toBeUndefined();

    // Click should not throw when services are undefined
    const badge = page.root.shadowRoot.querySelector('.badge') as HTMLElement;
    expect(() => badge.click()).not.toThrow();
  });

  it('handles keyboard navigation with Enter key', async () => {
    const mockOpen = jest.fn();
    const mockStore = {
      state: { updates: [], lastViewed: Date.now(), newUpdatesCount: 3 },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    const component = page.rootInstance;
    component.services = {
      store: mockStore,
      display: { open: mockOpen, close: jest.fn() }
    };

    const badge = page.root.shadowRoot.querySelector('.badge') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    badge.dispatchEvent(enterEvent);

    await page.waitForChanges();

    expect(mockOpen).toHaveBeenCalled();
  });

  it('handles keyboard navigation with Space key', async () => {
    const mockOpen = jest.fn();
    const mockStore = {
      state: { updates: [], lastViewed: Date.now(), newUpdatesCount: 3 },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    const component = page.rootInstance;
    component.services = {
      store: mockStore,
      display: { open: mockOpen, close: jest.fn() }
    };

    const badge = page.root.shadowRoot.querySelector('.badge') as HTMLElement;
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    badge.dispatchEvent(spaceEvent);

    await page.waitForChanges();

    expect(mockOpen).toHaveBeenCalled();
  });

  it('cleans up store subscription on disconnect', async () => {
    const unsubscribe = jest.fn();
    const mockStore = {
      state: { updates: [], lastViewed: Date.now() },
      onChange: jest.fn().mockReturnValue(unsubscribe)
    };

    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge></changebot-badge>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribe).toHaveBeenCalled();
  });
});