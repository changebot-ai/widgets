import { Component, h, Prop, Element, Listen } from '@stencil/core';
import { ActionDetail } from '../../types';
import { createScopedStore, getStorageKey } from '../../store';
import { registerStore, unregisterStore } from '../../store/registry';
import { createAPI } from '../../utils/api';
import { VERSION } from '../../utils/version';
import { logProvider as log } from '../../utils/logger';
import { safeStorage } from '../../utils/safe-storage';

@Component({
  tag: 'changebot-provider',
  styleUrl: 'changebot-provider.css',
  shadow: false, // No shadow DOM - needs document event access
})
export class ChangebotProvider {
  @Element() el: HTMLElement;

  @Prop() slug?: string;
  @Prop() userId?: string;
  @Prop() userData?: string;
  @Prop() scope: string = 'default'; // Undocumented: for multiple provider instances
  @Prop() baseUrl?: string; // Testing: custom API endpoint
  @Prop() mockData?: string; // Testing: JSON string of mock data for demos
  @Prop() preview?: boolean; // Testing: load built-in mock data for layout testing

  private scopedStore = createScopedStore();
  private api = createAPI();
  private abortController?: AbortController;

  private services = {
    store: this.scopedStore.store,
    config: {
      baseUrl: this.baseUrl,
      slug: this.slug,
      scope: this.scope || 'default',
    },
    display: {
      open: () => this.openAndMarkViewed(),
      close: () => this.scopedStore.actions.closeDisplay(),
    },
    highlight: {
      markBannerViewed: () => this.markBannerAsViewed(),
      markToastViewed: () => this.markToastAsViewed(),
    },
  };

  async componentWillLoad() {
    log.info(`Changebot Widgets v${VERSION}`);
    log.debug('componentWillLoad', {
      scope: this.scope,
      slug: this.slug,
      baseUrl: this.baseUrl,
      userId: this.userId,
      hasMockData: !!this.mockData,
    });

    // Create abort controller for this provider instance
    this.abortController = new AbortController();

    this.services.config = {
      baseUrl: this.baseUrl,
      slug: this.slug,
      scope: this.scope,
    };

    // Initialize API client with slug or baseUrl (slug takes precedence)
    this.api = createAPI(this.slug || this.baseUrl);

    this.hydrateLastViewed();

    // Register store IMMEDIATELY so consumers can connect
    // Store starts with empty data - consumers handle this gracefully:
    // - Badge: hidden when count=0 (already works)
    // - Panel: shows loading state if opened while loading
    // - Toast/Banner: don't render when no highlighted update (already works)
    registerStore(this.scope, this.services);
    log.debug('Registered store in registry', { scope: this.scope });

    // Load data in background - don't await (non-blocking)
    // When data arrives, store updates and consumers react via subscriptions
    if (this.preview) {
      log.debug('Preview mode enabled, loading built-in mock data');
      this.loadPreviewData();
    } else if (this.mockData) {
      log.debug('Loading mock data');
      this.loadMockData();
    } else if (this.slug || this.baseUrl) {
      log.debug('Loading updates from API', { slug: this.slug, baseUrl: this.baseUrl });
      void this.loadUpdates(); // Fire and forget
    } else {
      log.debug('No slug, baseUrl, or mock data provided - skipping update load');
    }
  }

  private loadPreviewData() {
    // 2 updates with future dates (appear as "new"), 1 with past date (appears as "viewed")
    const future = new Date('2099-01-01').toISOString();
    const past = new Date('2020-01-01').toISOString();

    const previewData = {
      widget: {
        title: "What's New",
        subheading: 'Preview Mode',
        slug: 'preview',
        branded: true,
      },
      publications: [
        {
          id: 1,
          title: 'Preview: Banner Update',
          content: '<p>This is preview mode. The banner displays highlighted updates. In production, your actual updates will appear here.</p>',
          display_date: new Date().toISOString().split('T')[0],
          published_at: future,
          expires_on: null,
          highlight_target: 'banner',
          hosted_url: null,
          tags: [{ id: 1, name: 'Preview', color: '#8b5cf6' }],
        },
        {
          id: 2,
          title: 'Preview: Toast Notification',
          content: '<p>This is preview mode. The toast displays highlighted updates. In production, your actual updates will appear here.</p>',
          display_date: new Date().toISOString().split('T')[0],
          published_at: future,
          expires_on: null,
          highlight_target: 'toast',
          hosted_url: null,
          tags: [{ id: 2, name: 'Preview', color: '#8b5cf6' }],
        },
        {
          id: 3,
          title: 'Preview: Regular Update',
          content: '<p>This is preview mode. Regular updates appear in the panel. In production, your actual updates will appear here.</p>',
          display_date: new Date().toISOString().split('T')[0],
          published_at: past,
          expires_on: null,
          highlight_target: null,
          hosted_url: null,
          tags: [{ id: 3, name: 'Preview', color: '#8b5cf6' }],
        },
      ],
    };

    this.scopedStore.actions.loadMockUpdates(previewData);
  }

