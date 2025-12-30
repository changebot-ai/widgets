/**
 * Shared logic for highlight consumer components (toast, banner)
 *
 * Both toast and banner components display highlighted updates and share
 * similar update checking and dismiss logic.
 */

import { StoreActions, Update } from '../types';
import { findHighlightedUpdate, HighlightTarget } from './update-checker';
import { validatePublishedAt } from './date-utils';

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
 * @param updates Array of updates to check
 * @param target The highlight target type ('banner' or 'toast')
 * @param lastViewed The timestamp of when updates were last viewed (from store)
 * @param currentUpdateId The ID of the currently displayed update
 * @param callbacks Callbacks for show/hide events
 * @param logPrefix Prefix for logging
 */
export function checkForHighlightedUpdate(
  updates: Update[],
  target: HighlightTarget,
  lastViewed: number | null,
  currentUpdateId: number | undefined,
  callbacks: HighlightConsumerCallbacks,
  logPrefix: string
): void {
  const result = findHighlightedUpdate(updates, target, lastViewed, currentUpdateId, logPrefix);

  if (result.shouldShow && result.newUpdate) {
    callbacks.onShow(result.newUpdate);
  } else if (!result.newUpdate) {
    callbacks.onHide();
  }
}

/**
 * Mark an update as viewed by calling the store action
 * @param update The update to mark as viewed
 * @param actions Store actions to call markViewed
 * @param log Logger instance
 * @param componentName Name of the component for logging
 */
export function markUpdateAsViewed(
  update: Update,
  actions: StoreActions,
  log: LogFn,
  componentName: string
): boolean {
  const updateTime = validatePublishedAt(update.published_at, componentName, update.title);

  if (updateTime === null) {
    log.error('Cannot mark update as viewed - invalid published_at');
    return false;
  }

  actions.markViewed(updateTime);
  log.info(`Marked update as viewed: ${update.title}`);
  return true;
}
