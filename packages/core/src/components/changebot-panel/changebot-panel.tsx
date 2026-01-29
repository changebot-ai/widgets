import { Component, Element, Prop, State, Method, Watch, Listen, h, Host } from '@stencil/core';
import { Services, Update, Widget } from '../../types';
import { waitForStore } from '../../store/registry';
import { Theme } from '../../utils/themes';
import { createThemeManager, ThemeManager } from '../../utils/theme-manager';
import { logPanel as log } from '../../utils/logger';
import { formatDisplayDate } from '../../utils/date-utils';

@Component({
  tag: 'changebot-panel',
  styleUrl: 'changebot-panel.css',
  shadow: true,
})
export class ChangebotPanel {
  @Element() el: HTMLChangebotPanelElement;

  @Prop() theme?: Theme;
  @Prop() scope?: string; // Undocumented: for multiple provider instances
  @Prop() light?: Theme;
  @Prop() dark?: Theme;
  @Prop() mode: 'modal' | 'drawer-left' | 'drawer-right' = 'drawer-right';

  @State() isOpen: boolean = false;
  @State() updates: Update[] = [];
  @State() widget: Widget | null = null;
  @State() activeTheme?: Theme;
  @State() isLoading: boolean = false;

  private services?: Services;
  private subscriptionCleanups: (() => void)[] = [];
  private panelElement?: HTMLDivElement;
  private firstFocusableElement?: HTMLElement;
  private lastFocusableElement?: HTMLElement;
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

  componentDidLoad() {
    this.setupFocusTrap();
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
      store.onChange('isOpen', () => {
        log.debug('isOpen changed', { isOpen: store.state.isOpen });
        const wasOpen = this.isOpen;
        this.isOpen = store.state.isOpen;

        if (this.isOpen && !wasOpen) {
          setTimeout(() => this.focusFirstElement(), 100);
        }
      })
    );

    this.subscriptionCleanups.push(
      store.onChange('updates', () => {
        log.debug('Updates changed', { count: store.state.updates?.length });
        this.updates = store.state.updates || [];
      })
    );

    this.subscriptionCleanups.push(
      store.onChange('widget', () => {
        log.debug('Widget metadata changed', { widget: store.state.widget });
        this.widget = store.state.widget;
      })
    );

    this.subscriptionCleanups.push(
      store.onChange('isLoading', () => {
        log.debug('isLoading changed', { isLoading: store.state.isLoading });
        this.isLoading = store.state.isLoading;
      })
    );

    // Set initial state
    this.isOpen = store.state.isOpen || false;
    this.updates = store.state.updates || [];
    this.widget = store.state.widget || null;
    this.isLoading = store.state.isLoading || false;
  }

  @Method()
  async open() {
    if (this.services) {
      this.services.display.open();
    } else {
      log.warn('Cannot open panel - no services available');
    }
  }

  @Method()
  async close() {
    if (this.services?.display) {
      this.services.display.close();
    } else {
      log.warn('Cannot close panel - no services available');
      this.isOpen = false;
    }
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

  /**
   * Consolidated close handler - used by all close actions
   */
  private closePanel = () => {
    try {
      if (this.services?.display) {
        this.services.display.close();
      }
    } catch (error) {
      log.warn('Failed to close panel', { error });
    } finally {
      // Always close the panel, regardless of provider state
      this.isOpen = false;
    }
  };

  @Listen('keydown', { target: 'document' })
  handleKeyDown(event: KeyboardEvent) {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel();
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

  private handleBackdropClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).classList.contains('backdrop')) {
      this.closePanel();
    }
  };

  private transformHtmlUrls(html: string): string {
    if (!html) return html;

    const div = document.createElement('div');
    div.innerHTML = html;

    // Convert Rails ActionText attachments to standard img tags
    const actionTextAttachments = div.querySelectorAll('action-text-attachment');
    actionTextAttachments.forEach((attachment: Element) => {
      const contentType = attachment.getAttribute('content-type');

      if (contentType && contentType.startsWith('image/')) {
        const url = attachment.getAttribute('url') || attachment.getAttribute('href');
        const filename = attachment.getAttribute('filename') || 'Image';
        const presentation = attachment.getAttribute('presentation');

        if (url) {
          const figure = document.createElement('figure');
          figure.className = 'attachment-figure';

          const img = document.createElement('img');
          img.src = url;
          img.alt = filename;
          img.loading = 'lazy';

          figure.appendChild(img);

          if (filename && filename !== 'Image' && presentation !== 'gallery') {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = filename;
            figure.appendChild(figcaption);
          }

          attachment.parentNode?.replaceChild(figure, attachment);
        }
      }
    });

    // Transform relative URLs to absolute
    const images = div.querySelectorAll('img[src^="/"], img[src^="rails/"]');
    images.forEach((img: HTMLImageElement) => {
      const src = img.getAttribute('src');
      if (src && (src.startsWith('/') || src.startsWith('rails/'))) {
        img.setAttribute('src', `https://app.changebot.ai${src.startsWith('/') ? src : '/' + src}`);
      }
    });

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

  private getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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
    // Show loading state only when panel is open and data is loading
    if (this.isLoading) {
      return (
        <div class="loading-state">
          <div class="loading-spinner" />
          <p>Loading updates...</p>
        </div>
      );
    }

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
        {this.isOpen && <div class="backdrop" onClick={this.handleBackdropClick} aria-hidden="true"></div>}

        <div
          ref={el => (this.panelElement = el)}
          class={classes}
          role="dialog"
          aria-modal={isModal ? 'true' : 'false'}
          aria-label="Product Updates"
          aria-hidden={!this.isOpen ? 'true' : 'false'}
        >
          <div class={`panel-header${!this.widget?.subheading ? ' no-subheading' : ''}`}>
            <div class="panel-header-content">
              <h2 class="panel-title">{this.widget?.title || "What's New"}</h2>
              {this.widget?.subheading && <p class="panel-subheading">{this.widget.subheading}</p>}
            </div>
            <button class="close-button" type="button" onClick={this.closePanel} aria-label="Close updates">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="panel-content">{this.renderContent()}</div>

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
                <span class="powered-by-tooltip" aria-hidden="true">
                  <span class="tooltip-text">Create yours!</span>
                  <span class="tooltip-arrow"></span>
                </span>
              </a>
            </div>
          )}

          <div class="visually-hidden" aria-live="polite" aria-atomic="true">
            {this.isOpen && `${this.updates.length} ${this.updates.length === 1 ? 'update' : 'updates'} available`}
          </div>
        </div>
      </Host>
    );
  }
}

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
