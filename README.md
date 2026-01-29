# Changebot Widgets

Web components for displaying product updates from Changebot.

## Features

- 🎨 **15 Built-in Themes** - Catppuccin, Gruvbox, Dracula, Nord, Solarized, Everforest, Tokyo Night, Cyberpunk, Frost, and more
- 🌓 **Light/Dark Mode** - Automatic theme switching based on system preferences
- 🎯 **Multiple Display Modes** - Drawer (left/right) or modal
- 📱 **Fully Responsive** - Works on all screen sizes
- ♿ **Accessible** - ARIA labels, keyboard navigation, focus management
- 🔧 **Fully Customizable** - Override any color with CSS variables
- 🚀 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS

## Installation

### Option 1: CDN (Recommended for quick setup)

Load directly from CDN - no build step required:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
    <!-- Module scripts are deferred by default and won't block rendering -->
    <script type="module" src="https://widgets.changebot.ai/latest/widgets.esm.js"></script>
  </head>
  <body>
    <changebot-provider slug="your-slug" />

    <!-- Your app content -->

    <!-- Badge shows update count -->
    <changebot-badge />

    <!-- Drawer displays updates (hidden until opened) -->
    <changebot-panel mode="drawer-right" />
  </body>
</html>
```

For production, pin to a specific version:

```html
<script type="module" src="https://widgets.changebot.ai/v0.1.22/widgets.esm.js"></script>
```

### Option 2: npm (For bundled apps)

```bash
npm install @changebot/core
```

Then import in your JavaScript:

```javascript
import { defineCustomElements } from '@changebot/core/loader';

defineCustomElements();
```

## Components

### changebot-provider

Required component that manages state and API calls.

**Props:**

- `slug` (string, required) - Your Changebot product slug
- `scope` (string, default: "default") - Scope for multiple providers
- `user-id` (string, optional) - User identifier for cross-device tracking
- `user-data` (string, optional) - JSON string with user metadata (e.g., email, name)

```html
<changebot-provider slug="your-team" />

<!-- With user tracking -->
<changebot-provider slug="your-team" user-id="user_123" user-data='{"email":"user@example.com"}' />
```

### changebot-badge

Badge that displays the count of new updates.

**Props:**

- `scope` (string, default: "default") - Connect to matching provider
- `theme` (string, optional) - Theme name (see themes below)
- `light` (string, optional) - Theme for light mode
- `dark` (string, optional) - Theme for dark mode
- `indicator` (string, default: "count") - Display style: "count" or "dot"

```html
<!-- Fixed theme -->
<changebot-badge theme="cyberpunk" />

<!-- Auto light/dark switching -->
<changebot-badge light="catppuccin-latte" dark="catppuccin-mocha" />

<!-- Show dot instead of count -->
<changebot-badge indicator="dot" />
```

### changebot-panel

Drawer/modal that displays the list of updates.

**Props:**

- `scope` (string, default: "default") - Connect to matching provider
- `theme` (string, optional) - Theme name
- `light` (string, optional) - Theme for light mode
- `dark` (string, optional) - Theme for dark mode
- `mode` (string, default: "drawer-right") - Display mode:
  - `drawer-right` - Slides in from right
  - `drawer-left` - Slides in from left
  - `modal` - Centered overlay

**Methods:**

- `open()` - Open the drawer
- `close()` - Close the drawer
- `setUpdates(updates)` - Set updates manually

```html
<changebot-panel mode="drawer-right" theme="nord" />
```

### changebot-banner

Top banner notification for highlighting important updates. Automatically displays updates marked with `highlight_target="banner"`.

**Props:**

- `scope` (string, default: "default") - Connect to matching provider
- `theme` (string, optional) - Theme name
- `light` (string, optional) - Theme for light mode
- `dark` (string, optional) - Theme for dark mode

**Methods:**

- `show(update)` - Show the banner with a specific update
- `dismiss()` - Dismiss the banner
- `toggle()` - Toggle expanded state

**Behavior:**

- Automatically shows for updates with `highlight_target="banner"`
- Click to expand and read full content
- Dismiss button marks update as viewed
- Shows first sentence by default, expands to show full content

```html
<changebot-banner theme="nord" />
```

### changebot-toast

Toast notification for highlighting updates. Automatically displays updates marked with `highlight_target="toast"`.

**Props:**

- `scope` (string, default: "default") - Connect to matching provider
- `theme` (string, optional) - Theme name
- `light` (string, optional) - Theme for light mode
- `dark` (string, optional) - Theme for dark mode
- `position` (string, default: "bottom-right") - Position on screen:
  - `top-left`
  - `top-right`
  - `bottom-left`
  - `bottom-right`
- `auto-dismiss` (number, optional) - Auto-dismiss after N seconds

**Methods:**

- `show(update)` - Show the toast with a specific update
- `dismiss()` - Dismiss the toast

**Behavior:**

- Automatically shows for updates with `highlight_target="toast"`
- Optional auto-dismiss after specified seconds
- Can be manually dismissed with close button
- Marks update as viewed when dismissed

```html
<!-- Basic toast -->
<changebot-toast />

