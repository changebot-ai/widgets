/**
 * Store Registry - Module-level registry for scoped stores
 *
 * Provides a promise-based mechanism for consumers to wait for
 * provider initialization, eliminating race conditions.
 */

import { Services } from '../types';
import { logRegistry as log } from '../utils/logger';

interface PendingStore {
  promise: Promise<Services>;
  resolve: (services: Services) => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * Result of waitForStore - includes cancel function for cleanup.
 */
export interface WaitForStoreResult {
  promise: Promise<Services>;
  cancel: () => void;
}

// Module-level registry - survives component lifecycle
const registry = new Map<string, Services>();
const pending = new Map<string, PendingStore>();

/**
 * Register a store for a given scope. Called by provider after initialization.
 * Resolves any pending waiters.
 */
export function registerStore(scope: string, services: Services): void {
  log.debug('Registering store', { scope });
  registry.set(scope, services);

  // Resolve any pending waiters
  const pendingEntry = pending.get(scope);
  if (pendingEntry) {
    log.debug('Resolving pending waiters', { scope });
    // Clear timeout before resolving
    if (pendingEntry.timeoutId) {
      clearTimeout(pendingEntry.timeoutId);
    }
    pendingEntry.resolve(services);
    pending.delete(scope);
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
 * @param scope - The scope identifier (default: 'default')
 * @param timeout - Maximum wait time in ms (default: 5000)
 * @returns Object with promise and cancel function
 */
export function waitForStore(scope: string = 'default', timeout: number = 5000): WaitForStoreResult {
  // Return immediately if already registered
  const existing = registry.get(scope);
  if (existing) {
    log.debug('Store already registered, returning immediately', { scope });
    return {
      promise: Promise.resolve(existing),
      cancel: () => {}, // No-op for immediate resolution
    };
  }

  // Check if already waiting - reuse the existing promise
  const existingPending = pending.get(scope);
  if (existingPending) {
    log.debug('Already waiting for store, reusing promise', { scope });
    return {
      promise: existingPending.promise,
      cancel: () => {
        // Individual cancellation doesn't affect shared promise
        // The promise will still be fulfilled if provider registers
      },
    };
  }

  log.debug('Store not registered, waiting...', { scope, timeout });

  // Track cancellation state for this specific waiter
  let cancelled = false;

  // Create new pending entry with deferred promise pattern
  let resolvePromise: (services: Services) => void;
  let rejectPromise: (error: Error) => void;

  const promise = new Promise<Services>((resolve, reject) => {
    resolvePromise = (services) => {
      if (!cancelled) resolve(services);
    };
    rejectPromise = (error) => {
      if (!cancelled) reject(error);
    };
  });

  const pendingEntry: PendingStore = {
    promise,
    resolve: resolvePromise!,
    reject: rejectPromise!,
  };

  // Timeout handling
  if (timeout > 0) {
    pendingEntry.timeoutId = setTimeout(() => {
      if (pending.has(scope) && !cancelled) {
        pending.delete(scope);
        const error = new Error(
          `Timeout waiting for provider with scope "${scope}". ` +
            `Ensure <changebot-provider scope="${scope}"> is present in the DOM.`
        );
        log.warn('Timeout waiting for store', { scope, timeout });
        rejectPromise!(error);
      }
    }, timeout);
  }

  pending.set(scope, pendingEntry);

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (pendingEntry.timeoutId) {
        clearTimeout(pendingEntry.timeoutId);
      }
      // Remove from pending if this entry is still the current one
      const current = pending.get(scope);
      if (current === pendingEntry) {
        pending.delete(scope);
      }
      log.debug('Cancelled wait for store', { scope });
    },
  };
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
  // Clear any pending timeouts
  for (const entry of pending.values()) {
    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }
  }
  registry.clear();
  pending.clear();
}
