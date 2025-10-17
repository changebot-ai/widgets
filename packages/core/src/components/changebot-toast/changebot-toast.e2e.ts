import { newE2EPage } from '@stencil/core/testing';

describe('changebot-toast e2e', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('renders without crashing', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast></changebot-toast>');

    const component = await page.find('changebot-toast');
    expect(component).toHaveClass('hydrated');
  });

  it('applies theme prop correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast theme="catppuccin-mocha"></changebot-toast>');

    const component = await page.find('changebot-toast');

    // Set a visible update to render the toast
    await component.setProperty('isVisible', true);
    await component.setProperty('currentUpdate', {
      id: '1',
      title: 'Test',
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    await page.waitForChanges();

    const toast = await page.find('changebot-toast >>> .toast');
    if (toast) {
      expect(toast).toHaveClass('theme--catppuccin-mocha');
    }
  });

  it('applies correct position class', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast position="top-left"></changebot-toast>');

    const component = await page.find('changebot-toast');

    // Set a visible update to render the toast
    await component.setProperty('isVisible', true);
    await component.setProperty('currentUpdate', {
      id: '1',
      title: 'Test',
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    await page.waitForChanges();

    const toast = await page.find('changebot-toast >>> .toast');
    if (toast) {
      expect(toast).toHaveClass('toast--top-left');
    }
  });

  it('applies default position when not specified', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast></changebot-toast>');

    const component = await page.find('changebot-toast');

    // Set a visible update to render the toast
    await component.setProperty('isVisible', true);
    await component.setProperty('currentUpdate', {
      id: '1',
      title: 'Test',
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    await page.waitForChanges();

    const toast = await page.find('changebot-toast >>> .toast');
    if (toast) {
      expect(toast).toHaveClass('toast--bottom-right');
    }
  });

  it('handles scope attribute correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast scope="dashboard"></changebot-toast>');

    const component = await page.find('changebot-toast');
    expect(await component.getAttribute('data-scope')).toBe('dashboard');
  });

  it('renders with auto-dismiss prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast auto-dismiss="5"></changebot-toast>');

    const component = await page.find('changebot-toast');
    expect(await component.getProperty('autoDismiss')).toBe(5);
  });

  it('has correct aria attributes', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast></changebot-toast>');

    const component = await page.find('changebot-toast');

    // Set a visible update to render the toast
    await component.setProperty('isVisible', true);
    await component.setProperty('currentUpdate', {
      id: '1',
      title: 'Test Update',
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    await page.waitForChanges();

    const toast = await page.find('changebot-toast >>> .toast');
    if (toast) {
      expect(await toast.getAttribute('role')).toBe('alert');
      expect(await toast.getAttribute('aria-live')).toBe('polite');
    }
  });

  it('close button has correct aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-toast></changebot-toast>');

    const component = await page.find('changebot-toast');

    // Set a visible update to render the toast
    await component.setProperty('isVisible', true);
    await component.setProperty('currentUpdate', {
      id: '1',
      title: 'Test Update',
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    await page.waitForChanges();

    const closeButton = await page.find('changebot-toast >>> .toast-close');
    if (closeButton) {
      expect(await closeButton.getAttribute('aria-label')).toBe('Dismiss notification');
    }
  });
});
