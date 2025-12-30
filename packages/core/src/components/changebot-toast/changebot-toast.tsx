import { Component, Element, Prop, State, Watch, Method, h, Host } from '@stencil/core';
import { Services, Update } from '../../types';
import { Theme } from '../../utils/themes';
import { requestServices } from '../../utils/context';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
import { formatDisplayDate, setLastViewedTime, validatePublishedAt } from '../../utils/date-utils';
import { findHighlightedUpdate } from '../../utils/update-checker';

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

  @Watch('isVisible')
  onVisibilityChange() {
    if (this.isVisible) {
      // Update container bounds when toast becomes visible
      this.updateContainerBounds();
    }
  }

  private services?: Services;
  private unsubscribeUpdates?: () => void;
  private themeManager?: ThemeManager;
  private autoDismissTimer?: ReturnType<typeof setTimeout>;
  private resizeObserver?: ResizeObserver;

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
    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });

    // Set data-scope attribute if scope is provided
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // Request context from provider
    console.log('🍞 Toast: Requesting context with scope:', this.scope || 'default');

    requestServices(this.el, this.scope, services => {
      console.log('🍞 Toast: Received services from provider', {
        hasStore: !!services?.store,
        hasActions: !!services?.actions,
        storeState: services?.store?.state,
      });
      this.services = services;
      this.subscribeToStore();
    });
  }

  componentDidLoad() {
    // Set up container bounds tracking
    this.updateContainerBounds();
    this.setupContainerTracking();
  }

  disconnectedCallback() {
    if (this.unsubscribeUpdates) {
      this.unsubscribeUpdates();
    }
    this.themeManager?.cleanup();
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // Clean up window event listeners
    window.removeEventListener('resize', this.updateContainerBounds);
    window.removeEventListener('scroll', this.updateContainerBounds);
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
    const result = findHighlightedUpdate(updates, 'toast', this.scope, this.currentUpdate?.id, '🍞 Toast');

    if (result.shouldShow && result.newUpdate) {
      this.currentUpdate = result.newUpdate;
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
    } else if (!result.newUpdate) {
      this.isVisible = false;
      this.currentUpdate = undefined;
    }
  }

  private handleDismiss = () => {
    // Clear auto-dismiss timer if active
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = undefined;
    }

    // Mark this update as viewed
    if (this.currentUpdate) {
      const updateTime = validatePublishedAt(this.currentUpdate.published_at, 'Toast', this.currentUpdate.title);

      if (updateTime === null) {
        console.error('Toast: Cannot mark update as viewed - invalid published_at');
        return;
      }

      setLastViewedTime(this.scope || 'default', updateTime);
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
    // Get the parent element (container) of the toast component
    const container = this.el.parentElement;
    if (!container) return;

    // Get the bounding rect of the container
    const rect = container.getBoundingClientRect();

    // Calculate offsets more clearly
    const leftOffset = rect.left;
    const rightOffset = window.innerWidth - rect.right;
    const topOffset = rect.top;

    // Set CSS custom properties on the host element
    // These will be inherited by the shadow DOM and can be used in CSS
    (this.el as HTMLElement).style.setProperty('--toast-container-left', `${leftOffset}px`);
    (this.el as HTMLElement).style.setProperty('--toast-container-right-offset', `${rightOffset}px`);
    (this.el as HTMLElement).style.setProperty('--toast-container-top', `${topOffset}px`);
  };

  private setupContainerTracking() {
    // Get the parent element (container) of the toast component
    const container = this.el.parentElement;
    if (!container) return;

    // Use ResizeObserver to track container size changes
    this.resizeObserver = new ResizeObserver(() => {
      this.updateContainerBounds();
    });

    this.resizeObserver.observe(container);

    // Also update on window resize (for viewport changes)
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
