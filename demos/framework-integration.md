# Framework Integration Examples

Changebot Widgets are built with Stencil, which generates standard Web Components that work with any framework. Below are examples for integrating with popular frameworks.

## 🔧 Installation

```bash
npm install @changebot/widgets
```

## ⚛️ React Integration

### Option 1: Using the Loader (Recommended)

```tsx
import { useEffect } from 'react';
import { defineCustomElements } from '@changebot/widgets/loader';

function App() {
  useEffect(() => {
    // Define custom elements on mount
    defineCustomElements();
  }, []);

  return (
    <div>
      <changebot-provider slug="your-team" scope="default">
        <header>
          <h1>My React App</h1>
          <changebot-badge scope="default" />
        </header>

        <changebot-panel scope="default" display-mode="drawer-right" />
      </changebot-provider>
    </div>
  );
}

export default App;
```

### Option 2: Using Custom Elements (Tree-shakeable)

```tsx
import '@changebot/widgets/dist/custom-elements';
import type { ChangebotBadge, ChangebotPanel, ChangebotProvider } from '@changebot/widgets';

// Add type support for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'changebot-provider': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          slug?: string;
          url?: string;
          scope?: string;
        },
        HTMLElement
      >;
      'changebot-badge': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'scope'?: string;
          'theme'?: 'light' | 'dark';
          'show-count'?: boolean;
          'count'?: number;
        },
        HTMLElement
      >;
      'changebot-panel': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'scope'?: string;
          'theme'?: 'light' | 'dark';
          'display-mode'?: 'drawer-left' | 'drawer-right' | 'modal';
        },
        HTMLElement
      >;
    }
  }
}

function App() {
  return (
    <changebot-provider slug="your-team" scope="default">
      <header>
        <h1>My React App</h1>
        <changebot-badge scope="default" />
      </header>

      <changebot-panel scope="default" display-mode="drawer-right" />
    </changebot-provider>
  );
}
```

### With TypeScript and Refs

```tsx
import { useRef, useEffect } from 'react';

function App() {
  const drawerRef = useRef<HTMLChangebotPanelElement>(null);

  const openDrawer = () => {
    drawerRef.current?.open();
  };

  const closeDrawer = () => {
    drawerRef.current?.close();
  };

  return (
    <div>
      <button onClick={openDrawer}>Open Updates</button>
      <button onClick={closeDrawer}>Close Updates</button>

      <changebot-panel ref={drawerRef} display-mode="modal" />
    </div>
  );
}
```

## 🖖 Vue 3 Integration

### Setup in main.ts/js

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { defineCustomElements } from '@changebot/widgets/loader';

const app = createApp(App);

// Configure Vue to ignore custom elements
app.config.compilerOptions.isCustomElement = tag => tag.startsWith('changebot-');

// Define custom elements
defineCustomElements();

app.mount('#app');
```

### Using in Components

```vue
<template>
  <div>
    <changebot-provider slug="your-team" scope="default">
      <header>
        <h1>My Vue App</h1>
        <changebot-badge scope="default" />
      </header>

      <changebot-panel scope="default" display-mode="drawer-right" />
    </changebot-provider>
  </div>
</template>

<script setup lang="ts">
// No imports needed if configured in main.ts
</script>
```

### With Refs and Methods

```vue
<template>
  <div>
    <button @click="openDrawer">Open Updates</button>
    <button @click="closeDrawer">Close Updates</button>

    <changebot-panel ref="drawerRef" display-mode="modal" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const drawerRef = ref<HTMLChangebotPanelElement | null>(null);

const openDrawer = () => {
  drawerRef.value?.open();
};

const closeDrawer = () => {
  drawerRef.value?.close();
};
</script>
```

### With Vite

If using Vite, update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat all tags starting with 'changebot-' as custom elements
          isCustomElement: tag => tag.startsWith('changebot-'),
        },
      },
    }),
  ],
});
```

## 🅰️ Angular Integration

### 1. Import in app.module.ts

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { defineCustomElements } from '@changebot/widgets/loader';