<!-- Positioned toast with auto-dismiss -->
<changebot-toast position="top-right" auto-dismiss="5" theme="dracula" />
```

## Opening the Drawer from Custom Elements

You can trigger the drawer from **any element** on your page by dispatching a custom event:

```html
<!-- Custom button to open drawer -->
<button onclick="openUpdates()">View What's New</button>

<script>
  function openUpdates() {
    const event = new CustomEvent('changebot:action', {
      detail: {
        type: 'openDisplay',
        scope: 'default', // Match your provider scope
      },
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  }
</script>
```

Or inline:

```html
<button
  onclick="document.dispatchEvent(new CustomEvent('changebot:action', {
  detail: { type: 'openDisplay', scope: 'default' },
  bubbles: true,
  composed: true
}))"
>
  What's New
</button>
```

You can trigger it from anywhere:

- Custom buttons or links
- Keyboard shortcuts
- Navigation menu items
- After certain user actions
- On page load (if needed)

## Themes

### Built-in Themes

**Catppuccin:**

- `catppuccin-latte` (light)
- `catppuccin-frappe` (dark)
- `catppuccin-macchiato` (dark)
- `catppuccin-mocha` (dark)

**Gruvbox:**

- `gruvbox-light`
- `gruvbox-dark`

**Other:**

- `dracula`
- `nord`
- `solarized-light`
- `solarized-dark`
- `everforest-light`
- `everforest-dark`
- `tokyo-night`
- `cyberpunk`
- `frost`

### Custom Themes

Override theme colors with CSS variables:

```html
<style>
  changebot-badge {
    --cb-badge-bg: #ff6600;
    --cb-badge-text: #ffffff;
  }

  changebot-panel {
    --cb-panel-bg: #1a1d29;
    --cb-panel-surface: #252938;
    --cb-panel-text: #e8eaed;
    --cb-panel-accent: #ff6600;
    --cb-panel-link: #5eb3f6;
    --cb-panel-meta: #a78bfa;
    --cb-panel-border: #3d4354;
  }
</style>
```

See the [custom theme demo](/custom-theme.html) for a complete example.

## Advanced Usage

### Multiple Scopes

Use multiple providers for different update feeds:

```html
<!-- Admin updates -->
<changebot-provider slug="admin-updates" scope="admin" />
<changebot-badge scope="admin"></changebot-badge>
<changebot-panel scope="admin"></changebot-panel>

<!-- User updates -->
<changebot-provider slug="user-updates" scope="user" />
<changebot-badge scope="user"></changebot-badge>
<changebot-panel scope="user"></changebot-panel>
```

### Programmatic Control

```javascript
// Get drawer reference
const drawer = document.querySelector('changebot-panel');

// Open/close programmatically
await drawer.open();
await drawer.close();

// Set updates manually
await drawer.setUpdates([
  {
    id: 1,
    title: 'New Feature',
    content: '<p>Description here</p>',
    display_date: '2025-01-29',
    published_at: new Date().toISOString(),
    expires_on: null,
    highlight_target: null,
    hosted_url: null,
    tags: [{ id: 1, name: 'Feature', color: '#3b82f6' }],
  },
]);
```

### Using with React

Install the React wrapper:

```bash
npm install @changebot/widgets-react
```

Then use the components in your React app:

```tsx
import { ChangebotProvider, ChangebotBadge, ChangebotPanel, ChangebotBanner, ChangebotToast } from '@changebot/widgets-react';

