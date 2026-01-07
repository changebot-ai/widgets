import { newSpecPage } from '@stencil/core/testing';
import { ChangebotBanner } from './changebot-banner';

describe('changebot-banner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders nothing when no update is visible', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    expect(root.shadowRoot.children.length).toBe(0);
  });

  it('displays banner when there is a new update', async () => {
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
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const banner = page.root.shadowRoot.querySelector('.banner');
    expect(banner).toBeTruthy();

    const title = banner.querySelector('.banner-title');
    expect(title.textContent).toBe('New Feature');

    const content = banner.querySelector('.banner-content');
    expect(content.textContent).toContain('Check out our new feature!');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner scope="admin"></changebot-banner>',
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
      components: [ChangebotBanner],
      html: '<changebot-banner theme="catppuccin-mocha"></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const banner = page.root.shadowRoot.querySelector('.banner');
    expect(banner).toHaveClass('theme--catppuccin-mocha');
  });

  it('starts collapsed by default', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: 'This is a long update with multiple sentences. Here is more content.',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    expect(component.isExpanded).toBe(false);
    const banner = page.root.shadowRoot.querySelector('.banner');
    expect(banner).not.toHaveClass('banner--expanded');
  });

  it('expands when clicked', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: 'This is a long update with multiple sentences. Here is more content.',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const bannerMain = page.root.shadowRoot.querySelector('.banner-main') as HTMLElement;
    bannerMain.click();
    await page.waitForChanges();

    expect(component.isExpanded).toBe(true);
    const banner = page.root.shadowRoot.querySelector('.banner');
    expect(banner).toHaveClass('banner--expanded');
  });

  it('shows preview when collapsed', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: 'This is the first sentence. This is the second sentence.',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    component.isExpanded = false;
    await page.waitForChanges();

    const preview = page.root.shadowRoot.querySelector('.banner-preview');
    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain('This is the first sentence.');
    expect(preview.textContent).toContain('Click to read more');
  });

  it('shows full content when expanded', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: 'This is the first sentence. This is the second sentence.',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    component.isExpanded = true;
    await page.waitForChanges();

    const description = page.root.shadowRoot.querySelector('.banner-description');
    expect(description).toBeTruthy();
    expect(description.innerHTML).toBe('This is the first sentence. This is the second sentence.');
  });

  it('hides banner when dismissed', async () => {
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
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const closeButton = page.root.shadowRoot.querySelector('.banner-close') as HTMLElement;
    closeButton.click();
    await page.waitForChanges();

    // Should start dismissing animation
    expect(component.isDismissing).toBe(true);
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
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    // Should not throw when dismissed without services
    const closeButton = page.root.shadowRoot.querySelector('.banner-close') as HTMLElement;
    expect(() => closeButton.click()).not.toThrow();
    await page.waitForChanges();

    expect(component.isDismissing).toBe(true);
  });

  it('handles keyboard navigation with Enter key', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: 'This is a long update with multiple sentences. Here is more content.',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const bannerMain = page.root.shadowRoot.querySelector('.banner-main') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    bannerMain.dispatchEvent(enterEvent);
    await page.waitForChanges();

    expect(component.isExpanded).toBe(true);
  });

  it('handles keyboard navigation with Space key', async () => {
    const mockUpdate = {
      id: 1,
      title: 'Update',
      content: 'This is a long update with multiple sentences. Here is more content.',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const bannerMain = page.root.shadowRoot.querySelector('.banner-main') as HTMLElement;
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    bannerMain.dispatchEvent(spaceEvent);
    await page.waitForChanges();

    expect(component.isExpanded).toBe(true);
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
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const date = page.root.shadowRoot.querySelector('.banner-date');
    expect(date.textContent).toMatch(/Oct 4, 2025/);
  });

  it('loads without provider (services remain undefined)', async () => {
    const page = await newSpecPage({
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
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
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
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
      components: [ChangebotBanner],
      html: '<changebot-banner></changebot-banner>',
    });

    const component = page.rootInstance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribe).toHaveBeenCalled();
  });

  describe('preview mode', () => {
    it('shows banner immediately with preview prop', async () => {
      const page = await newSpecPage({
        components: [ChangebotBanner],
        html: '<changebot-banner preview="true"></changebot-banner>',
      });

      const component = page.rootInstance;

      // Should be visible immediately
      expect(component.isVisible).toBe(true);
      expect(component.currentUpdate).toBeDefined();

      const banner = page.root.shadowRoot.querySelector('.banner');
      expect(banner).toBeTruthy();
    });

    it('displays preview content', async () => {
      const page = await newSpecPage({
        components: [ChangebotBanner],
        html: '<changebot-banner preview="true"></changebot-banner>',
      });

      const banner = page.root.shadowRoot.querySelector('.banner');
      const title = banner.querySelector('.banner-title');

      expect(title.textContent).toContain('Preview');
    });

    it('does not require a provider in preview mode', async () => {
      const page = await newSpecPage({
        components: [ChangebotBanner],
        html: '<changebot-banner preview="true"></changebot-banner>',
      });

      const component = page.rootInstance;

      // Services should be undefined (no provider)
      expect(component.services).toBeUndefined();

      // But banner should still be visible
      expect(component.isVisible).toBe(true);
    });

    it('respects theme prop in preview mode', async () => {
      const page = await newSpecPage({
        components: [ChangebotBanner],
        html: '<changebot-banner preview="true" theme="nord"></changebot-banner>',
      });

      const banner = page.root.shadowRoot.querySelector('.banner');
      expect(banner).toHaveClass('theme--nord');
    });

    it('can expand in preview mode', async () => {
      const page = await newSpecPage({
        components: [ChangebotBanner],
        html: '<changebot-banner preview="true"></changebot-banner>',
      });

      const component = page.rootInstance;
      expect(component.isExpanded).toBe(false);

      const bannerMain = page.root.shadowRoot.querySelector('.banner-main') as HTMLElement;
      bannerMain.click();
      await page.waitForChanges();

      expect(component.isExpanded).toBe(true);
    });

    it('dismisses without calling services in preview mode', async () => {
      const page = await newSpecPage({
        components: [ChangebotBanner],
        html: '<changebot-banner preview="true"></changebot-banner>',
      });

      const component = page.rootInstance;

      // Mock services to verify they're not called
      const mockMarkBannerViewed = jest.fn();
      component.services = {
        highlight: { markBannerViewed: mockMarkBannerViewed }
      };

      const closeButton = page.root.shadowRoot.querySelector('.banner-close') as HTMLElement;
      closeButton.click();
      await page.waitForChanges();

      // Should not call markBannerViewed in preview mode
      expect(mockMarkBannerViewed).not.toHaveBeenCalled();
      expect(component.isDismissing).toBe(true);
    });
  });
});
