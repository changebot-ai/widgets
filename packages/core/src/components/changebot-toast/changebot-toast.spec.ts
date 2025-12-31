import { newSpecPage } from '@stencil/core/testing';
import { ChangebotToast } from './changebot-toast';

describe('changebot-toast', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders nothing when no update is visible', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    expect(root.shadowRoot.children.length).toBe(0);
  });

  it('displays toast when there is a new update', async () => {
    const mockUpdate = {
      id: 1,
      title: 'New Feature',
      content: 'Check out our new feature!',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toBeTruthy();

    const title = toast.querySelector('.toast-title');
    expect(title.textContent).toBe('New Feature');

    const content = toast.querySelector('.toast-content');
    expect(content.innerHTML).toBe('Check out our new feature!');
  });

  it('applies correct position class', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast position="top-left"></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toHaveClass('toast--top-left');
  });

  it('applies default bottom-right position', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toHaveClass('toast--bottom-right');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast scope="admin"></changebot-toast>',
    });

    expect(root.getAttribute('data-scope')).toBe('admin');
  });

  it('applies theme class when provided', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast theme="catppuccin-mocha"></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toHaveClass('theme--catppuccin-mocha');
  });

  it('hides toast when dismissed', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.toast-close') as HTMLElement;
    closeButton.click();
    await page.waitForChanges();

    expect(component.isVisible).toBe(false);
  });

  it('dismisses without error when no services available', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    // Should not throw when dismissed without services
    const closeButton = page.root.shadowRoot.querySelector('.toast-close') as HTMLElement;
    expect(() => closeButton.click()).not.toThrow();
    await page.waitForChanges();

    expect(component.isVisible).toBe(false);
  });

  it('handles keyboard navigation with Enter key', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.toast-close') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    closeButton.dispatchEvent(enterEvent);
    await page.waitForChanges();

    expect(component.isVisible).toBe(false);
  });

  it('handles keyboard navigation with Space key', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.toast-close') as HTMLElement;
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    closeButton.dispatchEvent(spaceEvent);
    await page.waitForChanges();

    expect(component.isVisible).toBe(false);
  });

  it('formats date correctly', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: '',
      display_date: '2025-10-04',
      published_at: '2025-10-04T12:00:00.000Z',
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const date = page.root.shadowRoot.querySelector('.toast-date');
    expect(date.textContent).toMatch(/Oct 4, 2025/);
  });

  it('loads without provider (services remain undefined)', async () => {
    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    // Verify component loaded successfully
    expect(page.rootInstance).toBeDefined();

    // Services should be undefined since no provider registered a store
    expect(page.rootInstance.services).toBeUndefined();
  });

  it('subscribes to store updates when context is received', async () => {
    const mockStore = {
      state: {
        updates: [
          {
            id: 1,
            title: 'Update 1',
            content: '',
            display_date: new Date().toISOString().split('T')[0],
            published_at: new Date().toISOString(),
            expires_on: null,
            highlight_target: null,
            hosted_url: null,
            tags: []
          }
        ]
      },
      onChange: jest.fn()
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;

    // Simulate receiving context
    component.services = { store: mockStore };
    component.subscribeToStore();

    expect(mockStore.onChange).toHaveBeenCalledWith('updates', expect.any(Function));
  });

  it('cleans up on disconnect', async () => {
    const unsubscribe = jest.fn();
    const mockStore = {
      state: { updates: [] },
      onChange: jest.fn().mockReturnValue(unsubscribe)
    };

    const page = await newSpecPage({
      components: [ChangebotToast],
      html: '<changebot-toast></changebot-toast>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