  disconnectedCallback() {
    // Abort any pending requests
    this.abortController?.abort();

    unregisterStore(this.scope);
    log.debug('Unregistered store from registry', { scope: this.scope });
  }

  @Listen('changebot:action', { target: 'document' })
  handleAction(event: CustomEvent<ActionDetail>) {
    const { type, scope } = event.detail;

    // Only handle events for this provider's scope
    if (scope && scope !== this.scope) {
      return;
    }

    log.debug('Received action', { type, scope, myScope: this.scope });

    switch (type) {
      case 'openDisplay':
        this.services.display.open();
        break;
      case 'closeDisplay':
        this.services.display.close();
        break;
      case 'toggleDisplay':
        if (this.scopedStore.store.state.isOpen) {
          this.services.display.close();
        } else {
          this.services.display.open();
        }
        break;
      case 'markViewed': // Internal: mark updates as viewed without opening panel
        void this.markAsViewed();
        break;
      case 'markAllViewed': // Internal: mark all updates as viewed
        this.scopedStore.actions.markAllViewed();
        void this.markAsViewed();
        break;
      default:
        log.debug('Unknown action type', { type });
    }
  }

  private async markAsViewed() {
    log.debug('Marking as viewed', { scope: this.scope });
    await this.setLastViewed(Date.now());
  }

  private async markBannerAsViewed() {
    log.debug('Marking banner as viewed', { scope: this.scope });
    await this.setLastViewedBanner(Date.now());
  }

  private async markToastAsViewed() {
    log.debug('Marking toast as viewed', { scope: this.scope });
    await this.setLastViewedToast(Date.now());
  }

  private openAndMarkViewed() {
    log.debug('Opening display and marking as viewed', { scope: this.scope });
    this.scopedStore.actions.openDisplay();
    void this.markAsViewed();
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

    // Hydrate banner and toast timestamps from localStorage
    this.hydrateLastViewedBanner();
    this.hydrateLastViewedToast();
  }

