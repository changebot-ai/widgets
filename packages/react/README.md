# @changebot/widgets-react

React wrapper components for [Changebot](https://www.changebot.ai) - beautiful, customizable widgets for displaying product updates and changelogs to your users.

## Installation

```bash
npm install @changebot/widgets-react
```

### Peer Dependencies

This package requires React 16.8.0 or later:

```bash
npm install react react-dom
```

## Quick Start

```tsx
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel
} from '@changebot/widgets-react';

function App() {
  return (
    <>
      {/* Provider can be placed anywhere - components don't need to be nested */}
      <ChangebotProvider slug="your-team-slug" />

      <header>
        <h1>My App</h1>
        <ChangebotBadge />
      </header>

      <ChangebotPanel mode="drawer-right" />
    </>
  );
}
```

## Components

### ChangebotProvider

The provider component manages state and data fetching for all Changebot components. It listens at the document level, so components do **not** need to be nested inside it—they can be placed anywhere on the page.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slug` | `string` | required | Your Changebot team slug (from your Changebot dashboard) |
| `scope` | `string` | `"default"` | Scope identifier for isolating multiple instances |

#### Example

```tsx
// Components can be siblings - no nesting required
<ChangebotProvider slug="acme-corp" />
<ChangebotBadge />
<ChangebotPanel />
```

#### Multiple Instances

Use different scopes to run multiple independent instances:

```tsx
<div>
  <ChangebotProvider slug="team-a" scope="team-a">
    <ChangebotBadge scope="team-a" />
    <ChangebotPanel scope="team-a" />
  </ChangebotProvider>

  <ChangebotProvider slug="team-b" scope="team-b">
    <ChangebotBadge scope="team-b" />
    <ChangebotPanel scope="team-b" />
  </ChangebotProvider>
</div>
```

---

### ChangebotBadge

A badge component that displays the count of new, unread updates. Clicking the badge opens the associated panel.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `string` | `"default"` | Scope to connect to (must match provider scope) |
| `theme` | `Theme` | - | Fixed theme (see Theming section) |
| `light` | `Theme` | - | Theme for light mode (auto-switches based on system preference) |
| `dark` | `Theme` | - | Theme for dark mode (auto-switches based on system preference) |
| `indicator` | `"count"` \| `"dot"` | `"count"` | Display style: show count number or dot only |

#### Example

```tsx
// Basic usage
<ChangebotBadge />

// With theme
<ChangebotBadge theme="catppuccin-mocha" />

// Show dot instead of count
<ChangebotBadge indicator="dot" />

// Auto-switching theme
<ChangebotBadge
  light="catppuccin-latte"
  dark="catppuccin-mocha"
/>
```

---

### ChangebotPanel

A panel component that displays your product updates. Can be displayed as a drawer (left/right) or centered modal.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `string` | `"default"` | Scope to connect to (must match provider scope) |
| `mode` | `"drawer-left"` \| `"drawer-right"` \| `"modal"` | `"drawer-right"` | Display mode |
| `theme` | `Theme` | - | Fixed theme (see Theming section) |
| `light` | `Theme` | - | Theme for light mode (auto-switches based on system preference) |
| `dark` | `Theme` | - | Theme for dark mode (auto-switches based on system preference) |

#### Methods

Use refs to access methods:

```tsx
const panelRef = useRef<HTMLChangebotPanelElement>(null);

// Open the panel
await panelRef.current?.open();

// Close the panel
await panelRef.current?.close();

// Set updates programmatically (for standalone usage)
await panelRef.current?.setUpdates(updatesArray);
```

#### Example

```tsx
import { useRef } from 'react';
import { ChangebotPanel } from '@changebot/widgets-react';

function App() {
  const panelRef = useRef<HTMLChangebotPanelElement>(null);

  const handleOpenPanel = async () => {
    await panelRef.current?.open();
  };

  return (
    <>
      <button onClick={handleOpenPanel}>Show Updates</button>
      <ChangebotPanel
        ref={panelRef}
        mode="drawer-right"
        theme="nord"
      />
    </>
  );
}
```

---

### ChangebotBanner

A banner component that displays a highlighted update at the top of your page. Automatically shows the most recent update marked with `highlight_target="banner"`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `string` | `"default"` | Scope to connect to (must match provider scope) |
| `theme` | `Theme` | - | Fixed theme (see Theming section) |
| `light` | `Theme` | - | Theme for light mode (auto-switches based on system preference) |
| `dark` | `Theme` | - | Theme for dark mode (auto-switches based on system preference) |

#### Methods

```tsx
const bannerRef = useRef<HTMLChangebotBannerElement>(null);

// Show banner with specific update
await bannerRef.current?.show(update);

// Dismiss the banner
await bannerRef.current?.dismiss();

// Toggle expanded state
await bannerRef.current?.toggle();
```

#### Example

```tsx
<ChangebotBanner
  theme="dracula"
/>
```

---

### ChangebotToast

A toast notification component that displays brief update notifications. Automatically shows the most recent update marked with `highlight_target="toast"`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `string` | `"default"` | Scope to connect to (must match provider scope) |
| `position` | `"top-left"` \| `"top-right"` \| `"bottom-left"` \| `"bottom-right"` | `"bottom-right"` | Screen position for the toast |
| `autoDismiss` | `number` | - | Auto-dismiss after N seconds (optional) |
| `theme` | `Theme` | - | Fixed theme (see Theming section) |
| `light` | `Theme` | - | Theme for light mode (auto-switches based on system preference) |
| `dark` | `Theme` | - | Theme for dark mode (auto-switches based on system preference) |

#### Methods

```tsx
const toastRef = useRef<HTMLChangebotToastElement>(null);

// Show toast with specific update
await toastRef.current?.show(update);

// Dismiss the toast
await toastRef.current?.dismiss();
```

#### Example

```tsx
<ChangebotToast
  position="bottom-right"
  autoDismiss={5}
  theme="tokyo-night"
/>
```

---

## Theming

Changebot widgets include 15 beautiful pre-built themes:

### Available Themes

- **Catppuccin**: `catppuccin-latte` (light), `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha` (dark)
- **Gruvbox**: `gruvbox-light`, `gruvbox-dark`
- **Popular**: `dracula`, `nord`, `tokyo-night`, `cyberpunk`
- **Solarized**: `solarized-light`, `solarized-dark`
- **Everforest**: `everforest-light`, `everforest-dark`
- **Modern**: `frost` (clean, minimal light theme)

### Using Themes

#### Fixed Theme

Use the `theme` prop for a theme that never changes:

```tsx
<ChangebotPanel theme="catppuccin-mocha" />
```

#### Auto-Switching Theme

Use `light` and `dark` props to automatically switch based on user's system preference:

```tsx
<ChangebotPanel
  light="catppuccin-latte"
  dark="catppuccin-mocha"
/>
```

#### Apply to All Components

```tsx
<ChangebotProvider slug="acme">
  <ChangebotBadge
    light="gruvbox-light"
    dark="gruvbox-dark"
  />
  <ChangebotPanel
    light="gruvbox-light"
    dark="gruvbox-dark"
  />
  <ChangebotBanner
    light="gruvbox-light"
    dark="gruvbox-dark"
  />
  <ChangebotToast
    light="gruvbox-light"
    dark="gruvbox-dark"
  />
</ChangebotProvider>
```

---

## Display Modes

The `ChangebotPanel` component supports three display modes:

### drawer-right (default)

Slides in from the right side of the screen. Great for most applications.

```tsx
<ChangebotPanel mode="drawer-right" />
```

### drawer-left

Slides in from the left side of the screen. Useful when your navigation is on the right.

```tsx
<ChangebotPanel mode="drawer-left" />
```

### modal

Displays as a centered modal dialog with backdrop overlay. Best for focused, important updates.

```tsx
<ChangebotPanel mode="modal" />
```

---

## Advanced Usage

### Standalone Usage (Without Provider)

Components can work independently without a provider for simple use cases:

#### Standalone Panel

```tsx
import { useRef, useState } from 'react';
import { ChangebotPanel } from '@changebot/widgets-react';

function Updates() {
  const panelRef = useRef<HTMLChangebotPanelElement>(null);

  const openWithUpdates = async () => {
    await panelRef.current?.setUpdates([
      {
        id: 1,
        title: 'New Feature',
        content: '<p>Check out our new feature!</p>',
        display_date: '2024-01-15',
        published_at: '2024-01-15T10:00:00Z',
        expires_on: null,
        highlight_target: null,
        hosted_url: null,
        tags: [{ id: 1, name: 'Feature', color: '#3b82f6' }]
      }
    ]);
    await panelRef.current?.open();
  };

  return (
    <>
      <button onClick={openWithUpdates}>Show Updates</button>
      <ChangebotPanel ref={panelRef} />
    </>
  );
}
```

---

## Complete Examples

### Basic Setup with All Components

```tsx
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel,
  ChangebotBanner,
  ChangebotToast
} from '@changebot/widgets-react';

