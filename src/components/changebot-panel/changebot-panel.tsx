import { Component, Element, Prop, State, Method, Watch, Listen, Event, EventEmitter, h, Host } from '@stencil/core';
import { dispatchAction } from '../../utils/context';
import { Update, Widget } from '../../types';
import { Theme } from '../../utils/themes';

@Component({
  tag: 'changebot-panel',
  styleUrl: 'changebot-panel.css',
  shadow: true,
})
export class ChangebotPanel {
  @Element() el: HTMLChangebotPanelElement;

  @Prop() scope?: string;
  @Prop() theme?: Theme;
  @Prop() light?: Theme;
  @Prop() dark?: Theme;
  @Prop() mode: 'modal' | 'drawer-left' | 'drawer-right' = 'drawer-right';

  @State() isOpen: boolean = false;
  @State() updates: Update[] = [];
  @State() widget: Widget | null = null;
  @State() activeTheme?: Theme;
  @State() prefersDark: boolean = false;

  @Event({ eventName: 'changebot:lastViewed' }) changebotLastViewed: EventEmitter<{ scope: string }>;

  private services: any;
  private unsubscribeIsOpen?: () => void;
  private unsubscribeUpdates?: () => void;
  private unsubscribeWidget?: () => void;
  private panelElement?: HTMLDivElement;
  private firstFocusableElement?: HTMLElement;
  private lastFocusableElement?: HTMLElement;
  private mediaQuery?: MediaQueryList;
  private mediaQueryListener?: (e: MediaQueryListEvent) => void;

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

