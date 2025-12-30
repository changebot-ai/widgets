/**
 * Date and time utility functions shared across components
 */

/**
 * Format a date string for display
 * @param dateString ISO date string or YYYY-MM-DD format
 * @returns Formatted date like "Jan 15, 2025"
 */
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Validate a published_at timestamp and return the time in milliseconds
 * @param published_at The timestamp to validate
 * @param context Context string for logging (e.g., 'Banner', 'Toast')
 * @param title Optional title for logging
 * @returns The timestamp in milliseconds, or null if invalid
 */
export function validatePublishedAt(
  published_at: string | null | undefined,
  context: string,
  title?: string
): number | null {
  if (!published_at) {
    console.warn(`${context}: Missing published_at for update:`, title);
    return null;
  }

  const updateTime = new Date(published_at).getTime();

  if (isNaN(updateTime) || updateTime === 0) {
    console.warn(`${context}: Invalid published_at timestamp for update:`, title, published_at);
    return null;
  }

  return updateTime;
}