function App() {
  return (
    <div>
      <ChangebotProvider slug="your-slug" />

      <header>
        <h1>My App</h1>
        <ChangebotBadge theme="nord" />
      </header>

      <ChangebotPanel mode="drawer-right" light="catppuccin-latte" dark="catppuccin-mocha" />
      <ChangebotBanner theme="nord" />
      <ChangebotToast position="bottom-right" autoDismiss={5} />
    </div>
  );
}
```

### Using with Vue

Install the Vue wrapper:

```bash
npm install @changebot/widgets-vue
```

Then use the components in your Vue app:

```vue
<template>
  <div>
    <changebot-provider slug="your-slug" />

    <header>
      <h1>My App</h1>
      <changebot-badge theme="nord" />
    </header>

    <changebot-panel mode="drawer-right" light="catppuccin-latte" dark="catppuccin-mocha" />
    <changebot-banner theme="nord" />
    <changebot-toast position="bottom-right" :auto-dismiss="5" />
  </div>
</template>

<script setup>
import { ChangebotProvider, ChangebotBadge, ChangebotPanel, ChangebotBanner, ChangebotToast } from '@changebot/widgets-vue';
</script>
```

## API Reference

### changebot-provider

Required component that manages state and API calls.

| Prop        | Type   | Default     | Description                                          |
| ----------- | ------ | ----------- | ---------------------------------------------------- |
| `slug`      | string | -           | Your Changebot product slug                          |
| `scope`     | string | `"default"` | Scope for multiple providers                         |
| `user-id`   | string | -           | User identifier for cross-device tracking            |
| `user-data` | string | -           | JSON string with user metadata (e.g., email, name)   |

**Events:**

- Listens to `changebot:context-request` - Provides services to child components
- Listens to `changebot:action` - Handles actions dispatched by other components

### changebot-badge

Badge that displays the count of new updates.

| Prop         | Type    | Default     | Description                                         |
| ------------ | ------- | ----------- | --------------------------------------------------- |
| `scope`      | string  | `"default"` | Connect to matching provider                        |
| `theme`      | string  | -           | Fixed theme name (see themes below)                 |
| `light`      | string  | -           | Theme for light mode                                |
| `dark`       | string  | -           | Theme for dark mode                                 |
| `indicator`  | string  | `"count"`   | Display style: `"count"` or `"dot"`                 |

**Events:**

- Dispatches `changebot:context-request` - Requests services from provider
- Dispatches `changebot:action` - Opens the panel when clicked
- Listens to `changebot:lastViewed` - Updates count when panel is viewed

**Methods:**

- None (interaction via click)

**Behavior:**

- Automatically calculates new updates based on `localStorage` timestamp
- Clicking clears the badge and opens the panel
- Supports keyboard navigation (Enter/Space)

### changebot-panel

Drawer/modal that displays the list of updates.

| Prop    | Type   | Default          | Description                                             |
| ------- | ------ | ---------------- | ------------------------------------------------------- |
| `scope` | string | `"default"`      | Connect to matching provider                            |
| `theme` | string | -                | Fixed theme name                                        |
| `light` | string | -                | Theme for light mode                                    |
| `dark`  | string | -                | Theme for dark mode                                     |
| `mode`  | string | `"drawer-right"` | Display mode: `drawer-right`, `drawer-left`, or `modal` |

**Methods:**

- `open()` - Open the panel programmatically
- `close()` - Close the panel programmatically
- `setUpdates(updates)` - Set updates manually (for standalone mode)

**Events:**

- Dispatches `changebot:context-request` - Requests services from provider
- Dispatches `changebot:action` - Closes panel via action system
- Dispatches `changebot:lastViewed` - Notifies when panel is viewed
- Emits `changebot-last-viewed` - Stencil event for backward compatibility

**Behavior:**

- Automatically marks updates as viewed when opened
- Supports keyboard navigation (Escape to close, Tab for focus trap in modal mode)
- Clicking backdrop closes the panel
- Displays widget metadata (title, subheading) from API

### changebot-banner

Top banner notification for highlighting important updates.

| Prop    | Type   | Default     | Description                  |
| ------- | ------ | ----------- | ---------------------------- |
| `scope` | string | `"default"` | Connect to matching provider |
| `theme` | string | -           | Fixed theme name             |
| `light` | string | -           | Theme for light mode         |
| `dark`  | string | -           | Theme for dark mode          |

**Methods:**

- `show(update)` - Show the banner with a specific update
- `dismiss()` - Dismiss the banner
- `toggle()` - Toggle expanded state

**Events:**

- Dispatches `changebot:context-request` - Requests services from provider

**Behavior:**

- Automatically displays updates with `highlight_target="banner"`
- Shows first sentence by default, click to expand for full content
- Dismiss button marks update as viewed in localStorage
- Only expandable (click expands, but doesn't collapse)
- Supports keyboard navigation (Enter/Space to expand)

### changebot-toast

Toast notification for highlighting updates.

| Prop           | Type   | Default          | Description                                                                  |
| -------------- | ------ | ---------------- | ---------------------------------------------------------------------------- |
| `scope`        | string | `"default"`      | Connect to matching provider                                                 |
| `theme`        | string | -                | Fixed theme name                                                             |
| `light`        | string | -                | Theme for light mode                                                         |
| `dark`         | string | -                | Theme for dark mode                                                          |
| `position`     | string | `"bottom-right"` | Position: `top-left`, `top-right`, `bottom-left`, or `bottom-right`          |
| `auto-dismiss` | number | -                | Auto-dismiss after N seconds (automatically hides toast after this duration) |

**Methods:**

- `show(update)` - Show the toast with a specific update
- `dismiss()` - Dismiss the toast

**Events:**

- Dispatches `changebot:context-request` - Requests services from provider

**Behavior:**

- Automatically displays updates with `highlight_target="toast"`
- Shows full content in toast notification
- Dismiss button marks update as viewed in localStorage
- Optional auto-dismiss clears toast after specified seconds
- Supports keyboard navigation (Enter/Space to dismiss)
- Manual dismiss clears auto-dismiss timer if active

## CSS Customization

### Badge CSS Variables

Override these CSS variables to customize the badge appearance:

```css
changebot-badge {
  /* Colors */
  --cb-badge-bg: #ff4444; /* Background color */
  --cb-badge-text: white; /* Text/icon color */
  --cb-badge-shadow: rgba(0, 0, 0, 0.15); /* Box shadow color */
  --cb-badge-pulse: rgba(255, 68, 68, 0.7); /* Pulse animation color */
  --cb-badge-hover-mix: black; /* Color to mix on hover */
  --cb-badge-ripple: rgba(255, 255, 255, 0.3); /* Click ripple color */

  /* Sizing */
  --badge-size: 20px; /* Badge height and min-width */
  --badge-font-size: 11px; /* Font size for count */
  --badge-animation-duration: 0.3s; /* Animation duration */
}
```

### Panel CSS Variables

Override these CSS variables to customize the panel appearance:

```css
changebot-panel {
  /* Background & Surfaces */
  --cb-panel-bg: #ffffff; /* Main background */
  --cb-panel-surface: #f9fafb; /* Update card background */
  --cb-panel-border: #e5e7eb; /* Border color */

  /* Text Colors */
  --cb-panel-text: #111827; /* Primary text */
  --cb-panel-text-muted: #6b7280; /* Secondary text */

  /* Interactive Elements */
  --cb-panel-hover: #f3f4f6; /* Hover background */
  --cb-panel-link: #3b82f6; /* Link color */
  --cb-panel-focus: #3b82f6; /* Focus outline color */

  /* Accent Colors */
  --cb-panel-accent: #3b82f6; /* Accent color (titles) */
  --cb-panel-meta: #6b7280; /* Metadata color (dates) */
  --cb-panel-subtle: #3b82f6; /* Subtle accents */

  /* Effects */
  --cb-panel-shadow: rgba(0, 0, 0, 0.1); /* Shadow color */
  --cb-backdrop: rgba(0, 0, 0, 0.5); /* Backdrop overlay color */
}
```

## Events & Communication

### Custom Event System

Components communicate using a custom event system. You can hook into these events:

#### `changebot:action`

Dispatch actions to control components:

```javascript
// Open the panel
document.dispatchEvent(
  new CustomEvent('changebot:action', {
    detail: {
      type: 'openDisplay',
      scope: 'default', // Match your provider scope
    },
    bubbles: true,
    composed: true,
  }),
);

