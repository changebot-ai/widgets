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
  loadUpdates: () => Promise<void>;
  markViewed: (timestamp?: number) => void;
  markAllViewed: () => void;
  openDisplay: () => void;
  closeDisplay: () => void;
  toggleDisplay: () => void;
  calculateNewCount: () => void;
}

export interface Services {
  store: any;
  config: StoreConfig;
  actions: StoreActions;
}

export interface ContextRequestDetail<T = any> {
  key: keyof Services;
  scope?: string;
  provide: (value: T) => void;
}

export interface ActionDetail {
  type: keyof StoreActions;
  payload?: any;
  scope?: string;
}