function App() {
  return (
    <>
      {/* Provider can be placed anywhere */}
      <ChangebotProvider slug="acme-corp" />

      {/* Banner appears automatically for banner-highlighted updates */}
      <ChangebotBanner theme="catppuccin-mocha" />

      <header>
        <h1>ACME Corp</h1>
        {/* Badge shows count of new updates */}
        <ChangebotBadge theme="catppuccin-mocha" />
      </header>

      <main>
        {/* Your app content */}
      </main>

      {/* Panel opens when badge is clicked */}
      <ChangebotPanel
        mode="drawer-right"
        theme="catppuccin-mocha"
      />

      {/* Toast appears for toast-highlighted updates */}
      <ChangebotToast
        position="bottom-right"
        autoDismiss={5}
        theme="catppuccin-mocha"
      />
    </>
  );
}
```

### Responsive Theme Example

```tsx
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel
} from '@changebot/widgets-react';

function App() {
  // Automatically switches between light/dark based on system preference
  return (
    <ChangebotProvider slug="acme-corp">
      <header>
        <h1>My App</h1>
        <ChangebotBadge
          light="catppuccin-latte"
          dark="catppuccin-mocha"
        />
      </header>

      <ChangebotPanel
        mode="drawer-right"
        light="catppuccin-latte"
        dark="catppuccin-mocha"
      />
    </ChangebotProvider>
  );
}
```

### Multiple Scopes Example

```tsx
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel
} from '@changebot/widgets-react';

