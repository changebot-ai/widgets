import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { dispatchAction } from '../../utils/context';
import { StoreState } from '../../types';

@Component({
  tag: 'changebot-badge',
  styleUrl: 'changebot-badge.css',
  shadow: true,
})
export class ChangebotBadge {
  @Element() el: HTMLChangebotBadgeElement;

  @Prop() scope?: string;
  @Prop() theme?: 'light' | 'dark';
  @Prop() showCount: boolean = true;
  @Prop() count?: number; // For testing and external control

  @State() newUpdatesCount: number = 0;
  @State() isVisible: boolean = false;

  private services: any;
  private unsubscribe?: () => void;

  @Watch('count')
  onCountChange(newCount: number) {
    if (newCount !== undefined) {
      this.newUpdatesCount = newCount;
      this.isVisible = newCount > 0;
    }
  }

  async componentWillLoad() {
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
          storeState: services?.store?.state
        });
        this.services = services;
        this.subscribeToStore();
      },
      scope: this.scope || 'default'  // Ensure we always have a scope
    };

    console.log('📛 Badge: Requesting context with scope:', detail.scope);

    this.el.dispatchEvent(
      new CustomEvent('changebot:context-request', {
        bubbles: true,
        composed: true,
        detail
      })
    );
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
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
    const newUpdates = lastViewed === 0
      ? state.updates  // All updates are new
      : state.updates.filter(update => update.timestamp > lastViewed);

    this.newUpdatesCount = newUpdates.length;
    this.isVisible = this.newUpdatesCount > 0;

    console.log(`📛 Badge calculated: ${this.newUpdatesCount} new updates (lastViewed: ${lastViewed === 0 ? 'never' : new Date(lastViewed).toLocaleTimeString()}, total updates: ${state.updates.length})`);
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

  private handleClick = () => {
    // Mark as viewed
    const key = `changebot:lastViewed:${this.scope || 'default'}`;
    localStorage.setItem(key, Date.now().toString());

    // Clear badge immediately
    this.newUpdatesCount = 0;
    this.isVisible = false;

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
      [`badge--${this.theme}`]: !!this.theme
    };

    const countClasses = {
      'badge__count': true,
      'badge__count--hidden': !this.showCount && this.newUpdatesCount > 0
    };

    return (
      <button
        class={classes}
        type="button"
        role="status"
        aria-label={this.ariaLabel}
        aria-live="polite"
        tabindex={0}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        <span class={countClasses}>{this.displayCount}</span>
      </button>
    );
  }
}

// Type declaration for HTMLElement
declare global {
  interface HTMLChangebotBadgeElement extends HTMLElement {
    scope?: string;
    theme?: 'light' | 'dark';
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCount: boolean;
    newUpdatesCount: number;
  }
}