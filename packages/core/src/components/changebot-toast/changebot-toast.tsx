import { Component, Element, Prop, State, Watch, Method, h, Host } from '@stencil/core';
import { Services, Update } from '../../types';
import { connectConsumer } from '../../store/registry';
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
  @Prop() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' = 'bottom-right';
  @Prop() confetti: boolean = false;
  @Prop() confettiParticleCount: number = 351;
  @Prop() confettiSpread: number = 130;
  @Prop() confettiStartVelocity: number = 46;
  @Prop() confettiScalar: number = 0.8;

  @State() isVisible: boolean = false;
  @State() currentUpdate?: Update;
  @State() activeTheme?: Theme;

  @Watch('isVisible')
  onVisibilityChange() {
    if (this.isVisible) {
      this.updateContainerBounds();
    } else {
      this.cleanupConfetti();
    }
  }

  private services?: Services;
  private subscriptionCleanups: (() => void)[] = [];
  private themeManager?: ThemeManager;
  private resizeObserver?: ResizeObserver;
  private unsubscribeFromRegistry?: () => void;
  private confettiFn?: typeof import('canvas-confetti');
  private confettiCanvas?: HTMLCanvasElement;
  private wasVisibleAtRender: boolean = false;

  @Watch('theme')
  @Watch('light')
  @Watch('dark')
  onThemePropsChange() {
    this.themeManager?.cleanup();
    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });
  }

  @Watch('confetti')
  onConfettiGatePropChange() {
    this.maybePreloadConfetti();
  }

  componentWillLoad() {
    this.themeManager = createThemeManager(this, theme => {
      this.activeTheme = theme;
    });

    // Set data-scope attribute for debugging
    if (this.scope) {
      this.el.setAttribute('data-scope', this.scope);
    }

    this.maybePreloadConfetti();

    // Connect to provider asynchronously (don't block rendering)
    this.connectToProvider();
  }

  private connectToProvider() {
    this.unsubscribeFromRegistry?.();
    this.subscriptionCleanups.forEach(cleanup => cleanup());
    this.subscriptionCleanups = [];
    this.unsubscribeFromRegistry = connectConsumer(this.el, this.scope, services => {
      this.services = services;
      log.debug('Connected to provider via registry', { scope: this.scope || 'default' });
      this.subscribeToStore();
    });
  }

  componentDidLoad() {
    this.updateContainerBounds();
    this.setupContainerTracking();
  }

  componentDidRender() {
    if (this.isVisible && !this.wasVisibleAtRender) {
      this.maybeFireConfetti();
    }
    this.wasVisibleAtRender = this.isVisible;
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
    this.cleanupConfetti();
  }

  private maybePreloadConfetti() {
    if (!this.confetti || this.confettiFn) return;
    import('canvas-confetti')
      .then(mod => {
        // canvas-confetti uses `export =`; bundlers may wrap as { default }.
        this.confettiFn = (mod as any).default ?? mod;
        // If the toast became visible before the import resolved, the
        // componentDidRender burst was a no-op — fire now.
        if (this.isVisible) this.maybeFireConfetti();
      })
      .catch(err => log.warn('Failed to load canvas-confetti', err));
  }

  private maybeFireConfetti() {
    if (!this.confetti) return;
    if (!this.confettiFn) return;

    const mm = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (mm?.matches) return;

    this.cleanupConfetti();
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(canvas);
    this.confettiCanvas = canvas;

    const { origin, angle } = this.getConfettiBurst();
    // Bottom positions fire upward; add a boost so gravity doesn't sap the burst.
    const firesUpward = this.position === 'bottom-left' || this.position === 'bottom-right';
    const startVelocity = this.confettiStartVelocity + (firesUpward ? 20 : 0);

    const fire = this.confettiFn.create(canvas, { resize: true, useWorker: false });
    fire({
      particleCount: this.confettiParticleCount,
      spread: this.confettiSpread,
      startVelocity,
      scalar: this.confettiScalar,
      origin,
      angle,
    })?.then(() => this.cleanupConfetti());
  }

  private getConfettiBurst(): { origin: { x: number; y: number }; angle: number } {
    const angleByPosition = {
      'top-left': 315,
      'top-right': 225,
      'bottom-left': 45,
      'bottom-right': 135,
      'center': 90,
    } as const;
    const angle = angleByPosition[this.position] ?? 90;

    const toastEl = this.el.shadowRoot?.querySelector('.toast') as HTMLElement | null;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const fallback = { origin: { x: 0.5, y: 0.5 }, angle };
    if (!toastEl) return fallback;

    const rect = toastEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return fallback;

    const anchorX = this.position === 'top-left' || this.position === 'bottom-left'
      ? rect.left
      : this.position === 'top-right' || this.position === 'bottom-right'
        ? rect.right
        : rect.left + rect.width / 2;
    const anchorY = this.position === 'top-left' || this.position === 'top-right'
      ? rect.top
      : this.position === 'bottom-left' || this.position === 'bottom-right'
        ? rect.bottom
        : rect.top + rect.height / 2;

    return {
      origin: { x: anchorX / vw, y: anchorY / vh },
      angle,
    };
  }

  private cleanupConfetti() {
    this.confettiCanvas?.remove();
    this.confettiCanvas = undefined;
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

  // The compact toast doesn't show images, but removing them outright collapses
  // the whitespace they occupied and smooshes adjacent paragraphs together. Swap
  // each image (and figure) for a <br> so its line break is preserved.
  private formatContent(content: string): string {
    return content
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, '<br>')
      .replace(/<img\b[^>]*>/gi, '<br>');
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
      case 'center':
        return 'toast--center';
      default:
        return 'toast--bottom-right';
    }
  }

  private updateContainerBounds = () => {
    const container = this.el.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Intersect the container rect with the viewport, so the toast always
    // anchors inside both. If there's no overlap on an axis (e.g. wrapper sits
    // below the fold), fall back to viewport corners on that axis.
    const visibleLeft = Math.max(0, rect.left);
    const visibleRight = Math.min(vw, rect.right);
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(vh, rect.bottom);

    const hasHorzOverlap = visibleRight > visibleLeft;
    const hasVertOverlap = visibleBottom > visibleTop;

    const leftOffset = hasHorzOverlap ? visibleLeft : 0;
    const rightOffset = hasHorzOverlap ? vw - visibleRight : 0;
    const topOffset = hasVertOverlap ? visibleTop : 0;
    const bottomOffset = hasVertOverlap ? vh - visibleBottom : 0;

    const host = this.el as HTMLElement;
    host.style.setProperty('--toast-container-left', `${leftOffset}px`);
    host.style.setProperty('--toast-container-right-offset', `${rightOffset}px`);
    host.style.setProperty('--toast-container-top', `${topOffset}px`);
    host.style.setProperty('--toast-container-bottom-offset', `${bottomOffset}px`);
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
            <div class="toast-content" innerHTML={this.formatContent(this.currentUpdate.content)}></div>
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
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    confetti: boolean;
    confettiParticleCount: number;
    confettiSpread: number;
    confettiStartVelocity: number;
    confettiScalar: number;
    preview?: boolean;
  }
}
