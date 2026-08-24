import { newE2EPage } from '@stencil/core/testing';
import { injectFetchMock, seedLocalStorage, waitForConnected, waitForShadow, waitForShadowGone } from '../../test-utils/e2e-helpers';

/**
 * Customer journey for the banner: a publication with
 * highlight_target "banner" arrives, the collapsed preview shows the first
 * sentence, click expands, dismiss persists to localStorage (and to the API
 * when a userId is set), and the banner does not reappear on reload.
 */

const BANNER_PUB = {
  id: 10,
  title: 'Banner Update',
  content: '<p>First sentence here. Second sentence with a lot more detail about the release.</p>',
  display_date: '2025-06-01',
  published_at: '2025-06-01T12:00:00Z',
  expires_on: null,
  highlight_target: 'banner',
  hosted_url: null,
  tags: [],
};

const bannerMock = JSON.stringify({
  widget: { title: 'Updates', slug: 'test' },
  publications: [BANNER_PUB],
});

describe('changebot-banner e2e', () => {
  it('shows collapsed, expands on click, dismisses, and stays dismissed on reload', async () => {
    // ===== Visit 1: banner appears collapsed =====
    let page = await newE2EPage();
    const scope = 'banner-journey';

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${bannerMock}' />
      <changebot-banner scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-banner');
    await waitForShadow(page, 'changebot-banner', '.banner');

    const banner = await page.find('changebot-banner >>> .banner');
    expect(await banner.getProperty('className')).not.toContain('banner--expanded');

    const title = await page.find('changebot-banner >>> .banner-title');
    expect(await title.textContent).toBe('Banner Update');

    // Collapsed preview shows only the first sentence, plus a read-more hint
    const preview = await page.find('changebot-banner >>> .banner-preview');
    const previewText = await preview.textContent;
    expect(previewText).toContain('First sentence here.');
    expect(previewText).not.toContain('Second sentence');
    expect(previewText).toContain('Click to read more');

    // ===== Click expands =====
    const main = await page.find('changebot-banner >>> .banner-main');
    await main.click();
    await waitForShadow(page, 'changebot-banner', '.banner.banner--expanded');

    const description = await page.find('changebot-banner >>> .banner-description');
    expect(await description.textContent).toContain('Second sentence with a lot more detail');

    // ===== Dismiss hides the banner and persists the timestamp =====
    const close = await page.find('changebot-banner >>> .banner-close');
    await close.click();
    await waitForShadowGone(page, 'changebot-banner', '.banner');

    const storageKey = `changebot:lastViewedBanner:${scope}`;
    const stored = await page.evaluate((key: string) => localStorage.getItem(key), storageKey);
    expect(stored).not.toBeNull();
    const dismissedAt = parseInt(stored, 10);
    expect(dismissedAt).toBeGreaterThan(new Date(BANNER_PUB.published_at).getTime());

    await page.close();

    // ===== Visit 2: same data, dismissal persisted — banner stays hidden =====
    page = await newE2EPage();
    await seedLocalStorage(page, { [storageKey]: String(dismissedAt) });

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${bannerMock}' />
      <changebot-banner scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-banner');
    await page.waitForChanges();

    const bannerAfterReload = await page.find('changebot-banner >>> .banner');
    expect(bannerAfterReload).toBeNull();

    await page.close();
  });

  it('dismiss sends last_viewed_banner_at to the API when a userId is set', async () => {
    const page = await newE2EPage();
    const scope = 'banner-userid';
    const apiBase = 'https://api.changebot.ai/v1/widgets/banner-widget';

    const mock = await injectFetchMock(page, {
      apiBase,
      updates: { widget: { title: 'Updates', slug: 'banner-widget' }, publications: [BANNER_PUB] },
      // A known user, so the provider does not send an initial last_seen_at PATCH
      user: { last_seen_at: '2025-01-01T00:00:00Z' },
    });

    await page.setContent(`
      <changebot-provider slug="banner-widget" scope="${scope}" user-id="banner-user" />
      <changebot-banner scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-banner');
    await waitForShadow(page, 'changebot-banner', '.banner');

    const close = await page.find('changebot-banner >>> .banner-close');
    await close.click();
    await waitForShadowGone(page, 'changebot-banner', '.banner');

    await mock.waitForPatch();
    const patch = await mock.getLastPatchBody();
    expect(patch.last_viewed_banner_at).toBeDefined();
    expect(new Date(patch.last_viewed_banner_at as string).getTime()).toBeGreaterThan(new Date(BANNER_PUB.published_at).getTime());

    await page.close();
  });

  it('does not show the banner when no publication targets it', async () => {
    const page = await newE2EPage();
    const scope = 'banner-none';
    const noBannerMock = JSON.stringify({
      widget: { title: 'Updates', slug: 'test' },
      publications: [{ ...BANNER_PUB, id: 11, highlight_target: null }],
    });

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${noBannerMock}' />
      <changebot-banner scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-banner');
    await page.waitForChanges();

    const banner = await page.find('changebot-banner >>> .banner');
    expect(banner).toBeNull();

    await page.close();
  });
});
