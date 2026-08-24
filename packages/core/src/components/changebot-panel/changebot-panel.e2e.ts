import { expect } from '@playwright/test';
import { test, type E2EPage } from '@stencil/playwright';
import { waitForConnected, waitForPanelOpen, waitForPanelClosed } from '../../test-utils/e2e-helpers';

const emptyMockData = JSON.stringify({ publications: [], widget: { name: 'Test' } });

/** Class list of the element focused inside the panel's shadow root. */
function shadowFocusClasses(page: E2EPage): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.querySelector('changebot-panel').shadowRoot.activeElement;
    return active ? active.className : null;
  });
}

test.describe('changebot-panel e2e', () => {
  test('renders', async ({ page }) => {
    await page.setContent(`<changebot-panel></changebot-panel><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const element = page.locator('changebot-panel');
    await expect(element).toContainClass('hydrated');
  });

  test('renders with drawer-right class by default', async ({ page }) => {
    await page.setContent(`<changebot-panel></changebot-panel><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const drawer = page.locator('changebot-panel .panel');
    const className = await drawer.evaluate((el: any) => el.className);

    expect(className).toContain('panel--right');
    expect(className).toContain('panel--closed');
  });

  test('renders with drawer-left class when specified', async ({ page }) => {
    await page.setContent(`<changebot-panel mode="drawer-left"></changebot-panel><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const drawer = page.locator('changebot-panel .panel');
    const className = await drawer.evaluate((el: any) => el.className);

    expect(className).toContain('panel--left');
  });

  test('renders with modal class when specified', async ({ page }) => {
    await page.setContent(`<changebot-panel mode="modal"></changebot-panel><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const drawer = page.locator('changebot-panel .panel');
    const className = await drawer.evaluate((el: any) => el.className);

    expect(className).toContain('panel--modal');
  });

  test('shows close button', async ({ page }) => {
    await page.setContent(`<changebot-panel></changebot-panel><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const closeButton = page.locator('changebot-panel .close-button');
    await expect(closeButton).toHaveCount(1);
  });

  test.describe('focus behavior', () => {
    test('moves focus into the panel when opened', async ({ page }) => {
      const scope = 'panel-focus-open';

      await page.setContent(`
        <changebot-provider scope="${scope}" mock-data='${emptyMockData}' />
        <changebot-panel scope="${scope}" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      await page.$eval('changebot-panel', (el: any) => el.open());
      await waitForPanelOpen(page);

      // Focus moves to the first focusable element (the close button) shortly
      // after the panel opens
      await page.waitForFunction(
        () => document.querySelector('changebot-panel').shadowRoot.activeElement?.classList.contains('close-button'),
        { timeout: 5000, polling: 50 },
      );
      expect(await shadowFocusClasses(page)).toContain('close-button');
    });

    test('traps Tab and Shift+Tab inside a modal panel', async ({ page }) => {
      const scope = 'panel-focus-trap';

      // With no updates, the focusable elements are exactly the close button
      // (first) and the powered-by footer link (last).
      await page.setContent(`
        <changebot-provider scope="${scope}" mock-data='${emptyMockData}' />
        <changebot-panel scope="${scope}" mode="modal" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      await page.$eval('changebot-panel', (el: any) => el.open());
      await waitForPanelOpen(page);
      await page.waitForFunction(
        () => document.querySelector('changebot-panel').shadowRoot.activeElement?.classList.contains('close-button'),
        { timeout: 5000, polling: 50 },
      );

      // Tab from the first element moves to the last (normal tab order)
      await page.keyboard.press('Tab');
      await page.waitForChanges();
      expect(await shadowFocusClasses(page)).toContain('powered-by-link');

      // Tab from the last element wraps to the first
      await page.keyboard.press('Tab');
      await page.waitForChanges();
      expect(await shadowFocusClasses(page)).toContain('close-button');

      // Shift+Tab from the first element wraps to the last
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      await page.waitForChanges();
      expect(await shadowFocusClasses(page)).toContain('powered-by-link');
    });
  });

  test.describe('trigger prop', () => {
    test('opens the panel when a trigger element is clicked', async ({ page }) => {
      const scope = 'panel-trigger';

      await page.setContent(`
        <button class="open-updates">What's new?</button>
        <changebot-provider scope="${scope}" mock-data='${emptyMockData}' />
        <changebot-panel scope="${scope}" trigger=".open-updates" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      await page.click('.open-updates');
      await waitForPanelOpen(page);
    });

    test('works for trigger elements added after mount', async ({ page }) => {
      const scope = 'panel-trigger-dynamic';

      await page.setContent(`
        <changebot-provider scope="${scope}" mock-data='${emptyMockData}' />
        <changebot-panel scope="${scope}" trigger=".open-updates" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      await page.evaluate(() => {
        const button = document.createElement('button');
        button.className = 'open-updates';
        button.textContent = 'Added later';
        document.body.appendChild(button);
      });
      await page.waitForChanges();

      await page.click('.open-updates');
      await waitForPanelOpen(page);
    });

    test('ignores clicks outside the trigger selector', async ({ page }) => {
      const scope = 'panel-trigger-miss';

      await page.setContent(`
        <button class="unrelated">Not a trigger</button>
        <changebot-provider scope="${scope}" mock-data='${emptyMockData}' />
        <changebot-panel scope="${scope}" trigger=".open-updates" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      await page.click('.unrelated');
      await page.waitForChanges();
      await waitForPanelClosed(page);
    });
  });
});