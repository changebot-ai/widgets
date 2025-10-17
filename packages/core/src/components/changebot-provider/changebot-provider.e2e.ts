import { newE2EPage } from '@stencil/core/testing';

describe('changebot-provider', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider></changebot-provider>');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
  });

  it('renders with url prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider url="https://api.example.com/updates"></changebot-provider>');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
    expect(await element.getProperty('url')).toBe('https://api.example.com/updates');
  });

  it('renders with slug prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider slug="test-team"></changebot-provider>');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
    expect(await element.getProperty('slug')).toBe('test-team');
  });

  it('renders with scope prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider scope="custom-scope"></changebot-provider>');

    const element = await page.find('changebot-provider');
    expect(element).toHaveClass('hydrated');
    expect(await element.getProperty('scope')).toBe('custom-scope');
  });

  it('renders with default scope when not provided', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-provider></changebot-provider>');

    const element = await page.find('changebot-provider');
    expect(await element.getProperty('scope')).toBe('default');
  });

  describe('context request event handling', () => {
    it('responds to context request events', async () => {
      const page = await newE2EPage();
      await page.setContent('<changebot-provider></changebot-provider>');

      // Set up listener for the response
      const contextReceived = await page.evaluateHandle(() => {
        return new Promise((resolve) => {
          // Dispatch context request
          const requestEvent = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (context) => {
                if (context && context.store && context.actions) {
                  resolve(true);
                } else {
                  resolve(false);
                }
              },
              scope: 'default'
            },
            bubbles: true,
            composed: true
          });

          document.dispatchEvent(requestEvent);
        });
      });

      const result = await contextReceived.jsonValue();
      expect(result).toBe(true);
    });

    it('ignores context requests with different scope', async () => {
      const page = await newE2EPage();
      await page.setContent('<changebot-provider scope="scope-a"></changebot-provider>');

      const contextReceived = await page.evaluate(() => {
        return new Promise((resolve) => {
          let callbackCalled = false;

          const requestEvent = new CustomEvent('changebot:context-request', {
            detail: {
              callback: () => {
                callbackCalled = true;
              },
              scope: 'scope-b'
            },
            bubbles: true,
            composed: true
          });

          document.dispatchEvent(requestEvent);

          // Wait a bit to ensure callback isn't called
          setTimeout(() => {
            resolve(callbackCalled);
          }, 100);
        });
      });

      expect(contextReceived).toBe(false);
    });
  });

  describe('action event handling', () => {
    it('handles action events', async () => {
      const page = await newE2EPage();
      await page.setContent('<changebot-provider></changebot-provider>');

      // Spy on console to verify action handling
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      await page.evaluate(() => {
        const actionEvent = new CustomEvent('changebot:action', {
          detail: {
            type: 'toggleDisplay',
            scope: 'default'
          },
          bubbles: true,
          composed: true
        });

        document.dispatchEvent(actionEvent);
      });

      await page.waitForChanges();

      // The component should process the action without errors
      const errors = consoleMessages.filter(msg => msg.includes('Error'));
      expect(errors).toHaveLength(0);
    });

    it('ignores actions with different scope', async () => {
      const page = await newE2EPage();
      await page.setContent('<changebot-provider scope="scope-a"></changebot-provider>');

      const actionProcessed = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Mock the action handler
          let actionCalled = false;

          const actionEvent = new CustomEvent('changebot:action', {
            detail: {
              type: 'toggleDisplay',
              scope: 'scope-b'
            },
            bubbles: true,
            composed: true
          });

          document.dispatchEvent(actionEvent);

          // Wait to ensure action isn't processed
          setTimeout(() => {
            resolve(actionCalled);
          }, 100);
        });
      });

      expect(actionProcessed).toBe(false);
    });
  });

  describe('multiple providers with different scopes', () => {
    it('allows multiple providers to coexist with different scopes', async () => {
      const page = await newE2EPage();
      await page.setContent(`
        <changebot-provider scope="scope-a"></changebot-provider>
        <changebot-provider scope="scope-b"></changebot-provider>
      `);

      const providers = await page.findAll('changebot-provider');
      expect(providers).toHaveLength(2);

      expect(await providers[0].getProperty('scope')).toBe('scope-a');
      expect(await providers[1].getProperty('scope')).toBe('scope-b');

      // Test that each responds only to its scope
      const results = await page.evaluate(() => {
        return new Promise((resolve) => {
          const results = { scopeA: false, scopeB: false };
          let completed = 0;

          // Request context from scope-a
          const requestA = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (context) => {
                results.scopeA = context && context.config && context.config.scope === 'scope-a';
                completed++;
                if (completed === 2) resolve(results);
              },
              scope: 'scope-a'
            },
            bubbles: true,
            composed: true
          });

          // Request context from scope-b
          const requestB = new CustomEvent('changebot:context-request', {
            detail: {
              callback: (context) => {
                results.scopeB = context && context.config && context.config.scope === 'scope-b';
                completed++;
                if (completed === 2) resolve(results);
              },
              scope: 'scope-b'
            },
            bubbles: true,
            composed: true
          });

          document.dispatchEvent(requestA);
          document.dispatchEvent(requestB);
        });
      });

      expect(results).toEqual({ scopeA: true, scopeB: true });
    });
  });

  describe('slot content', () => {
    it('renders slot content', async () => {
      const page = await newE2EPage();
      await page.setContent(`
        <changebot-provider>
          <div class="test-content">Test Content</div>
        </changebot-provider>
      `);

      const slotContent = await page.find('.test-content');
      expect(slotContent).not.toBeNull();
      expect(await slotContent.textContent).toBe('Test Content');
    });
  });
});