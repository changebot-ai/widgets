/**
 * Module-level state survives component lifecycles so consumers and
 * providers can register in any order.
 */

import { Services } from '../types';
import { logRegistry as log } from '../utils/logger';

interface PendingListener {
  onConnect: (services: Services) => void;
  onTimeout?: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

const registry = new Map<string, Services>();
const pending = new Map<string, Set<PendingListener>>();

function detachListener(scope: string, listener: PendingListener): void {
  if (listener.timeoutId) {
    clearTimeout(listener.timeoutId);
    listener.timeoutId = undefined;
  }
  const listeners = pending.get(scope);
  if (listeners) {
    listeners.delete(listener);
    if (listeners.size === 0) {
      pending.delete(scope);
    }
  }
}

export function registerStore(scope: string, services: Services): void {
  log.debug('Registering store', { scope });
  registry.set(scope, services);

  const listeners = pending.get(scope);
  if (listeners && listeners.size > 0) {
    log.debug('Notifying pending subscribers', { scope, count: listeners.size });
    // Snapshot — onConnect callbacks may mutate `pending`.
    const snapshot = Array.from(listeners);
    pending.delete(scope);
    for (const listener of snapshot) {
      if (listener.timeoutId) {
        clearTimeout(listener.timeoutId);
      }
      // Isolate each subscriber so a thrower can't orphan its siblings or
      // break provider initialization, which calls registerStore synchronously.
      try {
        listener.onConnect(services);
      } catch (error) {
        log.error('Subscriber threw during onConnect', { scope, error });
      }
    }
  }
}

export function unregisterStore(scope: string): void {
  log.debug('Unregistering store', { scope });
  registry.delete(scope);
  // Don't clear pending — a new provider may register on this scope.
}

/**
 * Fires onConnect when the store for `scope` is registered. If the store
 * is already registered, onConnect is deferred to a microtask (never
 * synchronous, so callers can safely assign the unsubscribe handle first).
 *
 * On timeout the registry logs a warning, drops the subscription, and
 * calls onTimeout if provided.
 *
 * @returns unsubscribe function; safe to call multiple times.
 */
export function onStoreReady(
  scope: string = 'default',
  onConnect: (services: Services) => void,
  options: { timeout?: number; onTimeout?: () => void } = {}
): () => void {
  const timeout = options.timeout ?? 5000;

  const existing = registry.get(scope);
  if (existing) {
    log.debug('Store already registered, notifying in microtask', { scope });
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        onConnect(existing);
      } catch (error) {
        log.error('Subscriber threw during onConnect', { scope, error });
      }
    });
    return () => {
      cancelled = true;
    };
  }

  log.debug('Store not registered, subscribing...', { scope, timeout });

  const listener: PendingListener = { onConnect, onTimeout: options.onTimeout };

  if (timeout > 0) {
    listener.timeoutId = setTimeout(() => {
      if (!pending.get(scope)?.has(listener)) return;
      detachListener(scope, listener);
      log.warn(
        `Timeout waiting for provider with scope "${scope}". ` +
          `Ensure <changebot-provider scope="${scope}"> is present in the DOM.`,
        { scope, timeout }
      );
      if (listener.onTimeout) {
        try {
          listener.onTimeout();
        } catch (error) {
          log.error('Subscriber threw during onTimeout', { scope, error });
        }
      }
    }, timeout);
  }

  let listeners = pending.get(scope);
  if (!listeners) {
    listeners = new Set();
    pending.set(scope, listeners);
  }
  listeners.add(listener);

  return () => detachListener(scope, listener);
}

export function hasStore(scope: string = 'default'): boolean {
  return registry.has(scope);
}

/** Returns undefined if not yet registered; use onStoreReady to wait. */
export function getStore(scope: string = 'default'): Services | undefined {
  return registry.get(scope);
}

/** Test-only: drops all stores and pending subscribers without notifying them. */
export function clearRegistry(): void {
  log.debug('Clearing registry');
  for (const listeners of pending.values()) {
    for (const listener of listeners) {
      if (listener.timeoutId) {
        clearTimeout(listener.timeoutId);
      }
    }
  }
  registry.clear();
  pending.clear();
}
