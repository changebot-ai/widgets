# Widget Installation Guide

Add these components to your website to display updates.

## 1. Load the widget script

Add this script tag to your HTML `<head>`:

```html
<script type="module" src="https://widgets.changebot.ai/latest/widgets.esm.js"></script>
```

For production, pin to a specific version like `v0.2.0/widgets.esm.js`.

> **Using React or Vue?** Use the NPM packages instead of the script tag:
> - `npm install` [@changebot/widgets-react](https://www.npmjs.com/package/@changebot/widgets-react)
> - `npm install` [@changebot/widgets-vue](https://www.npmjs.com/package/@changebot/widgets-vue)

## 2. Add the provider

The provider manages data and API calls for all widget components:

```html
<changebot-provider slug="YOUR_WIDGET_SLUG" />
```

Components do not need to be nested inside the provider. Place the provider anywhere on the page and components will automatically connect to it.

### Preview mode during setup

Add the `preview` attribute to the provider while you're placing components in your layout:

```html
<changebot-provider slug="YOUR_WIDGET_SLUG" preview />
```

This renders all components with sample data so you can see where they appear and what they look like. Without it, you won't see anything until you've published updates to this destination. The widget also tracks which updates each user has already seen — once viewed, badges, banners, and toasts won't re-highlight the same updates on subsequent page loads. Preview mode bypasses both of these, making it easy to iterate on placement. Remove the attribute when you're ready to go live.

## 3. User tracking (optional)

Track which users have viewed updates by passing a `user-id` to the provider:

```html
<changebot-provider slug="YOUR_WIDGET_SLUG" user-id="user_123" />
```

This syncs the user's last-viewed timestamp with the Changebot API, enabling cross-device read state. You can also pass additional user metadata with `user-data`:

<!-- prettier-ignore -->
```html
<changebot-provider
  slug="YOUR_WIDGET_SLUG"
  user-id="user_123"
  user-data='{"email":"user@example.com","name":"Jane Doe"}'
/>
```

## 4. Choose a theme

Use `theme` for a fixed theme, or `light` and `dark` to switch automatically based on system preference:

```html
<changebot-badge light="catppuccin-latte" dark="catppuccin-mocha" />
```

**Light:** catppuccin-latte, gruvbox-light, solarized-light, everforest-light, frost

**Dark:** catppuccin-frappe, catppuccin-macchiato, catppuccin-mocha, gruvbox-dark, dracula, nord, solarized-dark, everforest-dark, tokyo-night, cyberpunk

## 5. Add display components

Choose which components to use based on your needs. Props with defaults don't need to be set.

### Badge

Displays a count of new updates. Clicking opens the panel.

```html
<changebot-badge theme="nord" />
```

| Prop | Values | Default |
| --- | --- | --- |
| `indicator` | `"count"`, `"dot"` | `"count"` |

**CSS custom properties:**

Set `--badge-size` to scale the entire badge proportionally. All other dimensions adjust automatically.

```css
changebot-badge {
  --badge-size: 14px;
}
```

You can also override these properties individually:

| Variable | Description | Default |
| --- | --- | --- |
| `--badge-size` | Badge height and min-width | `20px` |
| `--badge-font-size` | Text size | `calc(var(--badge-size) * 0.55)` |
| `--badge-padding` | Horizontal padding | `calc(var(--badge-size) * 0.3)` |
| `--badge-dot-size` | Dot indicator diameter | `calc(var(--badge-size) * 0.3)` |
| `--badge-shadow-y` | Shadow vertical offset | `calc(var(--badge-size) * 0.1)` |
| `--badge-shadow-blur` | Shadow blur radius | `calc(var(--badge-size) * 0.4)` |
| `--badge-pulse-spread` | Pulse animation spread | `calc(var(--badge-size) * 0.5)` |
| `--cb-badge-bg` | Background color | `#ff4444` |
| `--cb-badge-text` | Text color | `white` |
| `--cb-badge-shadow` | Box shadow color | `rgba(0, 0, 0, 0.15)` |

### Panel

Drawer or modal that displays the full list of updates.

```html
<changebot-panel light="catppuccin-latte" dark="catppuccin-mocha" />
```

| Prop | Values | Default |
| --- | --- | --- |
| `mode` | `"drawer-right"`, `"drawer-left"`, `"modal"` | `"drawer-right"` |

**Programmatic control:**

```javascript
// Direct method calls
document.querySelector('changebot-panel').open();
document.querySelector('changebot-panel').close();

// Or dispatch events
document.dispatchEvent(new CustomEvent('changebot:action', {
  detail: { type: 'openDisplay' }
}));
document.dispatchEvent(new CustomEvent('changebot:action', {
  detail: { type: 'toggleDisplay' }
}));
```

### Banner

Top-of-page banner that automatically displays updates published with `highlight_target="banner"`. No additional props beyond theming.

```html
<changebot-banner theme="nord" />
```

### Toast

Popup notification that automatically displays updates published with `highlight_target="toast"`.

```html
<changebot-toast theme="nord" auto-dismiss="5" />
```

| Prop | Values | Default |
| --- | --- | --- |
| `position` | `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"` | `"bottom-right"` |
| `auto-dismiss` | seconds (number) | none |

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

## More information

For detailed API reference, CSS customization, and accessibility features, see the [@changebot/core README on npm](https://www.npmjs.com/package/@changebot/core).
