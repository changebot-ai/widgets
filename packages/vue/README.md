# @changebot/widgets-vue

Vue wrapper components for [Changebot](https://www.changebot.ai) - beautiful, customizable widgets for displaying product updates and changelogs to your users.

## Installation

```bash
npm install @changebot/widgets-vue
```

### Peer Dependencies

This package requires Vue 3.0.0 or later:

```bash
npm install vue
```

## Quick Start

```vue
<script setup>
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel
} from '@changebot/widgets-vue';
</script>

<template>
  <ChangebotProvider slug="your-team-slug">
    <header>
      <h1>My App</h1>
      <ChangebotBadge />
    </header>

    <ChangebotPanel mode="drawer-right" />
  </ChangebotProvider>
</template>
```

## Components

### ChangebotProvider

The provider component manages state and data fetching for all child Changebot components. Wrap your components with this provider to enable automatic updates and state synchronization.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slug` | `string` | required | Your Changebot team slug (from your Changebot dashboard) |
| `scope` | `string` | `"default"` | Scope identifier for isolating multiple instances |

#### Example

```vue
<template>
  <ChangebotProvider slug="acme-corp">
    <!-- Your components -->
  </ChangebotProvider>
</template>
```

#### Multiple Instances

Use different scopes to run multiple independent instances:

```vue
<template>
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
</template>
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

```vue
<template>
  <!-- Basic usage -->
  <ChangebotBadge />

  <!-- With theme -->
  <ChangebotBadge theme="catppuccin-mocha" />

  <!-- Show dot instead of count -->
  <ChangebotBadge indicator="dot" />

  <!-- Auto-switching theme -->
  <ChangebotBadge
    light="catppuccin-latte"
    dark="catppuccin-mocha"
  />
</template>
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

Use template refs to access methods:

```vue
<script setup>
import { ref } from 'vue';
import { ChangebotPanel } from '@changebot/widgets-vue';

const panelRef = ref(null);

const openPanel = async () => {
  await panelRef.value?.open();
};

const closePanel = async () => {
  await panelRef.value?.close();
};

// Set updates programmatically (for standalone usage)
const setUpdates = async (updates) => {
  await panelRef.value?.setUpdates(updates);
};
</script>

<template>
  <button @click="openPanel">Show Updates</button>
  <ChangebotPanel
    ref="panelRef"
    mode="drawer-right"
    theme="nord"
  />
</template>
```

#### Example

```vue
<script setup>
import { ref } from 'vue';
import { ChangebotPanel } from '@changebot/widgets-vue';

const panelRef = ref(null);

const handleOpenPanel = async () => {
  await panelRef.value?.open();
};
</script>

<template>
  <button @click="handleOpenPanel">Show Updates</button>
  <ChangebotPanel
    ref="panelRef"
    mode="drawer-right"
    theme="nord"
  />
</template>
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

```vue
<script setup>
import { ref } from 'vue';

const bannerRef = ref(null);

// Show banner with specific update
const showBanner = async (update) => {
  await bannerRef.value?.show(update);
};

// Dismiss the banner
const dismissBanner = async () => {
  await bannerRef.value?.dismiss();
};

// Toggle expanded state
const toggleBanner = async () => {
  await bannerRef.value?.toggle();
};
</script>

<template>
  <ChangebotBanner ref="bannerRef" theme="dracula" />
</template>
```

#### Example

```vue
<template>
  <ChangebotBanner theme="dracula" />
</template>
```

---

### ChangebotToast

A toast notification component that displays brief update notifications. Automatically shows the most recent update marked with `highlight_target="toast"`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `string` | `"default"` | Scope to connect to (must match provider scope) |
| `position` | `"top-left"` \| `"top-right"` \| `"bottom-left"` \| `"bottom-right"` | `"bottom-right"` | Screen position for the toast |
| `auto-dismiss` | `number` | - | Auto-dismiss after N seconds (optional) |
| `theme` | `Theme` | - | Fixed theme (see Theming section) |
| `light` | `Theme` | - | Theme for light mode (auto-switches based on system preference) |
| `dark` | `Theme` | - | Theme for dark mode (auto-switches based on system preference) |

#### Methods

```vue
<script setup>
import { ref } from 'vue';

const toastRef = ref(null);

// Show toast with specific update
const showToast = async (update) => {
  await toastRef.value?.show(update);
};

// Dismiss the toast
const dismissToast = async () => {
  await toastRef.value?.dismiss();
};
</script>

<template>
  <ChangebotToast
    ref="toastRef"
    position="bottom-right"
    :auto-dismiss="5"
    theme="tokyo-night"
  />
</template>
```

#### Example

```vue
<template>
  <ChangebotToast
    position="bottom-right"
    :auto-dismiss="5"
    theme="tokyo-night"
  />
</template>
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

```vue
<template>
  <ChangebotPanel theme="catppuccin-mocha" />
</template>
```

#### Auto-Switching Theme

Use `light` and `dark` props to automatically switch based on user's system preference:

```vue
<template>
  <ChangebotPanel
    light="catppuccin-latte"
    dark="catppuccin-mocha"
  />
</template>
```

#### Apply to All Components

```vue
<template>
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
</template>
```

---

## Display Modes

The `ChangebotPanel` component supports three display modes:

### drawer-right (default)

Slides in from the right side of the screen. Great for most applications.

```vue
<template>
  <ChangebotPanel mode="drawer-right" />
</template>
```

### drawer-left

Slides in from the left side of the screen. Useful when your navigation is on the right.

```vue
<template>
  <ChangebotPanel mode="drawer-left" />
</template>
```

### modal

Displays as a centered modal dialog with backdrop overlay. Best for focused, important updates.

```vue
<template>
  <ChangebotPanel mode="modal" />
</template>
```

---

## Advanced Usage

### Standalone Usage (Without Provider)

Components can work independently without a provider for simple use cases:

#### Standalone Badge

```vue
<script setup>
import { ref } from 'vue';
import { ChangebotBadge } from '@changebot/widgets-vue';

const count = ref(3);
</script>

<template>
  <ChangebotBadge :count="count" :show-count="true" />
</template>
```

#### Standalone Panel

```vue
<script setup>
import { ref } from 'vue';
import { ChangebotPanel } from '@changebot/widgets-vue';

const panelRef = ref(null);

const openWithUpdates = async () => {
  await panelRef.value?.setUpdates([
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
  await panelRef.value?.open();
};
</script>

<template>
  <button @click="openWithUpdates">Show Updates</button>
  <ChangebotPanel ref="panelRef" />
</template>
```

---

## Complete Examples

### Basic Setup with All Components

```vue
<script setup>
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel,
  ChangebotBanner,
  ChangebotToast
} from '@changebot/widgets-vue';
</script>

<template>
  <ChangebotProvider slug="acme-corp">
    <!-- Banner appears automatically for banner-highlighted updates -->
    <ChangebotBanner theme="catppuccin-mocha" />

    <header>
      <h1>ACME Corp</h1>
      <!-- Badge shows count of new updates -->
      <ChangebotBadge theme="catppuccin-mocha" />
    </header>

    <main>
      <!-- Your app content -->
    </main>

    <!-- Panel opens when badge is clicked -->
    <ChangebotPanel
      mode="drawer-right"
      theme="catppuccin-mocha"
    />

    <!-- Toast appears for toast-highlighted updates -->
    <ChangebotToast
      position="bottom-right"
      :auto-dismiss="5"
      theme="catppuccin-mocha"
    />
  </ChangebotProvider>
</template>
```

### Responsive Theme Example

```vue
<script setup>
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel
} from '@changebot/widgets-vue';
</script>

<template>
  <!-- Automatically switches between light/dark based on system preference -->
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
</template>
```

### Multiple Scopes Example

```vue
<script setup>
import {
  ChangebotProvider,
  ChangebotBadge,
  ChangebotPanel
} from '@changebot/widgets-vue';
</script>

<template>
  <div>
    <!-- Product Updates -->
    <ChangebotProvider slug="product-updates" scope="product">
      <section>
        <h2>
          Product News
          <ChangebotBadge scope="product" theme="nord" />
        </h2>
        <ChangebotPanel scope="product" mode="drawer-right" theme="nord" />
      </section>
    </ChangebotProvider>

    <!-- Company Announcements -->
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
</template>
```

### Programmatic Control Example

```vue
<script setup>
import { ref } from 'vue';
import {
  ChangebotProvider,
  ChangebotPanel
} from '@changebot/widgets-vue';

const panelRef = ref(null);

const showUpdates = async () => {
  await panelRef.value?.open();
};

const hideUpdates = async () => {
  await panelRef.value?.close();
};
</script>

<template>
  <ChangebotProvider slug="acme-corp">
    <div>
      <button @click="showUpdates">Show Updates</button>
      <button @click="hideUpdates">Hide Updates</button>
    </div>

    <ChangebotPanel ref="panelRef" mode="modal" />
  </ChangebotProvider>
</template>
```

### Composition API Example

```vue
<script setup>
import { ref, onMounted } from 'vue';
import {
  ChangebotProvider,
  ChangebotPanel
} from '@changebot/widgets-vue';

const panelRef = ref(null);
const isOpen = ref(false);

const togglePanel = async () => {
  if (isOpen.value) {
    await panelRef.value?.close();
  } else {
    await panelRef.value?.open();
  }
  isOpen.value = !isOpen.value;
};

// Auto-open on mount
onMounted(async () => {
  await panelRef.value?.open();
  isOpen.value = true;
});
</script>

<template>
  <ChangebotProvider slug="acme-corp">
    <button @click="togglePanel">
      {{ isOpen ? 'Close' : 'Open' }} Updates
    </button>

    <ChangebotPanel
      ref="panelRef"
      mode="drawer-right"
      theme="nord"
    />
  </ChangebotProvider>
</template>
```

---

## TypeScript Support

This package includes TypeScript definitions out of the box. All components are fully typed.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import type { HTMLChangebotPanelElement } from '@changebot/widgets-vue';

const panelRef = ref<HTMLChangebotPanelElement | null>(null);
</script>
```

---

## License

Apache-2.0

## Links

- [Changebot Website](https://www.changebot.ai)
- [Documentation](https://docs.changebot.ai)
- [GitHub Repository](https://github.com/changebot-ai/widgets)
- [NPM Package](https://www.npmjs.com/package/@changebot/widgets-vue)
