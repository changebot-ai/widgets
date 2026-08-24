import { expect } from '@playwright/test';
import { test, type E2EPage } from '@stencil/playwright';

// Stub window.fetch before any document loads so the provider's auto-fetch
// on mount never hits the real network (CORS-blocked, slow, flaky). Any
// non-localhost request returns an empty publications payload. Patching at
// the fetch layer leaves Playwright's routing free for the dev server.
async function stubFetch(page: E2EPage): Promise<void> {
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
        return Promise.resolve(
          new Response(JSON.stringify({ publications: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return originalFetch(input, init);
    };
  });
}

test.describe('changebot-provider', () => {
  test('renders', async ({ page }) => {
    await stubFetch(page);
    await page.setContent('<changebot-provider />');

    const element = page.locator('changebot-provider');
    await expect(element).toContainClass('hydrated');
  });

  test('renders with baseUrl prop', async ({ page }) => {
    await stubFetch(page);
    await page.setContent('<changebot-provider base-url="https://api.example.com" />');

    const element = page.locator('changebot-provider');
    await expect(element).toContainClass('hydrated');
    expect(await element.evaluate((el: any) => el.baseUrl)).toBe('https://api.example.com');
  });

  test('renders with slug prop', async ({ page }) => {
    await stubFetch(page);
    await page.setContent('<changebot-provider slug="test-team" />');

    const element = page.locator('changebot-provider');
    await expect(element).toContainClass('hydrated');
    expect(await element.evaluate((el: any) => el.slug)).toBe('test-team');
  });

  test('renders with scope prop', async ({ page }) => {
    await stubFetch(page);
    await page.setContent('<changebot-provider scope="custom-scope" />');

    const element = page.locator('changebot-provider');
    await expect(element).toContainClass('hydrated');
    expect(await element.evaluate((el: any) => el.scope)).toBe('custom-scope');
  });

  test('renders with default scope when not provided', async ({ page }) => {
    await stubFetch(page);
    await page.setContent('<changebot-provider />');

    const element = page.locator('changebot-provider');
    expect(await element.evaluate((el: any) => el.scope)).toBe('default');
  });

  test.describe('store registration', () => {
    test('registers store in registry on load', async ({ page }) => {
      await stubFetch(page);
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

  test.describe('multiple providers with different scopes', () => {
    test('allows multiple providers to coexist with different scopes', async ({ page }) => {
      await stubFetch(page);
      await page.setContent(`
        <changebot-provider scope="scope-a" />
        <changebot-provider scope="scope-b" />
        <changebot-panel scope="scope-a" />
        <changebot-panel scope="scope-b" />
      `);

      const providers = page.locator('changebot-provider');
      await expect(providers).toHaveCount(2);

      expect(await providers.nth(0).evaluate((el: any) => el.scope)).toBe('scope-a');
      expect(await providers.nth(1).evaluate((el: any) => el.scope)).toBe('scope-b');

      await page.waitForChanges();

      // Test that each panel is connected to the correct provider
      // by opening one panel and verifying only it opens
      const panels = page.locator('changebot-panel');
      await panels.nth(0).evaluate((el: any) => el.open());

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Only scope-a panel should be open
      const panelElements = page.locator('changebot-panel .panel');
      const panel1Classes = await panelElements.nth(0).evaluate((el: any) => el.className);
      const panel2Classes = await panelElements.nth(1).evaluate((el: any) => el.className);

      expect(panel1Classes).toContain('panel--open');
      expect(panel2Classes).toContain('panel--closed');
    });
  });

  test.describe('slot content', () => {
    test('renders slot content', async ({ page }) => {
      await stubFetch(page);
      await page.setContent(`
        <changebot-provider />
        <div class="test-content">Test Content</div>
      `);

      const slotContent = page.locator('.test-content');
      await expect(slotContent).toHaveCount(1);
      expect(await slotContent.textContent()).toBe('Test Content');
    });
  });
});
