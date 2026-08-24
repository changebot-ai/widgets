# Test suite plan

The goal: make the suite complete enough that a refactor which breaks the widget
for customers fails a test. This file records the current state of the suite.
The phased plan that used to live here is implemented; see the gaps list at the
bottom for what was deliberately left out.

## Current state

All tests live in `packages/core`. CI (`.github/workflows/ci.yml`) runs the
full suite plus the built-output smoke test on every push to main and every
pull request. `release.yml` still runs the suite before deploying.

### Unit (spec) tests

Component specs cover badge, panel, toast, banner, and the provider's
user-tracking and API-caching internals. `store/registry.spec.ts` covers
timeouts, unsubscribe races, and throwing subscribers. `store/index.spec.ts`
covers publication transformation (string tags, bare-array payloads), widget
defaults, the badge-count calculation (null and boundary timestamps, invalid
dates), and `loadUpdates` URL building, error, and abort paths. Utility specs
cover `api.ts` (slug vs URL base, NaN timestamp rejection, NullAPI),
`update-checker.ts` (the isNewer × matchesTarget × currentUpdateId matrix),
`date-utils.ts`, `safe-storage.ts` (throwing storage), `theme-manager.ts`
(theme beats light/dark beats fallback, media-query flips), and
`highlight-consumer.ts`.

### E2E tests

Shared helpers live in `src/test-utils/e2e-helpers.ts`: a fetch mock installed
before page load, deterministic waits on the `data-changebot-state="connected"`
attribute and on shadow-DOM selectors, and a localStorage seeding helper for
multi-visit journeys. No test waits with `setTimeout`.

Customer journeys covered in the browser:

- `actions.e2e.ts`: every `changebot:action` type, with and without `scope`,
  including wrong-scope events being ignored and viewed-state persistence.
- `changebot-banner.e2e.ts`: show collapsed → expand → dismiss → persisted
  across reload, plus the userId variant asserting the PATCH body contains
  `last_viewed_banner_at`.
- `changebot-toast.e2e.ts`: visibility driven through provider data, dismiss
  persistence across reload, and independence from the badge's `lastViewed`.
- `integration.e2e.ts`: the userId journey and the anonymous journey (first
  visit initializes `lastViewed`, a newer publication shows a count, opening
  the panel clears it and it stays cleared).
- `changebot-panel-content.e2e.ts`: ActionText attachment conversion, relative
  URL rewriting, tags with contrast colors, `hosted_url` title links, widget
  title/subheading, the `branded` footer toggle, and the loading, empty, and
  API-failure (500 and network reject) states.
- `changebot-panel.e2e.ts`: focus moving into the panel on open, the modal
  Tab/Shift+Tab focus trap, and the `trigger` selector prop including
  elements added after mount.
- `changebot-badge.e2e.ts`: the remount scenario (a framework re-render
  removes and re-adds the badge).

### Built-output smoke test

`packages/core/scripts/smoke-test.mjs` (run as `pnpm run test.smoke`, after a
build) serves `dist/` and loads a plain HTML page through the lazy loader
bundle — the same path a customer embed uses. It asserts all five elements
define, hydrate, and connect, the badge shows a count, a badge click opens the
panel, and no uncaught page errors occur.

## Known gaps

- Confetti is spec-only; no browser test fires a real confetti burst.
- The smoke test covers the lazy loader bundle but not the
  `dist-custom-elements` tree-shakable imports or the React/Vue wrappers.
