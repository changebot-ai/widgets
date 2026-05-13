import { Component, Element, Prop, State, Watch, Method, h, Host } from '@stencil/core';
import { Services, Update } from '../../types';
import { onStoreReady } from '../../store/registry';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
import { logToast as log } from '../../utils/logger';
import { formatDisplayDate } from '../../utils/date-utils';
import { checkForHighlightedUpdate } from '../../utils/highlight-consumer';

@Component({
  tag: 'changebot-toast',
  styleUrl: 'changebot-toast.css',
  shadow: true,
})
export class ChangebotToast {
  @Element() el: HTMLChangebotToastElement;

  @Prop() theme?: Theme;
  // Connect-time only: changes after mount are ignored. To rebind, remount the element.
  @Prop() scope?: string; // Undocumented: for multiple provider instances
  @Prop() light?: Theme;
  @Prop() dark?: Theme;
  @Prop() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';

  @State() isVisible: boolean = false;
  @State() currentUpdate?: Update;
  @State() activeTheme?: Theme;

  @Watch('isVisible')
  onVisibilityChange() {
    if (this.isVisible) {
      this.updateContainerBounds();
    }
  }

  private services?: Services;
  private subscriptionCleanups: (() => void)[] = [];
  private themeManager?: ThemeManager;
  private resizeObserver?: ResizeObserver;
  private unsubscribeFromRegistry?: () => void;

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

  private connectToProvider() {
    this.unsubscribeFromRegistry?.();
    this.el.setAttribute('data-changebot-state', 'waiting-for-provider');
    this.unsubscribeFromRegistry = onStoreReady(
      this.scope || 'default',
      services => {
        this.services = services;
        this.el.setAttribute('data-changebot-state', 'connected');
        log.debug('Connected to provider via registry', { scope: this.scope || 'default' });
        this.subscribeToStore();
      },
      {
        onTimeout: () => {
          this.el.setAttribute('data-changebot-state', 'provider-missing');
        },
      }
    );
  }

  componentDidLoad() {
    this.updateContainerBounds();
    this.setupContainerTracking();
  }

  disconnectedCallback() {
    this.unsubscribeFromRegistry?.();
    this.unsubscribeFromRegistry = undefined;
    this.subscriptionCleanups.forEach(cleanup => cleanup());
    this.subscriptionCleanups = [];
    this.themeManager?.cleanup();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('resize', this.updateContainerBounds);
    window.removeEventListener('scroll', this.updateContainerBounds);
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
    // Use lastViewedToast for toast visibility (independent of badge's lastViewed)
    const lastViewedToast = this.services?.store.state.lastViewedToast ?? null;
    checkForHighlightedUpdate(
      updates,
      'toast',
      lastViewedToast,
      this.currentUpdate?.id,
      {
        onShow: update => {
          this.currentUpdate = update;
          this.isVisible = true;
        },
        onHide: () => {
          this.isVisible = false;
          this.currentUpdate = undefined;
        },
      },
      '🍞 Toast'
    );
  }

  private handleDismiss = () => {
    // Mark as viewed to persist dismissal
    this.services?.highlight.markToastViewed();

    this.isVisible = false;
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleDismiss();
    }
  };

  @Method()
  async show(update: Update) {
    this.currentUpdate = update;
    this.isVisible = true;
  }

  @Method()
  async dismiss() {
    this.handleDismiss();
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

  private updateContainerBounds = () => {
    const container = this.el.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const leftOffset = rect.left;
    const rightOffset = window.innerWidth - rect.right;
    const topOffset = rect.top;

    (this.el as HTMLElement).style.setProperty('--toast-container-left', `${leftOffset}px`);
    (this.el as HTMLElement).style.setProperty('--toast-container-right-offset', `${rightOffset}px`);
    (this.el as HTMLElement).style.setProperty('--toast-container-top', `${topOffset}px`);
  };

  private setupContainerTracking() {
    const container = this.el.parentElement;
    if (!container) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateContainerBounds();
    });

    this.resizeObserver.observe(container);

    window.addEventListener('resize', this.updateContainerBounds);
    window.addEventListener('scroll', this.updateContainerBounds);
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

    const titleContent = this.currentUpdate.hosted_url ? (
      <a
        href={this.currentUpdate.hosted_url}
        class="toast-title-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {this.currentUpdate.title}
      </a>
    ) : (
      this.currentUpdate.title
    );

    return (
      <Host>
        <div class={classes} role="alert" aria-live="polite">
          <div class="toast-header">
            <h3 class="toast-title">{titleContent}</h3>
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
          {this.currentUpdate.content && (
            <div class="toast-content" innerHTML={this.currentUpdate.content}></div>
          )}
          <time class="toast-date" dateTime={this.currentUpdate.display_date}>
            {formatDisplayDate(this.currentUpdate.display_date)}
          </time>
        </div>
      </Host>
    );
  }
}

declare global {
  interface HTMLChangebotToastElement extends HTMLElement {
    scope?: string;
    theme?: Theme;
    light?: Theme;
    dark?: Theme;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    preview?: boolean;
  }
}
