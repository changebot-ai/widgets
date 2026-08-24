import { newE2EPage } from '@stencil/core/testing';
import { injectFetchMock, waitForConnected, waitForPanelOpen, waitForShadow } from '../../test-utils/e2e-helpers';

/**
 * Panel content rendering: ActionText attachment conversion, relative URL
 * rewriting, tags with contrast colors, hosted_url title links, widget
 * title/subheading, the branded footer toggle, and the loading, empty, and
 * API-failure states.
 */

const richMockData = JSON.stringify({
  widget: { title: 'Release Notes', subheading: 'All the news', slug: 'rich', branded: true },
  publications: [
    {
      id: 1,
      title: 'Rich Update',
      content:
        '<action-text-attachment content-type="image/png" url="/rails/active_storage/blobs/abc.png" filename="screenshot.png"></action-text-attachment>' +
        '<p>Body with a <a href="/changelog/1">relative link</a> and an <img src="/uploads/pic.png"> image.</p>',
      display_date: '2025-03-05',
      published_at: '2025-03-05T12:00:00Z',
      expires_on: null,
      highlight_target: null,
      hosted_url: 'https://example.com/changelog/rich-update',
      tags: [
        { id: 1, name: 'Feature', color: '#000080' },
        { id: 2, name: 'Fix', color: '#ffff00' },
      ],
    },
  ],
});

describe('changebot-panel content rendering', () => {
  it('renders widget metadata, transformed content, tags, and the branded footer', async () => {
    const page = await newE2EPage();
    const scope = 'panel-rich';

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${richMockData}' />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    await page.$eval('changebot-panel', (el: any) => el.open());
    await waitForPanelOpen(page);

    // Widget title and subheading
    const title = await page.find('changebot-panel >>> .panel-title');
    expect(await title.textContent).toBe('Release Notes');
    const subheading = await page.find('changebot-panel >>> .panel-subheading');
    expect(await subheading.textContent).toBe('All the news');

    // hosted_url renders the title as an external link
    const titleLink = await page.find('changebot-panel >>> .update-title-link');
    expect(await titleLink.getAttribute('href')).toBe('https://example.com/changelog/rich-update');
    expect(await titleLink.getAttribute('target')).toBe('_blank');
    expect(await titleLink.getAttribute('rel')).toBe('noopener noreferrer');
    expect(await titleLink.textContent).toBe('Rich Update');

    // ActionText attachment converted to figure > img with rewritten src
    const figureImg = await page.find('changebot-panel >>> .update-description figure.attachment-figure img');
    expect(await figureImg.getAttribute('src')).toBe('https://app.changebot.ai/rails/active_storage/blobs/abc.png');
    expect(await figureImg.getAttribute('alt')).toBe('screenshot.png');
    const figcaption = await page.find('changebot-panel >>> .update-description figure.attachment-figure figcaption');
    expect(await figcaption.textContent).toBe('screenshot.png');

    // Relative link and image URLs rewritten to app.changebot.ai
    const bodyLink = await page.find('changebot-panel >>> .update-description p a');
    expect(await bodyLink.getAttribute('href')).toBe('https://app.changebot.ai/changelog/1');
    const bodyImg = await page.find('changebot-panel >>> .update-description p img');
    expect(await bodyImg.getAttribute('src')).toBe('https://app.changebot.ai/uploads/pic.png');

    // Tags with contrast colors: white text on navy, black text on yellow
    const tagStyles = await page.evaluate(() => {
      const tags = document.querySelector('changebot-panel').shadowRoot.querySelectorAll('.update-tag');
      return Array.from(tags).map((tag: HTMLElement) => ({
        text: tag.textContent,
        background: tag.style.backgroundColor,
        color: tag.style.color,
      }));
    });
    expect(tagStyles).toEqual([
      { text: 'Feature', background: 'rgb(0, 0, 128)', color: 'rgb(255, 255, 255)' },
      { text: 'Fix', background: 'rgb(255, 255, 0)', color: 'rgb(0, 0, 0)' },
    ]);

    // branded: true renders the footer
    const footer = await page.find('changebot-panel >>> .panel-footer');
    expect(footer).not.toBeNull();
  });

  it('hides the footer when the widget is not branded', async () => {
    const page = await newE2EPage();
    const scope = 'panel-unbranded';
    const mockData = JSON.stringify({
      widget: { title: 'Updates', slug: 'test', branded: false },
      publications: [],
    });

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${mockData}' />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    const footer = await page.find('changebot-panel >>> .panel-footer');
    expect(footer).toBeNull();
  });

  it('shows the loading state while updates are being fetched', async () => {
    const page = await newE2EPage();
    const scope = 'panel-loading';

    await injectFetchMock(page, {
      apiBase: 'https://api.changebot.ai/v1/widgets/loading-widget',
      updatesHang: true,
    });

    await page.setContent(`
      <changebot-provider slug="loading-widget" scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    await page.$eval('changebot-panel', (el: any) => el.open());
    await waitForPanelOpen(page);

    await waitForShadow(page, 'changebot-panel', '.loading-state .loading-spinner');
    const loadingText = await page.find('changebot-panel >>> .loading-state p');
    expect(await loadingText.textContent).toBe('Loading updates...');
  });

  it('shows the empty state when there are no updates', async () => {
    const page = await newE2EPage();
    const scope = 'panel-empty';
    const mockData = JSON.stringify({ widget: { title: 'Updates', slug: 'test' }, publications: [] });

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${mockData}' />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    await page.$eval('changebot-panel', (el: any) => el.open());
    await waitForPanelOpen(page);

    const emptyState = await page.find('changebot-panel >>> .empty-state');
    expect(await emptyState.textContent).toContain('No updates available');
  });

  it('handles a server error: badge stays hidden, panel opens to the empty state', async () => {
    const page = await newE2EPage();
    const scope = 'panel-api-500';

    await injectFetchMock(page, {
      apiBase: 'https://api.changebot.ai/v1/widgets/failing-widget',
      updatesStatus: 500,
    });

    await page.setContent(`
      <changebot-provider slug="failing-widget" scope="${scope}" />
      <changebot-badge scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-badge');
    await waitForConnected(page, 'changebot-panel');

    await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

    await page.$eval('changebot-panel', (el: any) => el.open());
    await waitForPanelOpen(page);
    await waitForShadow(page, 'changebot-panel', '.empty-state');

    // The widget still works: ESC closes the panel
    await page.keyboard.press('Escape');
    await waitForShadow(page, 'changebot-panel', '.panel.panel--closed:not(.panel--open)');
  });

  it('handles a network failure: badge stays hidden, panel opens to the empty state', async () => {
    const page = await newE2EPage();
    const scope = 'panel-api-down';

    await injectFetchMock(page, {
      apiBase: 'https://api.changebot.ai/v1/widgets/offline-widget',
      updatesNetworkError: true,
    });

    await page.setContent(`
      <changebot-provider slug="offline-widget" scope="${scope}" />
      <changebot-badge scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-badge');
    await waitForConnected(page, 'changebot-panel');

    await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

    await page.$eval('changebot-panel', (el: any) => el.open());
    await waitForPanelOpen(page);
    await waitForShadow(page, 'changebot-panel', '.empty-state');
  });
});
