import { ActionDetail, Services } from '../types';

/**
 * Request all services from the provider component via bubbling event.
 * This is the preferred method for consumer components to get store, actions, and config.
 *
 * @param element The element dispatching the request
 * @param scope Optional scope for multi-provider scenarios (default: 'default')
 * @param callback Callback that receives the services object
 */
export function requestServices(
  element: HTMLElement,
  scope: string | undefined,
  callback: (services: Services) => void
): void {
  const detail = {
    callback,
    scope: scope || 'default',
  };

  element.dispatchEvent(
    new CustomEvent('changebot:context-request', {
      bubbles: true,
      composed: true,
      detail,
    })
  );
}

/**
 * Dispatch an action to the provider component via bubbling event.
 * The provider will execute the corresponding action from its actions service.
 *
 * @param element The element dispatching the action
 * @param type The action type to execute
 * @param payload Optional payload for the action
 * @param scope Optional scope for multi-provider scenarios (default: 'default')
 */
export function dispatchAction(
  element: HTMLElement,
  type: string,
  payload?: any,
  scope = 'default'
): void {
  const detail: ActionDetail = {
    type: type as any,
    payload,
    scope
  };

  element.dispatchEvent(
    new CustomEvent('changebot:action', {
      bubbles: true,
      composed: true,
      detail
    })
  );
}
