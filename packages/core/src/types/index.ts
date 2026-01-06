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
  lastViewedBanner: number | null;
  lastViewedToast: number | null;
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
  loadUpdates: (slug?: string, baseUrl?: string, signal?: AbortSignal) => Promise<void>;
  loadMockUpdates: (data: unknown) => void;
  markViewed: (timestamp?: number) => void;
  markAllViewed: () => void;
  markBannerViewed: (timestamp?: number) => void;
  markToastViewed: (timestamp?: number) => void;
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
  baseUrl?: string;
  slug?: string;
  scope: string;
}

export interface DisplayControl {
  /** Opens display and marks as viewed (persists to localStorage/API) */
  open: () => void;
  /** Closes the display */
  close: () => void;
}

export interface HighlightControl {
  /** Mark banner as viewed (persists to localStorage/API) */
  markBannerViewed: () => void;
  /** Mark toast as viewed (persists to localStorage/API) */
  markToastViewed: () => void;
}

export interface Services {
  store: StencilStore<StoreState>;
  config: ProviderConfig;
  /** Display control operations */
  display: DisplayControl;
  /** Highlight notification control operations */
  highlight: HighlightControl;
}

/** Action types that can be dispatched via changebot:action events */
export type ActionType = 'openDisplay' | 'closeDisplay' | 'toggleDisplay' | 'markViewed' | 'markAllViewed';

export interface ActionDetail {
  type: ActionType;
  scope?: string;
}
