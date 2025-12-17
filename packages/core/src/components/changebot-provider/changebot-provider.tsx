import { Component, h, Prop, Listen, Element } from '@stencil/core';
import { createScopedStore, getStorageKey } from '../../store';
import { createAPI } from '../../utils/api';
import { VERSION } from '../../utils/version';

@Component({
  tag: 'changebot-provider',
  styleUrl: 'changebot-provider.css',
  shadow: false, // No shadow DOM - needs document event access
})
export class ChangebotProvider {
  @Element() el: HTMLElement;

  @Prop() url?: string;
  @Prop() slug?: string;
  @Prop() scope: string = 'default';
  @Prop() mockData?: string;
  @Prop() userId?: string;
  @Prop() userData?: string;

  private scopedStore = createScopedStore();
  private api = createAPI();

  private services = {
    store: this.scopedStore.store,
    actions: this.scopedStore.actions,
    config: {
      url: this.url,
      slug: this.slug,
      scope: this.scope || 'default',
    },
  };

  componentWillLoad() {
    console.log(`🤖 Changebot Widgets v${VERSION}`);
    console.log('🔌 Provider: componentWillLoad', {
      scope: this.scope,
      slug: this.slug,
      url: this.url,
      userId: this.userId,
      hasMockData: !!this.mockData,
    });

    this.services.config = {
      url: this.url,
      slug: this.slug,
      scope: this.scope,
    };

    // Initialize API client with slug or url
    this.api = createAPI(this.url || this.slug);

    this.hydrateLastViewed();

    if (this.mockData) {
      console.log('🔌 Provider: Loading mock data');
      this.loadMockData();
    } else if (this.url || this.slug) {
      console.log('🔌 Provider: Loading updates from API', { slug: this.slug, url: this.url });
      this.loadUpdates();
    } else {
      console.log('🔌 Provider: No slug, url, or mock data provided - skipping update load');
    }
  }

  @Listen('changebot:context-request', { target: 'document', capture: true })
  handleContextRequest(event: CustomEvent<{ callback: Function; scope?: string }>) {
    const requestScope = event.detail.scope || 'default';

    console.log(`🔌 Provider: Received context request for scope "${requestScope}", my scope is "${this.scope}"`);

    // Only respond if scope matches
    if (requestScope === this.scope) {
      // Stop propagation to prevent other providers from responding
      event.stopPropagation();

      console.log('🔌 Provider: Responding with services', this.services);

      // Provide the services via callback
      if (event.detail.callback) {
        event.detail.callback(this.services);
      }
    } else {
      console.log(`🔌 Provider: Ignoring request (scope mismatch)`);
    }
  }

  @Listen('changebot:action', { target: 'document', capture: true })
  handleAction(event: CustomEvent<{ type: string; payload?: any; scope?: string }>) {
    const actionScope = event.detail.scope || 'default';

    // Only handle if scope matches
    if (actionScope === this.scope) {
      const { type, payload } = event.detail;

      if (type in this.scopedStore.actions) {
        try {
          if (payload !== undefined) {
            this.scopedStore.actions[type](payload);
          } else {
            this.scopedStore.actions[type]();
          }

          if (type === 'openDisplay') {
            void this.markAsViewed();
          }
        } catch (error) {
          console.error(`Error executing action ${type}:`, error);
        }
      } else {
        console.warn('Unknown action type:', type);
      }
    }
  }

  private async markAsViewed() {
    console.log('🔌 Provider: Marking as viewed for scope', this.scope);
    await this.setLastViewed(Date.now());
  }

  private hydrateLastViewed() {
    console.log('🔌 Provider: Hydrating lastViewed for scope', this.scope, { userId: this.userId });
    const timestamp = this.fetchLastSeen();
    if (timestamp) {
      console.log('🔌 Provider: Marking as viewed with timestamp from storage', {
        timestamp,
        formatted: new Date(timestamp).toISOString(),
      });
      this.scopedStore.actions.markViewed(timestamp);
    } else if (!this.userId) {
      // Anonymous user with no localStorage - initialize to now
      // so future updates will show as unread
      const currentTime = Date.now();
      console.log('🔌 Provider: No timestamp found and no userId, initializing to current time', {
        currentTime,
        formatted: new Date(currentTime).toISOString(),
      });
      this.updateLocalStore(currentTime);
    } else {
      console.log('🔌 Provider: No timestamp found but userId exists, waiting for API sync', { userId: this.userId });
    }
  }

  private async loadUpdates() {
    try {
      await this.scopedStore.actions.loadUpdates(this.slug, this.url);
    } catch (error) {
      console.error('🔌 Provider: Failed to load updates:', error);
      // Store error is already handled in the action
    }
  }

