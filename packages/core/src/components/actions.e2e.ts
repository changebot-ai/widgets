import { newE2EPage, E2EPage } from '@stencil/core/testing';
import { seedLocalStorage, waitForConnected, waitForPanelOpen, waitForPanelClosed, waitForShadow } from '../test-utils/e2e-helpers';

/**
 * Tests for the changebot:action CustomEvent API — the documented public
 * integration surface. External code dispatches these events on the document
 * and the provider reacts.
 */

function dispatchAction(page: E2EPage, type: string, scope?: string): Promise<void> {
  return page.evaluate(
    (t: string, s?: string) => {
      const detail: Record<string, string> = { type: t };
      if (s) detail.scope = s;
      document.dispatchEvent(new CustomEvent('changebot:action', { detail }));
    },
    type,
    scope,
  );
}

const OLD_LAST_VIEWED = new Date('2024-01-01T00:00:00Z').getTime();

const twoUpdatesMock = JSON.stringify({
  widget: { title: 'Updates', slug: 'test' },
  publications: [
    { id: 1, title: 'Update 1', content: '<p>One</p>', display_date: '2025-01-01', published_at: '2025-01-01T00:00:00Z', tags: [] },
    { id: 2, title: 'Update 2', content: '<p>Two</p>', display_date: '2025-01-02', published_at: '2025-01-02T00:00:00Z', tags: [] },
  ],
});

describe('changebot:action events', () => {
  it('openDisplay, closeDisplay, and toggleDisplay control the panel', async () => {
    const page = await newE2EPage();
    const scope = 'actions-display';

    await page.setContent(`
      <changebot-provider scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    await dispatchAction(page, 'openDisplay', scope);
    await waitForPanelOpen(page);

    await dispatchAction(page, 'closeDisplay', scope);
    await waitForPanelClosed(page);

    await dispatchAction(page, 'toggleDisplay', scope);
    await waitForPanelOpen(page);

    await dispatchAction(page, 'toggleDisplay', scope);
    await waitForPanelClosed(page);
  });

  it('ignores events for a different scope', async () => {
    const page = await newE2EPage();
    const scope = 'actions-scoped';

    await page.setContent(`
      <changebot-provider scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    await dispatchAction(page, 'openDisplay', 'some-other-scope');
    await page.waitForChanges();

    const panel = await page.find('changebot-panel >>> .panel');
    expect(await panel.getProperty('className')).toContain('panel--closed');

    // The same event with the right scope opens the panel, proving the
    // wrong-scope event was ignored rather than lost to broken wiring.
    await dispatchAction(page, 'openDisplay', scope);
    await waitForPanelOpen(page);
  });

  it('an event without a scope reaches every provider', async () => {
    const page = await newE2EPage();

    await page.setContent(`
      <changebot-provider scope="actions-all-a" />
      <changebot-panel scope="actions-all-a" />
      <changebot-provider scope="actions-all-b" />
      <changebot-panel scope="actions-all-b" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-panel');

    await dispatchAction(page, 'openDisplay');
    await waitForPanelOpen(page, 0);
    await waitForPanelOpen(page, 1);
  });

  it('openDisplay marks updates as viewed', async () => {
    const page = await newE2EPage();
    const scope = 'actions-open-marks';

    await seedLocalStorage(page, { [`changebot:lastViewed:${scope}`]: String(OLD_LAST_VIEWED) });
    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${twoUpdatesMock}' />
      <changebot-badge scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-badge');

    // Both publications are newer than the seeded lastViewed
    await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');
    const count = await page.find('changebot-badge >>> .badge__count');
    expect(await count.textContent).toBe('2');

    await dispatchAction(page, 'openDisplay', scope);
    await waitForPanelOpen(page);
    await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');
  });

  it('markViewed clears the badge without opening the panel and persists to localStorage', async () => {
    const page = await newE2EPage();
    const scope = 'actions-mark-viewed';

    await seedLocalStorage(page, { [`changebot:lastViewed:${scope}`]: String(OLD_LAST_VIEWED) });
    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${twoUpdatesMock}' />
      <changebot-badge scope="${scope}" />
      <changebot-panel scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-badge');
    await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');

    await dispatchAction(page, 'markViewed', scope);
    await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

    // Panel stayed closed
    const panel = await page.find('changebot-panel >>> .panel');
    expect(await panel.getProperty('className')).toContain('panel--closed');

    // The new timestamp was persisted
    const stored = await page.evaluate((key: string) => localStorage.getItem(key), `changebot:lastViewed:${scope}`);
    expect(parseInt(stored, 10)).toBeGreaterThan(OLD_LAST_VIEWED);
  });

  it('markAllViewed clears the badge and persists to localStorage', async () => {
    const page = await newE2EPage();
    const scope = 'actions-mark-all';

    await seedLocalStorage(page, { [`changebot:lastViewed:${scope}`]: String(OLD_LAST_VIEWED) });
    await page.setContent(`
      <changebot-provider scope="${scope}" mock-data='${twoUpdatesMock}' />
      <changebot-badge scope="${scope}" />
    `);
    await page.waitForChanges();
    await waitForConnected(page, 'changebot-badge');
    await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');

    await dispatchAction(page, 'markAllViewed', scope);
    await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

    const stored = await page.evaluate((key: string) => localStorage.getItem(key), `changebot:lastViewed:${scope}`);
    expect(parseInt(stored, 10)).toBeGreaterThan(OLD_LAST_VIEWED);
  });
});
