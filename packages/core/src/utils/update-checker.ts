/**
 * Update checking utility functions shared between banner and toast components
 */

import { Update } from '../types';
import { getLastViewedTime, validatePublishedAt } from './date-utils';

export type HighlightTarget = 'banner' | 'toast';

export interface UpdateCheckResult {
  /** The new update to display, if any */
  newUpdate: Update | undefined;
  /** Whether to show the update (new update exists and differs from current) */
  shouldShow: boolean;
}

/**
 * Check for a new update that matches the given highlight target
 * @param updates Array of updates to check
 * @param highlightTarget The target type ('banner' or 'toast')
 * @param scope The scope identifier for lastViewed lookup
 * @param currentUpdateId The ID of the currently displayed update (to avoid re-showing)
 * @param context Context string for logging (e.g., 'Banner', 'Toast')
 * @returns UpdateCheckResult with the new update (if any) and whether to show it
 */
export function findHighlightedUpdate(
  updates: Update[],
  highlightTarget: HighlightTarget,
  scope: string | undefined,
  currentUpdateId: number | undefined,
  context: string
): UpdateCheckResult {
  if (!updates || updates.length === 0) {
    return { newUpdate: undefined, shouldShow: false };
  }

  const lastViewed = getLastViewedTime(scope || 'default');

  // Find the most recent update that's newer than lastViewed AND has the target highlight_target
  const newUpdate = updates.find(update => {
    const updateTime = validatePublishedAt(update.published_at, context, update.title);
    if (updateTime === null) return false;

    const isNewer = lastViewed === 0 || updateTime > lastViewed;
    const matchesTarget = update.highlight_target === highlightTarget;
    return isNewer && matchesTarget;
  });

  if (newUpdate && newUpdate.id !== currentUpdateId) {
    console.log(`${context}: Found new update to display:`, newUpdate.title);
    return { newUpdate, shouldShow: true };
  }

  return { newUpdate: undefined, shouldShow: false };
}
