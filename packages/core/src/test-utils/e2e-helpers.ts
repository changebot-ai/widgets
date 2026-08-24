/**
 * Shared helpers for e2e tests.
 *
 * Waiting: consumers set `data-changebot-state="connected"` when they receive
 * services from a provider (see store/registry.ts `connectConsumer`), so tests
 * wait on that attribute instead of sleeping.
 *
 * Fetch mocking: Stencil's e2e harness owns Puppeteer request interception, so
 * network mocks are installed by patching `window.fetch` before the document
 * loads (via `evaluateOnNewDocument`).
 */

import type { E2EPage } from '@stencil/core/testing';

const WAIT_OPTIONS = { timeout: 5000, polling: 50 };

/**
 * Waits until every element matching `tag` has connected to its provider.
 */
export async function waitForConnected(page: E2EPage, tag: string): Promise<void> {
  await page.waitForFunction(
    (t: string) => {
      const els = Array.from(document.querySelectorAll(t));
      return els.length > 0 && els.every(el => el.getAttribute('data-changebot-state') === 'connected');
    },
    WAIT_OPTIONS,
    tag,
  );
}

/**
 * Waits until a shadow-DOM selector matches inside the `index`-th element
 * with the given tag. Returns nothing; throws on timeout.
 */
export async function waitForShadow(page: E2EPage, tag: string, selector: string, index: number = 0): Promise<void> {
  await page.waitForFunction(
    (t: string, sel: string, i: number) => {
      const host = document.querySelectorAll(t)[i];
      return !!host?.shadowRoot?.querySelector(sel);
    },
    WAIT_OPTIONS,
    tag,
    selector,
    index,
  );
}

/**
 * Waits until a shadow-DOM selector matches NO element inside the `index`-th
 * element with the given tag. The host element itself must exist.
 */
export async function waitForShadowGone(page: E2EPage, tag: string, selector: string, index: number = 0): Promise<void> {
  await page.waitForFunction(
    (t: string, sel: string, i: number) => {
      const host = document.querySelectorAll(t)[i];
      return !!host && !host.shadowRoot?.querySelector(sel);
    },
    WAIT_OPTIONS,
    tag,
    selector,
    index,
  );
}

export async function waitForPanelOpen(page: E2EPage, index: number = 0): Promise<void> {
  await waitForShadow(page, 'changebot-panel', '.panel.panel--open', index);
}

export async function waitForPanelClosed(page: E2EPage, index: number = 0): Promise<void> {
  await waitForShadow(page, 'changebot-panel', '.panel.panel--closed:not(.panel--open)', index);
}

/**
 * Seeds localStorage before the page's scripts run. Values are written at
 * document start, so the provider's hydration sees them. Use for multi-visit
 * journeys (e.g. a `changebot:lastViewed:<scope>` timestamp from a previous
 * visit).
 */
export async function seedLocalStorage(page: E2EPage, entries: Record<string, string>): Promise<void> {
  await page.evaluateOnNewDocument((toSet: Record<string, string>) => {
    for (const [key, value] of Object.entries(toSet)) {
      localStorage.setItem(key, value);
    }
  }, entries);
}

export interface FetchMockOptions {
  /** Base API URL the widget talks to, e.g. https://api.changebot.ai/v1/widgets/test-widget */
  apiBase: string;
  /** Response body for GET {apiBase}/updates (array or {widget, publications}). */
  updates?: unknown;
  /** HTTP status for GET {apiBase}/updates (default 200). */
  updatesStatus?: number;
  /** When true, GET {apiBase}/updates rejects like a network failure. */
  updatesNetworkError?: boolean;
  /** When true, GET {apiBase}/updates never resolves (for loading-state tests). */
  updatesHang?: boolean;
  /** Response body for GET {apiBase}/users/:userId. */
  user?: {
    last_seen_at: string | null;
    last_viewed_banner_at?: string | null;
    last_viewed_toast_at?: string | null;
  };
}

export interface FetchMockHandle {
  /** Bodies of all PATCH {apiBase}/users/:userId requests, oldest first. */
  getPatchBodies(): Promise<Array<Record<string, unknown>>>;
  /** Body of the most recent PATCH, or null if none happened. */
  getLastPatchBody(): Promise<Record<string, unknown> | null>;
  /** Waits until at least `count` PATCH requests have been sent. */
  waitForPatch(count?: number): Promise<void>;
}

/**
 * Installs a fetch mock for the widget API before the page loads. Unmatched
 * requests fall through to the real fetch. Call before `page.setContent`.
 */
export async function injectFetchMock(page: E2EPage, options: FetchMockOptions): Promise<FetchMockHandle> {
  await page.evaluateOnNewDocument((opts: FetchMockOptions) => {
    (window as any).__changebotPatches = [];

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method || 'GET').toUpperCase();

      if (url === `${opts.apiBase}/updates` && method === 'GET') {
        if (opts.updatesHang) {
          return new Promise<Response>(() => {});
        }
        if (opts.updatesNetworkError) {
          throw new TypeError('Failed to fetch');
        }
        return new Response(JSON.stringify(opts.updates ?? { publications: [] }), {
          status: opts.updatesStatus ?? 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.startsWith(`${opts.apiBase}/users/`)) {
        if (method === 'GET') {
          return new Response(
            JSON.stringify({
              id: decodeURIComponent(url.slice(`${opts.apiBase}/users/`.length)),
              last_seen_at: opts.user?.last_seen_at ?? null,
              last_viewed_banner_at: opts.user?.last_viewed_banner_at ?? null,
              last_viewed_toast_at: opts.user?.last_viewed_toast_at ?? null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (method === 'PATCH') {
          const body = init?.body ? JSON.parse(init.body as string) : null;
          (window as any).__changebotPatches.push(body);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return originalFetch(input, init);
    };
  }, options as any);

  return {
    getPatchBodies: () => page.evaluate(() => (window as any).__changebotPatches ?? []),
    getLastPatchBody: async () => {
      const patches = await page.evaluate(() => (window as any).__changebotPatches ?? []);
      return patches.length > 0 ? patches[patches.length - 1] : null;
    },
    waitForPatch: async (count: number = 1) => {
      await page.waitForFunction((n: number) => ((window as any).__changebotPatches ?? []).length >= n, WAIT_OPTIONS, count);
    },
  };
}
