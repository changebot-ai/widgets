import { newE2EPage, E2EPage } from '@stencil/core/testing';
import { seedLocalStorage, waitForConnected, waitForShadow, waitForShadowGone } from '../../test-utils/e2e-helpers';

/**
 * The toast is driven entirely through provider data: a publication with
 * highlight_target "toast" makes it appear, dismissing persists
 * lastViewedToast, and the dismissal is independent of the badge's
 * lastViewed timestamp.
 */

const TOAST_PUB = {
  id: 20,
  title: 'Toast Update',
  content: '<p>A short announcement.</p>',
  display_date: '2025-06-01',
  published_at: '2025-06-01T12:00:00Z',
  expires_on: null,
  highlight_target: 'toast',
  hosted_url: null,
  tags: [],
};

const toastMock = JSON.stringify({
  widget: { title: 'Updates', slug: 'test' },
  publications: [TOAST_PUB],
});

/**
 * Clicks the dismiss button through the DOM. The toast positions itself with
 * fixed coordinates computed after layout, so a real mouse click can race the
 * geometry and fail with "not clickable"; dismissal doesn't depend on it.
 */
async function dismissToast(page: E2EPage) {
  await page.evaluate(() => {
    const button = document.querySelector('changebot-toast').shadowRoot.querySelector('.toast-close') as HTMLElement;
    button.click();
  });
}

async function loadToastPage(page: E2EPage, scope: string, toastAttrs: string = '') {
  await page.setContent(`
    <changebot-provider scope="${scope}" mock-data='${toastMock}' />
    <changebot-toast scope="${scope}" ${toastAttrs} />
  `);
  await page.waitForChanges();
  await waitForConnected(page, 'changebot-toast');
}

describe('changebot-toast e2e', () => {
  it('shows for a toast-targeted publication, dismisses, and stays dismissed on reload', async () => {
    // ===== Visit 1: toast appears =====
    let page = await newE2EPage();
    const scope = 'toast-journey';

    await loadToastPage(page, scope);
    await waitForShadow(page, 'changebot-toast', '.toast');

    const title = await page.find('changebot-toast >>> .toast-title');
    expect(await title.textContent).toBe('Toast Update');

    const content = await page.find('changebot-toast >>> .toast-content');
    expect(await content.textContent).toContain('A short announcement.');

    // ===== Dismiss hides the toast and persists the timestamp =====
    await dismissToast(page);
    await waitForShadowGone(page, 'changebot-toast', '.toast');

    const storageKey = `changebot:lastViewedToast:${scope}`;
    const stored = await page.evaluate((key: string) => localStorage.getItem(key), storageKey);
    expect(stored).not.toBeNull();
    const dismissedAt = parseInt(stored, 10);
    expect(dismissedAt).toBeGreaterThan(new Date(TOAST_PUB.published_at).getTime());

    await page.close();

    // ===== Visit 2: dismissal persisted — toast stays hidden =====
    page = await newE2EPage();
    await seedLocalStorage(page, { [storageKey]: String(dismissedAt) });

    await loadToastPage(page, scope);
    await page.waitForChanges();

    const toastAfterReload = await page.find('changebot-toast >>> .toast');
    expect(toastAfterReload).toBeNull();

    await page.close();
  });

  it('dismissing the toast does not touch the badge lastViewed', async () => {
    const page = await newE2EPage();
    const scope = 'toast-independent';
    const oldLastViewed = new Date('2024-01-01T00:00:00Z').getTime();

    // The badge counts the toast publication too — it's newer than the
    // seeded lastViewed.
    await seedLocalStorage(page, { [`changebot:lastViewed:${scope}`]: String(oldLastViewed) });
    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${toastMock}' />
      <changebot-toast scope="${scope}" />
      <changebot-badge scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-toast');
    await waitForConnected(page, 'changebot-badge');
    await waitForShadow(page, 'changebot-toast', '.toast');
    await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');

    await dismissToast(page);
    await waitForShadowGone(page, 'changebot-toast', '.toast');

    // Badge still shows its count and its timestamp is unchanged
    const badge = await page.find('changebot-badge >>> .badge');
    expect(await badge.getProperty('className')).not.toContain('badge--hidden');
    const storedLastViewed = await page.evaluate((key: string) => localStorage.getItem(key), `changebot:lastViewed:${scope}`);
    expect(parseInt(storedLastViewed, 10)).toBe(oldLastViewed);

    await page.close();
  });

  it('does not show when no publication targets the toast', async () => {
    const page = await newE2EPage();
    const scope = 'toast-none';
    const noToastMock = JSON.stringify({
      widget: { title: 'Updates', slug: 'test' },
      publications: [{ ...TOAST_PUB, id: 21, highlight_target: 'banner' }],
    });

    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${noToastMock}' />
      <changebot-toast scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-toast');
    await page.waitForChanges();

    const toast = await page.find('changebot-toast >>> .toast');
    expect(toast).toBeNull();

    await page.close();
  });

  it('applies theme prop correctly', async () => {
    const page = await newE2EPage();
    await loadToastPage(page, 'toast-theme', 'theme="catppuccin-mocha"');
    await waitForShadow(page, 'changebot-toast', '.toast');

    const toast = await page.find('changebot-toast >>> .toast');
    expect(toast).toHaveClass('theme--catppuccin-mocha');
  });

  it('applies correct position class', async () => {
    const page = await newE2EPage();
    await loadToastPage(page, 'toast-pos-tl', 'position="top-left"');
    await waitForShadow(page, 'changebot-toast', '.toast');

    const toast = await page.find('changebot-toast >>> .toast');
    expect(toast).toHaveClass('toast--top-left');
  });

  it('applies center position class', async () => {
    const page = await newE2EPage();
    await loadToastPage(page, 'toast-pos-center', 'position="center"');
    await waitForShadow(page, 'changebot-toast', '.toast');

    const toast = await page.find('changebot-toast >>> .toast');
    expect(toast).toHaveClass('toast--center');
  });

  it('applies default position when not specified', async () => {
    const page = await newE2EPage();
    await loadToastPage(page, 'toast-pos-default');
    await waitForShadow(page, 'changebot-toast', '.toast');

    const toast = await page.find('changebot-toast >>> .toast');
    expect(toast).toHaveClass('toast--bottom-right');
  });

  it('handles scope attribute correctly', async () => {
    const page = await newE2EPage();
    await loadToastPage(page, 'toast-scope-attr');

    const component = await page.find('changebot-toast');
    expect(await component.getAttribute('data-scope')).toBe('toast-scope-attr');
  });

  it('has correct aria attributes and close button label', async () => {
    const page = await newE2EPage();
    await loadToastPage(page, 'toast-aria');
    await waitForShadow(page, 'changebot-toast', '.toast');

    const toast = await page.find('changebot-toast >>> .toast');
    expect(await toast.getAttribute('role')).toBe('alert');
    expect(await toast.getAttribute('aria-live')).toBe('polite');

    const closeButton = await page.find('changebot-toast >>> .toast-close');
    expect(await closeButton.getAttribute('aria-label')).toBe('Dismiss notification');
  });
});
