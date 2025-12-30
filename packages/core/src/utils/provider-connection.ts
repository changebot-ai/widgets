/**
 * Provider connection utilities for consumer components
 *
 * Handles the boilerplate of connecting to a provider:
 * - Setting data-scope attribute
 * - Requesting services
 * - Managing subscriptions with automatic cleanup
 */

import { Services } from '../types';
import { requestServices } from './context';

type LogFn = {
  debug: (msg: string, data?: Record<string, unknown>) => void;
};

/**
 * Connect a consumer component to the provider.
 * Handles scope attribute setting and service request.
 *
 * @param el - The component's host element
 * @param scope - Optional scope for multi-provider scenarios
 * @param onConnect - Callback when services are received
 * @param log - Logger instance for the component
 */
export function connectToProvider(
  el: HTMLElement,
  scope: string | undefined,
  onConnect: (services: Services) => void,
  log: LogFn
): void {
  // Set data-scope attribute for debugging
  if (scope) {
    el.setAttribute('data-scope', scope);
  }

  log.debug('Requesting context', { scope: scope || 'default' });

  requestServices(el, scope, services => {
    log.debug('Received services from provider', {
      hasStore: !!services?.store,
      hasActions: !!services?.actions,
    });
    onConnect(services);
  });
}

/**
 * Manages multiple store subscriptions with a single cleanup function.
 * Ensures proper cleanup on component disconnect.
 */
export class SubscriptionManager {
  private cleanups: (() => void)[] = [];

  /**
   * Add a subscription cleanup function
   */
  add(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  /**
   * Subscribe to a store property change
   */
  subscribe(
    store: { onChange: (prop: string, callback: () => void) => () => void },
    prop: string,
    callback: () => void
  ): void {
    const unsubscribe = store.onChange(prop, callback);
    this.add(unsubscribe);
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
  }
}
