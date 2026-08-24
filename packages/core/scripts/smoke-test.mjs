/**
 * Built-output smoke test.
 *
 * Serves the built dist/ directory, loads a plain HTML page that pulls the
 * lazy loader bundle exactly like a customer embed does, and asserts that all
 * five elements define and hydrate, the consumers connect to the provider,
 * and a badge click opens the panel. This is the only layer that catches
 * "source is fine, bundle is broken".
 *
 * Requires a prior `pnpm run build`. Run with `pnpm run test.smoke`.
 */

import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const coreDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(coreDir, 'dist');
const loaderFile = path.join(distDir, 'widgets', 'widgets.esm.js');

const CONSUMER_TAGS = ['changebot-badge', 'changebot-panel', 'changebot-banner', 'changebot-toast'];
const ALL_TAGS = ['changebot-provider', ...CONSUMER_TAGS];

const OLD_LAST_VIEWED = new Date('2024-01-01T00:00:00Z').getTime();

const MOCK_DATA = JSON.stringify({
  widget: { title: 'Smoke Test', slug: 'smoke', branded: true },
  publications: [
    {
      id: 1,
      title: 'Regular Update',
      content: '<p>Panel content</p>',
      display_date: '2025-01-02',
      published_at: '2025-01-02T00:00:00Z',
      expires_on: null,
      highlight_target: null,
      hosted_url: null,
      tags: [],
    },
    {
      id: 2,
      title: 'Banner Update',
      content: '<p>Banner content here.</p>',
      display_date: '2025-01-03',
      published_at: '2025-01-03T00:00:00Z',
      expires_on: null,
      highlight_target: 'banner',
      hosted_url: null,
      tags: [],
    },
    {
      id: 3,
      title: 'Toast Update',
      content: '<p>Toast content here.</p>',
      display_date: '2025-01-04',
      published_at: '2025-01-04T00:00:00Z',
      expires_on: null,
      highlight_target: 'toast',
      hosted_url: null,
      tags: [],
    },
  ],
});

const PAGE_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script type="module" src="/dist/widgets/widgets.esm.js"></script>
</head>
<body>
  <changebot-provider mock-data='${MOCK_DATA}'></changebot-provider>
  <changebot-badge></changebot-badge>
  <changebot-panel></changebot-panel>
  <changebot-banner></changebot-banner>
  <changebot-toast></changebot-toast>
</body>
</html>
`;

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url, 'http://localhost').pathname;

    if (urlPath === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(PAGE_HTML);
      return;
    }

    if (urlPath.startsWith('/dist/')) {
      const filePath = path.join(coreDir, path.normalize(urlPath).replace(/^([/\\])+/, ''));
      if (filePath.startsWith(distDir) && existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
        createReadStream(filePath).pipe(res);
        return;
      }
    }

    res.writeHead(404);
    res.end('not found');
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function waitFor(page, description, fn, arg) {
  try {
    await page.waitForFunction(fn, arg, { timeout: 10_000, polling: 100 });
    console.log(`ok: ${description}`);
  } catch (error) {
    throw new Error(`FAILED: ${description}\n${error.message}`);
  }
}

async function run() {
  if (!existsSync(loaderFile)) {
    throw new Error(`Loader bundle not found at ${loaderFile} — run \`pnpm run build\` first.`);
  }

  const server = await startServer();
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.addInitScript(lastViewed => {
      localStorage.clear();
      localStorage.setItem('changebot:lastViewed:default', String(lastViewed));
    }, OLD_LAST_VIEWED);

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

    await waitFor(page, 'all five custom elements are defined', tags => tags.every(tag => customElements.get(tag)), ALL_TAGS);

    await waitFor(page, 'all five elements hydrate', tags => tags.every(tag => document.querySelector(tag)?.classList.contains('hydrated')), ALL_TAGS);

    await waitFor(
      page,
      'all consumers connect to the provider',
      tags => tags.every(tag => document.querySelector(tag)?.getAttribute('data-changebot-state') === 'connected'),
      CONSUMER_TAGS,
    );

    await waitFor(page, 'badge shows the new-updates count', () => {
      const badge = document.querySelector('changebot-badge')?.shadowRoot?.querySelector('.badge');
      const count = document.querySelector('changebot-badge')?.shadowRoot?.querySelector('.badge__count');
      return badge && !badge.classList.contains('badge--hidden') && count?.textContent === '3';
    });

    await waitFor(page, 'banner renders its highlighted update', () => {
      return !!document.querySelector('changebot-banner')?.shadowRoot?.querySelector('.banner');
    });

    await waitFor(page, 'toast renders its highlighted update', () => {
      return !!document.querySelector('changebot-toast')?.shadowRoot?.querySelector('.toast');
    });

    await page.evaluate(() => {
      document.querySelector('changebot-badge').shadowRoot.querySelector('.badge').click();
    });

    await waitFor(page, 'badge click opens the panel', () => {
      const panel = document.querySelector('changebot-panel')?.shadowRoot?.querySelector('.panel');
      return panel?.classList.contains('panel--open');
    });

    await waitFor(page, 'opening the panel clears the badge count', () => {
      const badge = document.querySelector('changebot-badge')?.shadowRoot?.querySelector('.badge');
      return badge?.classList.contains('badge--hidden');
    });

    if (pageErrors.length > 0) {
      throw new Error(`FAILED: page threw errors:\n${pageErrors.join('\n')}`);
    }
    console.log('ok: no uncaught page errors');

    console.log('\nBuilt-output smoke test passed.');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(error => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
