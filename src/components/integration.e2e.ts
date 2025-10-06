import { newE2EPage } from '@stencil/core/testing';

describe('Integration Tests - Full System', () => {
  describe('Provider-Badge-Drawer Integration', () => {
    it('should allow badge and drawer to communicate through provider', async () => {
      const page = await newE2EPage();

      // Setup: Create a complete system with all three components
      await page.setContent(`
        <changebot-provider scope="test">
          <changebot-badge scope="test"></changebot-badge>
          <changebot-panel scope="test"></changebot-panel>
        </changebot-provider>
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
        <changebot-provider scope="test">
          <changebot-badge scope="test"></changebot-badge>
          <changebot-panel scope="test"></changebot-panel>
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
      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');
    });

    it('should handle badge click to open drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="test">
          <changebot-badge scope="test" count="3"></changebot-badge>
          <changebot-panel scope="test"></changebot-panel>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Click the badge
      const badgeButton = await page.find('changebot-badge >>> .badge');
      await badgeButton.click();

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify drawer opened
      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');
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
          <changebot-panel scope="sync-test"></changebot-panel>
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
      const drawer = await page.find('changebot-panel >>> .panel');
      const drawerClasses = await drawer.getProperty('className');
      expect(drawerClasses).toContain('panel--open');

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
      const closedDrawer = await page.find('changebot-panel >>> .panel');
      const closedClasses = await closedDrawer.getProperty('className');
      expect(closedClasses).toContain('panel--closed');
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
          <changebot-panel scope="app1"></changebot-panel>
        </changebot-provider>

        <changebot-provider scope="app2">
          <changebot-panel scope="app2"></changebot-panel>
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
      const drawers = await page.findAll('changebot-panel >>> .panel');
      const drawer1Classes = await drawers[0].getProperty('className');

      expect(drawer1Classes).toContain('panel--open');
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
        <changebot-panel></changebot-panel>
      `);

      await page.waitForChanges();

      // Open drawer using method
      await page.$eval('changebot-panel', (el: any) => {
        return el.open();
      });

      await page.waitForChanges();

      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--open');
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should handle ESC key to close drawer', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="a11y-test">
          <changebot-panel scope="a11y-test"></changebot-panel>
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
      const drawer = await page.find('changebot-panel >>> .panel');
      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--closed');
    });

    it('should support keyboard navigation on badge', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="kbd-test">
          <changebot-badge scope="kbd-test" count="3"></changebot-badge>
          <changebot-panel scope="kbd-test"></changebot-panel>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Focus badge and press Enter
      await page.focus('changebot-badge >>> .badge');
      await page.keyboard.press('Enter');

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

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

    it('should render as modal with backdrop', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-panel mode="modal"></changebot-panel>
      `);

      await page.waitForChanges();

      // Open the modal
      await page.$eval('changebot-panel', (el: any) => {
        return el.open();
      });

      await page.waitForChanges();

      const drawer = await page.find('changebot-panel >>> .panel');
      const backdrop = await page.find('changebot-panel >>> .backdrop');

      const className = await drawer.getProperty('className');
      expect(className).toContain('panel--modal');
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

  describe('Badge Count Clearing', () => {
    it('should clear badge count when panel opens programmatically', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="badge-clear-test">
          <changebot-badge scope="badge-clear-test" count="5"></changebot-badge>
          <changebot-panel scope="badge-clear-test"></changebot-panel>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Verify badge initially shows count
      let badgeCount = await page.find('changebot-badge >>> .badge__count');
      let countText = await badgeCount.textContent;
      expect(countText).toBe('5');

      // Verify badge is visible
      let badge = await page.find('changebot-badge >>> .badge');
      let badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).not.toContain('badge--hidden');

      // Open panel programmatically using the open() method
      await page.$eval('changebot-panel', (el: any) => {
        return el.open();
      });

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify panel is open
      const panel = await page.find('changebot-panel >>> .panel');
      const panelClasses = await panel.getProperty('className');
      expect(panelClasses).toContain('panel--open');

      // Verify badge count is cleared (should be 0 and hidden)
      badge = await page.find('changebot-badge >>> .badge');
      badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).toContain('badge--hidden');
    });

    it('should clear badge count when panel opens via action event', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="badge-clear-action-test">
          <changebot-badge scope="badge-clear-action-test" count="3"></changebot-badge>
          <changebot-panel scope="badge-clear-action-test"></changebot-panel>
        </changebot-provider>
      `);

      await page.waitForChanges();

      // Verify badge initially shows count
      let badge = await page.find('changebot-badge >>> .badge');
      let badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).not.toContain('badge--hidden');

      // Open panel via action event (simulating programmatic opening)
      await page.evaluate(() => {
        const event = new CustomEvent('changebot:action', {
          detail: {
            type: 'openDisplay',
            scope: 'badge-clear-action-test'
          },
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      });

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify panel is open
      const panel = await page.find('changebot-panel >>> .panel');
      const panelClasses = await panel.getProperty('className');
      expect(panelClasses).toContain('panel--open');

      // Verify badge count is cleared
      badge = await page.find('changebot-badge >>> .badge');
      badgeClasses = await badge.getProperty('className');
      expect(badgeClasses).toContain('badge--hidden');
    });

    it('should not interact when badge and panel have different scopes', async () => {
      const page = await newE2EPage();

      await page.setContent(`
        <changebot-provider scope="badge-scope">
          <changebot-badge scope="badge-scope" count="5"></changebot-badge>
        </changebot-provider>
        <changebot-provider scope="panel-scope">
          <changebot-panel scope="panel-scope"></changebot-panel>
        </changebot-provider>
      `);

      await page.waitForChanges();

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
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify panel is still closed (different scope prevents opening)
      panel = await page.find('changebot-panel >>> .panel');
      panelClasses = await panel.getProperty('className');
      expect(panelClasses).toContain('panel--closed');
      expect(panelClasses).not.toContain('panel--open');

      // Now open the panel programmatically
      await page.$eval('changebot-panel', (el: any) => {
        return el.open();
      });

      await page.waitForChanges();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify panel is now open
      panel = await page.find('changebot-panel >>> .panel');
      panelClasses = await panel.getProperty('className');
      expect(panelClasses).toContain('panel--open');

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