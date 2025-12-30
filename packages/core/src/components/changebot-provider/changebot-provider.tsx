import { Component, h, Prop, Listen, Element } from '@stencil/core';
import { createScopedStore, getStorageKey } from '../../store';
import { createAPI } from '../../utils/api';
import { VERSION } from '../../utils/version';
import { logProvider as log } from '../../utils/logger';

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
    log.info(`Changebot Widgets v${VERSION}`);
    log.debug('componentWillLoad', {
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
      log.debug('Loading mock data');
      this.loadMockData();
    } else if (this.url || this.slug) {
      log.debug('Loading updates from API', { slug: this.slug, url: this.url });
      this.loadUpdates();
    } else {
      log.debug('No slug, url, or mock data provided - skipping update load');
    }
  }

  @Listen('changebot:context-request', { target: 'document', capture: true })
  handleContextRequest(event: CustomEvent<{ callback: Function; scope?: string }>) {
    const requestScope = event.detail.scope || 'default';

    log.debug(`Received context request for scope "${requestScope}", my scope is "${this.scope}"`);

    // Only respond if scope matches
    if (requestScope === this.scope) {
      // Stop propagation to prevent other providers from responding
      event.stopPropagation();

      log.debug('Responding with services');

      // Provide the services via callback
      if (event.detail.callback) {
        event.detail.callback(this.services);
      }
    } else {
      log.debug('Ignoring request (scope mismatch)');
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
          log.error(`Error executing action ${type}`, { error });
        }
      } else {
        log.warn(`Unknown action type: ${type}`);
      }
    }
  }

  private async markAsViewed() {
    log.debug('Marking as viewed', { scope: this.scope });
    await this.setLastViewed(Date.now());
  }

  private hydrateLastViewed() {
    log.debug('Hydrating lastViewed', { scope: this.scope, userId: this.userId });
    const timestamp = this.fetchLastSeen();
    if (timestamp) {
      log.debug('Marking as viewed with timestamp from storage', {
        timestamp,
        formatted: new Date(timestamp).toISOString(),
      });
      this.scopedStore.actions.markViewed(timestamp);
    } else if (!this.userId) {
      // Anonymous user with no localStorage - initialize to now
      const currentTime = Date.now();
      log.debug('No timestamp found and no userId, initializing to current time', {
        currentTime,
        formatted: new Date(currentTime).toISOString(),
      });
      this.updateLocalStore(currentTime);
    } else {
      log.debug('No timestamp found but userId exists, waiting for API sync', { userId: this.userId });
    }
  }

  private async loadUpdates() {
    try {
      await this.scopedStore.actions.loadUpdates(this.slug, this.url);
    } catch (error) {
      log.error('Failed to load updates', { error });
    }
  }

  private loadMockData() {
    try {
      const data = JSON.parse(this.mockData);
      this.scopedStore.actions.loadMockUpdates(data);
    } catch (error) {
      log.error('Failed to parse mock data', { error });
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
    log.debug('Fetching lastViewed from localStorage', {
      key,
      scope: this.scope,
      userId: this.userId,
    });

    const stored = localStorage.getItem(key);
    const localValue = stored ? parseInt(stored, 10) : null;

    if (localValue) {
      log.debug('Fetched lastViewed from localStorage', {
        value: localValue,
        formatted: new Date(localValue).toLocaleString(),
      });
    } else {
      log.debug('No lastViewed found in localStorage');
    }

    // Only sync from API if cache has expired
    if (this.shouldSyncWithApi()) {
      log.debug('API sync needed, initiating sync');
      void this.syncFromApi();
    } else {
      log.debug('API sync not needed (recently synced or no userId)');
    }

    return localValue;
  }

  private updateLocalStore(timestamp: number) {
    log.debug('Updating local store with timestamp', {
      timestamp,
      formatted: !isNaN(timestamp) ? new Date(timestamp).toISOString() : 'Invalid timestamp',
      scope: this.scope,
      userId: this.userId,
    });

    this.scopedStore.actions.markViewed(timestamp);

    const key = getStorageKey(this.scope, 'lastViewed', this.userId);
    localStorage.setItem(key, timestamp.toString());
    log.debug('Updated localStorage', { key, value: timestamp });
  }

  private async syncFromApi(): Promise<void> {
    log.debug('Fetching last_seen_at from API', { userId: this.userId });
    const data = await this.fetchUserTracking();

    if (!data) {
      log.debug('Could not fetch last_seen_at from API, using localStorage value');
      return;
    }

    if (data.last_seen_at === null || data.last_seen_at === undefined) {
      log.debug('User not tracked yet, setting last_seen_at to current time');
      const currentTime = Date.now();
      await this.setLastViewed(currentTime);
    } else {
      // Convert ISO timestamp to Unix timestamp in milliseconds
      const timestamp = new Date(data.last_seen_at).getTime();

      if (isNaN(timestamp) || timestamp === 0) {
        log.warn('Invalid timestamp received from API', { last_seen_at: data.last_seen_at });
        return;
      }

      log.debug('Fetched last_seen_at from API', { formatted: new Date(timestamp).toLocaleString() });

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
      log.debug('Updating last_seen_at via API', { userId: this.userId });
      const success = await this.updateUserTracking(timestamp, userData);

      if (success) {
        log.debug('Successfully updated last_seen_at via API');
      } else {
        log.debug('Could not update last_seen_at via API, but localStorage was updated');
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
      log.error('Invalid userData JSON, discarding userData but continuing with user tracking', { error });
      return null;
    }
  }

  render() {
    return <slot></slot>;
  }
}