function MultiTenantApp() {
  return (
    <div>
      {/* Product Updates */}
      <ChangebotProvider slug="product-updates" scope="product">
        <section>
          <h2>
            Product News
            <ChangebotBadge scope="product" theme="nord" />
          </h2>
          <ChangebotPanel scope="product" mode="drawer-right" theme="nord" />
        </section>
      </ChangebotProvider>

      {/* Company Announcements */}
      <ChangebotProvider slug="company-news" scope="company">
        <section>
          <h2>
            Company Announcements
            <ChangebotBadge scope="company" theme="dracula" />
          </h2>
          <ChangebotPanel scope="company" mode="drawer-left" theme="dracula" />
        </section>
      </ChangebotProvider>
    </div>
  );
}
```

### Programmatic Control Example

```tsx
import { useRef } from 'react';
import {
  ChangebotProvider,
  ChangebotPanel
} from '@changebot/widgets-react';

function App() {
  const panelRef = useRef<HTMLChangebotPanelElement>(null);

  const showUpdates = async () => {
    await panelRef.current?.open();
  };

  const hideUpdates = async () => {
    await panelRef.current?.close();
  };

  return (
    <ChangebotProvider slug="acme-corp">
      <div>
        <button onClick={showUpdates}>Show Updates</button>
        <button onClick={hideUpdates}>Hide Updates</button>
      </div>

      <ChangebotPanel ref={panelRef} mode="modal" />
    </ChangebotProvider>
  );
}
```

---

## TypeScript Support

This package includes TypeScript definitions out of the box. All components are fully typed.

```tsx
import type { HTMLChangebotPanelElement } from '@changebot/widgets-react';

const panelRef = useRef<HTMLChangebotPanelElement>(null);
```

---

## License

Apache-2.0

## Links

- [Changebot Website](https://www.changebot.ai)
- [Documentation](https://docs.changebot.ai)
- [GitHub Repository](https://github.com/changebot-ai/widgets)
- [NPM Package](https://www.npmjs.com/package/@changebot/widgets-react)
