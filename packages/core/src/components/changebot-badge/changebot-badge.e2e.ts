import { newE2EPage } from '@stencil/core/testing';
import { seedLocalStorage, waitForConnected, waitForShadow } from '../../test-utils/e2e-helpers';

const mockData = JSON.stringify({
  publications: [
    { id: 1, title: 'New Feature', content: '<p>Description</p>', display_date: '2025-01-01', published_at: '2025-01-01T00:00:00Z', tags: [] },
    { id: 2, title: 'Bug Fix', content: '<p>Description</p>', display_date: '2025-01-02', published_at: '2025-01-02T00:00:00Z', tags: [] },
  ],
  widget: { name: 'Test Widget' },
});

const emptyMockData = JSON.stringify({ publications: [], widget: { name: 'Test' } });

describe('changebot-badge e2e', () => {
  it('renders and displays badge correctly', async () => {
    const page = await newE2EPage();
    await page.setContent(`<changebot-badge></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const component = await page.find('changebot-badge');
    const badge = await page.find('changebot-badge >>> .badge');

    expect(component).toHaveClass('hydrated');
    expect(badge).toHaveClass('badge--hidden');
  });

  it('applies theme prop correctly', async () => {
    const page = await newE2EPage();
    await page.setContent(`<changebot-badge theme="catppuccin-mocha"></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const badge = await page.find('changebot-badge >>> .badge');
    expect(badge).toHaveClass('theme--catppuccin-mocha');
  });

  it('has correct initial aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent(`<changebot-badge></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const badge = await page.find('changebot-badge >>> .badge');
    expect(await badge.getAttribute('aria-label')).toBe('No new updates');
  });

  it('handles scope attribute correctly', async () => {
    const page = await newE2EPage();
    await page.setContent(`<changebot-badge scope="dashboard"></changebot-badge><changebot-provider scope="dashboard" mock-data='${emptyMockData}'></changebot-provider>`);

    const component = await page.find('changebot-badge');
    expect(await component.getAttribute('data-scope')).toBe('dashboard');
  });

  it('renders with indicator prop', async () => {
    const page = await newE2EPage();
    await page.setContent(`<changebot-badge indicator="dot"></changebot-badge><changebot-provider mock-data='${emptyMockData}'></changebot-provider>`);

    const component = await page.find('changebot-badge');
    expect(await component.getProperty('indicator')).toBe('dot');
  });

  it('displays correct count after badge re-renders', async () => {
    const page = await newE2EPage();
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

    const count = await page.find('changebot-badge >>> .badge__count');
    expect(await count.innerText).toBe('2');
  });
});