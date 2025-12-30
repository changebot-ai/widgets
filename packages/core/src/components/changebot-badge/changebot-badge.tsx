import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { dispatchAction, requestServices } from '../../utils/context';
import { Services } from '../../types';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';

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
  @State() activeTheme?: Theme;

  private services?: Services;
  private unsubscribe?: () => void;
  private themeManager?: ThemeManager;

  @Watch('count')
  onCountChange(newCount: number) {
    this.setCount(newCount);
  }

  private setCount(count: number) {
    if (count !== undefined) {
      const newCount = Math.max(0, count);
      console.log('📛 Badge: setCount called', {
        inputCount: count,
        finalCount: newCount,
        previousCount: this.newUpdatesCount,
        willUpdate: newCount !== this.newUpdatesCount,
      });
      this.newUpdatesCount = newCount;
      console.log('📛 Badge: Count updated, badge will', this.newUpdatesCount === 0 ? 'be hidden' : `show ${this.newUpdatesCount}`);
    } else {
      console.log('📛 Badge: setCount called with undefined, ignoring');
    }
  }

  @Watch('theme')
  @Watch('light')
  @Watch('dark')
  onThemePropsChange() {
    // Re-initialize theme manager when props change
    this.themeManager?.cleanup();
    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });
  }

  async componentWillLoad() {
    console.log('📛 Badge: componentWillLoad', {
      scope: this.scope || 'default',
      hasCountProp: this.count !== undefined,
      countProp: this.count,
    });

    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });

    // Set data-scope attribute if scope is provided
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // If count prop is provided, use it directly (for testing)
    if (this.count !== undefined) {
      console.log('📛 Badge: Using count prop (testing mode)', this.count);
      this.setCount(this.count);
      return;
    }

    // Request context from provider
    console.log('📛 Badge: Requesting context with scope:', this.scope || 'default');

    requestServices(this.el, this.scope, services => {
      console.log('📛 Badge: Received services from provider', {
        hasStore: !!services?.store,
        hasActions: !!services?.actions,
        storeState: services?.store?.state,
      });
      this.services = services;
      this.subscribeToStore();
    });

    console.log('📛 Badge: Context request event dispatched');
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.themeManager?.cleanup();
  }

  public subscribeToStore() {
    if (!this.services?.store) {
      console.log('📛 Badge: Cannot subscribe - no store available');
      return;
    }

    const store = this.services.store;

    console.log('📛 Badge: Subscribing to store, current state:', {
      newUpdatesCount: store.state.newUpdatesCount,
      updatesLength: store.state.updates?.length || 0,
      lastViewed: store.state.lastViewed,
      lastViewedFormatted: store.state.lastViewed ? new Date(store.state.lastViewed).toISOString() : null,
      fullState: store.state,
    });

    // Set initial count from store
    console.log('📛 Badge: Setting initial count from store:', store.state.newUpdatesCount);
    this.setCount(store.state.newUpdatesCount);

    // Subscribe to newUpdatesCount changes
    const unsubscribe1 = store.onChange('newUpdatesCount', () => {
      console.log('📛 Badge: newUpdatesCount changed in store', {
        newValue: store.state.newUpdatesCount,
        previousComponentValue: this.newUpdatesCount,
      });
      this.setCount(store.state.newUpdatesCount);
    });

    // Also subscribe to updates and lastViewed changes to catch indirect newUpdatesCount updates
    const unsubscribe2 = store.onChange('updates', () => {
      console.log('📛 Badge: updates changed, reading newUpdatesCount from store', {
        newValue: store.state.newUpdatesCount,
        previousComponentValue: this.newUpdatesCount,
      });
      this.setCount(store.state.newUpdatesCount);
    });

    const unsubscribe3 = store.onChange('lastViewed', () => {
      console.log('📛 Badge: lastViewed changed, reading newUpdatesCount from store', {
        newValue: store.state.newUpdatesCount,
        previousComponentValue: this.newUpdatesCount,
      });
      this.setCount(store.state.newUpdatesCount);
    });

    // Combine unsubscribe functions
    this.unsubscribe = () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };

    console.log('📛 Badge: Successfully subscribed to newUpdatesCount, updates, and lastViewed changes');
  }

  public setNewUpdatesCount(count: number) {
    this.newUpdatesCount = count;
  }

  private handleClick = () => {
    // this.setCount(0);
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
      'badge--hidden': this.newUpdatesCount === 0,
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
    showCount: boolean;
    newUpdatesCount: number;
  }
}
