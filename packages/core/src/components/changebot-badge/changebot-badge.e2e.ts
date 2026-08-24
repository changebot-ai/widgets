import { expect } from '@playwright/test';
import { test } from '@stencil/playwright';
import { seedLocalStorage, waitForConnected, waitForShadow } from '../../test-utils/e2e-helpers';

const mockData = JSON.stringify({
  publications: [
    { id: 1, title: 'New Feature', content: '<p>Description</p>', display_date: '2025-01-01', published_at: '2025-01-01T00:00:00Z', tags: [] },
    { id: 2, title: 'Bug Fix', content: '<p>Description</p>', display_date: '2025-01-02', published_at: '2025-01-02T00:00:00Z', tags: [] },
  ],
  widget: { name: 'Test Widget' },
});

const emptyMockData = JSON.stringify({ publications: [], widget: { name: 'Test' } });

test.describe('changebot-badge e2e', () => {
  test('renders and displays badge correctly', async ({ page }) => {
    await page.setContent(`<changebot-badge></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const component = page.locator('changebot-badge');
    const badge = page.locator('changebot-badge .badge');

    await expect(component).toContainClass('hydrated');
    await expect(badge).toContainClass('badge--hidden');
  });

  test('applies theme prop correctly', async ({ page }) => {
    await page.setContent(`<changebot-badge theme="catppuccin-mocha"></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const badge = page.locator('changebot-badge .badge');
    await expect(badge).toContainClass('theme--catppuccin-mocha');
  });

  test('has correct initial aria-label', async ({ page }) => {
    await page.setContent(`<changebot-badge></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const badge = page.locator('changebot-badge .badge');
    expect(await badge.getAttribute('aria-label')).toBe('No new updates');
  });

  test('handles scope attribute correctly', async ({ page }) => {
    await page.setContent(`<changebot-badge scope="dashboard"></changebot-badge><changebot-provider scope="dashboard" mock-data='${emptyMockData}'></changebot-provider>`);

    const component = page.locator('changebot-badge');
    expect(await component.getAttribute('data-scope')).toBe('dashboard');
  });

  test('renders with indicator prop', async ({ page }) => {
    await page.setContent(`<changebot-badge indicator="dot"></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const component = page.locator('changebot-badge');
    expect(await component.evaluate((el: any) => el.indicator)).toBe('dot');
  });

  test('displays correct count after badge re-renders', async ({ page }) => {
    const scope = 'badge-remount';

    // A lastViewed older than both publications, so the count is 2
    await seedLocalStorage(page, { [`changebot:lastViewed:${scope}`]: String(new Date('2024-01-01T00:00:00Z').getTime()) });

    await page.setContent(`
      <div id="badge-container">
        <changebot-badge scope="${scope}"></changebot-badge>
      </div>
      <changebot-provider scope="${scope}" mock-data='${mockData}'></changebot-provider>
    `);

    await page.waitForChanges();

    // Simulate a framework re-render: remove the badge from the DOM...
    await page.evaluate(() => {
      const container = document.getElementById('badge-container');
      container.innerHTML = '';
    });
    await page.waitForChanges();

    // ...and add a fresh one back
    await page.evaluate((s: string) => {
      const container = document.getElementById('badge-container');
      const newBadge = document.createElement('changebot-badge');
      newBadge.setAttribute('scope', s);
      container.appendChild(newBadge);
    }, scope);
    await page.waitForChanges();

    // The new badge connects to the provider and shows the count
    await waitForConnected(page, 'changebot-badge');
    await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');

    const count = page.locator('changebot-badge .badge__count');
    expect(await count.innerText()).toBe('2');
  });
});