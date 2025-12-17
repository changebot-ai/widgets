import { Component, Element, Prop, State, Watch, Method, h, Host } from '@stencil/core';
import { Update } from '../../types';
import { Theme } from '../../utils/themes';

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

  private services: any;
  private unsubscribeUpdates?: () => void;
  private mediaQuery?: MediaQueryList;
  private mediaQueryListener?: (e: MediaQueryListEvent) => void;

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
        console.log('🎯 Banner: Received services from provider', {
          hasStore: !!services?.store,
          hasActions: !!services?.actions,
          storeState: services?.store?.state,
        });
        this.services = services;
        this.subscribeToStore();
      },
      scope: this.scope || 'default',
    };

    console.log('🎯 Banner: Requesting context with scope:', detail.scope);

    this.el.dispatchEvent(
      new CustomEvent('changebot:context-request', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  disconnectedCallback() {
    if (this.unsubscribeUpdates) {
      this.unsubscribeUpdates();
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

    console.log('🎯 Banner: Subscribing to store, current state:', store.state);

    // Subscribe to updates changes
    this.unsubscribeUpdates = store.onChange('updates', () => {
      console.log('🎯 Banner: Updates changed, checking for new update...');
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

    // Find the most recent update that's newer than lastViewed AND has highlight_target="banner"
    const newUpdate = updates.find(update => {
      // Skip updates with null/undefined published_at
      if (!update.published_at) {
        console.warn('Banner: Missing published_at for update:', update.title);
        return false;
      }

      const updateTime = new Date(update.published_at).getTime();

      // Skip updates with invalid timestamps (NaN or 0 from null)
      if (isNaN(updateTime) || updateTime === 0) {
        console.warn('Banner: Invalid published_at timestamp for update:', update.title, update.published_at);
        return false;
      }

      const isNewer = lastViewed === 0 || updateTime > lastViewed;
      const isBanner = update.highlight_target === 'banner';
      return isNewer && isBanner;
    });

    if (newUpdate && newUpdate.id !== this.currentUpdate?.id) {
      console.log('🎯 Banner: Found new update to display:', newUpdate.title);
      this.currentUpdate = newUpdate;
      this.isVisible = true;
      this.isExpanded = false; // Start collapsed
    } else if (!newUpdate) {
      this.isVisible = false;
      this.currentUpdate = undefined;
      this.isExpanded = false;
    }
  }

  private getLastViewedTime(): number {
    const key = `changebot:lastViewed:${this.scope || 'default'}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  }

  private handleDismiss = (event?: MouseEvent | Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('🎯 Banner: Dismiss button clicked');

    // Start dismissing animation
    this.isDismissing = true;

    // Mark this update as viewed
    if (this.currentUpdate) {
      if (!this.currentUpdate.published_at) {
        console.error('Banner: Cannot mark update as viewed - missing published_at');
        return;
      }

      const updateTime = new Date(this.currentUpdate.published_at).getTime();

      if (isNaN(updateTime) || updateTime === 0) {
        console.error('Banner: Cannot mark update as viewed - invalid published_at:', this.currentUpdate.published_at);
        return;
      }

      const key = `changebot:lastViewed:${this.scope || 'default'}`;
      localStorage.setItem(key, updateTime.toString());
      console.log('🎯 Banner: Marked update as viewed:', this.currentUpdate.title);
    }

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

  /**
   * Show the banner with a specific update
   */
  @Method()
  async show(update: Update) {
    this.currentUpdate = update;
    this.isVisible = true;
    this.isExpanded = false;
  }

  /**
   * Dismiss the banner
   */
  @Method()
  async dismiss() {
    this.handleDismiss(new Event('dismiss'));
  }

  /**
   * Toggle expanded state
   */
  @Method()
  async toggle() {
    this.handleToggle();
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private getFirstSentence(html: string): string {
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, '');
    // Find the first sentence (ending with . ! ? or end of string)
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
              {this.formatDate(this.currentUpdate.display_date)}
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

// Type declaration for HTMLElement
declare global {
  interface HTMLChangebotBannerElement extends HTMLElement {
    scope?: string;
    theme?: Theme;
    light?: Theme;
    dark?: Theme;
  }
}
