# Changebot Widgets - Usage Examples

This directory contains interactive examples demonstrating different use cases for Changebot Widgets.

## 📚 Examples

### 1. Basic Usage (`basic-usage.html`)

The simplest setup showing:

- One provider managing state
- One badge showing update counts
- One drawer displaying updates
- Automatic communication between components

**Best for**: Understanding the core concepts and getting started quickly.

### 2. Multiple Scopes (`multiple-scopes.html`)

Demonstrates multiple independent widget systems on the same page:

- Two separate providers with different scopes
- Isolated state management per scope
- Independent badge and drawer pairs
- No cross-scope interference

**Best for**: Multi-tenant applications, admin dashboards with multiple contexts, or pages with separate update streams.

### 3. Display Modes (`display-modes.html`)

Shows all three display modes side by side:

- `drawer-right` - Slides from right (default)
- `drawer-left` - Slides from left
- `modal` - Centered with backdrop

**Best for**: Choosing the right display mode for your UI/UX needs.

### 4. Standalone Usage (`standalone-usage.html`)

Components working without a provider:

- Badge with direct `count` prop
- Drawer controlled via public methods
- Programmatic control examples
- Useful for testing and simple implementations

**Best for**: Simple use cases, testing, or when you want full manual control.

## 🚀 Running the Examples

### Option 1: Using npm dev server

```bash
npm start
```

Then navigate to:

- `http://localhost:3333/demos/basic-usage.html`
- `http://localhost:3333/demos/multiple-scopes.html`
- `http://localhost:3333/demos/display-modes.html`
- `http://localhost:3333/demos/standalone-usage.html`

### Option 2: Build and serve

```bash
npm run build
# Use any static file server to serve the demos directory
```

## 📖 Key Concepts

### Provider Pattern

The `changebot-provider` component manages state and coordinates communication between badge and drawer components using custom events.

### Scopes

Use the `scope` prop to create isolated widget systems on the same page. Components only communicate with providers matching their scope.

### Event-Based Communication

Components discover and communicate with providers through custom events (`changebot:context-request`, `changebot:action`), enabling flexible placement anywhere in the DOM.

### Standalone Mode

Components can work independently without a provider for simple use cases by using props and public methods.

## 🎨 Customization

All components support:

- **Theme**: `theme="light"` or `theme="dark"`
- **Display Mode**: `display-mode="drawer-left|drawer-right|modal"`
- **Scope**: `scope="your-scope"` for isolation

## 📝 API Reference

### Provider Props

- `slug`: Team slug for api.changebot.ai
- `url`: Custom API endpoint
- `scope`: Isolation scope (default: "default")

### Badge Props

- `scope`: Provider scope to connect to
- `theme`: "light" or "dark"
- `show-count`: Boolean to show/hide count number
- `count`: Direct count control (standalone mode)

### Drawer Props

- `scope`: Provider scope to connect to
- `theme`: "light" or "dark"
- `display-mode`: "drawer-left", "drawer-right", or "modal"

### Drawer Methods

- `open()`: Open the drawer
- `close()`: Close the drawer
- `setUpdates(updates)`: Set updates array

## 💡 Tips

1. **Always match scopes**: Ensure provider, badge, and drawer all use the same scope.
2. **One provider per scope**: Each scope should have exactly one provider.
3. **Flexible placement**: Components can be placed anywhere in the DOM tree.
4. **LocalStorage**: Badge uses localStorage to track last viewed time per scope.

## 🐛 Troubleshooting

**Badge not updating?**

- Check console for scope mismatch messages
- Ensure provider is loaded before badge
- Verify scope names match exactly

**Drawer not opening?**

- Check that scope matches between badge/drawer/provider
- Verify drawer is inside or sibling to provider in DOM
- Check console for event dispatching logs

**Multiple providers conflicting?**

- Ensure each provider has a unique scope
- Verify all child components use correct scope

## 📚 Learn More

For more information, see:

- [Component Documentation](../docs/components/)
- [Architecture Decision Records](../.agent-os/specs/2025-09-29-product-updates-widget/sub-specs/technical-spec.md)