    // Request context from provider with error handling
    try {
      const detail = {
        callback: (services: any) => {
          try {
            console.log('📂 Panel: Received services from provider', {
              hasStore: !!services?.store,
              hasActions: !!services?.actions,
              storeState: services?.store?.state
            });
            this.services = services;
            this.subscribeToStore();
          } catch (error) {
            // If provider setup fails, panel will still work in standalone mode
            console.warn('Panel: Failed to setup provider connection, using standalone mode:', error);
          }
        },
        scope: this.scope || 'default'
      };

      console.log('📂 Panel: Requesting context with scope:', detail.scope);

      this.el.dispatchEvent(
        new CustomEvent('changebot:context-request', {
          bubbles: true,
          composed: true,
          detail
        })
      );
    } catch (error) {
      // If provider request fails, continue in standalone mode
      console.warn('Panel: Failed to request provider context, using standalone mode:', error);
    }
  }

  componentDidLoad() {
    // Setup focus trap elements
    this.setupFocusTrap();
  }

  disconnectedCallback() {
    // Cleanup subscriptions
    if (this.unsubscribeIsOpen) {
      this.unsubscribeIsOpen();
    }
    if (this.unsubscribeUpdates) {
      this.unsubscribeUpdates();
    }
    if (this.unsubscribeWidget) {
      this.unsubscribeWidget();
    }

    // Cleanup media query listener
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

    try {
      const store = this.services.store;

      console.log('📂 Panel: Subscribing to store, current state:', store.state);

      // Subscribe to isOpen changes
      this.unsubscribeIsOpen = store.onChange('isOpen', () => {
        try {
          console.log('📂 Panel: isOpen changed to', store.state.isOpen);
          const wasOpen = this.isOpen;
          this.isOpen = store.state.isOpen;

          if (this.isOpen && !wasOpen) {
            // Mark as viewed when opening
            this.markAsViewed();
            // Focus first element when opening
            setTimeout(() => this.focusFirstElement(), 100);
          }
        } catch (error) {
          console.warn('Panel: Error in isOpen change handler:', error);
        }
      });

      // Subscribe to updates changes
      this.unsubscribeUpdates = store.onChange('updates', () => {
        try {
          console.log('📂 Panel: Updates changed, count:', store.state.updates?.length);
          this.updates = store.state.updates || [];
        } catch (error) {
          console.warn('Panel: Error in updates change handler:', error);
        }
      });

      // Subscribe to widget metadata changes
      this.unsubscribeWidget = store.onChange('widget', () => {
        try {
          console.log('📂 Panel: Widget metadata changed:', store.state.widget);
          this.widget = store.state.widget;
        } catch (error) {
          console.warn('Panel: Error in widget change handler:', error);
        }
      });

      // Initialize state safely
      this.isOpen = store.state.isOpen || false;
      this.updates = store.state.updates || [];
      this.widget = store.state.widget || null;
    } catch (error) {
      console.warn('Panel: Failed to subscribe to store:', error);
    }
  }

  /**
   * Open the panel
   */
  @Method()
  async open() {
    this.isOpen = true;
    this.markAsViewed();
    if (this.isOpen) {
      setTimeout(() => this.focusFirstElement(), 100);
    }
  }

  /**
   * Close the panel
   */
  @Method()
  async close() {
    this.isOpen = false;
  }

  /**
   * Set the updates to display
   */
  @Method()
  async setUpdates(updates: Update[]) {
    this.updates = updates;
  }

  private setupFocusTrap() {
    if (!this.panelElement) return;

    const focusableElements = this.panelElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      this.firstFocusableElement = focusableElements[0] as HTMLElement;
      this.lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    }
  }

  private markAsViewed() {
    // Set the last viewed timestamp in localStorage
    const key = `changebot:lastViewed:${this.scope || 'default'}`;
    localStorage.setItem(key, Date.now().toString());
    console.log('📂 Panel: Marked as viewed at', new Date().toLocaleTimeString());

    // Emit event to notify badge that lastViewed has changed
    this.changebotLastViewed.emit({ scope: this.scope || 'default' });
  }

  private focusFirstElement() {
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }
  }

  @Listen('keydown', { target: 'document' })
  handleKeyDown(event: KeyboardEvent) {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      try {
        // If connected to provider, dispatch action
        if (this.services) {
          dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
        }
      } catch (error) {
        // If dispatch fails for any reason, close directly
        console.warn('Failed to dispatch close action from ESC key, closing directly:', error);
      } finally {
        // Always close the panel, regardless of provider state
        this.isOpen = false;
      }
    }

    // Focus trap for modal mode
    if (this.mode === 'modal' && event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      } else if (!event.shiftKey && document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  }

  private handleClose = () => {
    try {
      // If connected to provider, dispatch action
      if (this.services) {
        dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
      }
    } catch (error) {
      // If dispatch fails for any reason, close directly
      console.warn('Failed to dispatch close action, closing directly:', error);
    } finally {
      // Always close the panel, regardless of provider state
      // This ensures errors don't prevent users from closing the panel
      this.isOpen = false;
    }
  };

  private handleBackdropClick = (event: MouseEvent) => {
    // Close on backdrop click for all display modes
    if ((event.target as HTMLElement).classList.contains('backdrop')) {
      try {
        // If connected to provider, dispatch action
        if (this.services) {
          dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
        }
      } catch (error) {
        // If dispatch fails for any reason, close directly
        console.warn('Failed to dispatch close action from backdrop, closing directly:', error);
      } finally {
        // Always close the panel, regardless of provider state
        this.isOpen = false;
      }
    }
  };

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private transformHtmlUrls(html: string): string {
    if (!html) return html;

    // Create a temporary div to parse and transform the HTML
    const div = document.createElement('div');
    div.innerHTML = html;

    // Convert Rails ActionText attachments to standard img tags
    const actionTextAttachments = div.querySelectorAll('action-text-attachment');
    actionTextAttachments.forEach((attachment: Element) => {
      const contentType = attachment.getAttribute('content-type');

      // Only process image attachments
      if (contentType && contentType.startsWith('image/')) {
        const url = attachment.getAttribute('url') || attachment.getAttribute('href');
        const filename = attachment.getAttribute('filename') || 'Image';
        const presentation = attachment.getAttribute('presentation');

        if (url) {
          // Create a figure element for better semantic HTML
          const figure = document.createElement('figure');
          figure.className = 'attachment-figure';

          const img = document.createElement('img');
          img.src = url;
          img.alt = filename;

          // Add loading lazy for performance
          img.loading = 'lazy';

          figure.appendChild(img);

          // Add caption if filename is meaningful
          if (filename && filename !== 'Image' && presentation !== 'gallery') {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = filename;
            figure.appendChild(figcaption);
          }

          // Replace the action-text-attachment with the figure
          attachment.parentNode?.replaceChild(figure, attachment);
        }
      }
    });

    // Find all images with relative URLs and make them absolute
    const images = div.querySelectorAll('img[src^="/"], img[src^="rails/"]');
    images.forEach((img: HTMLImageElement) => {
      const src = img.getAttribute('src');
      if (src && (src.startsWith('/') || src.startsWith('rails/'))) {
        // Transform relative URLs to absolute URLs pointing to Changebot domain
        img.setAttribute('src', `https://app.changebot.ai${src.startsWith('/') ? src : '/' + src}`);
      }
    });

    // Also handle any links in the HTML
    const links = div.querySelectorAll('a[href^="/"], a[href^="rails/"]');
    links.forEach((link: HTMLAnchorElement) => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('/') || href.startsWith('rails/'))) {
        link.setAttribute('href', `https://app.changebot.ai${href.startsWith('/') ? href : '/' + href}`);
      }
    });

    return div.innerHTML;
  }

  private getModeClass(): string {
    switch (this.mode) {
      case 'drawer-left':
        return 'panel--left';
      case 'drawer-right':
        return 'panel--right';
      case 'modal':
        return 'panel--modal';
      default:
        return 'panel--right';
    }
  }

  /**
   * Calculate the appropriate text color (white or black) for a given background color
   * to ensure sufficient contrast and readability
   */
  private getContrastColor(hexColor: string): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  private renderUpdateItem(update: Update) {
    const titleContent = update.hosted_url ? (
      <a
        href={update.hosted_url}
        class="update-title-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {update.title}
      </a>
    ) : (
      update.title
    );

    return (
      <div class="update-item" key={update.id}>
        <div class="update-header">
          <h3 class="update-title">{titleContent}</h3>
          <time class="update-date" dateTime={update.display_date}>
            {this.formatDate(update.display_date)}
          </time>
        </div>
        {update.content && (
          <div class="update-description" innerHTML={this.transformHtmlUrls(update.content)}></div>
        )}
        {update.tags && update.tags.length > 0 && (
          <div class="update-tags">
            {update.tags.map(tag => (
              <span
                class="update-tag"
                key={tag.id}
                style={{
                  backgroundColor: tag.color,
                  color: this.getContrastColor(tag.color)
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  private renderContent() {
    if (this.updates.length === 0) {
      return (
        <div class="empty-state">
          <p>No updates available</p>
        </div>
      );
    }

    return (
      <div class="updates-list">
        {this.updates.map(update => this.renderUpdateItem(update))}
      </div>
    );
  }

  render() {
    const classes = {
      'panel': true,
      'panel--closed': !this.isOpen,
      'panel--open': this.isOpen,
      [`theme--${this.activeTheme}`]: !!this.activeTheme,
      [this.getModeClass()]: true
    };

    const isModal = this.mode === 'modal';

    return (
      <Host>
        {/* Backdrop */}
        {this.isOpen && (
          <div
            class="backdrop"
            onClick={this.handleBackdropClick}
            aria-hidden="true"
          ></div>
        )}

        {/* Main panel container */}
        <div
          ref={el => this.panelElement = el}
          class={classes}
          role="dialog"
          aria-modal={isModal ? 'true' : 'false'}
          aria-label="Product Updates"
          aria-hidden={!this.isOpen ? 'true' : 'false'}
        >
          {/* Header */}
          <div class="panel-header">
            <div class="panel-header-content">
              <h2 class="panel-title">{this.widget?.title || "What's New"}</h2>
              {this.widget?.subheading && (
                <p class="panel-subheading">{this.widget.subheading}</p>
              )}
            </div>
            <button
              class="close-button"
              type="button"
              onClick={this.handleClose}
              aria-label="Close updates"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div class="panel-content">
            {this.renderContent()}
          </div>

          {/* ARIA live region for announcements */}
          <div class="visually-hidden" aria-live="polite" aria-atomic="true">
            {this.isOpen && `${this.updates.length} ${this.updates.length === 1 ? 'update' : 'updates'} available`}
          </div>
        </div>
      </Host>
    );
  }
}

// Type declaration for HTMLElement
declare global {
  interface HTMLChangebotPanelElement extends HTMLElement {
    scope?: string;
    theme?: Theme;
    light?: Theme;
    dark?: Theme;
    mode: 'modal' | 'drawer-left' | 'drawer-right';
    isOpen: boolean;
    updates: Update[];
  }
}