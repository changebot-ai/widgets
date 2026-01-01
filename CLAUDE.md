# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a pnpm monorepo containing a Stencil web components library with auto-generated React and Vue wrappers. Stencil compiles to standards-based Web Components using TypeScript, JSX, and a virtual DOM.

### Monorepo Structure

```
packages/
├── core/     # @changebot/core - Stencil web components (source of truth)
├── react/    # @changebot/widgets-react - Auto-generated React wrappers
└── vue/      # @changebot/widgets-vue - Auto-generated Vue wrappers
```

- **Core** contains all component logic; React/Vue packages are generated during build
- Packages use `workspace:^` references and must be kept at the same version
- Framework wrappers are generated via Stencil output targets in `stencil.config.ts`

## Development Commands

- `pnpm install` - Install dependencies (or `npm install`)
- `pnpm start` - Start development server with watch mode and live reload (or `npm start`)
- `pnpm run build` - Build components for production (or `npm run build`)
- `pnpm test` - Run all tests (both spec and e2e) (or `npm test`)
- `pnpm run test.watch` - Run tests in watch mode (or `npm run test.watch`)
- `pnpm run generate` - Generate a new component scaffold (or `npm run generate`)

**Note**: This project uses `pnpm` as the package manager. All npm commands will also work.

## Project Architecture

### Build Configuration

The project uses `stencil.config.ts` with multiple output targets:
- `dist` - Distribution with lazy loading support (ESM loader in `../loader`)
- `dist-custom-elements` - Standalone custom elements for tree-shaking
- `docs-readme` - Auto-generated component documentation
- `www` - Development server output

### Adding Demo Pages

Demo pages showcase component usage and are served by the development server. To add a new demo page:

1. **Create the HTML file** in `packages/core/src/` (e.g., `my-demo.html`)
2. **Add to copy configuration** in `packages/core/stencil.config.ts`:
   ```typescript
   {
     type: 'www',
     copy: [
       { src: 'dashboard.html' },
       { src: 'my-demo.html' },  // Add your new file here
       // ... other files
     ],
   }
   ```
3. **Link from index.html** by adding a link in `packages/core/src/index.html`
4. **Restart dev server** - Stop and restart `npm start` to copy the new file to `www/`

Demo pages are copied from `src/` to `www/` during build. The dev server watches `src/` for changes to existing files but requires a restart to detect new files.

### Available Demo Pages

When running `pnpm start`, the dev server serves at `http://localhost:<port>` (port varies, commonly 3333, 3335, or 3336) with these demo pages:

- **Vanilla JS** (`/vanilla-demo.html`) - Plain JavaScript with all testing controls. Uses local build with mock data.
- **React** (`/react-demo.html`) - React 18 integration demo. Uses Composition API with refs.
- **Vue 3** (`/vue-demo.html`) - Vue 3 Composition API demo. Uses ref/reactive for state.
- **Production (CDN)** (`/production-demo.html`) - Loads from CDN with real API. Tests deployed widgets.
- **UserId Testing** (`/userid-demo.html`) - Tests userId tracking with local mock server. Requires `pnpm run mock-server` (port 3456).

### Component Structure

Components live in `packages/core/src/components/[component-name]/`:
- `[component-name].tsx` - Component implementation using `@Component` decorator, JSX with `h` function
- `[component-name].css` - Component styles
- `[component-name].spec.ts` - Unit tests using `newSpecPage` from `@stencil/core/testing`
- `[component-name].e2e.ts` - E2E tests using Puppeteer

Components use:
- `@Prop()` decorator for properties
- `@Component` decorator with `tag`, `styleUrl`, and `shadow: true` for Shadow DOM
- JSX with `h` import from `@stencil/core`
- Private methods for component logic

### Entry Points

- `packages/core/src/index.ts` - Library entry point (exports utilities and types, NOT components)
- Components are consumed via package exports defined in `package.json`
- Two consumption patterns: lazy loading via loader script, or direct custom element imports

### Testing

**Running Tests:**
- `pnpm test` - Runs all tests (both spec and e2e), equivalent to `stencil test --spec --e2e`
- `pnpm run test.watch` - Runs tests in watch mode for development

**Test Types:**
- **Spec tests** (`.spec.ts`) - Unit tests using `newSpecPage` from `@stencil/core/testing` for component snapshot testing
- **E2E tests** (`.e2e.ts`) - End-to-end tests using Puppeteer for browser automation testing

