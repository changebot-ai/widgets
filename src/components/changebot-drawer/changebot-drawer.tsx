import { Component, Element, Prop, State, Method, h, Host } from '@stencil/core';
import { dispatchAction } from '../../utils/context';
import { Update } from '../../types';

@Component({
  tag: 'changebot-drawer',
  styleUrl: 'changebot-drawer.css',
  shadow: true,
})
export class ChangebotDrawer {
  @Element() el: HTMLChangebotDrawerElement;

  @Prop() scope?: string;
  @Prop() theme?: 'light' | 'dark';
  @Prop() displayMode: 'drawer-left' | 'drawer-right' | 'modal' = 'drawer-right';

  @State() isOpen: boolean = false;
  @State() updates: Update[] = [];

  private services: any;
  private unsubscribeIsOpen?: () => void;
  private unsubscribeUpdates?: () => void;
  private drawerElement?: HTMLDivElement;
  private firstFocusableElement?: HTMLElement;
  private lastFocusableElement?: HTMLElement;

  async componentWillLoad() {
    // Set data-scope attribute if scope is provided
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    // Request context from provider
    const detail = {
      callback: (services: any) => {
        console.log('📂 Drawer: Received services from provider', {
          hasStore: !!services?.store,
          hasActions: !!services?.actions,
          storeState: services?.store?.state
        });
        this.services = services;
        this.subscribeToStore();
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
  }

  public subscribeToStore() {
    if (!this.services?.store) return;

    const store = this.services.store;

    console.log('📂 Drawer: Subscribing to store, current state:', store.state);

    // Subscribe to isOpen changes
    this.unsubscribeIsOpen = store.onChange('isOpen', () => {
      console.log('📂 Drawer: isOpen changed to', store.state.isOpen);
      this.isOpen = store.state.isOpen;

      if (this.isOpen) {
        // Focus first element when opening
        setTimeout(() => this.focusFirstElement(), 100);
      }
    });

    // Subscribe to updates changes
    this.unsubscribeUpdates = store.onChange('updates', () => {
      console.log('📂 Drawer: Updates changed, count:', store.state.updates?.length);
      this.updates = store.state.updates || [];
    });

    // Initialize state
    this.isOpen = store.state.isOpen || false;
    this.updates = store.state.updates || [];
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
      // If connected to provider, dispatch action
      if (this.services) {
        dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
      } else {
        // If standalone (no provider), close directly
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
    // If connected to provider, dispatch action
    if (this.services) {
      dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
    } else {
      // If standalone (no provider), close directly
      this.isOpen = false;
    }
  };

  private handleBackdropClick = (event: MouseEvent) => {
    // Only close on backdrop click in modal mode
    if (this.displayMode === 'modal' && (event.target as HTMLElement).classList.contains('backdrop')) {
      // If connected to provider, dispatch action
      if (this.services) {
        dispatchAction(this.el, 'closeDisplay', undefined, this.scope);
      } else {
        // If standalone (no provider), close directly
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
          <div class="update-description" innerHTML={update.description}></div>
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
          <div class="update-details" innerHTML={update.details}></div>
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
      [`drawer--${this.theme}`]: !!this.theme,
      [this.getDisplayModeClass()]: true
    };

    const isModal = this.displayMode === 'modal';

    return (
      <Host>
        {/* Backdrop for modal mode */}
        {isModal && this.isOpen && (
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
    theme?: 'light' | 'dark';
    displayMode: 'drawer-left' | 'drawer-right' | 'modal';
    isOpen: boolean;
    updates: Update[];
  }
}