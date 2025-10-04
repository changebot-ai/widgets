import { Component, Element, Prop, State, Method, Watch, h, Host } from '@stencil/core';
import { dispatchAction } from '../../utils/context';
import { Update } from '../../types';
import { CatppuccinTheme } from '../../utils/themes';

@Component({
  tag: 'changebot-drawer',
  styleUrl: 'changebot-drawer.css',
  shadow: true,
})
export class ChangebotDrawer {
  @Element() el: HTMLChangebotDrawerElement;

  @Prop() scope?: string;
  @Prop() theme?: CatppuccinTheme;
  @Prop() light?: CatppuccinTheme;
  @Prop() dark?: CatppuccinTheme;
  @Prop() displayMode: 'drawer-left' | 'drawer-right' | 'modal' = 'drawer-right';

  @State() isOpen: boolean = false;
  @State() updates: Update[] = [];
  @State() activeTheme?: CatppuccinTheme;

  private services: any;
  private unsubscribeIsOpen?: () => void;
  private unsubscribeUpdates?: () => void;
  private drawerElement?: HTMLDivElement;
  private firstFocusableElement?: HTMLElement;
  private lastFocusableElement?: HTMLElement;
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

    // Request context from provider with error handling
    try {
      const detail = {
        callback: (services: any) => {
          try {
            console.log('📂 Drawer: Received services from provider', {
              hasStore: !!services?.store,
              hasActions: !!services?.actions,
              storeState: services?.store?.state
            });
            this.services = services;
            this.subscribeToStore();
          } catch (error) {
            // If provider setup fails, drawer will still work in standalone mode
            console.warn('Drawer: Failed to setup provider connection, using standalone mode:', error);
          }
        },
        scope: this.scope || 'default'
      };

      console.log('📂 Drawer: Requesting context with scope:', detail.scope);

      this.el.dispatchEvent(
        new CustomEvent('changebot:context-request', {
          bubbles: true,
          composed: true,
          detail
        })
      );
    } catch (error) {
      // If provider request fails, continue in standalone mode
      console.warn('Drawer: Failed to request provider context, using standalone mode:', error);
    }

    // Listen for ESC key globally
    document.addEventListener('keydown', this.handleKeyDown);
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

    // Remove event listener
    document.removeEventListener('keydown', this.handleKeyDown);

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

  public subscribeToStore() {
    if (!this.services?.store) return;

    try {
      const store = this.services.store;

      console.log('📂 Drawer: Subscribing to store, current state:', store.state);

      // Subscribe to isOpen changes
      this.unsubscribeIsOpen = store.onChange('isOpen', () => {
        try {
          console.log('📂 Drawer: isOpen changed to', store.state.isOpen);
          this.isOpen = store.state.isOpen;

          if (this.isOpen) {
            // Focus first element when opening
            setTimeout(() => this.focusFirstElement(), 100);
          }
        } catch (error) {
          console.warn('Drawer: Error in isOpen change handler:', error);
        }
      });

      // Subscribe to updates changes
      this.unsubscribeUpdates = store.onChange('updates', () => {
        try {
          console.log('📂 Drawer: Updates changed, count:', store.state.updates?.length);
          this.updates = store.state.updates || [];
        } catch (error) {
          console.warn('Drawer: Error in updates change handler:', error);
        }
      });

      // Initialize state safely
      this.isOpen = store.state.isOpen || false;
      this.updates = store.state.updates || [];
    } catch (error) {
      console.warn('Drawer: Failed to subscribe to store:', error);
    }
  }

  /**
   * Open the drawer/modal
   */
  @Method()
  async open() {
    this.isOpen = true;
    if (this.isOpen) {
      setTimeout(() => this.focusFirstElement(), 100);
    }
  }

  /**
   * Close the drawer/modal
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
    if (!this.drawerElement) return;

    const focusableElements = this.drawerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      this.firstFocusableElement = focusableElements[0] as HTMLElement;
      this.lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    }
  }

  private focusFirstElement() {
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }
  }

  public handleKeyDown = (event: KeyboardEvent) => {
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
        // Always close the drawer, regardless of provider state
        this.isOpen = false;
      }
    }

    // Focus trap for modal mode
    if (this.displayMode === 'modal' && event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      } else if (!event.shiftKey && document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };

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
      // Always close the drawer, regardless of provider state
      // This ensures errors don't prevent users from closing the drawer
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
        // Always close the drawer, regardless of provider state
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

  private getDisplayModeClass(): string {
    switch (this.displayMode) {
      case 'drawer-left':
        return 'drawer--left';
      case 'drawer-right':
        return 'drawer--right';
      case 'modal':
        return 'drawer--modal';
      default:
        return 'drawer--right';
    }
  }

  private renderUpdateItem(update: Update) {
    return (
      <div class="update-item" key={update.id}>
        <div class="update-header">
          <h3 class="update-title">{update.title}</h3>
          <time class="update-date" dateTime={update.date}>
            {this.formatDate(update.date)}
          </time>
        </div>
        {update.description && (
          <div class="update-description" innerHTML={this.transformHtmlUrls(update.description)}></div>
        )}
        {update.tags && update.tags.length > 0 && (
          <div class="update-tags">
            {update.tags.map(tag => (
              <span
                class="update-tag"
                key={tag.text}
                style={{ backgroundColor: tag.color }}
              >
                {tag.text}
              </span>
            ))}
          </div>
        )}
        {update.details && (
          <div class="update-details" innerHTML={this.transformHtmlUrls(update.details)}></div>
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
      'drawer': true,
      'drawer--closed': !this.isOpen,
      'drawer--open': this.isOpen,
      [`theme--${this.activeTheme}`]: !!this.activeTheme,
      [this.getDisplayModeClass()]: true
    };

    const isModal = this.displayMode === 'modal';

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

        {/* Main drawer/modal container */}
        <div
          ref={el => this.drawerElement = el}
          class={classes}
          role="dialog"
          aria-modal={isModal ? 'true' : 'false'}
          aria-label="Product Updates"
          aria-hidden={!this.isOpen ? 'true' : 'false'}
        >
          {/* Header */}
          <div class="drawer-header">
            <h2 class="drawer-title">What's New</h2>
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
          <div class="drawer-content">
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
  interface HTMLChangebotDrawerElement extends HTMLElement {
    scope?: string;
    theme?: CatppuccinTheme;
    light?: CatppuccinTheme;
    dark?: CatppuccinTheme;
    displayMode: 'drawer-left' | 'drawer-right' | 'modal';
    isOpen: boolean;
    updates: Update[];
  }
}