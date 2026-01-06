import { Update } from '../types';

export interface UserTracking {
  id: string;
  last_seen_at: string | null;
  last_viewed_banner_at: string | null;
  last_viewed_toast_at: string | null;
}

class NullAPI {
  async fetchUpdates(): Promise<Update[] | null> {
    console.warn('⚠️ Changebot widget: Cannot fetch updates - no slug or URL provided');
    return null;
  }

  async fetchUserTracking(userId: string): Promise<UserTracking | null> {
    console.warn('⚠️ Changebot widget: Cannot fetch user tracking - no slug or URL provided', { userId });
    return null;
  }

  async updateUserTracking(userId: string, timestamps: UserTrackingTimestamps, data?: object): Promise<boolean> {
    console.warn('⚠️ Changebot widget: Cannot update user tracking - no slug or URL provided', { userId, timestamps, data });
    return false;
  }
}

export interface UserTrackingTimestamps {
  lastViewed?: number;
  lastViewedBanner?: number;
  lastViewedToast?: number;
}

export class ChangebotAPI {
  private baseUrl: string;

  constructor(slugOrUrl: string) {
    if (slugOrUrl.startsWith('http')) {
      // Custom URL provided - use as-is
      this.baseUrl = slugOrUrl;
    } else {
      // Slug provided - construct standard API URL
      this.baseUrl = `https://api.changebot.ai/v1/widgets/${slugOrUrl}`;
    }
  }

  async fetchUpdates(): Promise<Update[] | null> {
    try {
      const response = await fetch(`${this.baseUrl}/updates`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        console.warn(`⚠️ Changebot widget: Failed to fetch updates (${response.status} ${response.statusText})`);
        return null;
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Changebot widget: Error fetching updates:', errorMessage);
      return null;
    }
  }

  async fetchUserTracking(userId: string): Promise<UserTracking | null> {
    try {
      const encodedUserId = encodeURIComponent(userId);
      const response = await fetch(`${this.baseUrl}/users/${encodedUserId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        console.warn(`⚠️ Changebot widget: Failed to fetch user tracking data (${response.status} ${response.statusText})`);
        return null;
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Changebot widget: Error fetching user tracking data:', errorMessage);
      return null;
    }
  }

  async updateUserTracking(userId: string, timestamps: UserTrackingTimestamps, data?: object): Promise<boolean> {
    try {
      const encodedUserId = encodeURIComponent(userId);

      const body: Record<string, unknown> = {};

      if (timestamps.lastViewed !== undefined) {
        if (isNaN(timestamps.lastViewed)) {
          console.error('API: Invalid lastViewed timestamp provided to updateUserTracking:', timestamps.lastViewed);
          return false;
        }
        body.last_seen_at = new Date(timestamps.lastViewed).toISOString();
      }

      if (timestamps.lastViewedBanner !== undefined) {
        if (isNaN(timestamps.lastViewedBanner)) {
          console.error('API: Invalid lastViewedBanner timestamp provided to updateUserTracking:', timestamps.lastViewedBanner);
          return false;
        }
        body.last_viewed_banner_at = new Date(timestamps.lastViewedBanner).toISOString();
      }

      if (timestamps.lastViewedToast !== undefined) {
        if (isNaN(timestamps.lastViewedToast)) {
          console.error('API: Invalid lastViewedToast timestamp provided to updateUserTracking:', timestamps.lastViewedToast);
          return false;
        }
        body.last_viewed_toast_at = new Date(timestamps.lastViewedToast).toISOString();
      }

      if (data) {
        body.data = data;
      }

      const response = await fetch(`${this.baseUrl}/users/${encodedUserId}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.warn(`⚠️ Changebot widget: Failed to update user tracking data (${response.status} ${response.statusText})`);
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Changebot widget: Error updating user tracking data:', errorMessage);
      return false;
    }
  }
}

export function createAPI(slugOrUrl?: string): ChangebotAPI | NullAPI {
  return slugOrUrl ? new ChangebotAPI(slugOrUrl) : new NullAPI();
}
