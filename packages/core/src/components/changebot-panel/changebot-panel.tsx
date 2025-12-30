import { Component, Element, Prop, State, Method, Watch, Listen, h, Host } from '@stencil/core';
import { dispatchAction, requestServices } from '../../utils/context';
import { Services, Update, Widget } from '../../types';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
import { formatDisplayDate } from '../../utils/date-utils';

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

  private services?: Services;
  private unsubscribeIsOpen?: () => void;
  private unsubscribeUpdates?: () => void;
  private unsubscribeWidget?: () => void;
  private panelElement?: HTMLDivElement;
  private firstFocusableElement?: HTMLElement;
  private lastFocusableElement?: HTMLElement;
  private themeManager?: ThemeManager;

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

    // Request context from provider with error handling
    console.log('📂 Panel: Requesting context with scope:', this.scope || 'default');

    try {
      requestServices(this.el, this.scope, services => {
        try {
          console.log('📂 Panel: Received services from provider', {
            hasStore: !!services?.store,
            hasActions: !!services?.actions,
            storeState: services?.store?.state,
          });
          this.services = services;
          this.subscribeToStore();
        } catch (error) {
          // If provider setup fails, panel will still work in standalone mode
          console.warn('Panel: Failed to setup provider connection, using standalone mode:', error);
        }
      });
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
    this.themeManager?.cleanup();
  }

  public subscribeToStore() {
    if (!this.services?.store) return;

    try {
      const store = this.services.store;

      console.log('📂 Panel: Subscribing to store, current state:', store.state);

      this.unsubscribeIsOpen = store.onChange('isOpen', () => {
        try {
          console.log('📂 Panel: isOpen changed to', store.state.isOpen);
          const wasOpen = this.isOpen;
          this.isOpen = store.state.isOpen;

          if (this.isOpen && !wasOpen) {
            setTimeout(() => this.focusFirstElement(), 100);
          }
        } catch (error) {
          console.warn('Panel: Error in isOpen change handler:', error);
        }
      });

      this.unsubscribeUpdates = store.onChange('updates', () => {
        try {
          console.log('📂 Panel: Updates changed, count:', store.state.updates?.length);
          this.updates = store.state.updates || [];
        } catch (error) {
          console.warn('Panel: Error in updates change handler:', error);
        }
      });

      this.unsubscribeWidget = store.onChange('widget', () => {
        try {
          console.log('📂 Panel: Widget metadata changed:', store.state.widget);
          this.widget = store.state.widget;
        } catch (error) {
          console.warn('Panel: Error in widget change handler:', error);
        }
      });

      this.isOpen = store.state.isOpen || false;
      this.updates = store.state.updates || [];
      this.widget = store.state.widget || null;
    } catch (error) {
      console.warn('Panel: Failed to subscribe to store:', error);
    }
  }

  @Method()
  async open() {
    dispatchAction(this.el, 'openDisplay', undefined, this.scope);
  }

  @Method()
  async close() {
    dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
  }

  @Method()
  async setUpdates(updates: Update[]) {
    this.updates = updates;
  }

  private setupFocusTrap() {
    if (!this.panelElement) return;

    const focusableElements = this.panelElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

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
      <a href={update.hosted_url} class="update-title-link" target="_blank" rel="noopener noreferrer">
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
            {formatDisplayDate(update.display_date)}
          </time>
        </div>
        {update.content && <div class="update-description" innerHTML={this.transformHtmlUrls(update.content)}></div>}
        {update.tags && update.tags.length > 0 && (
          <div class="update-tags">
            {update.tags.map(tag => (
              <span
                class="update-tag"
                key={tag.id}
                style={{
                  backgroundColor: tag.color,
                  color: this.getContrastColor(tag.color),
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

    return <div class="updates-list">{this.updates.map(update => this.renderUpdateItem(update))}</div>;
  }

  render() {
    const classes = {
      'panel': true,
      'panel--closed': !this.isOpen,
      'panel--open': this.isOpen,
      [`theme--${this.activeTheme}`]: !!this.activeTheme,
      [this.getModeClass()]: true,
    };

    const isModal = this.mode === 'modal';

    return (
      <Host>
        {/* Backdrop */}
        {this.isOpen && <div class="backdrop" onClick={this.handleBackdropClick} aria-hidden="true"></div>}

        {/* Main panel container */}
        <div
          ref={el => (this.panelElement = el)}
          class={classes}
          role="dialog"
          aria-modal={isModal ? 'true' : 'false'}
          aria-label="Product Updates"
          aria-hidden={!this.isOpen ? 'true' : 'false'}
        >
          {/* Header */}
          <div class={`panel-header${!this.widget?.subheading ? ' no-subheading' : ''}`}>
            <div class="panel-header-content">
              <h2 class="panel-title">{this.widget?.title || "What's New"}</h2>
              {this.widget?.subheading && <p class="panel-subheading">{this.widget.subheading}</p>}
            </div>
            <button class="close-button" type="button" onClick={this.handleClose} aria-label="Close updates">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div class="panel-content">{this.renderContent()}</div>

          {/* Footer with Powered by Changebot */}
          {this.widget?.branded !== false && (
            <div class="panel-footer">
              <a
                href="https://www.changebot.ai/?utm_source=powered_by&utm_medium=widget&utm_campaign=customer_widget"
                class="powered-by-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Powered by Changebot - Create your own changelog"
              >
                <span class="powered-by-text">Powered by</span>
                <span class="powered-by-brand">Changebot</span>

                {/* Hover tooltip */}
                <span class="powered-by-tooltip" aria-hidden="true">
                  <span class="tooltip-text">Create yours!</span>
                  <span class="tooltip-arrow"></span>
                </span>
              </a>
            </div>
          )}

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
