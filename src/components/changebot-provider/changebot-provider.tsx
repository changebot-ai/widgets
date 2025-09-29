import { Component, h, Prop, Listen, Element } from '@stencil/core';
import { updatesStore, actions } from '../../store';

@Component({
  tag: 'changebot-provider',
  styleUrl: 'changebot-provider.css',
  shadow: false, // No shadow DOM - needs document event access
})
export class ChangebotProvider {
  @Element() el: HTMLElement;

  @Prop() url?: string;
  @Prop() slug?: string;
  @Prop() scope: string = 'default';
  @Prop() pollInterval?: number;

  pollTimer?: NodeJS.Timeout;  // Made public for testing

  // Initialize services immediately when component is created
  private services = {
    store: updatesStore,
    actions: actions,
    config: {
      url: this.url,
      slug: this.slug,
      scope: this.scope || 'default',
      pollInterval: this.pollInterval,
    },
  };

  componentWillLoad() {
    // Update services config with actual prop values
    this.services.config = {
      url: this.url,
      slug: this.slug,
      scope: this.scope,
      pollInterval: this.pollInterval,
    };

    // Load initial data if url or slug provided
    if (this.url || this.slug) {
      this.loadUpdates();

      // Setup polling if interval provided (in seconds, minimum 1 second)
      if (this.pollInterval) {
        const intervalMs = Math.max(this.pollInterval, 1) * 1000; // Convert to ms, minimum 1 second
        console.log(`🔌 Provider: Setting up polling every ${Math.max(this.pollInterval, 1)} seconds`);
        this.pollTimer = setInterval(() => {
          this.loadUpdates();
        }, intervalMs);
      }
    }
  }

  disconnectedCallback() {
    // Clear polling timer
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  @Listen('changebot:context-request', { target: 'document', capture: true })
  handleContextRequest(event: CustomEvent<{ callback: Function; scope?: string }>) {
    const requestScope = event.detail.scope || 'default';

    console.log(`🔌 Provider: Received context request for scope "${requestScope}", my scope is "${this.scope}"`);

    // Only respond if scope matches
    if (requestScope === this.scope) {
      // Stop propagation to prevent other providers from responding
      event.stopPropagation();

      console.log('🔌 Provider: Responding with services', this.services);

      // Provide the services via callback
      if (event.detail.callback) {
        event.detail.callback(this.services);
      }
    } else {
      console.log(`🔌 Provider: Ignoring request (scope mismatch)`);
    }
  }

  @Listen('changebot:action', { target: 'document', capture: true })
  handleAction(event: CustomEvent<{ type: string; payload?: any; scope?: string }>) {
    const actionScope = event.detail.scope || 'default';

    // Only handle if scope matches
    if (actionScope === this.scope) {
      const { type, payload } = event.detail;

      // Dispatch action to store
      if (type in actions) {
        try {
          if (payload !== undefined) {
            actions[type](payload);
          } else {
            actions[type]();
          }
        } catch (error) {
          console.error(`Error executing action ${type}:`, error);
        }
      } else {
        console.warn('Unknown action type:', type);
      }
    }
  }

  private async loadUpdates() {
    try {
      await actions.loadUpdates(this.slug, this.url);
    } catch (error) {
      console.error('🔌 Provider: Failed to load updates:', error);
      // Store error is already handled in the action
    }
  }

  render() {
    return (
      <slot></slot>
    );
  }
}