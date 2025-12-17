import { createStore } from '@stencil/store';
import { StoreState, Update } from '../types';

export function getStorageKey(scope: string, property: string, userId?: string): string {
  if (userId) {
    return `changebot:${property}:${scope}:${userId}`;
  }
  return `changebot:${property}:${scope}`;
}

function calculateNewUpdatesCount(updates: Update[], lastViewed: number | null): number {
  console.log('🔢 Store: Calculating badge count', {
    updatesLength: updates.length,
    lastViewed: lastViewed ? new Date(lastViewed).toISOString() : null,
    lastViewedTimestamp: lastViewed,
  });

  if (!lastViewed) {
    console.log('🔢 Store: No lastViewed timestamp, returning count = 0');
    return 0;
  }

  const newUpdates = updates.filter(update => {
    const updateTime = new Date(update.published_at).getTime();
    const isNew = updateTime > lastViewed;
    console.log('🔢 Store: Update comparison', {
      title: update.title?.substring(0, 50) || 'No title',
      published_at: update.published_at,
      updateTime,
      updateTimeFormatted: new Date(updateTime).toISOString(),
      lastViewed,
      lastViewedFormatted: new Date(lastViewed).toISOString(),
      isNew,
    });
    return isNew;
  });

  const count = newUpdates.length;
  console.log(`🔢 Store: Calculated badge count = ${count}`, {
    totalUpdates: updates.length,
    newUpdates: count,
  });

  return count;
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

        console.log('📥 Store: Received data from API', {
          hasPublications: !!data.publications,
          publicationsLength: data.publications?.length || 0,
          isArray: Array.isArray(data),
        });

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

        console.log('📥 Store: Processed updates', {
          count: updates.length,
          updates: updates.map(u => ({
            title: u.title?.substring(0, 50) || 'No title',
            published_at: u.published_at,
          })),
        });

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
      console.log('✅ Store: markViewed called', {
        providedTimestamp: timestamp,
        finalTimestamp: now,
        finalFormatted: new Date(now).toISOString(),
        previousValue: store.state.lastViewed,
        previousFormatted: store.state.lastViewed ? new Date(store.state.lastViewed).toISOString() : null,
      });
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
    console.log('🔄 Store: lastViewed changed', {
      newValue: store.state.lastViewed,
      newValueFormatted: store.state.lastViewed ? new Date(store.state.lastViewed).toISOString() : null,
      updatesLength: store.state.updates.length,
    });
    store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
    console.log('🔄 Store: newUpdatesCount updated to', store.state.newUpdatesCount);
  });

  store.onChange('updates', () => {
    console.log('🔄 Store: updates changed', {
      newLength: store.state.updates.length,
      lastViewed: store.state.lastViewed,
      lastViewedFormatted: store.state.lastViewed ? new Date(store.state.lastViewed).toISOString() : null,
    });
    store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
    console.log('🔄 Store: newUpdatesCount updated to', store.state.newUpdatesCount);
  });

  return {
    store,
    actions: scopedActions
  };
}
