/**
 * Update checking utility functions shared between banner and toast components
 */

import { Update } from '../types';
import { validatePublishedAt } from './date-utils';
import { logger } from './logger';

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
 * @param lastViewed The timestamp of when updates were last viewed (from store)
 * @param currentUpdateId The ID of the currently displayed update (to avoid re-showing)
 * @param context Context string for logging (e.g., 'Banner', 'Toast')
 * @returns UpdateCheckResult with the new update (if any) and whether to show it
 */
export function findHighlightedUpdate(
  updates: Update[],
  highlightTarget: HighlightTarget,
  lastViewed: number | null,
  currentUpdateId: number | undefined,
  context: string
): UpdateCheckResult {
  if (!updates || updates.length === 0) {
    logger.debug(context, 'No updates to check');
    return { newUpdate: undefined, shouldShow: false };
  }

  logger.debug(context, `Checking ${updates.length} updates for highlight_target="${highlightTarget}"`, {
    lastViewed,
    lastViewedFormatted: lastViewed ? new Date(lastViewed).toISOString() : null,
    currentUpdateId,
  });

  // Find the most recent update that's newer than lastViewed AND has the target highlight_target
  const newUpdate = updates.find(update => {
    const updateTime = validatePublishedAt(update.published_at, context, update.title);
    if (updateTime === null) return false;

    const isNewer = lastViewed === null || lastViewed === 0 || updateTime > lastViewed;
    const matchesTarget = update.highlight_target === highlightTarget;

    // Log updates that have any highlight_target set
    if (update.highlight_target) {
      logger.debug(context, `Update "${update.title?.substring(0, 40)}" has highlight_target="${update.highlight_target}"`, {
        matchesTarget,
        isNewer,
        updateTime,
        lastViewed,
      });
    }

    return isNewer && matchesTarget;
  });

  if (newUpdate && newUpdate.id !== currentUpdateId) {
    logger.debug(context, 'Found new update to display', { title: newUpdate.title });
    return { newUpdate, shouldShow: true };
  }

  logger.debug(context, 'No matching update found');
  return { newUpdate: undefined, shouldShow: false };
}
