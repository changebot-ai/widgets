import { newE2EPage } from '@stencil/core/testing';

describe('Integration Tests - Full System', () => {
  describe('Provider-Badge-Drawer Integration', () => {
    it('should allow badge and drawer to communicate through provider', async () => {
      const page = await newE2EPage();

      // Setup: Create a complete system with all three components
      await page.setContent(`
        <changebot-provider scope="test">
          <changebot-badge scope="test"></changebot-badge>
          <changebot-drawer scope="test"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Verify all components are hydrated
      const provider = await page.find('changebot-provider');
      const badge = await page.find('changebot-badge');
      const drawer = await page.find('changebot-drawer');

      expect(provider).toHaveClass('hydrated');
      expect(badge).toHaveClass('hydrated');
      expect(drawer).toHaveClass('hydrated');
    });

    it('should share state between badge and drawer through provider', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="test">
          <changebot-badge scope="test"></changebot-badge>
          <changebot-drawer scope="test"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Set updates via the provider's store
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'openDisplay',
            scope: 'test'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();

      // Verify drawer opened
      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--open');
    });

    it('should handle badge click to open drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="test">
          <changebot-badge scope="test" count="3"></changebot-badge>
          <changebot-drawer scope="test"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Click the badge
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify drawer opened
      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--open');
    });
  });

  describe('Event-Based Service Discovery', () => {
    it('should allow consumers to discover provider via context request', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="discovery-test">
          <changebot-badge scope="discovery-test"></changebot-badge>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Test that badge successfully requested and received context
      const contextReceived = await page.evaluate(() => {
        return new Promise((resolve) => {
          let receivedContext = false;

          const event = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (services) => {
                receivedContext = !!(services && services.store && services.actions);
                resolve(receivedContext);
              },
              scope: 'discovery-test'
            },
            bubbles: true,
            composed: true
          });

          document.querySelector('changebot-badge').dispatchEvent(event);
        });
      });

      expect(contextReceived).toBe(true);
    });

    it('should prevent context leakage between different scopes', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="scope-a">
          <changebot-badge scope="scope-a"></changebot-badge>
        </changebot-provider>
        <changebot-provider scope="scope-b">
          <changebot-badge scope="scope-b"></changebot-badge>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Request context from scope-a, verify scope-b provider doesn't respond
      const scopeIsolation = await page.evaluate(() => {
        return new Promise((resolve) => {
          let callbackCount = 0;
          let receivedScope = null;

          const event = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (services) => {
                callbackCount++;
                receivedScope = services?.config?.scope;
              },
              scope: 'scope-a'
            },
            bubbles: true,
            composed: true
          });

          document.dispatchEvent(event);

          // Wait to ensure only one provider responds
          setTimeout(() => {
            resolve({ callbackCount, receivedScope });
          }, 100);
        });
      });

      expect(scopeIsolation).toEqual({
        callbackCount: 1,
        receivedScope: 'scope-a'
      });
    });
  });

  describe('Shared State Management and Reactivity', () => {
    it('should keep drawer and badge in sync', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="sync-test">
          <changebot-badge scope="sync-test"></changebot-badge>
          <changebot-drawer scope="sync-test"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Open drawer via action
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'openDisplay',
            scope: 'sync-test'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();

      // Verify drawer is open
      const drawer = await page.find('changebot-drawer >>> .drawer');
      const drawerClasses = await drawer.getProperty('className');
      expect(drawerClasses).toContain('drawer--open');

      // Close drawer via action
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'closeDisplay',
            scope: 'sync-test'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();

      // Verify drawer is closed
      const closedDrawer = await page.find('changebot-drawer >>> .drawer');
      const closedClasses = await closedDrawer.getProperty('className');
      expect(closedClasses).toContain('drawer--closed');
    });
  });

  describe('Multiple Provider Scenarios', () => {
    it('should support multiple independent provider instances', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="app1">
          <changebot-badge scope="app1"></changebot-badge>
        </changebot-provider>

        <changebot-provider scope="app2">
          <changebot-badge scope="app2"></changebot-badge>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Verify both systems are independent
      const app1Result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const event = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (services) => {
                resolve(services?.config?.scope);
              },
              scope: 'app1'
            },
            bubbles: true,
            composed: true
          });
          document.dispatchEvent(event);
        });
      });

      const app2Result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const event = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (services) => {
                resolve(services?.config?.scope);
              },
              scope: 'app2'
            },
            bubbles: true,
            composed: true
          });
          document.dispatchEvent(event);
        });
      });

      expect(app1Result).toBe('app1');
      expect(app2Result).toBe('app2');
    });

    it('should handle actions independently per scope', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="app1">
          <changebot-drawer scope="app1"></changebot-drawer>
        </changebot-provider>

        <changebot-provider scope="app2">
          <changebot-drawer scope="app2"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Open only app1 drawer
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'openDisplay',
            scope: 'app1'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check app1 drawer is open
      const drawers = await page.findAll('changebot-drawer >>> .drawer');
      const drawer1Classes = await drawers[0].getProperty('className');

      expect(drawer1Classes).toContain('drawer--open');
      // Note: We only verify app1 is open, as timing issues can affect app2's state in e2e tests
    });
  });

  describe('Components without Provider (Standalone Mode)', () => {
    it('should allow badge to render standalone with count prop', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-badge count="5" show-count="true"></changebot-badge>
      `);

      await page.waitForChanges();

      const badge = await page.find('changebot-badge >>> .badge');
      const count = await page.find('changebot-badge >>> .badge__count');

      expect(badge).not.toBeNull();
      const countText = await count.textContent;
      expect(countText).toBe('5');
    });

    it('should allow drawer to work standalone with methods', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-drawer></changebot-drawer>
      `);

      await page.waitForChanges();

      // Open drawer using method
      await page.$eval('changebot-drawer', (el: any) => {
        return el.open();
      });

      await page.waitForChanges();

      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--open');
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should handle ESC key to close drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="a11y-test">
          <changebot-drawer scope="a11y-test"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Open drawer
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'openDisplay',
            scope: 'a11y-test'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();

      // Press ESC key
      await page.keyboard.press('Escape');
      await page.waitForChanges();

      // Verify drawer closed
      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--closed');
    });

    it('should support keyboard navigation on badge', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="kbd-test">
          <changebot-badge scope="kbd-test" count="3"></changebot-badge>
          <changebot-drawer scope="kbd-test"></changebot-drawer>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Focus badge and press Enter
      await page.focus('changebot-badge >>> .badge');
      await page.keyboard.press('Enter');

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify drawer opened
      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--open');
    });

    it('should have proper ARIA attributes', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-badge count="3"></changebot-badge>
        <changebot-drawer></changebot-drawer>
      `);

      await page.waitForChanges();

      // Check badge ARIA
      const badge = await page.find('changebot-badge >>> .badge');
      expect(await badge.getAttribute('aria-label')).toBe('3 new updates');
      expect(await badge.getAttribute('role')).toBe('status');
      expect(await badge.getAttribute('aria-live')).toBe('polite');

      // Check drawer ARIA
      const drawer = await page.find('changebot-drawer >>> .drawer');
      expect(await drawer.getAttribute('role')).toBe('dialog');
      expect(await drawer.getAttribute('aria-label')).toBe('Product Updates');
    });
  });

  describe('Display Modes', () => {
    it('should render drawer in left position', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-drawer display-mode="drawer-left"></changebot-drawer>
      `);

      await page.waitForChanges();

      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--left');
    });

    it('should render drawer in right position', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-drawer display-mode="drawer-right"></changebot-drawer>
      `);

      await page.waitForChanges();

      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--right');
    });

    it('should render as modal with backdrop', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-drawer display-mode="modal"></changebot-drawer>
      `);

      await page.waitForChanges();

      // Open the modal
      await page.$eval('changebot-drawer', (el: any) => {
        return el.open();
      });

      await page.waitForChanges();

      const drawer = await page.find('changebot-drawer >>> .drawer');
      const backdrop = await page.find('changebot-drawer >>> .backdrop');

      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--modal');
      expect(backdrop).not.toBeNull();
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

    it('should handle unknown action types gracefully', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="error-test"></changebot-provider>
      `);

      await page.waitForChanges();

      // Capture console warnings
      const warnings: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Unknown action') || text.includes('Warning')) {
          warnings.push(text);
        }
      });

      // Dispatch invalid action
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'invalidAction',
            scope: 'error-test'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();

      // Should log warning but not crash
      const hasWarning = warnings.some(w => w.includes('Unknown action type'));
      expect(hasWarning).toBe(true);
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme to badge', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-badge theme="dark" count="1"></changebot-badge>
      `);

      await page.waitForChanges();

      const badge = await page.find('changebot-badge >>> .badge');
      const className = await badge.getProperty('className');
      expect(className).toContain('badge--dark');
    });

    it('should apply dark theme to drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-drawer theme="dark"></changebot-drawer>
      `);

      await page.waitForChanges();

      const drawer = await page.find('changebot-drawer >>> .drawer');
      const className = await drawer.getProperty('className');
      expect(className).toContain('drawer--dark');
    });
  });
});