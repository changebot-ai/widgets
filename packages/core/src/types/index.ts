export interface Tag {
  id: number;
  name: string;
  color: string; // Hex color code (e.g., "#3b82f6")
}

export interface Update {
  id: number;
  title: string;
  content: string; // HTML content from ActionText
  display_date: string; // YYYY-MM-DD format
  published_at: string; // ISO 8601 timestamp
  expires_on: string | null; // Optional expiration date
  highlight_target: 'banner' | 'toast' | null; // Display emphasis mode
  hosted_url: string | null; // Full URL to hosted changelog page
  tags: Tag[];
}

export interface Widget {
  title: string;
  subheading: string | null;
  slug: string;
  branded: boolean;
}

export interface StoreState {
  updates: Update[];
  widget: Widget | null;
  lastViewed: number | null;
  isOpen: boolean;
  newUpdatesCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface StoreConfig {
  endpoint: string;
  scope?: string;
  fetchOnInit?: boolean;
  persistLastViewed?: boolean;
}

export interface StoreActions {
  loadUpdates: (slug?: string, url?: string, signal?: AbortSignal) => Promise<void>;
  loadMockUpdates: (data: unknown) => void;
  markViewed: (timestamp?: number) => void;
  markAllViewed: () => void;
  openDisplay: () => void;
  closeDisplay: () => void;
  toggleDisplay: () => void;
  calculateNewCount: () => void;
}

/**
 * Stencil Store interface for state management
 */
export interface StencilStore<T> {
  state: T;
  onChange: <K extends keyof T>(propName: K, callback: (newValue: T[K]) => void) => () => void;
  reset: () => void;
  dispose: () => void;
}

export interface ProviderConfig {
  url?: string;
  slug?: string;
  scope: string;
}

export interface Services {
  store: StencilStore<StoreState>;
  config: ProviderConfig;
  actions: StoreActions;
  /** Opens display and persists lastViewed to localStorage/API */
  openAndMarkViewed: () => void;
}

export interface ActionDetail<T = unknown> {
  type: keyof StoreActions;
  payload?: T;
  scope?: string;
}
