import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { dispatchAction } from '../../utils/context';
import { Services } from '../../types';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
import { connectToProvider, SubscriptionManager } from '../../utils/provider-connection';
import { logBadge as log } from '../../utils/logger';

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
  private subscriptions = new SubscriptionManager();
  private themeManager?: ThemeManager;

  @Watch('count')
  onCountChange(newCount: number) {
    this.setCount(newCount);
  }

  private setCount(count: number) {
    if (count !== undefined) {
      const newCount = Math.max(0, count);
      log.debug('setCount called', {
        inputCount: count,
        finalCount: newCount,
        previousCount: this.newUpdatesCount,
        willUpdate: newCount !== this.newUpdatesCount,
      });
      this.newUpdatesCount = newCount;
    }
  }

  @Watch('theme')
  @Watch('light')
  @Watch('dark')
  onThemePropsChange() {
    this.themeManager?.cleanup();
    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });
  }

  async componentWillLoad() {
    log.debug('componentWillLoad', {
      scope: this.scope || 'default',
      hasCountProp: this.count !== undefined,
      countProp: this.count,
    });

    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });

    // If count prop is provided, use it directly (for testing)
    if (this.count !== undefined) {
      log.debug('Using count prop (testing mode)', { count: this.count });
      this.setCount(this.count);
      return;
    }

    // Connect to provider
    connectToProvider(this.el, this.scope, services => {
      this.services = services;
      this.subscribeToStore();
    }, log);
  }

  disconnectedCallback() {
    this.subscriptions.cleanup();
    this.themeManager?.cleanup();
  }

  public subscribeToStore() {
    if (!this.services?.store) {
      log.debug('Cannot subscribe - no store available');
      return;
    }

    const store = this.services.store;

    log.debug('Subscribing to store', {
      newUpdatesCount: store.state.newUpdatesCount,
      updatesLength: store.state.updates?.length || 0,
      lastViewed: store.state.lastViewed,
    });

    // Set initial count from store
    this.setCount(store.state.newUpdatesCount);

    // Subscribe to newUpdatesCount changes
    this.subscriptions.subscribe(store, 'newUpdatesCount', () => {
      log.debug('newUpdatesCount changed', {
        newValue: store.state.newUpdatesCount,
        previousComponentValue: this.newUpdatesCount,
      });
      this.setCount(store.state.newUpdatesCount);
    });

    // Subscribe to updates changes (indirect newUpdatesCount updates)
    this.subscriptions.subscribe(store, 'updates', () => {
      log.debug('updates changed', { newValue: store.state.newUpdatesCount });
      this.setCount(store.state.newUpdatesCount);
    });

    // Subscribe to lastViewed changes (indirect newUpdatesCount updates)
    this.subscriptions.subscribe(store, 'lastViewed', () => {
      log.debug('lastViewed changed', { newValue: store.state.newUpdatesCount });
      this.setCount(store.state.newUpdatesCount);
    });

    log.debug('Successfully subscribed to store changes');
  }

  private handleClick = () => {
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
