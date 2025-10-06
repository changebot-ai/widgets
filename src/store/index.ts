import { createStore } from '@stencil/store';
import { StoreState, StoreActions, StoreConfig, Update } from '../types';

const STORAGE_KEY = 'changebot_lastViewed';

/**
 * Get the last viewed timestamp from localStorage
 */
function getLastViewed(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Save the last viewed timestamp to localStorage
 */
function saveLastViewed(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, timestamp.toString());
  } catch (e) {
    console.warn('Failed to save lastViewed to localStorage:', e);
  }
}

/**
 * Calculate the number of new updates since lastViewed
 */
function calculateNewUpdatesCount(updates: Update[], lastViewed: number | null): number {
  if (!lastViewed) return updates.length;

  return updates.filter(update => {
    const updateTime = new Date(update.date).getTime();
    return updateTime > lastViewed;
  }).length;
}

/**
 * Create the widget store with initial state and actions
 */
export function createWidgetStore(config: StoreConfig) {
  const { state, onChange, reset, get } = createStore<StoreState>({
    updates: [],
    lastViewed: config.persistLastViewed ? getLastViewed() : null,
    isDrawerOpen: false,
    isModalOpen: false,
    isOpen: false,
    displayMode: config.displayMode || 'drawer',
    drawerPosition: config.drawerPosition || 'right',
    newUpdatesCount: 0,
    isLoading: false,
    error: null
  });

  // Auto-calculate new updates count when updates or lastViewed changes
  onChange('updates', (updates) => {
    state.newUpdatesCount = calculateNewUpdatesCount(updates, state.lastViewed);
  });

  onChange('lastViewed', (lastViewed) => {
    state.newUpdatesCount = calculateNewUpdatesCount(state.updates, lastViewed);
    if (config.persistLastViewed && lastViewed !== null) {
      saveLastViewed(lastViewed);
    }
  });

  // Create actions
  const actions: StoreActions = {
    async loadUpdates() {
      state.isLoading = true;
      state.error = null;

      try {
        const response = await fetch(config.endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch updates: ${response.statusText}`);
        }

        const data = await response.json();
        state.updates = Array.isArray(data) ? data : data.updates || [];
        state.isLoading = false;
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to load updates';
        state.isLoading = false;
        console.error('Failed to load updates:', error);
      }
    },

    markAllViewed() {
      const now = Date.now();
      state.lastViewed = now;
    },

    openDisplay() {
      if (state.displayMode === 'drawer') {
        state.isDrawerOpen = true;
        state.isModalOpen = false;
      } else {
        state.isModalOpen = true;
        state.isDrawerOpen = false;
      }
    },

    closeDisplay() {
      state.isDrawerOpen = false;
      state.isModalOpen = false;
    },

    toggleDisplay() {
      if (state.displayMode === 'drawer') {
        state.isDrawerOpen = !state.isDrawerOpen;
      } else {
        state.isModalOpen = !state.isModalOpen;
      }
    },

    setDisplayMode(mode: 'drawer' | 'modal') {
      state.displayMode = mode;
      // Close any open displays when switching modes
      state.isDrawerOpen = false;
      state.isModalOpen = false;
    },

    setDrawerPosition(position: 'left' | 'right') {
      state.drawerPosition = position;
    },

    calculateNewCount() {
      state.newUpdatesCount = calculateNewUpdatesCount(state.updates, state.lastViewed);
    }
  };

  return {
    state,
    actions,
    onChange,
    reset,
    get
  };
}

// Create a default global store instance
const defaultStore = createStore<StoreState>({
  updates: [],
  lastViewed: getLastViewed(),
  isDrawerOpen: false,
  isModalOpen: false,
  displayMode: 'drawer',
  drawerPosition: 'right',
  newUpdatesCount: 0,
  isLoading: false,
  error: null,
  isOpen: false
});

/**
 * Create a scoped store instance for multi-provider setups
 * This ensures each provider has its own isolated state
 */
export function createScopedStore() {
  const store = createStore<StoreState>({
    updates: [],
    lastViewed: null,
    isDrawerOpen: false,
    isModalOpen: false,
    displayMode: 'panel',
    drawerPosition: 'right',
    newUpdatesCount: 0,
    isLoading: false,
    error: null,
    isOpen: false
  });

  const scopedActions = {
    async loadUpdates(slug?: string, url?: string) {
      store.state.isLoading = true;
      store.state.error = null;

      try {
        let apiUrl: string;
        if (slug) {
          apiUrl = `https://api.changebot.ai/v1/updates/${slug}`;
        } else if (url) {
          apiUrl = url;
        } else {
          throw new Error('Either slug or url must be provided');
        }

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch updates: ${response.statusText}`);
        }

        const data = await response.json();

        // Parse the API response format
        let updates = [];
        if (Array.isArray(data)) {
          updates = data;
        } else if (data.data && Array.isArray(data.data)) {
          updates = data.data.map((item: any) => ({
            id: item.id.toString(),
            title: item.attributes?.title || 'Untitled',
            description: item.attributes?.content?.body || '',
            date: item.attributes?.published_at || new Date().toISOString(),
            timestamp: new Date(item.attributes?.published_at || Date.now()).getTime(),
            tags: []
          }));
        } else if (data.updates) {
          updates = data.updates;
        }

        store.state.updates = updates;
        store.state.isLoading = false;
        store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load updates';
        store.state.error = errorMessage;
        store.state.isLoading = false;
        console.warn('⚠️ Changebot widget: Could not load updates.', {
          error: errorMessage,
          slug,
          url
        });
      }
    },

    markViewed(timestamp?: string) {
      const now = timestamp ? new Date(timestamp).getTime() : Date.now();
      store.state.lastViewed = now;
      store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, now);
    },

    markAllViewed() {
      const now = Date.now();
      store.state.lastViewed = now;
      store.state.newUpdatesCount = 0;
    },

    openDisplay() {
      store.state.isOpen = true;
      if (store.state.displayMode === 'drawer') {
        store.state.isDrawerOpen = true;
        store.state.isModalOpen = false;
      } else {
        store.state.isModalOpen = true;
        store.state.isDrawerOpen = false;
      }
    },

    closeDisplay() {
      store.state.isOpen = false;
      store.state.isDrawerOpen = false;
      store.state.isModalOpen = false;
    },

    toggleDisplay() {
      store.state.isOpen = !store.state.isOpen;
      if (store.state.displayMode === 'drawer') {
        store.state.isDrawerOpen = !store.state.isDrawerOpen;
      } else {
        store.state.isModalOpen = !store.state.isModalOpen;
      }
    },

    setDisplayMode(mode: 'drawer' | 'modal') {
      store.state.displayMode = mode;
      store.state.isOpen = false;
      store.state.isDrawerOpen = false;
      store.state.isModalOpen = false;
    },

    setDrawerPosition(position: 'left' | 'right') {
      store.state.drawerPosition = position;
    },

    calculateNewCount() {
      store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
    }
  };

  return {
    store,
    actions: scopedActions
  };
}

// Export the default store state
export const updatesStore = defaultStore;

// Create and export default actions
export const actions: StoreActions & { loadUpdates: (slug?: string, url?: string) => Promise<void>, markViewed: (timestamp?: string) => void } = {
  async loadUpdates(slug?: string, url?: string) {
    updatesStore.state.isLoading = true;
    updatesStore.state.error = null;

    try {
      let apiUrl: string;
      if (slug) {
        // Slug takes precedence - always use the standard API format
        apiUrl = `https://api.changebot.ai/v1/updates/${slug}`;
      } else if (url) {
        // Use url as-is without modification
        apiUrl = url;
      } else {
        throw new Error('Either slug or url must be provided');
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const rateLimitHeaders = {
          limit: response.headers.get('X-RateLimit-Limit'),
          remaining: response.headers.get('X-RateLimit-Remaining'),
          reset: response.headers.get('X-RateLimit-Reset'),
          retryAfter: retryAfterHeader
        };

        // Use server's Retry-After if provided, otherwise use a sensible default
        // Since we poll every 30 seconds, wait at least 60 seconds on rate limit
        let waitTime = 60000; // Default 60 seconds

        if (retryAfterHeader) {
          // Retry-After can be seconds or an HTTP date
          const retryAfterSeconds = parseInt(retryAfterHeader);
          if (!isNaN(retryAfterSeconds)) {
            waitTime = retryAfterSeconds * 1000;
          }
        } else if (rateLimitHeaders.reset) {
          // Calculate wait time from reset timestamp
          const resetTime = parseInt(rateLimitHeaders.reset) * 1000;
          waitTime = Math.max(resetTime - Date.now(), 60000);
        }

        const errorMessage = `Rate limited. Will retry in ${Math.ceil(waitTime / 1000)} seconds.`;
        updatesStore.state.error = errorMessage;
        updatesStore.state.isLoading = false;

        // Dispatch error event for UI to handle
        document.dispatchEvent(new CustomEvent('changebot:error', {
          detail: { error: errorMessage, type: 'rate-limit' },
          bubbles: true
        }));

        // Detailed console logging
        console.group('🚫 Rate Limit Detected (HTTP 429)');
        console.log(`URL: ${apiUrl}`);
        console.log(`Wait Time: ${Math.ceil(waitTime / 1000)} seconds`);

        if (Object.values(rateLimitHeaders).some(h => h !== null)) {
          console.log('Rate Limit Headers:', rateLimitHeaders);
          if (rateLimitHeaders.reset) {
            const resetDate = new Date(parseInt(rateLimitHeaders.reset) * 1000);
            console.log(`Reset Time: ${resetDate.toLocaleTimeString()}`);
          }
        }

        console.log(`Next Retry: ${new Date(Date.now() + waitTime).toLocaleTimeString()}`);
        console.log('💡 Tip: Normal polling is paused until rate limit clears');
        console.groupEnd();

        // Don't retry automatically - let the normal polling handle it
        // Just log that we're rate limited
        return;
      }

      // Handle successful request
      if (response.ok) {
        // Success - continue processing
      } else {
        throw new Error(`Failed to fetch updates: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse the API response format
      let updates = [];
      if (Array.isArray(data)) {
        updates = data;
      } else if (data.data && Array.isArray(data.data)) {
        // Transform API response to our Update format
        updates = data.data.map((item: any) => ({
          id: item.id.toString(),
          title: item.attributes?.title || 'Untitled',
          description: item.attributes?.content?.body || '',
          date: item.attributes?.published_at || new Date().toISOString(),
          timestamp: new Date(item.attributes?.published_at || Date.now()).getTime(),
          tags: []
        }));
      } else if (data.updates) {
        updates = data.updates;
      }

      updatesStore.state.updates = updates;
      updatesStore.state.isLoading = false;

      // Calculate new updates count
      updatesStore.state.newUpdatesCount = calculateNewUpdatesCount(updatesStore.state.updates, updatesStore.state.lastViewed);
    } catch (error) {
      // Handle errors gracefully - don't let API errors break the widget
      const errorMessage = error instanceof Error ? error.message : 'Failed to load updates';
      updatesStore.state.error = errorMessage;
      updatesStore.state.isLoading = false;

      // Log errors quietly - don't spam console with expected CORS/404 errors
      // This prevents blocking the customer's app if the widget has issues
      console.warn('⚠️ Changebot widget: Could not load updates. Widget functionality will continue to work.', {
        error: errorMessage,
        slug,
        url
      });
    }
  },

  markViewed(timestamp?: string) {
    const now = timestamp ? new Date(timestamp).getTime() : Date.now();
    updatesStore.state.lastViewed = now;
    saveLastViewed(now);
    updatesStore.state.newUpdatesCount = calculateNewUpdatesCount(updatesStore.state.updates, now);
  },

  markAllViewed() {
    const now = Date.now();
    updatesStore.state.lastViewed = now;
    saveLastViewed(now);
    updatesStore.state.newUpdatesCount = 0;
  },

  openDisplay() {
    updatesStore.state.isOpen = true;
    if (updatesStore.state.displayMode === 'drawer') {
      updatesStore.state.isDrawerOpen = true;
      updatesStore.state.isModalOpen = false;
    } else {
      updatesStore.state.isModalOpen = true;
      updatesStore.state.isDrawerOpen = false;
    }
  },

  closeDisplay() {
    updatesStore.state.isOpen = false;
    updatesStore.state.isDrawerOpen = false;
    updatesStore.state.isModalOpen = false;
  },

  toggleDisplay() {
    updatesStore.state.isOpen = !updatesStore.state.isOpen;
    if (updatesStore.state.displayMode === 'drawer') {
      updatesStore.state.isDrawerOpen = !updatesStore.state.isDrawerOpen;
    } else {
      updatesStore.state.isModalOpen = !updatesStore.state.isModalOpen;
    }
  },

  setDisplayMode(mode: 'drawer' | 'modal') {
    updatesStore.state.displayMode = mode;
    // Close any open displays when switching modes
    updatesStore.state.isOpen = false;
    updatesStore.state.isDrawerOpen = false;
    updatesStore.state.isModalOpen = false;
  },

  setDrawerPosition(position: 'left' | 'right') {
    updatesStore.state.drawerPosition = position;
  },

  calculateNewCount() {
    updatesStore.state.newUpdatesCount = calculateNewUpdatesCount(updatesStore.state.updates, updatesStore.state.lastViewed);
  }
};