  private loadMockData() {
    try {
      const data = JSON.parse(this.mockData);
      this.scopedStore.actions.loadMockUpdates(data);
    } catch (error) {
      console.error('🔌 Provider: Failed to parse mock data:', error);
    }
  }

  private shouldSyncWithApi(): boolean {
    if (!this.userId) return false;

    const key = getStorageKey(this.scope, 'lastApiSync', this.userId);
    const lastSync = localStorage.getItem(key);

    if (!lastSync) return true; // Never synced before

    const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
    const elapsed = Date.now() - parseInt(lastSync, 10);

    return elapsed > SYNC_INTERVAL;
  }

  private fetchLastSeen(): number | null {
    // Always read localStorage first (fast, synchronous)
    const key = getStorageKey(this.scope, 'lastViewed', this.userId);
    console.log('🔌 Provider: Fetching lastViewed from localStorage', {
      key,
      scope: this.scope,
      userId: this.userId,
    });

    const stored = localStorage.getItem(key);
    const localValue = stored ? parseInt(stored, 10) : null;

    if (localValue) {
      console.log('🔌 Provider: Fetched lastViewed from localStorage:', {
        value: localValue,
        formatted: new Date(localValue).toLocaleString(),
        iso: new Date(localValue).toISOString(),
      });
    } else {
      console.log('🔌 Provider: No lastViewed found in localStorage');
    }

    // Only sync from API if cache has expired
    if (this.shouldSyncWithApi()) {
      console.log('🔌 Provider: API sync needed, initiating sync');
      void this.syncFromApi();
    } else {
      console.log('🔌 Provider: API sync not needed (recently synced or no userId)');
    }

    return localValue;
  }

  private updateLocalStore(timestamp: number) {
    console.log('🔌 Provider: Updating local store with timestamp', {
      timestamp,
      formatted: !isNaN(timestamp) ? new Date(timestamp).toISOString() : 'Invalid timestamp',
      scope: this.scope,
      userId: this.userId,
    });

    this.scopedStore.actions.markViewed(timestamp);

    const key = getStorageKey(this.scope, 'lastViewed', this.userId);
    localStorage.setItem(key, timestamp.toString());
    console.log('🔌 Provider: Updated localStorage', { key, value: timestamp });
  }

  private async syncFromApi(): Promise<void> {
    console.log('🔌 Provider: Fetching last_seen_at from API for user', this.userId);
    const data = await this.fetchUserTracking();

    if (!data) {
      console.log('🔌 Provider: Could not fetch last_seen_at from API, using localStorage value');
      return;
    }

    if (data.last_seen_at === null) {
      console.log('🔌 Provider: User not tracked yet, setting last_seen_at to current time');
      const currentTime = Date.now();
      await this.setLastViewed(currentTime);
    } else {
      // Convert ISO timestamp to Unix timestamp in milliseconds
      const timestamp = new Date(data.last_seen_at).getTime();

      if (isNaN(timestamp)) {
        console.warn('🔌 Provider: Invalid timestamp received from API:', data.last_seen_at);
        return;
      }

      console.log('🔌 Provider: Fetched last_seen_at from API:', new Date(timestamp).toLocaleString());

      this.updateLocalStore(timestamp);
    }

    // Update sync timestamp after successful sync
    const syncKey = getStorageKey(this.scope, 'lastApiSync', this.userId);
    localStorage.setItem(syncKey, Date.now().toString());
  }

  private async setLastViewed(timestamp: number): Promise<void> {
    this.updateLocalStore(timestamp);

    if (this.userId) {
      const userData = this.parseUserData();
      console.log('🔌 Provider: Updating last_seen_at via API for user', this.userId);
      const success = await this.updateUserTracking(timestamp, userData);

      if (success) {
        console.log('🔌 Provider: Successfully updated last_seen_at via API');
      } else {
        console.log('🔌 Provider: Could not update last_seen_at via API, but localStorage was updated');
      }
    }
  }

  private async fetchUserTracking(): Promise<{ id: string; last_seen_at: string | null } | null> {
    return await this.api.fetchUserTracking(this.userId);
  }

  private async updateUserTracking(timestamp: number, data?: object): Promise<boolean> {
    return await this.api.updateUserTracking(this.userId, timestamp, data);
  }

  private parseUserData(): object | null {
    if (!this.userData) {
      return null;
    }

    try {
      return JSON.parse(this.userData);
    } catch (error) {
      console.error('🔌 Provider: Invalid userData JSON, discarding userData but continuing with user tracking:', error);
      return null;
    }
  }

  render() {
    return <slot></slot>;
  }
}