  private hydrateLastViewedBanner() {
    const key = getStorageKey(this.scope, 'lastViewedBanner', this.userId);
    const stored = safeStorage.getItem(key);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      log.debug('Hydrating lastViewedBanner from localStorage', {
        timestamp,
        formatted: new Date(timestamp).toISOString(),
      });
      this.scopedStore.actions.markBannerViewed(timestamp);
    }
  }

  private hydrateLastViewedToast() {
    const key = getStorageKey(this.scope, 'lastViewedToast', this.userId);
    const stored = safeStorage.getItem(key);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      log.debug('Hydrating lastViewedToast from localStorage', {
        timestamp,
        formatted: new Date(timestamp).toISOString(),
      });
      this.scopedStore.actions.markToastViewed(timestamp);
    }
  }

  private async loadUpdates() {
    // Check if aborted before starting
    if (this.abortController?.signal.aborted) {
      log.debug('Load updates aborted before starting');
      return;
    }

    try {
      await this.scopedStore.actions.loadUpdates(this.slug, this.baseUrl, this.abortController?.signal);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        log.debug('Load updates aborted');
        return;
      }
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
    const lastSync = safeStorage.getItem(key);

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

    const stored = safeStorage.getItem(key);
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
    safeStorage.setItem(key, timestamp.toString());
    log.debug('Updated localStorage', { key, value: timestamp });
  }

  private updateLocalStoreBanner(timestamp: number) {
    log.debug('Updating local store banner with timestamp', {
      timestamp,
      formatted: !isNaN(timestamp) ? new Date(timestamp).toISOString() : 'Invalid timestamp',
      scope: this.scope,
      userId: this.userId,
    });

    this.scopedStore.actions.markBannerViewed(timestamp);

    const key = getStorageKey(this.scope, 'lastViewedBanner', this.userId);
    safeStorage.setItem(key, timestamp.toString());
    log.debug('Updated localStorage for banner', { key, value: timestamp });
  }

  private updateLocalStoreToast(timestamp: number) {
    log.debug('Updating local store toast with timestamp', {
      timestamp,
      formatted: !isNaN(timestamp) ? new Date(timestamp).toISOString() : 'Invalid timestamp',
      scope: this.scope,
      userId: this.userId,
    });

    this.scopedStore.actions.markToastViewed(timestamp);

    const key = getStorageKey(this.scope, 'lastViewedToast', this.userId);
    safeStorage.setItem(key, timestamp.toString());
    log.debug('Updated localStorage for toast', { key, value: timestamp });
  }

  private async syncFromApi(): Promise<void> {
    // Check if aborted
    if (this.abortController?.signal.aborted) return;

    log.debug('Fetching last_seen_at from API', { userId: this.userId });
    const data = await this.fetchUserTracking();

    // Check if aborted after fetch
    if (this.abortController?.signal.aborted) return;

    if (!data) {
      log.debug('Could not fetch last_seen_at from API, using localStorage value');
      return;
    }

    // Sync last_seen_at
    if (data.last_seen_at === null || data.last_seen_at === undefined) {
      log.debug('User not tracked yet, setting last_seen_at to current time');
      const currentTime = Date.now();
      await this.setLastViewed(currentTime);
    } else {
      // Convert ISO timestamp to Unix timestamp in milliseconds
      const timestamp = new Date(data.last_seen_at).getTime();

      if (isNaN(timestamp) || timestamp === 0) {
        log.warn('Invalid timestamp received from API', { last_seen_at: data.last_seen_at });
      } else {
        log.debug('Fetched last_seen_at from API', { formatted: new Date(timestamp).toLocaleString() });
        this.updateLocalStore(timestamp);
      }
    }

    // Sync last_viewed_banner_at
    if (data.last_viewed_banner_at) {
      const bannerTimestamp = new Date(data.last_viewed_banner_at).getTime();
      if (!isNaN(bannerTimestamp) && bannerTimestamp !== 0) {
        log.debug('Fetched last_viewed_banner_at from API', { formatted: new Date(bannerTimestamp).toLocaleString() });
        this.updateLocalStoreBanner(bannerTimestamp);
      }
    }

    // Sync last_viewed_toast_at
    if (data.last_viewed_toast_at) {
      const toastTimestamp = new Date(data.last_viewed_toast_at).getTime();
      if (!isNaN(toastTimestamp) && toastTimestamp !== 0) {
        log.debug('Fetched last_viewed_toast_at from API', { formatted: new Date(toastTimestamp).toLocaleString() });
        this.updateLocalStoreToast(toastTimestamp);
      }
    }

    // Update sync timestamp after successful sync
    const syncKey = getStorageKey(this.scope, 'lastApiSync', this.userId);
    safeStorage.setItem(syncKey, Date.now().toString());
  }

  private async setLastViewed(timestamp: number): Promise<void> {
    this.updateLocalStore(timestamp);

    if (this.userId) {
      const userData = this.parseUserData();
      log.debug('Updating last_seen_at via API', { userId: this.userId });
      const success = await this.updateUserTracking({ lastViewed: timestamp }, userData);

      if (success) {
        log.debug('Successfully updated last_seen_at via API');
      } else {
        log.debug('Could not update last_seen_at via API, but localStorage was updated');
      }
    }
  }

  private async setLastViewedBanner(timestamp: number): Promise<void> {
    this.updateLocalStoreBanner(timestamp);

    if (this.userId) {
      log.debug('Updating last_seen_at_banner via API', { userId: this.userId });
      const success = await this.updateUserTracking({ lastViewedBanner: timestamp });

      if (success) {
        log.debug('Successfully updated last_seen_at_banner via API');
      } else {
        log.debug('Could not update last_seen_at_banner via API, but localStorage was updated');
      }
    }
  }

  private async setLastViewedToast(timestamp: number): Promise<void> {
    this.updateLocalStoreToast(timestamp);

    if (this.userId) {
      log.debug('Updating last_seen_at_toast via API', { userId: this.userId });
      const success = await this.updateUserTracking({ lastViewedToast: timestamp });

      if (success) {
        log.debug('Successfully updated last_seen_at_toast via API');
      } else {
        log.debug('Could not update last_seen_at_toast via API, but localStorage was updated');
      }
    }
  }

  private async fetchUserTracking() {
    return await this.api.fetchUserTracking(this.userId);
  }

  private async updateUserTracking(timestamps: { lastViewed?: number; lastViewedBanner?: number; lastViewedToast?: number }, data?: object): Promise<boolean> {
    return await this.api.updateUserTracking(this.userId, timestamps, data);
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
