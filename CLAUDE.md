# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Stencil web components library. Stencil is a compiler that generates standards-based Web Components using TypeScript, JSX, and a virtual DOM. Components are framework-agnostic and can be used standalone or with any major framework.

## Development Commands

- `npm install` - Install dependencies
- `npm start` - Start development server with watch mode and live reload
- `npm run build` - Build components for production
- `npm test` - Run all unit tests (both spec and e2e)
- `npm run test.watch` - Run tests in watch mode
- `npm run generate` - Generate a new component scaffold

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

### Component Structure

Components live in `src/components/[component-name]/`:
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

- `src/index.ts` - Library entry point (exports utilities and types, NOT components)
- Components are consumed via package exports defined in `package.json`
- Two consumption patterns supported: lazy loading via loader script, or direct custom element imports

### Testing

Tests run in headless shell mode (configured in `stencil.config.ts`). Unit tests use `newSpecPage` for component snapshot testing. E2E tests use Puppeteer.

## TypeScript Configuration

- Target: ES2022
- JSX factory: `h` (Stencil's JSX pragma)
- Decorators enabled for Stencil's `@Component`, `@Prop`, etc.
- Strict unused locals/parameters checking enabled

## Provider-Consumer Pattern

This library uses a provider-consumer pattern for sharing state between components:

- **Provider placement**: The `<changebot-provider>` listens at the document level and does NOT require consumer components to be nested inside it. Components can be placed anywhere on the page.
- **Scope-based communication**: Multiple providers can coexist using the `scope` prop for isolation.
- **Event-based**: Uses CustomEvents (`changebot:context-request`, `changebot:action`) for framework-agnostic communication.

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

- `url` (changebot-provider) - Custom API endpoint URL for testing purposes
- `mockData` (changebot-provider) - JSON string for loading mock data directly (for demos and testing when API is unavailable)

These props should be omitted from all customer-facing documentation.