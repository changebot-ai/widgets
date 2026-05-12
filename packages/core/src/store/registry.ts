/**
 * Store Registry - Module-level registry for scoped stores
 *
 * Provides a promise-based mechanism for consumers to wait for
 * provider initialization, eliminating race conditions.
 */

import { Services } from '../types';
import { logRegistry as log } from '../utils/logger';

interface PendingListener {
  resolve: (services: Services) => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  abortHandler?: () => void;
}

// Module-level registry - survives component lifecycle
const registry = new Map<string, Services>();
const pending = new Map<string, Set<PendingListener>>();

function detachListener(scope: string, listener: PendingListener): void {
  if (listener.timeoutId) {
    clearTimeout(listener.timeoutId);
    listener.timeoutId = undefined;
  }
  if (listener.signal && listener.abortHandler) {
    listener.signal.removeEventListener('abort', listener.abortHandler);
    listener.abortHandler = undefined;
  }
  const listeners = pending.get(scope);
  if (listeners) {
    listeners.delete(listener);
    if (listeners.size === 0) {
      pending.delete(scope);
    }
  }
}

/**
 * Register a store for a given scope. Called by provider after initialization.
 * Resolves any pending waiters.
 */
export function registerStore(scope: string, services: Services): void {
  log.debug('Registering store', { scope });
  registry.set(scope, services);

  // Resolve any pending waiters
  const listeners = pending.get(scope);
  if (listeners && listeners.size > 0) {
    log.debug('Resolving pending waiters', { scope, count: listeners.size });
    // Snapshot to avoid mutation during iteration
    const snapshot = Array.from(listeners);
    pending.delete(scope);
    for (const listener of snapshot) {
      if (listener.timeoutId) {
        clearTimeout(listener.timeoutId);
        listener.timeoutId = undefined;
      }
      if (listener.signal && listener.abortHandler) {
        listener.signal.removeEventListener('abort', listener.abortHandler);
        listener.abortHandler = undefined;
      }
      listener.resolve(services);
    }
  }
}

/**
 * Unregister a store when provider disconnects.
 */
export function unregisterStore(scope: string): void {
  log.debug('Unregistering store', { scope });
  registry.delete(scope);
  // Note: Don't clear pending - new provider may register
}

/**
 * Get store for a scope. Returns immediately if available,
 * or waits for provider to register.
 *
 * Supports cancellation via AbortSignal so consumers can cancel
 * in-flight waits when they disconnect, preventing dangling timers
 * and late log output.
 *
 * @param scope - The scope identifier (default: 'default')
 * @param options - Optional timeout (default: 5000) and AbortSignal
 * @returns Promise that resolves with services when provider registers,
 *          or rejects on timeout / abort.
 */
export function waitForStore(
  scope: string = 'default',
  options: { timeout?: number; signal?: AbortSignal } = {}
): Promise<Services> {
  const timeout = options.timeout ?? 5000;
  const signal = options.signal;

  // If caller already aborted, reject immediately.
  if (signal?.aborted) {
    const reason =
      (signal.reason as Error | undefined) ??
      new DOMException('waitForStore aborted', 'AbortError');
    return Promise.reject(reason);
  }

  // Return immediately if already registered
  const existing = registry.get(scope);
  if (existing) {
    log.debug('Store already registered, returning immediately', { scope });
    return Promise.resolve(existing);
  }

  log.debug('Store not registered, waiting...', { scope, timeout });

  return new Promise<Services>((resolve, reject) => {
    const listener: PendingListener = { resolve, reject };

    // Per-caller timeout
    if (timeout > 0) {
      listener.timeoutId = setTimeout(() => {
        // Only fire if still pending for this listener
        const listeners = pending.get(scope);
        if (!listeners || !listeners.has(listener)) {
          return;
        }
        detachListener(scope, listener);
        const error = new Error(
          `Timeout waiting for provider with scope "${scope}". ` +
            `Ensure <changebot-provider scope="${scope}"> is present in the DOM.`
        );
        log.warn('Timeout waiting for store', { scope, timeout });
        reject(error);
      }, timeout);
    }

    // Per-caller abort
    if (signal) {
      listener.signal = signal;
      listener.abortHandler = () => {
        const listeners = pending.get(scope);
        if (!listeners || !listeners.has(listener)) {
          return;
        }
        detachListener(scope, listener);
        const reason =
          (signal.reason as Error | undefined) ??
          new DOMException('waitForStore aborted', 'AbortError');
        reject(reason);
      };
      signal.addEventListener('abort', listener.abortHandler);
    }

    let listeners = pending.get(scope);
    if (!listeners) {
      listeners = new Set();
      pending.set(scope, listeners);
    }
    listeners.add(listener);
  });
}

/**
 * Check if a store is registered (synchronous check).
 */
export function hasStore(scope: string = 'default'): boolean {
  return registry.has(scope);
}

/**
 * Get store synchronously, returns undefined if not registered.
 * Use waitForStore() for the async pattern.
 */
export function getStore(scope: string = 'default'): Services | undefined {
  return registry.get(scope);
}

/**
 * Clear all stores and pending waiters (useful for testing).
 */
export function clearRegistry(): void {
  log.debug('Clearing registry');
  // Clear any pending timeouts and abort listeners
  for (const listeners of pending.values()) {
    for (const listener of listeners) {
      if (listener.timeoutId) {
        clearTimeout(listener.timeoutId);
        listener.timeoutId = undefined;
      }
      if (listener.signal && listener.abortHandler) {
        listener.signal.removeEventListener('abort', listener.abortHandler);
        listener.abortHandler = undefined;
      }
    }
  }
  registry.clear();
  pending.clear();
}