import { AppComponent } from './app.component';

// Define custom elements
defineCustomElements();

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for web components
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### 2. Using in Components

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <changebot-provider slug="your-team" scope="default">
      <header>
        <h1>My Angular App</h1>
        <changebot-badge scope="default"></changebot-badge>
      </header>

      <changebot-panel scope="default" [attr.display-mode]="'drawer-right'"></changebot-panel>
    </changebot-provider>
  `,
})
export class AppComponent {
  title = 'my-angular-app';
}
```

### 3. With ViewChild and Methods

```typescript
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div>
      <button (click)="openDrawer()">Open Updates</button>
      <button (click)="closeDrawer()">Close Updates</button>

      <changebot-panel #drawer [attr.display-mode]="'modal'"></changebot-panel>
    </div>
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChild('drawer', { static: false }) drawer?: ElementRef<HTMLChangebotPanelElement>;

  ngAfterViewInit() {
    console.log('Drawer element:', this.drawer?.nativeElement);
  }

  async openDrawer() {
    await this.drawer?.nativeElement.open();
  }

  async closeDrawer() {
    await this.drawer?.nativeElement.close();
  }
}
```

### 4. TypeScript Type Definitions

Create `src/types/changebot-widgets.d.ts`:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    'changebot-provider': any;
    'changebot-badge': any;
    'changebot-panel': any;
  }
}

interface HTMLChangebotPanelElement extends HTMLElement {
  open(): Promise<void>;
  close(): Promise<void>;
  setUpdates(updates: any[]): Promise<void>;
}
```

## 🌐 Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Changebot Widgets</title>
    <script type="module" src="https://unpkg.com/@changebot/widgets/dist/widgets/widgets.esm.js"></script>
  </head>
  <body>
    <changebot-provider slug="your-team" scope="default">
      <changebot-badge scope="default"></changebot-badge>
      <changebot-panel scope="default" display-mode="drawer-right"></changebot-panel>
    </changebot-provider>

    <script>
      // Access drawer programmatically
      const drawer = document.querySelector('changebot-panel');

      // Use methods
      setTimeout(async () => {
        await drawer.open();
      }, 2000);
    </script>
  </body>
</html>
```

## 📝 Common Patterns

### Multiple Scopes

```jsx
// React example
<>
  <changebot-provider slug="product-team" scope="product">
    <changebot-badge scope="product" />
    <changebot-panel scope="product" />
  </changebot-provider>

  <changebot-provider slug="admin-team" scope="admin">
    <changebot-badge scope="admin" />
    <changebot-panel scope="admin" display-mode="modal" />
  </changebot-provider>
</>
```

### Custom Styling with Themes

```jsx
// Dark theme example
<changebot-badge theme="dark" scope="default" />
<changebot-panel theme="dark" scope="default" />
```

### Programmatic Control

```javascript
// Get reference to drawer
const drawer = document.querySelector('changebot-panel');

// Open
await drawer.open();

// Close
await drawer.close();

// Set custom updates
await drawer.setUpdates([
  {
    id: '1',
    title: 'New Feature',
    description: 'Check out our new feature!',
    date: new Date().toISOString(),
    timestamp: Date.now(),
  },
]);
```

## 🔍 Troubleshooting

### React: Property does not exist on JSX

Add type declarations as shown in the React TypeScript examples above.

### Vue: Unknown custom element

Make sure to configure `isCustomElement` in your Vue config as shown in the Vue setup.

### Angular: 'changebot-provider' is not a known element

Ensure `CUSTOM_ELEMENTS_SCHEMA` is added to your module's schemas array.

### Components not rendering

Make sure `defineCustomElements()` is called before components are used, typically in your app's entry point.

## 📚 Additional Resources

- [Stencil Framework Integration Guide](https://stenciljs.com/docs/overview)
- [Web Components Best Practices](https://developers.google.com/web/fundamentals/web-components)
- [Component Documentation](../src/components/)
- [Live Examples](./)