/**
 * Shared logic for highlight consumer components (toast, banner)
 *
 * Both toast and banner components display highlighted updates and share
 * similar update checking and dismiss logic.
 */

import { Update } from '../types';
import { findHighlightedUpdate, HighlightTarget } from './update-checker';
import { validatePublishedAt } from './date-utils';
import { setLastViewedTime } from './storage-utils';

type LogFn = {
  debug: (msg: string, data?: Record<string, unknown>) => void;
  info: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
};

export interface HighlightConsumerState {
  isVisible: boolean;
  currentUpdate?: Update;
}

export interface HighlightConsumerCallbacks {
  onShow: (update: Update) => void;
  onHide: () => void;
}

/**
 * Check for a new highlighted update and trigger appropriate callbacks
 */
export function checkForHighlightedUpdate(
  updates: Update[],
  target: HighlightTarget,
  scope: string | undefined,
  currentUpdateId: number | undefined,
  callbacks: HighlightConsumerCallbacks,
  logPrefix: string
): void {
  const result = findHighlightedUpdate(updates, target, scope, currentUpdateId, logPrefix);

  if (result.shouldShow && result.newUpdate) {
    callbacks.onShow(result.newUpdate);
  } else if (!result.newUpdate) {
    callbacks.onHide();
  }
}

/**
 * Mark an update as viewed by saving its timestamp to localStorage
 */
export function markUpdateAsViewed(
  update: Update,
  scope: string | undefined,
  log: LogFn,
  componentName: string
): boolean {
  const updateTime = validatePublishedAt(update.published_at, componentName, update.title);

  if (updateTime === null) {
    log.error('Cannot mark update as viewed - invalid published_at');
    return false;
  }

  setLastViewedTime(scope || 'default', updateTime);
  log.info(`Marked update as viewed: ${update.title}`);
  return true;
}

/**
 * Creates a standardized dismiss handler for highlight consumers
 */
export function createDismissHandler(
  getState: () => HighlightConsumerState,
  setState: (visible: boolean, update?: Update) => void,
  scope: string | undefined,
  log: LogFn,
  componentName: string,
  clearTimer?: () => void
): () => void {
  return () => {
    // Clear any auto-dismiss timer
    if (clearTimer) {
      clearTimer();
    }

    const state = getState();

    // Mark update as viewed
    if (state.currentUpdate) {
      markUpdateAsViewed(state.currentUpdate, scope, log, componentName);
    }

    // Hide the component
    setState(false, undefined);
  };
}
