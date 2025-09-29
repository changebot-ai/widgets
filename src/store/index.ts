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