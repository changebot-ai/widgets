import { Component, Element, Prop, State, Watch, Method, h, Host } from '@stencil/core';
import { Services, Update } from '../../types';
import { waitForStore } from '../../store/registry';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
import { logBanner as log } from '../../utils/logger';
import { formatDisplayDate } from '../../utils/date-utils';
import { checkForHighlightedUpdate } from '../../utils/highlight-consumer';

@Component({
  tag: 'changebot-banner',
  styleUrl: 'changebot-banner.css',
  shadow: true,
})
export class ChangebotBanner {
  @Element() el: HTMLChangebotBannerElement;

  @Prop() scope?: string;
  @Prop() theme?: Theme;
  @Prop() light?: Theme;
  @Prop() dark?: Theme;

  @State() isVisible: boolean = false;
  @State() isExpanded: boolean = false;
  @State() isDismissing: boolean = false;
  @State() currentUpdate?: Update;
  @State() activeTheme?: Theme;

  private services?: Services;
  private subscriptionCleanups: (() => void)[] = [];
  private themeManager?: ThemeManager;

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
    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });

    // Set data-scope attribute for debugging
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // Connect to provider asynchronously (don't block rendering)
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
    if (!this.services?.store) return;

    const store = this.services.store;
    log.debug('Subscribing to store', { state: store.state });

    this.subscriptionCleanups.push(
      store.onChange('updates', () => {
        log.debug('Updates changed, checking for new update...');
        this.checkForNewUpdate(store.state.updates);
      })
    );

    // Check initially
    if (store.state.updates) {
      this.checkForNewUpdate(store.state.updates);
    }
  }

  private checkForNewUpdate(updates: Update[]) {
    const lastViewed = this.services?.store.state.lastViewed ?? null;
    checkForHighlightedUpdate(
      updates,
      'banner',
      lastViewed,
      this.currentUpdate?.id,
      {
        onShow: update => {
          this.currentUpdate = update;
          this.isVisible = true;
          this.isExpanded = false; // Start collapsed
        },
        onHide: () => {
          this.isVisible = false;
          this.currentUpdate = undefined;
          this.isExpanded = false;
        },
      },
      '🎯 Banner'
    );
  }

  private handleDismiss = (event?: MouseEvent | Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    log.debug('Dismiss button clicked');

    // Start dismissing animation
    this.isDismissing = true;

    // Wait for animation to complete, then hide banner
    setTimeout(() => {
      this.isVisible = false;
      this.isExpanded = false;
      this.isDismissing = false;
    }, 300); // Match the slideUpOut animation duration
  };

  private handleToggle = () => {
    // Only allow expanding, not collapsing
    if (!this.isExpanded) {
      this.isExpanded = true;
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleToggle();
    }
  };

  @Method()
  async show(update: Update) {
    this.currentUpdate = update;
    this.isVisible = true;
    this.isExpanded = false;
  }

  @Method()
  async dismiss() {
    this.handleDismiss(new Event('dismiss'));
  }

  @Method()
  async toggle() {
    this.handleToggle();
  }

  private getFirstSentence(html: string): string {
    const text = html.replace(/<[^>]*>/g, '');
    const match = text.match(/^[^.!?]+[.!?]*/);
    return match ? match[0].trim() : text;
  }

  private hasMoreContent(html: string): boolean {
    const text = html.replace(/<[^>]*>/g, '');
    const firstSentence = this.getFirstSentence(html);
    return text.trim().length > firstSentence.length;
  }

  render() {
    if (!this.isVisible || !this.currentUpdate) {
      return null;
    }

    const classes = {
      'banner': true,
      'banner--expanded': this.isExpanded,
      'banner--dismissing': this.isDismissing,
      [`theme--${this.activeTheme}`]: !!this.activeTheme,
    };

    const hasMore = this.currentUpdate.content && this.hasMoreContent(this.currentUpdate.content);
    const firstSentence = this.currentUpdate.content ? this.getFirstSentence(this.currentUpdate.content) : '';

    const titleContent = this.currentUpdate.hosted_url ? (
      <a
        href={this.currentUpdate.hosted_url}
        class="banner-title-link"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {this.currentUpdate.title}
      </a>
    ) : (
      this.currentUpdate.title
    );

    return (
      <Host>
        <div class={classes} role="banner" aria-live="polite">
          <div
            class="banner-main"
            onClick={this.handleToggle}
            onKeyDown={this.handleKeyDown}
            role="button"
            tabindex={this.isExpanded ? undefined : '0'}
            aria-expanded={this.isExpanded.toString()}
            aria-label={this.isExpanded ? 'Update expanded' : 'Expand update'}
            style={{ cursor: this.isExpanded ? 'default' : 'pointer' }}
          >
            <h3 class="banner-title">{titleContent}</h3>
            <time class="banner-date" dateTime={this.currentUpdate.display_date}>
              {formatDisplayDate(this.currentUpdate.display_date)}
            </time>
            <div class="banner-content">
              {this.currentUpdate.content &&
                (this.isExpanded ? (
                  <div class="banner-description" innerHTML={this.currentUpdate.content}></div>
                ) : (
                  <div class="banner-preview">
                    {firstSentence}
                    {hasMore && <span class="banner-read-more"> Click to read more</span>}
                  </div>
                ))}
            </div>
          </div>
          <button class="banner-close" type="button" onClick={e => this.handleDismiss(e)} aria-label="Dismiss banner">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="4" x2="4" y2="12"></line>
              <line x1="4" y1="4" x2="12" y2="12"></line>
            </svg>
          </button>
        </div>
      </Host>
    );
  }
}

declare global {
  interface HTMLChangebotBannerElement extends HTMLElement {
    scope?: string;
    theme?: Theme;
    light?: Theme;
    dark?: Theme;
  }
}
