import { expect } from '@playwright/test';
import { matchers, createConfig } from '@stencil/playwright';

expect.extend(matchers);

export default createConfig({
  testDir: './src',
  // Each test builds its own page with setContent, so they do not share state
  // and can run together.
  fullyParallel: true,
  // A component that never connects to its provider fails by timing out, so
  // keep the per-test budget short enough to notice.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Playwright's downloaded Chromium expects system libraries that a Nix
        // dev shell does not put where it looks. The shell exports a browser
        // path; when it is set, use that browser instead of the bundled one.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
});
