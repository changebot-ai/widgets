import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { Services } from '../../types';
import { waitForStore } from '../../store/registry';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
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
  private subscriptionCleanups: (() => void)[] = [];
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

  componentWillLoad() {
    log.debug('componentWillLoad', {
      scope: this.scope || 'default',
      hasCountProp: this.count !== undefined,
      countProp: this.count,
    });

    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });

    // If count prop is provided, use it directly (for testing/standalone mode)
    if (this.count !== undefined) {
      log.debug('Using count prop (testing mode)', { count: this.count });
      this.setCount(this.count);
    }

    // Set data-scope attribute for debugging
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // Connect to provider asynchronously (don't block rendering)
    // This allows click to open panel even when count prop is used
    this.connectToProvider();
  }

  private async connectToProvider() {
    try {
      this.services = await waitForStore(this.scope || 'default');
      log.debug('Connected to provider via registry', { scope: this.scope || 'default' });
      this.subscribeToStore();
    } catch (error) {
      log.warn('Failed to connect to provider', {
        error: error instanceof Error ? error.message : error,
        scope: this.scope || 'default',
      });
    }
  }

  disconnectedCallback() {
    this.subscriptionCleanups.forEach(cleanup => cleanup());
    this.subscriptionCleanups = [];
    this.themeManager?.cleanup();
  }

  private subscribeToStore() {
    if (!this.services?.store) {
      log.debug('Cannot subscribe - no store available');
      return;
    }

    // If count prop is provided, don't override from store
    // (badge is in standalone mode with explicit count)
    if (this.count !== undefined) {
      log.debug('Count prop provided, skipping store subscription for count');
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

    // Subscribe to newUpdatesCount changes (store auto-calculates when updates/lastViewed change)
    this.subscriptionCleanups.push(
      store.onChange('newUpdatesCount', () => {
        log.debug('newUpdatesCount changed', {
          newValue: store.state.newUpdatesCount,
          previousComponentValue: this.newUpdatesCount,
        });
        this.setCount(store.state.newUpdatesCount);
      })
    );

    log.debug('Successfully subscribed to store changes');
  }

  private handleClick = () => {
    if (this.services) {
      this.services.openAndMarkViewed();
    } else {
      log.warn('Cannot open display - no services available');
    }
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
