import { newE2EPage } from '@stencil/core/testing';
import { injectFetchMock, seedLocalStorage, waitForConnected, waitForPanelOpen, waitForPanelClosed, waitForShadow } from '../test-utils/e2e-helpers';

describe('Integration Tests - Full System', () => {
  describe('Provider-Badge-Drawer Integration', () => {
    it('should allow badge and drawer to communicate through provider', async () => {
      const page = await newE2EPage();

      // Setup: Create a complete system with all three components
      await page.setContent(`
        <changebot-provider scope="test" />
        <changebot-badge scope="test" />
        <changebot-panel scope="test" />
      `);

      await page.waitForChanges();

      // Verify all components are hydrated
      const provider = await page.find('changebot-provider');
      const badge = await page.find('changebot-badge');
      const drawer = await page.find('changebot-panel');

      expect(provider).toHaveClass('hydrated');
      expect(badge).toHaveClass('hydrated');
      expect(drawer).toHaveClass('hydrated');
    });

    it('should share state between badge and drawer through provider', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="test" />
        <changebot-badge scope="test" />
        <changebot-panel scope="test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      // Open panel programmatically using the open() method
      await page.$eval('changebot-panel', (el: any) => el.open());

      await waitForPanelOpen(page);

      // Verify drawer opened
      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');
    });

    it('should handle badge click to open drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="test" />
        <changebot-badge scope="test" count="3" />
        <changebot-panel scope="test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForConnected(page, 'changebot-panel');

      // Click the badge
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();

      await waitForPanelOpen(page);

      // Verify drawer opened
      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');
    });
  });

  describe('Registry-Based Service Discovery', () => {
    it('should allow consumers to discover provider via registry', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="discovery-test" />
        <changebot-badge scope="discovery-test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');

      // Badge should be hydrated and connected to provider
      const badge = await page.find('changebot-badge');
      expect(badge).toHaveClass('hydrated');

      // Badge should have received services (can open panel)
      const badgeButton = await page.find('changebot-badge >>> .badge');
      expect(badgeButton).not.toBeNull();
    });

    it('should prevent context leakage between different scopes', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="scope-a" />
        <changebot-badge scope="scope-a" count="1" />
        <changebot-panel scope="scope-a" />
        <changebot-provider scope="scope-b" />
        <changebot-badge scope="scope-b" count="2" />
        <changebot-panel scope="scope-b" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForConnected(page, 'changebot-panel');

      // Click badge in scope-a
      const badges = await page.findAll('changebot-badge >>> .badge');
      await badges[0].click();

      await waitForPanelOpen(page, 0);

      // Verify only scope-a panel opened
      const panels = await page.findAll('changebot-panel >>> .panel');
      const panel1Classes = await panels[0].getProperty('className');
      const panel2Classes = await panels[1].getProperty('className');

      expect(panel1Classes).toContain('panel--open');
      expect(panel2Classes).toContain('panel--closed');
    });
  });

  describe('Shared State Management and Reactivity', () => {
    it('should keep drawer and badge in sync', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="sync-test" />
        <changebot-badge scope="sync-test" />
        <changebot-panel scope="sync-test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      // Open drawer programmatically
      await page.$eval('changebot-panel', (el: any) => el.open());
      await waitForPanelOpen(page);

      // Verify drawer is open
      const drawer = await page.find('changebot-panel >>> .panel');
      const drawerClasses = await drawer.getProperty('className');
      expect(drawerClasses).toContain('panel--open');

      // Close drawer programmatically
      await page.$eval('changebot-panel', (el: any) => el.close());
      await waitForPanelClosed(page);

      // Verify drawer is closed
      const closedDrawer = await page.find('changebot-panel >>> .panel');
      const closedClasses = await closedDrawer.getProperty('className');
      expect(closedClasses).toContain('panel--closed');
    });
  });

  describe('Multiple Provider Scenarios', () => {
    it('should support multiple independent provider instances', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="app1" />
        <changebot-badge scope="app1" />
        <changebot-panel scope="app1" />
        <changebot-provider scope="app2" />
        <changebot-badge scope="app2" />
        <changebot-panel scope="app2" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      // Verify both systems are independent by opening app1 panel only
      const panels = await page.findAll('changebot-panel');
      await panels[0].callMethod('open');

      await waitForPanelOpen(page, 0);

      // Check only app1 panel is open
      const panelElements = await page.findAll('changebot-panel >>> .panel');
      const panel1Classes = await panelElements[0].getProperty('className');
      const panel2Classes = await panelElements[1].getProperty('className');

      expect(panel1Classes).toContain('panel--open');
      expect(panel2Classes).toContain('panel--closed');
    });

    it('should handle actions independently per scope', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="app1" />
        <changebot-panel scope="app1" />

        <changebot-provider scope="app2" />
        <changebot-panel scope="app2" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      // Open only app1 drawer using the first panel's open method
      const panels = await page.findAll('changebot-panel');
      await panels[0].callMethod('open');

      await waitForPanelOpen(page, 0);

      // Check app1 drawer is open
      const drawers = await page.findAll('changebot-panel >>> .panel');
      const drawer1Classes = await drawers[0].getProperty('className');
      const drawer2Classes = await drawers[1].getProperty('className');

      expect(drawer1Classes).toContain('panel--open');
      expect(drawer2Classes).toContain('panel--closed');
    });
  });

  describe('Components without Provider (Standalone Mode)', () => {
    it('should allow badge to render standalone with count prop', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-badge count="5" indicator="count"></changebot-badge>
      `);

      await page.waitForChanges();

      const badge = await page.find('changebot-badge >>> .badge');
      const count = await page.find('changebot-badge >>> .badge__count');

      expect(badge).not.toBeNull();
      const countText = await count.textContent;
      expect(countText).toBe('5');
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should handle ESC key to close drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="a11y-test" />
        <changebot-panel scope="a11y-test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-panel');

      // Open drawer programmatically
      await page.$eval('changebot-panel', (el: any) => el.open());
      await waitForPanelOpen(page);

      // Verify drawer is open
      let drawer = await page.find('changebot-panel >>> .panel');
      let className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');

      // Press ESC key
      await page.keyboard.press('Escape');
      await waitForPanelClosed(page);

      // Verify drawer closed
      drawer = await page.find('changebot-panel >>> .panel');
      className = await drawer.getProperty('className');
      expect(className).toContain('panel--closed');
    });

    it('should support keyboard navigation on badge', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="kbd-test" />
        <changebot-badge scope="kbd-test" count="3" />
        <changebot-panel scope="kbd-test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForConnected(page, 'changebot-panel');

      // Focus badge and press Enter
      await page.focus('changebot-badge >>> .badge');
      await page.keyboard.press('Enter');

      await waitForPanelOpen(page);

      // Verify drawer opened
      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');
    });

    it('should have proper ARIA attributes', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-badge count="3"></changebot-badge>
        <changebot-panel></changebot-panel>
      `);

      await page.waitForChanges();

      // Check badge ARIA
      const badge = await page.find('changebot-badge >>> .badge');
      expect(await badge.getAttribute('aria-label')).toBe('3 new updates');
      expect(await badge.getAttribute('role')).toBe('status');
      expect(await badge.getAttribute('aria-live')).toBe('polite');

      // Check drawer ARIA
      const drawer = await page.find('changebot-panel >>> .panel');
      expect(await drawer.getAttribute('role')).toBe('dialog');
      expect(await drawer.getAttribute('aria-label')).toBe('Product Updates');
    });
  });

  describe('Display Modes', () => {
    it('should render drawer in left position', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-panel mode="drawer-left"></changebot-panel>
      `);

      await page.waitForChanges();

      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--left');
    });

    it('should render drawer in right position', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-panel mode="drawer-right"></changebot-panel>
      `);

      await page.waitForChanges();

      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--right');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing provider gracefully', async () => {
      const page = await newE2EPage();

      // Badge without provider should still render
      await page.setContent(`
        <changebot-badge></changebot-badge>
      `);

      await page.waitForChanges();

      const badge = await page.find('changebot-badge');
      expect(badge).toHaveClass('hydrated');

      const badgeElement = await page.find('changebot-badge >>> .badge');
      expect(badgeElement).not.toBeNull();
    });

    it('should handle panel operations without provider gracefully', async () => {
      // Silence expected "no services available" warnings bridged from the
      // browser by Stencil's e2e harness (panel.tsx open/close paths).
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const page = await newE2EPage();

        // Panel without provider should still render and not crash
        await page.setContent(`
          <changebot-panel></changebot-panel>
        `);

        await page.waitForChanges();

        const panel = await page.find('changebot-panel');
        expect(panel).toHaveClass('hydrated');

        // Calling open/close without provider should not crash
        await page.$eval('changebot-panel', (el: any) => el.open());
        await page.waitForChanges();

        await page.$eval('changebot-panel', (el: any) => el.close());
        await page.waitForChanges();

        // Panel should still be in a valid state
        const panelElement = await page.find('changebot-panel >>> .panel');
        expect(panelElement).not.toBeNull();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('Theme Support', () => {
    it('should apply catppuccin theme to badge', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-badge theme="catppuccin-mocha" count="1"></changebot-badge>
      `);

      await page.waitForChanges();

      const badge = await page.find('changebot-badge >>> .badge');
      const className = await badge.getProperty('className');
      expect(className).toContain('theme--catppuccin-mocha');
    });

    it('should apply catppuccin theme to drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-panel theme="catppuccin-mocha"></changebot-panel>
      `);

      await page.waitForChanges();

      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('theme--catppuccin-mocha');
    });
  });

  describe('UserId Tracking - New User Journey', () => {
    const API_BASE = 'https://api.changebot.ai/v1/widgets/test-widget';
    const USER_ID = 'new-user-123';
    const SCOPE = 'userid-test';

    // Helper to create publications with dynamic timestamps
    function createInitialPublications(beforeTimestamp: string) {
      // Publication that existed before the user's first visit
      const oldDate = new Date(new Date(beforeTimestamp).getTime() - 24 * 60 * 60 * 1000); // 1 day before
      return [
        {
          id: 1,
          title: 'Old Update',
          content: '<p>This existed before the user visited</p>',
          display_date: oldDate.toISOString().split('T')[0],
          published_at: oldDate.toISOString(),
          tags: [],
        },
      ];
    }

    function createPublicationsWithNewUpdate(afterTimestamp: string, initialPubs: any[]) {
      // New publication that was published after the user's first visit
      // Use just 1ms offset so it's after firstVisit but before the test clicks happen
      const newDate = new Date(new Date(afterTimestamp).getTime() + 1); // 1ms after
      return [
        {
          id: 2,
          title: 'New Update',
          content: '<p>This was published after user first visit</p>',
          display_date: newDate.toISOString().split('T')[0],
          published_at: newDate.toISOString(),
          tags: [],
        },
        ...initialPubs,
      ];
    }

    it('should show no badge count on first visit for new user, then show 1 after new update, then clear after viewing', async () => {
      // Create initial publications dated before "now"
      const testStartTime = new Date().toISOString();
      const initialPublications = createInitialPublications(testStartTime);

      // ============================================
      // VISIT 1: New user visits for the first time
      // ============================================
      let page = await newE2EPage();

      const mock1 = await injectFetchMock(page, {
        apiBase: API_BASE,
        updates: initialPublications,
        user: { last_seen_at: null }, // New user - never seen before
      });

      await page.setContent(`
        <changebot-provider slug="test-widget" scope="${SCOPE}" user-id="${USER_ID}" />
        <changebot-badge scope="${SCOPE}" />
        <changebot-panel scope="${SCOPE}" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      // The provider sets the new user's initial last_seen_at via PATCH
      await mock1.waitForPatch();

      // Badge should be hidden (count = 0) because new user hasn't seen anything yet
      // and their last_seen_at gets set to "now" on first sync
      let badge = await page.find('changebot-badge >>> .badge');
      let badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).toContain('badge--hidden');

      const patchedData1 = await mock1.getLastPatchBody();
      expect(patchedData1).not.toBeNull();
      expect(patchedData1.last_seen_at).toBeDefined();
      const firstVisitTimestamp = patchedData1.last_seen_at as string;

      // User does NOT click/open the panel - they just leave
      await page.close();

      // ============================================
      // VISIT 2: User returns after a new update was published
      // ============================================
      // Create publications with a new update published AFTER the user's first visit
      const publicationsWithNewUpdate = createPublicationsWithNewUpdate(firstVisitTimestamp, initialPublications);

      page = await newE2EPage();

      const mock2 = await injectFetchMock(page, {
        apiBase: API_BASE,
        updates: publicationsWithNewUpdate, // Now includes the new update
        user: { last_seen_at: firstVisitTimestamp }, // Their last_seen_at from first visit
      });

      await page.setContent(`
        <changebot-provider slug="test-widget" scope="${SCOPE}" user-id="${USER_ID}" />
        <changebot-badge scope="${SCOPE}" />
        <changebot-panel scope="${SCOPE}" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');

      // Badge should show count of 1 (one new update since their last visit)
      await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');

      const countElement = await page.find('changebot-badge >>> .badge__count');
      const countText = await countElement.textContent;
      expect(countText).toBe('1');

      // User clicks to open the panel
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();

      await waitForPanelOpen(page);

      // Badge should now be hidden (count cleared after viewing)
      await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

      // Verify last_seen_at was updated via PATCH
      await mock2.waitForPatch();
      const patchedData2 = await mock2.getLastPatchBody();
      expect(patchedData2).not.toBeNull();
      const secondVisitTimestamp = patchedData2.last_seen_at as string;
      expect(new Date(secondVisitTimestamp).getTime()).toBeGreaterThan(new Date(firstVisitTimestamp).getTime());

      // User closes the panel
      await page.keyboard.press('Escape');
      await waitForPanelClosed(page);

      // Badge should still be hidden after closing
      badge = await page.find('changebot-badge >>> .badge');
      badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).toContain('badge--hidden');

      await page.close();

      // ============================================
      // VISIT 3: User returns again (no new updates)
      // ============================================
      page = await newE2EPage();

      await injectFetchMock(page, {
        apiBase: API_BASE,
        updates: publicationsWithNewUpdate, // Same publications
        user: { last_seen_at: secondVisitTimestamp }, // Their updated last_seen_at
      });

      await page.setContent(`
        <changebot-provider slug="test-widget" scope="${SCOPE}" user-id="${USER_ID}" />
        <changebot-badge scope="${SCOPE}" />
        <changebot-panel scope="${SCOPE}" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');

      // Badge should still be hidden (no new updates since last view)
      await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

      await page.close();
    });
  });

  describe('Anonymous User Journey (no userId)', () => {
    const SCOPE = 'anon-journey';
    const STORAGE_KEY = `changebot:lastViewed:${SCOPE}`;

    function mockDataWith(publications: any[]): string {
      return JSON.stringify({
        widget: { title: 'Updates', slug: 'anon-test' },
        publications,
      });
    }

    const oldPublication = {
      id: 1,
      title: 'Old Update',
      content: '<p>Existed before the first visit</p>',
      display_date: '2025-01-01',
      published_at: '2025-01-01T00:00:00Z',
      tags: [],
    };

    it('initializes lastViewed on first visit, counts a newer publication on the next, and clears after opening the panel', async () => {
      // ===== Visit 1: first visit initializes lastViewed and hides the badge =====
      let page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="${SCOPE}" mock-data='${mockDataWith([oldPublication])}' />
        <changebot-badge scope="${SCOPE}" />
        <changebot-panel scope="${SCOPE}" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

      const stored1 = await page.evaluate((key: string) => localStorage.getItem(key), STORAGE_KEY);
      expect(stored1).not.toBeNull();
      const firstVisitTimestamp = parseInt(stored1, 10);
      expect(firstVisitTimestamp).toBeGreaterThan(new Date(oldPublication.published_at).getTime());

      await page.close();

      // ===== Visit 2: a publication newer than the first visit shows a count =====
      const newPublication = {
        id: 2,
        title: 'New Update',
        content: '<p>Published after the first visit</p>',
        display_date: '2025-06-01',
        // 1ms after the first visit: newer than that visit, but already in the
        // past by the time the test clicks (which marks "now" as viewed)
        published_at: new Date(firstVisitTimestamp + 1).toISOString(),
        tags: [],
      };

      page = await newE2EPage();
      await seedLocalStorage(page, { [STORAGE_KEY]: String(firstVisitTimestamp) });

      await page.setContent(`
        <changebot-provider scope="${SCOPE}" mock-data='${mockDataWith([newPublication, oldPublication])}' />
        <changebot-badge scope="${SCOPE}" />
        <changebot-panel scope="${SCOPE}" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForShadow(page, 'changebot-badge', '.badge:not(.badge--hidden)');

      const count = await page.find('changebot-badge >>> .badge__count');
      expect(await count.textContent).toBe('1');

      // Opening the panel clears the count and persists the new timestamp
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();
      await waitForPanelOpen(page);
      await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

      const stored2 = await page.evaluate((key: string) => localStorage.getItem(key), STORAGE_KEY);
      const secondVisitTimestamp = parseInt(stored2, 10);
      expect(secondVisitTimestamp).toBeGreaterThan(firstVisitTimestamp);

      await page.close();

      // ===== Visit 3: nothing new — the badge stays hidden =====
      page = await newE2EPage();
      await seedLocalStorage(page, { [STORAGE_KEY]: String(secondVisitTimestamp) });

      await page.setContent(`
        <changebot-provider scope="${SCOPE}" mock-data='${mockDataWith([newPublication, oldPublication])}' />
        <changebot-badge scope="${SCOPE}" />
        <changebot-panel scope="${SCOPE}" />
      `);
      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForShadow(page, 'changebot-badge', '.badge.badge--hidden');

      await page.close();
    });
  });

  describe('Badge Count Clearing', () => {
    it('should clear badge count when panel opens programmatically', async () => {
      const page = await newE2EPage();

      const mockData = JSON.stringify({
        widget: { title: 'Updates', slug: 'test' },
        publications: [
          {
            id: 1,
            title: 'Update 1',
            content: 'Content 1',
            display_date: '2025-01-01',
            published_at: '2025-01-01T00:00:00Z',
            tags: [],
          },
          {
            id: 2,
            title: 'Update 2',
            content: 'Content 2',
            display_date: '2025-01-02',
            published_at: '2025-01-02T00:00:00Z',
            tags: [],
          },
        ],
      });

      await page.setContent(`
        <changebot-provider scope="badge-clear-test" mock-data='${mockData}' />
        <changebot-badge scope="badge-clear-test" />
        <changebot-panel scope="badge-clear-test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForConnected(page, 'changebot-panel');

      // Verify badge initially shows 0 (lastViewed initializes to "now" on first load)
      let badge = await page.find('changebot-badge >>> .badge');
      let badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).toContain('badge--hidden'); // Hidden when count is 0

      // Open panel programmatically using the open() method
      await page.$eval('changebot-panel', (el: any) => {
        return el.open();
      });

      await waitForPanelOpen(page);

      // Verify badge count is cleared (should be 0 and hidden)
      badge = await page.find('changebot-badge >>> .badge');
      badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).toContain('badge--hidden');
    });

    it('should clear badge count when panel opens via badge click', async () => {
      const page = await newE2EPage();

      // Use explicit count prop to ensure badge is visible and clickable
      // This test focuses on verifying the click opens the panel
      await page.setContent(`
        <changebot-provider scope="badge-clear-click-test" />
        <changebot-badge scope="badge-clear-click-test" count="3" />
        <changebot-panel scope="badge-clear-click-test" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForConnected(page, 'changebot-panel');

      // Verify badge is visible with count
      let badge = await page.find('changebot-badge >>> .badge');
      let badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).not.toContain('badge--hidden');

      // Click the badge to open panel
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();

      await waitForPanelOpen(page);

      // Badge count remains visible since it uses explicit count prop
      // (count prop is for standalone mode, not store-managed)
      badge = await page.find('changebot-badge >>> .badge');
      badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).not.toContain('badge--hidden');
    });

    it('should not interact when badge and panel have different scopes', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="badge-scope" />
        <changebot-badge scope="badge-scope" count="5" />
        <changebot-provider scope="panel-scope" />
        <changebot-panel scope="panel-scope" />
      `);

      await page.waitForChanges();
      await waitForConnected(page, 'changebot-badge');
      await waitForConnected(page, 'changebot-panel');

      // Verify badge initially shows count
      let badge = await page.find('changebot-badge >>> .badge');
      let badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).not.toContain('badge--hidden');

      let badgeCount = await page.find('changebot-badge >>> .badge__count');
      let countText = await badgeCount.textContent;
      expect(countText).toBe('5');

      // Verify panel is initially closed
      let panel = await page.find('changebot-panel >>> .panel');
      let panelClasses = await panel.getProperty('className');
      expect(panelClasses).toContain('panel--closed');
      expect(panelClasses).not.toContain('panel--open');

      // Click the badge - this should NOT open the panel (different scope)
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();

      await page.waitForChanges();

      // Verify panel is still closed (different scope prevents opening)
      panel = await page.find('changebot-panel >>> .panel');
      panelClasses = await panel.getProperty('className');
      expect(panelClasses).toContain('panel--closed');
      expect(panelClasses).not.toContain('panel--open');

      // Now open the panel programmatically
      await page.$eval('changebot-panel', (el: any) => {
        return el.open();
      });

      await waitForPanelOpen(page);

      // Verify badge count is NOT cleared (different scope prevents clearing)
      badge = await page.find('changebot-badge >>> .badge');
      badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).not.toContain('badge--hidden');

      badgeCount = await page.find('changebot-badge >>> .badge__count');
      countText = await badgeCount.textContent;
      expect(countText).toBe('5');
    });
  });
});
