import { Component, h, Prop, Listen, Element } from '@stencil/core';
import { createScopedStore, getStorageKey } from '../../store';

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
    this.services.config = {
      url: this.url,
      slug: this.slug,
      scope: this.scope,
    };

    this.hydrateLastViewed();

    if (this.mockData) {
      this.loadMockData();
    } else if (this.url || this.slug) {
      this.loadUpdates();
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
    const timestamp = this.fetchLastSeen();
    if (timestamp) {
      this.scopedStore.actions.markViewed(timestamp);
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

    const key = getStorageKey(this.scope, 'lastApiSync');
    const lastSync = localStorage.getItem(key);

    if (!lastSync) return true; // Never synced before

    const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
    const elapsed = Date.now() - parseInt(lastSync, 10);

    return elapsed > SYNC_INTERVAL;
  }

  private fetchLastSeen(): number | null {
    // Always read localStorage first (fast, synchronous)
    const key = getStorageKey(this.scope, 'lastViewed');
    const stored = localStorage.getItem(key);
    const localValue = stored ? parseInt(stored, 10) : null;

    if (localValue) {
      console.log('🔌 Provider: Fetched lastViewed from localStorage:', new Date(localValue).toLocaleString());
    }

    // Only sync from API if cache has expired
    if (this.shouldSyncWithApi()) {
      void this.syncFromApi();
    }

    return localValue;
  }

  private updateLocalStore(timestamp: number) {
    this.scopedStore.actions.markViewed(timestamp);

    const key = getStorageKey(this.scope, 'lastViewed');
    localStorage.setItem(key, timestamp.toString());
  }

  private async syncFromApi(): Promise<void> {
    try {
      console.log('🔌 Provider: Fetching last_seen_at from API for user', this.userId);
      const data = await this.fetchUserTracking();

      if (data.last_seen_at === null) {
        console.log('🔌 Provider: User not tracked yet, setting last_seen_at to current time');
        const currentTime = Date.now();
        await this.setLastViewed(currentTime);
      } else {
        // Convert ISO timestamp to Unix timestamp in milliseconds
        const timestamp = new Date(data.last_seen_at).getTime();
        console.log('🔌 Provider: Fetched last_seen_at from API:', new Date(timestamp).toLocaleString());

        this.updateLocalStore(timestamp);
      }

      // Update sync timestamp after successful sync
      const syncKey = getStorageKey(this.scope, 'lastApiSync');
      localStorage.setItem(syncKey, Date.now().toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user tracking data';
      console.warn('⚠️ Changebot widget: Could not fetch last_seen_at from API, using localStorage value.', {
        error: errorMessage,
        userId: this.userId,
      });
    }
  }

  private async setLastViewed(timestamp: number): Promise<void> {
    this.updateLocalStore(timestamp);

    if (this.userId) {
      try {
        const userData = this.parseUserData();
        console.log('🔌 Provider: Updating last_seen_at via API for user', this.userId);
        await this.updateUserTracking(timestamp, userData);
        console.log('🔌 Provider: Successfully updated last_seen_at via API');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update user tracking data';
        console.warn('⚠️ Changebot widget: Could not update last_seen_at via API, but localStorage was updated.', {
          error: errorMessage,
          userId: this.userId,
        });
      }
    }
  }

  private async fetchUserTracking(): Promise<{ id: string; last_seen_at: string | null }> {
    let apiUrl: string;
    if (this.slug) {
      apiUrl = `https://api.changebot.ai/v1/widgets/${this.slug}/users/${encodeURIComponent(this.userId)}`;
    } else if (this.url) {
      // For custom URLs, append the user tracking path
      const baseUrl = this.url.replace(/\/updates$/, '');
      apiUrl = `${baseUrl}/users/${encodeURIComponent(this.userId)}`;
    } else {
      throw new Error('Either slug or url must be provided for user tracking');
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user tracking data: ${response.statusText}`);
    }

    return await response.json();
  }

  private async updateUserTracking(timestamp: number, data?: object): Promise<void> {
    let apiUrl: string;
    if (this.slug) {
      apiUrl = `https://api.changebot.ai/v1/widgets/${this.slug}/users/${encodeURIComponent(this.userId)}`;
    } else if (this.url) {
      // For custom URLs, append the user tracking path
      const baseUrl = this.url.replace(/\/updates$/, '');
      apiUrl = `${baseUrl}/users/${encodeURIComponent(this.userId)}`;
    } else {
      throw new Error('Either slug or url must be provided for user tracking');
    }

    const body: any = {
      last_seen_at: new Date(timestamp).toISOString(),
    };

    if (data) {
      body.data = data;
    }

    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user tracking data: ${response.statusText}`);
    }
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
