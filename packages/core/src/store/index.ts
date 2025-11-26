import { createStore } from '@stencil/store';
import { StoreState, Update } from '../types';

export function getStorageKey(scope: string, property: string): string {
  return `changebot:${property}:${scope}`;
}

function calculateNewUpdatesCount(updates: Update[], lastViewed: number | null): number {
  if (!lastViewed) return updates.length;

  return updates.filter(update => {
    const updateTime = new Date(update.published_at).getTime();
    return updateTime > lastViewed;
  }).length;
}

export function createScopedStore() {
  const store = createStore<StoreState>({
    updates: [],
    widget: null,
    lastViewed: null,
    isOpen: false,
    newUpdatesCount: 0,
    isLoading: false,
    error: null
  });

  const scopedActions = {
    async loadUpdates(slug?: string, url?: string) {
      store.state.isLoading = true;
      store.state.error = null;

      try {
        let apiUrl: string;
        if (slug) {
          apiUrl = `https://api.changebot.ai/v1/widgets/${slug}/updates`;
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

        // API returns {widget: {...}, publications: [...]}
        let updates = [];
        if (data.publications && Array.isArray(data.publications)) {
          // Transform publications to match our Update type
          updates = data.publications.map((pub: any) => ({
            ...pub,
            // Transform tags from string array to object array if needed
            tags: Array.isArray(pub.tags)
              ? pub.tags.map((tag: any) =>
                typeof tag === 'string'
                  ? { id: 0, name: tag, color: '#667eea' }
                  : tag
              )
              : []
          }));
        } else if (Array.isArray(data)) {
          // Fallback: if API returns array directly
          updates = data;
        }

        // Extract widget metadata
        if (data.widget) {
          store.state.widget = {
            title: data.widget.title || 'Updates',
            subheading: data.widget.subheading || null,
            slug: data.widget.slug || '',
            branded: data.widget.branded !== false // Default to true if not provided
          };
        }

        store.state.updates = updates;
        store.state.isLoading = false;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load updates';
        store.state.error = errorMessage;
        store.state.isLoading = false;
        console.warn('⚠️ Changebot widget: Could not load updates. Widget functionality will continue to work.', {
          error: errorMessage,
          slug,
          url
        });
      }
    },

    loadMockUpdates(data: any) {
      store.state.isLoading = true;
      store.state.error = null;

      try {
        // API returns {widget: {...}, publications: [...]}
        let updates = [];
        if (data.publications && Array.isArray(data.publications)) {
          // Transform publications to match our Update type
          updates = data.publications.map((pub: any) => ({
            ...pub,
            // Transform tags from string array to object array if needed
            tags: Array.isArray(pub.tags)
              ? pub.tags.map((tag: any) =>
                typeof tag === 'string'
                  ? { id: 0, name: tag, color: '#667eea' }
                  : tag
              )
              : []
          }));
        } else if (Array.isArray(data)) {
          // Fallback: if API returns array directly
          updates = data;
        }

        // Extract widget metadata
        if (data.widget) {
          store.state.widget = {
            title: data.widget.title || 'Updates',
            subheading: data.widget.subheading || null,
            slug: data.widget.slug || '',
            branded: data.widget.branded !== false // Default to true if not provided
          };
        }

        store.state.updates = updates;
        store.state.isLoading = false;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load mock updates';
        store.state.error = errorMessage;
        store.state.isLoading = false;
        console.warn('⚠️ Changebot widget: Could not load mock updates.', {
          error: errorMessage
        });
      }
    },

    markViewed(timestamp?: number) {
      const now = timestamp ?? Date.now();
      store.state.lastViewed = now;
    },

    markAllViewed() {
      const now = Date.now();
      store.state.lastViewed = now;
    },

    openDisplay() {
      store.state.isOpen = true;
    },

    closeDisplay() {
      store.state.isOpen = false;
    },

    toggleDisplay() {
      store.state.isOpen = !store.state.isOpen;
    },

    calculateNewCount() {
      store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
    }
  };

  store.onChange('lastViewed', () => {
    store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
  });

  store.onChange('updates', () => {
    store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
  });

  return {
    store,
    actions: scopedActions
  };
}
