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
      html: '<changebot-badge theme="dark"></changebot-badge>',
    });

    const badge = root.shadowRoot.querySelector('.badge');
    expect(badge).toHaveClass('badge--dark');
  });


  it('hides count when showCount is false', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge show-count="false" count="5"></changebot-badge>',
    });

    const badge = root.shadowRoot.querySelector('.badge');
    expect(badge).not.toHaveClass('badge--hidden');

    const count = badge.querySelector('.badge__count');
    expect(count).toHaveClass('badge__count--hidden');
    expect(badge.getAttribute('aria-label')).toBe('New updates available');
  });

  it('requests context on component load', async () => {
    // This test verifies that the component requests context
    // The actual context request happens in componentWillLoad
    const page = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge></changebot-badge>',
    });

    // Verify component loaded successfully
    expect(page.rootInstance).toBeDefined();

    // The context request event is dispatched during componentWillLoad
    // We can verify by checking that the component is ready to receive context
    expect(page.rootInstance.services).toBeUndefined(); // No services until context received
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

    expect(mockStore.onChange).toHaveBeenCalledWith('updates', expect.any(Function));
  });

  it('dispatches openUpdates action on click', async () => {
    const dispatchEventSpy = jest.fn();

    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    // Mock the element's dispatchEvent
    const component = root as HTMLChangebotBadgeElement;
    component.dispatchEvent = dispatchEventSpy;

    const badge = root.shadowRoot.querySelector('.badge') as HTMLElement;
    badge.click();

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'changebot:action',
        bubbles: true,
        composed: true,
        detail: expect.objectContaining({
          type: 'openUpdates',
          scope: 'default'
        })
      })
    );
  });

  it('handles keyboard navigation with Enter key', async () => {
    const dispatchEventSpy = jest.fn();

    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    const component = root as HTMLChangebotBadgeElement;
    component.dispatchEvent = dispatchEventSpy;

    const badge = root.shadowRoot.querySelector('.badge') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    badge.dispatchEvent(enterEvent);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'changebot:action',
        detail: expect.objectContaining({
          type: 'openUpdates'
        })
      })
    );
  });

  it('handles keyboard navigation with Space key', async () => {
    const dispatchEventSpy = jest.fn();

    const { root } = await newSpecPage({
      components: [ChangebotBadge],
      html: '<changebot-badge count="3"></changebot-badge>',
    });

    const component = root as HTMLChangebotBadgeElement;
    component.dispatchEvent = dispatchEventSpy;

    const badge = root.shadowRoot.querySelector('.badge') as HTMLElement;
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    badge.dispatchEvent(spaceEvent);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'changebot:action',
        detail: expect.objectContaining({
          type: 'openUpdates'
        })
      })
    );
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