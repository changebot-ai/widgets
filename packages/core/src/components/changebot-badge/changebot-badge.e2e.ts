import { newE2EPage } from '@stencil/core/testing';

const mockData = JSON.stringify({
  publications: [
    { id: '1', title: 'New Feature', body: 'Description', published_at: new Date().toISOString(), tags: [] },
    { id: '2', title: 'Bug Fix', body: 'Description', published_at: new Date().toISOString(), tags: [] },
  ],
  widget: { name: 'Test Widget' },
});

describe('changebot-badge e2e', () => {
  it('renders and displays badge correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge></changebot-badge>');

    const component = await page.find('changebot-badge');
    const badge = await page.find('changebot-badge >>> .badge');

    expect(component).toHaveClass('hydrated');
    expect(badge).toHaveClass('badge--hidden');
  });

  it('applies theme prop correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge theme="catppuccin-mocha"></changebot-badge>');

    const badge = await page.find('changebot-badge >>> .badge');
    expect(badge).toHaveClass('theme--catppuccin-mocha');
  });

  it('has correct initial aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge></changebot-badge>');

    const badge = await page.find('changebot-badge >>> .badge');
    expect(await badge.getAttribute('aria-label')).toBe('No new updates');
  });

  it('handles scope attribute correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge scope="dashboard"></changebot-badge>');

    const component = await page.find('changebot-badge');
    expect(await component.getAttribute('data-scope')).toBe('dashboard');
  });

  it('renders with showCount prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge show-count="false"></changebot-badge>');

    const component = await page.find('changebot-badge');
    expect(await component.getProperty('showCount')).toBe(false);
  });

  it.skip('displays correct count after badge re-renders', async () => {
    const page = await newE2EPage();

    // Set up provider with mock data and a badge
    await page.setContent(`
      <div id="badge-container">
        <changebot-badge></changebot-badge>
      </div>
      <changebot-provider mock-data='${mockData}'></changebot-provider>
    `);

    await page.waitForChanges();
    await new Promise(r => setTimeout(r, 50)); // Let badge start waiting for store

    // Simulate re-render: remove badge from DOM (before it connects to provider)
    await page.evaluate(() => {
      const container = document.getElementById('badge-container');
      container.innerHTML = '';
    });
    await page.waitForChanges();

    // Re-add badge to DOM (simulating framework re-render)
    await page.evaluate(() => {
      const container = document.getElementById('badge-container');
      const newBadge = document.createElement('changebot-badge');
      container.appendChild(newBadge);
    });
    await page.waitForChanges();
    await new Promise(r => setTimeout(r, 300));
    await page.waitForChanges();

    // Verify badge shows correct count after re-render
    const badge = await page.find('changebot-badge >>> .badge');
    const count = await page.find('changebot-badge >>> .badge__count');
    expect(await count.innerText).toBe('2');
    expect(badge).not.toHaveClass('badge--hidden');
  });
});