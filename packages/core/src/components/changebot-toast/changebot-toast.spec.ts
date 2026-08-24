import { render } from '@stencil/vitest';
import './changebot-toast';
import { Services } from '../../types';
import { clearRegistry, registerStore } from '../../store/registry';

describe('changebot-toast', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  it('renders nothing when no update is visible', async () => {
    const { root } = await render('<changebot-toast></changebot-toast>');

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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
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

  it('replaces images and figures with line breaks to preserve spacing', async () => {
    const mockUpdate = {
      id: 1,
      title: 'New Feature',
      content: '<p>First</p><img src="a.png" alt="a"><p>Second</p><figure><img src="b.png"><figcaption>cap</figcaption></figure><p>Third</p>',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const content = page.root.shadowRoot.querySelector('.toast-content');
    expect(content.innerHTML).toBe('<p>First</p><br><p>Second</p><br><p>Third</p>');
    expect(content.querySelector('img')).toBeNull();
    expect(content.querySelector('figure')).toBeNull();
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

    const page = await render('<changebot-toast position="top-left"></changebot-toast>');

    const component = page.instance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toHaveClass('toast--top-left');
  });

  it('applies center position class', async () => {
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

    const page = await render('<changebot-toast position="center"></changebot-toast>');

    const component = page.instance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toHaveClass('toast--center');
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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const toast = page.root.shadowRoot.querySelector('.toast');
    expect(toast).toHaveClass('toast--bottom-right');
  });

  it('applies custom scope attribute', async () => {
    const { root } = await render('<changebot-toast scope="admin"></changebot-toast>');

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

    const page = await render('<changebot-toast theme="catppuccin-mocha"></changebot-toast>');

    const component = page.instance;
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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
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

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
    component.currentUpdate = mockUpdate;
    component.isVisible = true;
    await page.waitForChanges();

    const date = page.root.shadowRoot.querySelector('.toast-date');
    expect(date.textContent).toMatch(/Oct 4, 2025/);
  });

  it('loads without provider (services remain undefined)', async () => {
    const page = await render('<changebot-toast></changebot-toast>');

    // Verify component loaded successfully
    expect(page.instance).toBeDefined();

    // Services should be undefined since no provider registered a store
    expect(page.instance.services).toBeUndefined();
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
      onChange: vi.fn(() => vi.fn())
    };

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;

    // Simulate receiving context
    component.services = { store: mockStore };
    component.subscribeToStore();

    expect(mockStore.onChange).toHaveBeenCalledWith('updates', expect.any(Function));
  });

  it('cleans up on disconnect', async () => {
    const unsubscribe = vi.fn();
    const mockStore = {
      state: { updates: [] },
      onChange: vi.fn().mockReturnValue(unsubscribe)
    };

    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
    component.services = { store: mockStore };
    component.subscribeToStore();

    // Disconnect the component
    component.disconnectedCallback();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('cancels its pending registry subscription on disconnect', async () => {
    const page = await render('<changebot-toast></changebot-toast>');

    const component = page.instance;
    expect(component.services).toBeUndefined();

    component.disconnectedCallback();

    const onChange = vi.fn().mockReturnValue(vi.fn());
    const services = {
      store: { state: { updates: [] }, onChange },
    } as unknown as Services;
    registerStore('default', services);

    expect(component.services).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes connection state via data-changebot-state', async () => {
    const page = await render('<changebot-toast></changebot-toast>');

    const host = page.root;
    expect(host.getAttribute('data-changebot-state')).toBe('waiting-for-provider');

    const onChange = vi.fn().mockReturnValue(vi.fn());
    const services = {
      store: { state: { updates: [] }, onChange },
    } as unknown as Services;
    registerStore('default', services);

    await page.waitForChanges();
    expect(host.getAttribute('data-changebot-state')).toBe('connected');
  });

  describe('confetti', () => {
    const confettiUpdate = {
      id: 1,
      title: 'Celebration',
      content: '',
      display_date: new Date().toISOString().split('T')[0],
      published_at: new Date().toISOString(),
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: []
    };

    const makeFakeConfetti = () => {
      const fire = vi.fn().mockReturnValue(Promise.resolve());
      const fn: any = vi.fn();
      fn.create = vi.fn().mockReturnValue(fire);
      return { fn, fire };
    };

    it('fires confetti when becoming visible with confetti=true and position=center', async () => {
      const { fn, fire } = makeFakeConfetti();
      const page = await render('<changebot-toast position="center" confetti="true"></changebot-toast>');

      const component = page.instance;
      (component as any).confettiFn = fn;
      component.currentUpdate = confettiUpdate;
      component.isVisible = true;
      await page.waitForChanges();

      expect(fn.create).toHaveBeenCalled();
      expect(fire).toHaveBeenCalled();
    });

    it('fires confetti for non-center positions', async () => {
      const { fn, fire } = makeFakeConfetti();
      const page = await render('<changebot-toast position="bottom-right" confetti="true"></changebot-toast>');

      const component = page.instance;
      (component as any).confettiFn = fn;
      component.currentUpdate = confettiUpdate;
      component.isVisible = true;
      await page.waitForChanges();

      expect(fn.create).toHaveBeenCalled();
      expect(fire).toHaveBeenCalled();
    });

    it('does not fire confetti when confetti prop is false', async () => {
      const { fn, fire } = makeFakeConfetti();
      const page = await render('<changebot-toast position="center"></changebot-toast>');

      const component = page.instance;
      (component as any).confettiFn = fn;
      component.currentUpdate = confettiUpdate;
      component.isVisible = true;
      await page.waitForChanges();

      expect(fn.create).not.toHaveBeenCalled();
      expect(fire).not.toHaveBeenCalled();
    });

    it('removes confetti canvas on dismiss', async () => {
      const page = await render('<changebot-toast position="center" confetti="true"></changebot-toast>');

      const component = page.instance;
      const fakeCanvas = document.createElement('canvas');
      document.body.appendChild(fakeCanvas);
      (component as any).confettiCanvas = fakeCanvas;
      component.currentUpdate = confettiUpdate;
      component.isVisible = true;
      await page.waitForChanges();

      const closeButton = page.root.shadowRoot.querySelector('.toast-close') as HTMLElement;
      closeButton.click();
      await page.waitForChanges();

      expect(document.body.contains(fakeCanvas)).toBe(false);
    });
  });
});
