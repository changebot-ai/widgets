/**
 * LocalStorage utility functions for persisting user state
 */

/**
 * Get the last viewed timestamp from localStorage
 * @param scope The scope identifier
 * @returns Timestamp in milliseconds, or 0 if not found
 */
export function getLastViewedTime(scope: string = 'default'): number {
  const key = `changebot:lastViewed:${scope}`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Set the last viewed timestamp in localStorage
 * @param scope The scope identifier
 * @param timestamp Timestamp in milliseconds
 */
export function setLastViewedTime(scope: string = 'default', timestamp: number): void {
  const key = `changebot:lastViewed:${scope}`;
  localStorage.setItem(key, timestamp.toString());
}
