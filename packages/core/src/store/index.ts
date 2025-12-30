import { createStore } from '@stencil/store';
import { StoreState, Update, Widget, Tag } from '../types';
import { validatePublishedAt } from '../utils/date-utils';
import { logStore as log } from '../utils/logger';

export function getStorageKey(scope: string, property: string, userId?: string): string {
  if (userId) {
    return `changebot:${property}:${scope}:${userId}`;
  }
  return `changebot:${property}:${scope}`;
}

interface ApiPublication {
  tags?: (string | Tag)[];
  [key: string]: unknown;
}

interface ApiResponse {
  publications?: ApiPublication[];
  widget?: {
    title?: string;
    subheading?: string | null;
    slug?: string;
    branded?: boolean;
  };
}

/**
 * Transform API publications to Update type
 */
function transformPublications(data: ApiResponse | ApiPublication[]): Update[] {
  let publications: ApiPublication[] = [];

  if (Array.isArray(data)) {
    publications = data;
  } else if (data.publications && Array.isArray(data.publications)) {
    publications = data.publications;
  }

  return publications.map((pub) => ({
    ...pub,
    tags: Array.isArray(pub.tags)
      ? pub.tags.map((tag) =>
          typeof tag === 'string'
            ? { id: 0, name: tag, color: '#667eea' }
            : tag
        )
      : [],
  })) as Update[];
}

/**
 * Extract widget metadata from API response
 */
function extractWidget(data: ApiResponse): Widget | null {
  if (!data.widget) return null;

  return {
    title: data.widget.title || 'Updates',
    subheading: data.widget.subheading || null,
    slug: data.widget.slug || '',
    branded: data.widget.branded !== false,
  };
}

function calculateNewUpdatesCount(updates: Update[], lastViewed: number | null): number {
  log.debug('Calculating badge count', {
    updatesLength: updates.length,
    lastViewed: lastViewed ? new Date(lastViewed).toISOString() : null,
    lastViewedTimestamp: lastViewed,
  });

  if (!lastViewed) {
    log.debug('No lastViewed timestamp, returning count = 0');
    return 0;
  }

  const newUpdates = updates.filter(update => {
    const updateTime = validatePublishedAt(update.published_at, 'Store', update.title);
    if (updateTime === null) return false;

    const isNew = updateTime > lastViewed;
    log.debug('Update comparison', {
      title: update.title?.substring(0, 50) || 'No title',
      published_at: update.published_at,
      updateTime,
      lastViewed,
      isNew,
    });
    return isNew;
  });

  const count = newUpdates.length;
  log.debug(`Calculated badge count = ${count}`, {
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

        log.debug('Received data from API', {
          hasPublications: !!data.publications,
          publicationsLength: data.publications?.length || 0,
          isArray: Array.isArray(data),
        });

        const updates = transformPublications(data);

        log.debug('Processed updates', {
          count: updates.length,
          updates: updates.map(u => ({
            title: u.title?.substring(0, 50) || 'No title',
            published_at: u.published_at,
          })),
        });

        store.state.widget = extractWidget(data);
        store.state.updates = updates;
        store.state.isLoading = false;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load updates';
        store.state.error = errorMessage;
        store.state.isLoading = false;
        log.warn('Could not load updates. Widget functionality will continue to work.', {
          error: errorMessage,
          slug,
          url
        });
      }
    },

    loadMockUpdates(data: ApiResponse | ApiPublication[]) {
      store.state.isLoading = true;
      store.state.error = null;

      try {
        store.state.updates = transformPublications(data);
        store.state.widget = Array.isArray(data) ? null : extractWidget(data);
        store.state.isLoading = false;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load mock updates';
        store.state.error = errorMessage;
        store.state.isLoading = false;
        log.warn('Could not load mock updates.', { error: errorMessage });
      }
    },

    markViewed(timestamp?: number) {
      const now = timestamp ?? Date.now();
      log.debug('markViewed called', {
        providedTimestamp: timestamp,
        finalTimestamp: now,
        finalFormatted: new Date(now).toISOString(),
        previousValue: store.state.lastViewed,
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
    log.debug('lastViewed changed', {
      newValue: store.state.lastViewed,
      newValueFormatted: store.state.lastViewed ? new Date(store.state.lastViewed).toISOString() : null,
      updatesLength: store.state.updates.length,
    });
    store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
    log.debug('newUpdatesCount updated', { count: store.state.newUpdatesCount });
  });

  store.onChange('updates', () => {
    log.debug('updates changed', {
      newLength: store.state.updates.length,
      lastViewed: store.state.lastViewed,
    });
    store.state.newUpdatesCount = calculateNewUpdatesCount(store.state.updates, store.state.lastViewed);
    log.debug('newUpdatesCount updated', { count: store.state.newUpdatesCount });
  });

  return {
    store,
    actions: scopedActions
  };
}
