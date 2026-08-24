/**
 * Test setup for spec tests.
 *
 * Component modules register their own tag when imported, so a spec imports
 * the component it renders and then renders the tag.
 *
 * The mock DOM supplies neither ResizeObserver, which the panel uses to watch
 * its content, nor localStorage, which the provider uses to remember when
 * updates were last viewed. Both get a stand-in here. Storage is per worker
 * and never persisted, so tests that care clear it themselves.
 */

import '@stencil/vitest';

class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  [name: string]: unknown;
}

/**
 * Stencil picks the DOM event name for a JSX `onFoo` prop by testing whether
 * `onfoo` is a member of window. A browser has `onkeydown`, so `onKeyDown`
 * binds the `keydown` event; the mock window has no such member, so it would
 * bind an event named `keyDown` that nothing dispatches. Declaring the members
 * the components bind makes the mock resolve names the way a browser does.
 */
function declareEventMembers(target: Window, events: string[]): void {
  for (const event of events) {
    if (!(`on${event}` in target)) {
      Object.defineProperty(target, `on${event}`, { value: null, writable: true, configurable: true });
    }
  }
}

globalThis.ResizeObserver = ResizeObserverMock;
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.localStorage = globalThis.localStorage;
  globalThis.window.sessionStorage = globalThis.sessionStorage;
  declareEventMembers(globalThis.window, ['click', 'keydown']);
}

export {};