// Close the panel
document.dispatchEvent(
  new CustomEvent('changebot:action', {
    detail: {
      type: 'closeDisplay',
      scope: 'default',
    },
    bubbles: true,
    composed: true,
  }),
);
```

#### `changebot:lastViewed`

Listen for when the panel is viewed:

```javascript
document.addEventListener('changebot:lastViewed', event => {
  console.log('Panel viewed for scope:', event.detail.scope);
  // Badge will automatically update
});
```

#### Available Action Types

| Action Type | Description |
|-------------|-------------|
| `openDisplay` | Opens the panel and marks updates as viewed |
| `closeDisplay` | Closes the panel |
| `toggleDisplay` | Toggles the panel (opens with mark viewed, or closes) |
| `markViewed` | Marks updates as viewed without opening panel |
| `markAllViewed` | Marks all updates as viewed |

## Accessibility Features

The widgets are built with accessibility in mind:

### Keyboard Navigation

- **Badge**: Focusable with Tab, activatable with Enter or Space
- **Panel**:
  - Close with Escape key
  - Focus trap in modal mode (Tab cycles through focusable elements)
  - Auto-focus on first element when opened
- **Banner**: Click or Enter/Space to expand content
- **Toast**: Enter/Space to dismiss notification

### Screen Reader Support

- **Badge**:
  - `role="status"` with `aria-live="polite"` for count announcements
  - Dynamic `aria-label` describing update count
  - Proper button semantics

- **Panel**:
  - `role="dialog"` with appropriate `aria-modal` attribute
  - `aria-label` for panel title
  - Live region announces update count when opened
  - Visually hidden text for screen reader announcements

- **Banner**:
  - `role="banner"` with `aria-live="polite"` for announcements
  - Dynamic `aria-expanded` state
  - Proper button semantics for interactive areas

- **Toast**:
  - `role="alert"` with `aria-live="polite"` for important announcements
  - Dismissible with clear labeling

### Focus Management

- Visible focus indicators on all interactive elements
- Focus returns to trigger element when panel closes
- No focus trap in drawer modes (allows page navigation)
- Focus trap in modal mode (prevents interaction with page)

### Motion & Contrast

- Respects `prefers-reduced-motion` - disables animations
- Respects `prefers-contrast: high` - adds borders for clarity
- All themes meet WCAG contrast requirements
- Dynamic contrast calculation for tag colors

### localStorage Tracking

Updates are tracked as "viewed" using localStorage:

```javascript
// Key format
const key = `changebot:lastViewed:${scope}`;