Tests run in headless shell mode (configured in `stencil.config.ts`).

## TypeScript Configuration

- Target: ES2022
- JSX factory: `h` (Stencil's JSX pragma)
- Decorators enabled for Stencil's `@Component`, `@Prop`, etc.
- Strict unused locals/parameters checking enabled

## Provider-Consumer Pattern

This library uses a provider-consumer pattern for sharing state between components:

- **Provider placement**: The `<changebot-provider>` listens at the document level and does NOT require consumer components to be nested inside it. Components can be placed anywhere on the page.
- **Scope-based communication**: Multiple providers can coexist using the `scope` prop for isolation.
- **Store registry**: Components connect to providers via a module-level registry (`waitForStore(scope)`)
- **Event-based actions**: External code uses `changebot:action` CustomEvents to trigger actions (openDisplay, closeDisplay, toggleDisplay, markViewed, markAllViewed)

**Correct usage examples:**
```html
<!-- Components can be siblings -->
<changebot-provider slug="my-app" />
<changebot-badge />

<!-- Or anywhere else on the page -->
<header>
  <changebot-badge />
</header>
<footer>
  <changebot-provider slug="my-app" />
</footer>
```

**Anti-pattern** (unnecessary nesting):
```html
<!-- ❌ Don't wrap - this is unnecessary -->
<changebot-provider slug="my-app">
  <changebot-badge />
</changebot-provider>
```

## Documentation Style

- Use self-closing syntax for components in documentation (e.g., `<changebot-provider />` not `<changebot-provider></changebot-provider>`)

## Testing-Only Props

The following props are for internal testing purposes only and should **not** be documented in public-facing documentation (README files, NPM docs, etc.):

- `baseUrl` (changebot-provider) - Base URL for custom API endpoint (e.g., `http://localhost:3456`). The widget appends paths like `/updates` and `/users/:userId` to this base.
- `mockData` (changebot-provider) - JSON string for loading mock data directly (for demos and testing when API is unavailable)

These props should be omitted from all customer-facing documentation.

## State Management

Uses `@stencil/store` with scope-based stores for multi-provider support:

- `createScopedStore()` creates isolated stores per provider instance
- Store state: `updates`, `widget`, `lastViewed`, `isOpen`, `newUpdatesCount`, `isLoading`, `error`
- Reactive subscriptions via `store.onChange(property, callback)`

### Services Interface

Consumer components receive a `services` object from the provider with this interface:

```typescript
interface Services {
  store: { state, onChange };  // Read-only state access with subscriptions
  display: {
    open: () => void;   // Opens panel AND marks as viewed (persists to localStorage/API)
    close: () => void;  // Closes the panel
  };
  config: { url, slug, scope };
}
```

**Key design principle**: All display operations go through `services.display`, ensuring side effects (marking as viewed, API sync) are always applied consistently. Internal store actions are not exposed to consumers.

## Theme System

Themes defined in `packages/core/src/utils/themes.ts` with 14 palettes (Catppuccin, Gruvbox, Dracula, Nord, etc.).

Theme selection priority:
1. Explicit `theme` prop → use that theme
2. `light`/`dark` props → auto-switch based on `prefers-color-scheme`
3. Fallback → first available theme

Theme manager (`utils/theme-manager.ts`) handles media query listeners for automatic dark mode switching.

## API Communication

- `ChangebotAPI` class in `utils/api.ts` handles all API calls
- Slug-based: `https://api.changebot.ai/v1/widgets/{slug}`
- `NullAPI` fallback when no slug/URL provided (logs warnings, returns null)
- Publications from API are transformed to `Update` type with normalized tags

## Version Management

```bash
# Bump all packages to new version
./scripts/bump-version.sh X.Y.Z
```

This updates:
- All three `package.json` files
- `packages/core/src/utils/version.ts` VERSION constant

GitHub Actions auto-release workflow creates tags and publishes to npm when version changes on main.

## Logging

Component-specific loggers in `utils/logger.ts`:
```typescript
const log = createLogger('🔌 Provider');
log.debug('message', { data });  // Respects LOGGING_ENABLED flag
log.warn('warning');             // Always shown
log.error('error');              // Always shown
```

Set `LOGGING_ENABLED = false` in logger.ts to disable debug/info logs.