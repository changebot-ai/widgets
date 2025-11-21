import { Component, Element, Prop, State, Watch, Listen, h } from '@stencil/core';
import { dispatchAction } from '../../utils/context';
import { StoreState } from '../../types';
import { Theme } from '../../utils/themes';

@Component({
  tag: 'changebot-badge',
  styleUrl: 'changebot-badge.css',
  shadow: true,
})
export class ChangebotBadge {
  @Element() el: HTMLChangebotBadgeElement;

  @Prop() scope?: string;
  @Prop() theme?: Theme;
  @Prop() light?: Theme;
  @Prop() dark?: Theme;
  @Prop() showCount: boolean = true;
  @Prop() count?: number; // For testing and external control

  @State() newUpdatesCount: number = 0;
  @State() isVisible: boolean = false;
  @State() activeTheme?: Theme;
  @State() prefersDark: boolean = false;

  private services: any;
  private unsubscribe?: () => void;
  private mediaQuery?: MediaQueryList;
  private mediaQueryListener?: (e: MediaQueryListEvent) => void;

  @Watch('count')
  onCountChange(newCount: number) {
    if (newCount !== undefined) {
      this.newUpdatesCount = newCount;
      this.isVisible = newCount > 0;
    }
  }

  @Watch('theme')
  @Watch('light')
  @Watch('dark')
  @Watch('prefersDark')
  onThemeChange() {
    this.updateActiveTheme();
  }

  async componentWillLoad() {
    this.setupTheme();
    // Set data-scope attribute if scope is provided
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // If count prop is provided, use it directly (for testing)
    if (this.count !== undefined) {
      this.newUpdatesCount = this.count;
      this.isVisible = this.count > 0;
      return;
    }

    // Request context from provider
    const detail = {
      callback: (services: any) => {
        console.log('📛 Badge: Received services from provider', {
          hasStore: !!services?.store,
          hasActions: !!services?.actions,
          storeState: services?.store?.state,
        });
        this.services = services;
        this.subscribeToStore();
      },
      scope: this.scope || 'default', // Ensure we always have a scope
    };

    console.log('📛 Badge: Requesting context with scope:', detail.scope);

    this.el.dispatchEvent(
      new CustomEvent('changebot:context-request', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
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
      this.prefersDark = this.mediaQuery.matches;
      this.updateActiveTheme();

      // Listen for changes in system preference
      this.mediaQueryListener = (e: MediaQueryListEvent) => {
        this.prefersDark = e.matches; // Triggers @Watch and re-render
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
    if (this.prefersDark && this.dark) {
      this.activeTheme = this.dark;
    } else if (!this.prefersDark && this.light) {
      this.activeTheme = this.light;
    } else if (this.light) {
      this.activeTheme = this.light;
    } else if (this.dark) {
      this.activeTheme = this.dark;
    }
  }

  public subscribeToStore() {
    if (!this.services?.store) return;

    const store = this.services.store;

    console.log('📛 Badge: Subscribing to store, current state:', store.state);

    // Calculate initial count
    this.calculateNewUpdatesCount(store.state);

    // Subscribe to updates changes
    this.unsubscribe = store.onChange('updates', () => {
      console.log('📛 Badge: Updates changed, recalculating...');
      this.calculateNewUpdatesCount(store.state);
    });
  }

  public calculateNewUpdatesCount(state: StoreState) {
    if (!state.updates) {
      this.newUpdatesCount = 0;
      console.log('📛 Badge: No updates in state yet');
      return;
    }

    const lastViewed = this.getLastViewedTime();

    // If no lastViewed (returns 0), ALL updates are new
    const newUpdates =
      lastViewed === 0
        ? state.updates // All updates are new
        : state.updates.filter(update => new Date(update.published_at).getTime() > lastViewed);

    this.newUpdatesCount = newUpdates.length;
    this.isVisible = this.newUpdatesCount > 0;

    console.log(
      `📛 Badge calculated: ${this.newUpdatesCount} new updates (lastViewed: ${lastViewed === 0 ? 'never' : new Date(lastViewed).toLocaleTimeString()}, total updates: ${state.updates.length})`,
    );
  }

  // Public method to set count for testing
  public setNewUpdatesCount(count: number) {
    this.newUpdatesCount = count;
    this.isVisible = count > 0;
  }

  private getLastViewedTime(): number {
    const key = `changebot:lastViewed:${this.scope || 'default'}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  }

  @Listen('changebot:lastViewed', { target: 'document' })
  handleLastViewedChange(event: CustomEvent) {
    const eventScope = event.detail?.scope || 'default';
    const badgeScope = this.scope || 'default';

    // Only respond to events for our scope
    if (eventScope === badgeScope) {
      console.log('📛 Badge: Received lastViewed change event, recalculating count');

      // Recalculate badge count based on new lastViewed time
      if (this.services?.store) {
        this.calculateNewUpdatesCount(this.services.store.state);
      } else {
        // If no store (standalone mode or using count prop), just clear the badge
        this.newUpdatesCount = 0;
        this.isVisible = false;
      }
    }
  }

  private handleClick = () => {
    // Only clear badge and mark as viewed if connected to a provider
    // Standalone badges with count prop shouldn't be cleared on click
    if (this.services) {
      // Mark as viewed
      const key = `changebot:lastViewed:${this.scope || 'default'}`;
      localStorage.setItem(key, Date.now().toString());

      // Clear badge immediately
      this.newUpdatesCount = 0;
      this.isVisible = false;
    }

    // Dispatch open action
    dispatchAction(this.el, 'openDisplay', undefined, this.scope);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  };

  private get displayCount(): string {
    if (this.newUpdatesCount > 9) {
      return '9+';
    }
    return this.newUpdatesCount.toString();
  }

  private get ariaLabel(): string {
    if (this.newUpdatesCount === 0) {
      return 'No new updates';
    }
    if (this.newUpdatesCount === 1) {
      return '1 new update';
    }
    if (!this.showCount) {
      return 'New updates available';
    }
    return `${this.newUpdatesCount} new updates`;
  }

  render() {
    const classes = {
      'badge': true,
      'badge--hidden': !this.isVisible || this.newUpdatesCount === 0,
      [`theme--${this.activeTheme}`]: !!this.activeTheme,
    };

    const countClasses = {
      'badge__count': true,
      'badge__count--hidden': !this.showCount && this.newUpdatesCount > 0,
    };

    return (
      <button class={classes} type="button" role="status" aria-label={this.ariaLabel} aria-live="polite" tabindex={0} onClick={this.handleClick} onKeyDown={this.handleKeyDown}>
        <span class={countClasses}>{this.displayCount}</span>
      </button>
    );
  }
}

// Type declaration for HTMLElement
declare global {
  interface HTMLChangebotBadgeElement extends HTMLElement {
    scope?: string;
    theme?: Theme;
    light?: Theme;
    dark?: Theme;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCount: boolean;
    newUpdatesCount: number;
  }
}