// Value is timestamp in milliseconds
localStorage.setItem(key, Date.now().toString());

// Badge automatically calculates new updates by comparing
// update timestamps with this value
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload
pnpm start

# Build for production
pnpm run build

# Run tests
pnpm test

# Generate new component
pnpm run generate
```

**Note**: This project uses `pnpm` as the package manager. All npm commands will also work.

## Release Process

This monorepo contains three packages that should be kept in sync:

- `@changebot/core` (packages/core)
- `@changebot/widgets-react` (packages/react)
- `@changebot/widgets-vue` (packages/vue)

### Automated Release (Recommended)

Simply bump the version in all three package.json files, commit, and push:

```bash
# 1. Update version in all package.json files (keep them in sync)
sed -i 's/"version": "X.X.X"/"version": "Y.Y.Y"/' packages/*/package.json

# 2. Commit and push
git add packages/*/package.json
git commit -m "chore: Bump all packages to vY.Y.Y"
git push origin main
```

GitHub Actions will automatically:
1. Detect the version change
2. Create tags (`core-vY.Y.Y`, `widgets-react-vY.Y.Y`, `widgets-vue-vY.Y.Y`)
3. Create GitHub releases
4. Trigger the deploy workflow (npm publish + CDN update)

### Manual Release

If you need to create a release manually (e.g., for a hotfix):

```bash
# Create and push tags
git tag core-vX.X.X
git tag widgets-react-vX.X.X
git tag widgets-vue-vX.X.X
git push origin core-vX.X.X widgets-react-vX.X.X widgets-vue-vX.X.X

# Create GitHub releases
gh release create core-vX.X.X --title "core vX.X.X" --generate-notes
gh release create widgets-react-vX.X.X --title "widgets-react vX.X.X" --notes "Version sync with core"
gh release create widgets-vue-vX.X.X --title "widgets-vue vX.X.X" --notes "Version sync with core"

# Trigger deploy manually
gh workflow run release.yml
```

### Verifying the Release

Check the Actions tab in GitHub to monitor deployment progress. The deploy workflow will:

1. Run tests
2. Build all packages
3. Publish to npm
4. Update the CDN at `https://widgets.changebot.ai/`