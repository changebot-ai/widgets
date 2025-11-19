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

## Documentation Style

- Use self-closing syntax for components in documentation (e.g., `<changebot-provider />` not `<changebot-provider></changebot-provider>`)

## Testing-Only Props

The following props are for internal testing purposes only and should **not** be documented in public-facing documentation (README files, NPM docs, etc.):

- `pollInterval` (changebot-provider) - Used for testing automatic polling behavior
- `url` (changebot-provider) - Custom API endpoint URL for testing purposes
- `mockData` (changebot-provider) - JSON string for loading mock data directly (for demos and testing when API is unavailable)

These props should be omitted from all customer-facing documentation.