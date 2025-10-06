export interface Tag {
  text: string;
  color: string; // Can be hex, rgb, or CSS color name
}

export interface Update {
  id: string;
  title: string;
  description: string;
  date: string;
  tags?: Tag[];
  details?: string;
  [key: string]: any; // Allow additional custom fields
}

export interface StoreState {
  updates: Update[];
  lastViewed: number | null;
  isOpen: boolean;
  mode: 'modal' | 'drawer-left' | 'drawer-right';
  newUpdatesCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface StoreConfig {
  endpoint: string;
  scope?: string;
  fetchOnInit?: boolean;
  persistLastViewed?: boolean;
  mode?: 'modal' | 'drawer-left' | 'drawer-right';
}

export interface StoreActions {
  loadUpdates: () => Promise<void>;
  markAllViewed: () => void;
  openDisplay: () => void;
  closeDisplay: () => void;
  toggleDisplay: () => void;
  setMode: (mode: 'modal' | 'drawer-left' | 'drawer-right') => void;
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