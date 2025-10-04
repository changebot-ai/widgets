import { Component, Element, Prop, State, Watch, Method, h, Host } from '@stencil/core';
import { Update } from '../../types';
import { Theme } from '../../utils/themes';

@Component({
  tag: 'changebot-toast',
  styleUrl: 'changebot-toast.css',
  shadow: true,
})
export class ChangebotToast {
  @Element() el: HTMLChangebotToastElement;

  @Prop() scope?: string;
  @Prop() theme?: Theme;
  @Prop() light?: Theme;
  @Prop() dark?: Theme;
  @Prop() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
  @Prop() autoDismiss?: number; // Auto-dismiss after N seconds (optional)

  @State() isVisible: boolean = false;
  @State() currentUpdate?: Update;
  @State() activeTheme?: Theme;

  private services: any;
  private unsubscribeUpdates?: () => void;
  private mediaQuery?: MediaQueryList;
  private mediaQueryListener?: (e: MediaQueryListEvent) => void;
  private autoDismissTimer?: NodeJS.Timeout;

  @Watch('theme')
  @Watch('light')
  @Watch('dark')
  onThemeChange() {
    this.updateActiveTheme();
  }

  async componentWillLoad() {
    this.setupTheme();

    // Set data-scope attribute if scope is provided
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // Request context from provider
    const detail = {
      callback: (services: any) => {
        console.log('🍞 Toast: Received services from provider', {
          hasStore: !!services?.store,
          hasActions: !!services?.actions,
          storeState: services?.store?.state
        });
        this.services = services;
        this.subscribeToStore();
      },
      scope: this.scope || 'default'
    };

    console.log('🍞 Toast: Requesting context with scope:', detail.scope);

    this.el.dispatchEvent(
      new CustomEvent('changebot:context-request', {
        bubbles: true,
        composed: true,
        detail
      })
    );
  }

  disconnectedCallback() {
    if (this.unsubscribeUpdates) {
      this.unsubscribeUpdates();
    }
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
  }

  private setupTheme() {
    // If theme is explicitly set, use it
    if (this.theme) {
      this.activeTheme = this.theme;
      return;
    }

    // If light and dark are provided, listen to system preference
    if (this.light || this.dark) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.updateActiveTheme();

      // Listen for changes in system preference
      this.mediaQueryListener = () => {
        this.updateActiveTheme();
      };
      this.mediaQuery.addEventListener('change', this.mediaQueryListener);
    }
  }

  private updateActiveTheme() {
    // If theme is explicitly set, use it
    if (this.theme) {
      this.activeTheme = this.theme;
      return;
    }

    // Use system preference to choose between light and dark
    const prefersDark = this.mediaQuery?.matches || window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersDark && this.dark) {
      this.activeTheme = this.dark;
    } else if (!prefersDark && this.light) {
      this.activeTheme = this.light;
    } else if (this.light) {
      this.activeTheme = this.light;
    } else if (this.dark) {
      this.activeTheme = this.dark;
    }
  }

  private subscribeToStore() {
    if (!this.services?.store) return;

    const store = this.services.store;

    console.log('🍞 Toast: Subscribing to store, current state:', store.state);

    // Subscribe to updates changes
    this.unsubscribeUpdates = store.onChange('updates', () => {
      console.log('🍞 Toast: Updates changed, checking for new update...');
      this.checkForNewUpdate(store.state.updates);
    });

    // Check initially
    if (store.state.updates) {
      this.checkForNewUpdate(store.state.updates);
    }
  }

  private checkForNewUpdate(updates: Update[]) {
    if (!updates || updates.length === 0) {
      this.isVisible = false;
      this.currentUpdate = undefined;
      return;
    }

    const lastViewed = this.getLastViewedTime();

    // Find the most recent update that's newer than lastViewed
    const newUpdate = updates.find(update => {
      const updateTime = update.timestamp || new Date(update.date).getTime();
      return lastViewed === 0 || updateTime > lastViewed;
    });

    if (newUpdate && newUpdate.id !== this.currentUpdate?.id) {
      console.log('🍞 Toast: Found new update to display:', newUpdate.title);
      this.currentUpdate = newUpdate;
      this.isVisible = true;

      // Setup auto-dismiss if configured
      if (this.autoDismiss) {
        if (this.autoDismissTimer) {
          clearTimeout(this.autoDismissTimer);
        }
        this.autoDismissTimer = setTimeout(() => {
          this.handleDismiss();
        }, this.autoDismiss * 1000);
      }
    } else if (!newUpdate) {
      this.isVisible = false;
      this.currentUpdate = undefined;
    }
  }

  private getLastViewedTime(): number {
    const key = `changebot:lastViewed:${this.scope || 'default'}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  }

  private handleDismiss = () => {
    // Clear auto-dismiss timer if active
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = undefined;
    }

    // Mark this update as viewed
    if (this.currentUpdate) {
      const updateTime = this.currentUpdate.timestamp || new Date(this.currentUpdate.date).getTime();
      const key = `changebot:lastViewed:${this.scope || 'default'}`;
      localStorage.setItem(key, updateTime.toString());
      console.log('🍞 Toast: Marked update as viewed:', this.currentUpdate.title);
    }

    // Hide toast
    this.isVisible = false;
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleDismiss();
    }
  };

  /**
   * Show the toast with a specific update
   */
  @Method()
  async show(update: Update) {
    this.currentUpdate = update;
    this.isVisible = true;

    // Setup auto-dismiss if configured
    if (this.autoDismiss) {
      if (this.autoDismissTimer) {
        clearTimeout(this.autoDismissTimer);
      }
      this.autoDismissTimer = setTimeout(() => {
        this.handleDismiss();
      }, this.autoDismiss * 1000);
    }
  }

  /**
   * Dismiss the toast
   */
  @Method()
  async dismiss() {
    this.handleDismiss();
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private getPositionClass(): string {
    switch (this.position) {
      case 'top-left':
        return 'toast--top-left';
      case 'top-right':
        return 'toast--top-right';
      case 'bottom-left':
        return 'toast--bottom-left';
      case 'bottom-right':
        return 'toast--bottom-right';
      default:
        return 'toast--bottom-right';
    }
  }

  render() {
    if (!this.isVisible || !this.currentUpdate) {
      return null;
    }

    const classes = {
      'toast': true,
      [`theme--${this.activeTheme}`]: !!this.activeTheme,
      [this.getPositionClass()]: true
    };

    return (
      <Host>
        <div class={classes} role="alert" aria-live="polite">
          <div class="toast-header">
            <h3 class="toast-title">{this.currentUpdate.title}</h3>
            <button
              class="toast-close"
              type="button"
              onClick={this.handleDismiss}
              onKeyDown={this.handleKeyDown}
              aria-label="Dismiss notification"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="4" x2="4" y2="12"></line>
                <line x1="4" y1="4" x2="12" y2="12"></line>
              </svg>
            </button>
          </div>
          {this.currentUpdate.description && (
            <div class="toast-content" innerHTML={this.currentUpdate.description}></div>
          )}
          <time class="toast-date" dateTime={this.currentUpdate.date}>
            {this.formatDate(this.currentUpdate.date)}
          </time>
        </div>
      </Host>
    );
  }
}

// Type declaration for HTMLElement
declare global {
  interface HTMLChangebotToastElement extends HTMLElement {
    scope?: string;
    theme?: Theme;
    light?: Theme;
    dark?: Theme;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    autoDismiss?: number;
  }
}
