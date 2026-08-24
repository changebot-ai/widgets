# Test suite plan

The goal: make the suite complete enough that a refactor which breaks the widget
for customers fails a test. This file records the current state of the suite,
the gaps, and the work planned to fill them, in order.

## Current state

The suite is 4,351 lines across 11 files, all in `packages/core`.

Spec (unit) tests are in decent shape. Badge, panel, toast, and banner each
have isolation tests with mocked services. The provider's user-tracking and
API-caching internals are covered. `store/registry.spec.ts` covers timeouts,
unsubscribe races, and throwing subscribers.

E2E tests are the weak layer. `integration.e2e.ts` covers provider/badge/panel
wiring, scope isolation, ESC handling, and one userId journey with a fetch
mock. The per-component e2e files mostly assert "renders and has class X".

## Gaps

Customer-facing behavior with no browser-level test:

1. The banner has no e2e file at all. The journey — publication with
   `highlight_target: 'banner'` arrives, collapsed preview shows the first
   sentence, click expands, dismiss writes `lastViewedBanner` to localStorage,
   banner does not reappear on reload — is only covered by isolated spec tests.
2. The toast e2e never drives the toast through the provider. Every test sets
   `isVisible`/`currentUpdate` directly, so the real pipeline (data with
   `highlight_target: 'toast'` → show; dismiss → `lastViewedToast` persisted →
   stays dismissed) is unexercised. Confetti is spec-only.
3. The `changebot:action` CustomEvent API is untested anywhere. It is the
   documented public integration surface (`openDisplay`, `closeDisplay`,
   `toggleDisplay`, `markViewed`, `markAllViewed`) and no test dispatches one.
4. The anonymous-user journey (no `userId`) is untested: first visit
   initializes `lastViewed` and hides the badge; a newer publication on the
   next visit shows a count; opening the panel clears it and it stays cleared.
   Only the userId variant is tested.
5. Panel content rendering. `transformHtmlUrls` in `changebot-panel.tsx`
   (ActionText attachments converted to `<figure><img>`, relative `src`/`href`
   rewritten to `app.changebot.ai`) has zero tests. Also untested: tags with
   contrast colors, `hosted_url` title links, loading state, empty state,
   widget title/subheading, and the `branded: false` footer toggle.
6. API failure paths in the browser: server returns 500 or the network
   rejects → badge stays hidden, panel opens to the empty state, no crash.
7. Modal focus behavior: focus moving into the panel on open and the
   Tab/Shift+Tab focus trap have no tests. The `trigger` selector prop is
   spec-tested but not e2e-tested.

Modules with no unit tests: `store/index.ts` (`transformPublications`,
`extractWidget`, `calculateNewUpdatesCount` — the badge-count logic itself,
`loadUpdates` URL building and abort handling), `utils/api.ts`,
`utils/update-checker.ts`, `utils/highlight-consumer.ts`,
`utils/theme-manager.ts`, `utils/safe-storage.ts`, `utils/date-utils.ts`.
Component specs exercise some of these indirectly, but not the edge cases
(string tags, invalid `published_at`, localStorage throwing in private mode).

Infrastructure problems that undermine trust in the suite:

- Tests only run inside `release.yml`. Nothing runs them on pushes or PRs, so
  a broken main only surfaces at release time.
- E2E tests wait with `setTimeout` (acknowledged in the `integration.e2e.ts`
  header). A deterministic ready signal already exists: `connectConsumer` sets
  `data-changebot-state="connected"` on every consumer, and no test uses it.
- `changebot-badge.e2e.ts` has a skipped test for the remount scenario
  (a framework re-render removes and re-adds the badge). That is a real
  customer situation and it is currently unverified.
- Nothing tests the built output. Customers consume the CDN loader bundle,
  but every test runs against source through Stencil's dev pipeline, so a
  packaging regression (loader, lazy loading, custom-element registration)
  would pass the suite.

## Plan

### Phase 0 — infrastructure

Everything after this depends on it.

1. Add `.github/workflows/ci.yml` running `pnpm test` on push and PR, with the
   chrome-headless-shell install step copied from `release.yml`.
2. Create a shared e2e helper module: `injectFetchMock` (generalized from the
   one in `integration.e2e.ts`), `waitForConnected(page, tag)` polling
   `data-changebot-state="connected"`, `waitForPanelOpen`/`waitForPanelClosed`
   via `page.waitForFunction`, and a localStorage seeding helper for
   multi-visit journeys.
3. Convert the existing `setTimeout` waits to those helpers and delete the
   tech-debt header comment.

### Phase 1 — customer-journey e2e tests

This is the refactoring safety net and the bulk of the work.

4. `actions.e2e.ts`: dispatch each `changebot:action` type, with and without
   `scope`. Assert the panel and badge react, and that wrong-scope events are
   ignored.
5. `changebot-banner.e2e.ts` (new): the full show → expand → dismiss →
   persist-across-reload journey, driven entirely by provider `mock-data`.
   Add a userId variant asserting the PATCH body contains
   `last_viewed_banner_at`.
6. Rework `changebot-toast.e2e.ts`: drive visibility through provider data
   instead of setting private state; test dismiss persistence and independence
   from the badge's `lastViewed`.
7. Add an anonymous-user journey test alongside the existing userId journey.
8. Panel content e2e: one rich fixture exercising ActionText attachment
   conversion, relative URL rewriting, tags, `hosted_url` links, subheading,
   and the `branded` footer; separate cases for loading, empty, and
   API-failure states.
9. Modal focus test (focus enters the panel on open; Tab and Shift+Tab wrap)
   and a `trigger` prop e2e.
10. Fix and unskip the badge remount test.

### Phase 2 — unit tests for untested logic

11. `store/index.spec.ts`: `calculateNewUpdatesCount` (null and invalid dates,
    boundary timestamps), `transformPublications` (string tags, bare-array
    payload), `extractWidget` defaults, `getStorageKey`, `loadUpdates` URL
    construction, error and abort paths with mocked fetch.
12. Specs for `api.ts` (slug vs URL base, NaN timestamp rejection, NullAPI
    warnings), `update-checker.ts` (the isNewer × matchesTarget ×
    currentUpdateId matrix), `date-utils.ts`, `safe-storage.ts` (throwing
    storage), `theme-manager.ts` (theme prop beats light/dark beats fallback;
    media-query flips), and `highlight-consumer.ts`.

### Phase 3 — packaging guard

13. A built-output smoke test: build, serve `www`, load a plain HTML page that
    pulls the loader script, and assert all five elements define, hydrate, and
    a badge click opens the panel. This is the only layer that catches
    "source is fine, bundle is broken" — the failure mode that reaches
    customers directly.

Rough sizing: Phase 0 is a day, Phase 1 is two to three days, Phases 2 and 3
a day or two more.
