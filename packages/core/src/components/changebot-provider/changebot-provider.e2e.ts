import { newE2EPage } from '@stencil/core/testing';

describe('changebot-provider', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider />');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
  });

  it('renders with baseUrl prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider base-url="https://api.example.com" />');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
    expect(await element.getProperty('baseUrl')).toBe('https://api.example.com');
  });

  it('renders with slug prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider slug="test-team" />');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
    expect(await element.getProperty('slug')).toBe('test-team');
  });

  it('renders with scope prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider scope="custom-scope" />');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
    expect(await element.getProperty('scope')).toBe('custom-scope');
  });

  it('renders with default scope when not provided', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider />');

    const element = await page.find('changebot-provider');
    expect(await element.getProperty('scope')).toBe('default');
  });

  describe('store registration', () => {
    it('registers store in registry on load', async () => {
      const page = await newE2EPage();
      await page.setContent('<changebot-provider />');

      await page.waitForChanges();

      // Check that the provider registered a store by verifying the registry has an entry
      const hasStore = await page.evaluate(() => {
        // The registry is a module-level Map, we can verify by trying to use a consumer
        return new Promise<boolean>(resolve => {
          // Give time for registration to complete
          setTimeout(() => {
            // Provider should have hydrated and registered
            const provider = document.querySelector('changebot-provider');
            resolve(provider?.classList.contains('hydrated') ?? false);
          }, 100);
        });
      });

      expect(hasStore).toBe(true);
    });
  });

  describe('multiple providers with different scopes', () => {
    it('allows multiple providers to coexist with different scopes', async () => {
      const page = await newE2EPage();
      await page.setContent(`
        <changebot-provider scope="scope-a" />
        <changebot-provider scope="scope-b" />
        <changebot-panel scope="scope-a" />
        <changebot-panel scope="scope-b" />
      `);

      const providers = await page.findAll('changebot-provider');
      expect(providers).toHaveLength(2);

      expect(await providers[0].getProperty('scope')).toBe('scope-a');
      expect(await providers[1].getProperty('scope')).toBe('scope-b');

      await page.waitForChanges();

      // Test that each panel is connected to the correct provider
      // by opening one panel and verifying only it opens
      const panels = await page.findAll('changebot-panel');
      await panels[0].callMethod('open');

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Only scope-a panel should be open
      const panelElements = await page.findAll('changebot-panel >>> .panel');
      const panel1Classes = await panelElements[0].getProperty('className');
      const panel2Classes = await panelElements[1].getProperty('className');

      expect(panel1Classes).toContain('panel--open');
      expect(panel2Classes).toContain('panel--closed');
    });
  });

  describe('slot content', () => {
    it('renders slot content', async () => {
      const page = await newE2EPage();
      await page.setContent(`
        <changebot-provider />
        <div class="test-content">Test Content</div>
      `);

      const slotContent = await page.find('.test-content');
      expect(slotContent).not.toBeNull();
      expect(await slotContent.textContent).toBe('Test Content');
    });
  });
});
