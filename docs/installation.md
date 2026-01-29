# Widget Installation Guide

Add these components to your website to display updates.

## 1. Load the widget script

Add this script tag to your HTML `<head>`:

```html
<script type="module" src="https://widgets.changebot.ai/latest/widgets.esm.js"></script>
```

For production, pin to a specific version like `v0.2.0/widgets.esm.js`.

## 2. Add the provider

The provider manages data and API calls for all widget components:

```html
<changebot-provider slug="YOUR_WIDGET_SLUG" />
```

Components do not need to be nested inside the provider. Place the provider anywhere on the page and components will automatically connect to it.

## 3. Add display components

Choose which components to use based on your needs:

```html
<!-- Badge showing update count -->
<changebot-badge theme="nord" />

<!-- Panel with full update list -->
<changebot-panel mode="drawer-right" light="catppuccin-latte" dark="catppuccin-mocha" />

<!-- Banner for important announcements -->
<changebot-banner theme="nord" />

<!-- Toast/popup notifications -->
<changebot-toast position="bottom-right" auto-dismiss="5" />
```

### Component options

**Badge:**

- `indicator` - Display style: `count` (shows number) or `dot` (shows dot only) (default: `count`)

**Panel:**

- `mode` - Display mode: `drawer-right`, `drawer-left`, or `modal` (default: `drawer-right`)

**Banner:**

- No additional options beyond theming

**Toast:**

- `position` - Screen position: `bottom-right`, `bottom-left`, `top-right`, or `top-left` (default: `bottom-right`)
- `auto-dismiss` - Auto-dismiss after N seconds (optional)

All components support `theme`, `light`, and `dark` props for theming (see Available themes below).

## 4. Control programmatically (optional)

### Direct method calls

Call methods directly on the panel element:

<!-- prettier-ignore -->
```html
<button onclick="document.querySelector('changebot-panel').open()">What's New</button>
<button onclick="document.querySelector('changebot-panel').close()">Close</button>
```

### Using events

Dispatch `changebot:action` events for more control:

```javascript
// Open panel
document.dispatchEvent(
  new CustomEvent('changebot:action', {
    detail: { type: 'openDisplay' },
  }),
);

// Close panel
document.dispatchEvent(
  new CustomEvent('changebot:action', {
    detail: { type: 'closeDisplay' },
  }),
);

// Toggle panel
document.dispatchEvent(
  new CustomEvent('changebot:action', {
    detail: { type: 'toggleDisplay' },
  }),
);
```

## Available themes

**Light themes:**

- catppuccin-latte
- gruvbox-light
- solarized-light
- everforest-light
- frost

**Dark themes:**

- catppuccin-frappe
- catppuccin-macchiato
- catppuccin-mocha
- gruvbox-dark
- dracula
- nord
- solarized-dark
- everforest-dark
- tokyo-night
- cyberpunk

Use `light` and `dark` props for automatic theme switching based on system preferences:

```html
<changebot-badge light="catppuccin-latte" dark="catppuccin-mocha" />
```

## Framework packages

For React and Vue applications, use our NPM packages for better integration:

- **React:** `npm install @changebot/widgets-react`
- **Vue:** `npm install @changebot/widgets-vue`

See the package READMEs on npm for framework-specific usage.

## Complete example

Here's a minimal working example:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="https://widgets.changebot.ai/latest/widgets.esm.js"></script>
  </head>
  <body>
    <!-- Provider fetches data from your Changebot dashboard -->
    <changebot-provider slug="YOUR_WIDGET_SLUG" />

    <!-- Badge in your header -->
    <header>
      <h1>My App</h1>
      <changebot-badge light="frost" dark="nord" />
    </header>

    <!-- Panel slides in when badge is clicked -->
    <changebot-panel mode="drawer-right" light="frost" dark="nord" />
  </body>
</html>
```

## Advanced usage

### User tracking

Track which users have viewed updates by passing a `user-id`:

```html
<changebot-provider slug="YOUR_WIDGET_SLUG" user-id="user_123" />
```

This syncs the user's last-viewed timestamp with the Changebot API, enabling cross-device read state.

You can also pass additional user metadata with `user-data`:

<!-- prettier-ignore -->
```html
<changebot-provider
  slug="YOUR_WIDGET_SLUG"
  user-id="user_123"
  user-data='{"email":"user@example.com","name":"Jane Doe"}'
/>
```

## More information

For detailed API reference, CSS customization, and accessibility features, see the [@changebot/core README on npm](https://www.npmjs.com/package/@changebot/core).
