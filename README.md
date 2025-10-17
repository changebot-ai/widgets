# Changebot Widgets

Web components for displaying product updates from Changebot.

## Features

- 🎨 **15 Built-in Themes** - Catppuccin, Gruvbox, Dracula, Nord, Solarized, Everforest, Tokyo Night, Cyberpunk, Baremetrics, and more
- 🌓 **Light/Dark Mode** - Automatic theme switching based on system preferences
- 🎯 **Multiple Display Modes** - Drawer (left/right) or modal
- 📱 **Fully Responsive** - Works on all screen sizes
- ♿ **Accessible** - ARIA labels, keyboard navigation, focus management
- 🔧 **Fully Customizable** - Override any color with CSS variables
- 🚀 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS

## Installation

```bash
npm install @changebot/widgets
```

## Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="path/to/widgets.esm.js"></script>
</head>
<body>
  <!-- Provider manages state -->
  <changebot-provider slug="your-team"></changebot-provider>

  <!-- Badge shows update count -->
  <changebot-badge></changebot-badge>

  <!-- Drawer displays updates (hidden until opened) -->
  <changebot-panel mode="drawer-right"></changebot-panel>
</body>
</html>
```

## Components

### changebot-provider

Required component that manages state and API calls.

**Props:**
- `slug` (string, optional) - Your Changebot product slug (either `slug` or `url` required)
- `url` (string, optional) - Custom API URL (either `slug` or `url` required)
- `scope` (string, default: "default") - Scope for multiple providers
- `poll-interval` (number, optional) - Polling interval in seconds

```html
<changebot-provider
  slug="your-team"
  poll-interval="60">
</changebot-provider>
```

### changebot-badge

Badge that displays the count of new updates.

**Props:**
- `scope` (string, default: "default") - Connect to matching provider
- `theme` (string, optional) - Theme name (see themes below)
- `light` (string, optional) - Theme for light mode
- `dark` (string, optional) - Theme for dark mode
- `show-count` (boolean, default: true) - Show number or just dot
- `count` (number, optional) - Manual count override

```html
<!-- Fixed theme -->
<changebot-badge theme="cyberpunk"></changebot-badge>

<!-- Auto light/dark switching -->
<changebot-badge
  light="catppuccin-latte"
  dark="catppuccin-mocha">
</changebot-badge>
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
<changebot-panel
  mode="drawer-right"
  theme="nord">
</changebot-panel>
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
        scope: 'default',  // Match your provider scope
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
<button onclick="document.dispatchEvent(new CustomEvent('changebot:action', {
  detail: { type: 'openDisplay', scope: 'default' },
  bubbles: true,
  composed: true
}))">
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
- `baremetrics`

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
<changebot-provider slug="admin-updates" scope="admin"></changebot-provider>
<changebot-badge scope="admin"></changebot-badge>
<changebot-panel scope="admin"></changebot-panel>

<!-- User updates -->
<changebot-provider slug="user-updates" scope="user"></changebot-provider>
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
    id: '1',
    title: 'New Feature',
    description: 'Description here',
    date: new Date().toISOString(),
    timestamp: Date.now(),
    tags: [{ text: 'Feature', color: '#3b82f6' }]
  }
]);
```

### Custom API Endpoint

```html
<changebot-provider
  url="https://your-api.com/updates"
  poll-interval="30">
</changebot-provider>
```

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm start

# Build for production
npm run build

# Run tests
npm test

# Generate new component
npm run generate
```
