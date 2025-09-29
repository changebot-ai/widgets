import { Component, h, Prop, Listen, Element } from '@stencil/core';
import { updatesStore, actions } from '../../store';

@Component({
  tag: 'changebot-provider',
  styleUrl: 'changebot-provider.css',
  shadow: false, // No shadow DOM - needs document event access
})
export class ChangebotProvider {
  @Element() el: HTMLElement;

  @Prop() endpoint?: string;
  @Prop() slug?: string;
  @Prop() scope: string = 'default';
  @Prop() pollInterval?: number;

  private services: {
    store: typeof updatesStore;
    actions: typeof actions;
    config: {
      endpoint?: string;
      slug?: string;
      scope: string;
      pollInterval?: number;
    };
  };

  pollTimer?: NodeJS.Timeout;  // Made public for testing

  componentWillLoad() {
    // Setup services object
    this.services = {
      store: updatesStore,
      actions: actions,
      config: {
        endpoint: this.endpoint,
        slug: this.slug,
        scope: this.scope,
        pollInterval: this.pollInterval,
      },
    };

    // Load initial data if endpoint or slug provided
    if (this.endpoint || this.slug) {
      this.loadUpdates();

      // Setup polling if interval provided
      if (this.pollInterval) {
        this.pollTimer = setInterval(() => {
          this.loadUpdates();
        }, this.pollInterval);
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

    // Only respond if scope matches
    if (requestScope === this.scope) {
      // Stop propagation to prevent other providers from responding
      event.stopPropagation();

      // Provide the services via callback
      if (event.detail.callback) {
        event.detail.callback(this.services);
      }
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
      await actions.loadUpdates(this.slug, this.endpoint);
    } catch (error) {
      console.error('Failed to load updates:', error);
      // Store error is already handled in the action
    }
  }

  render() {
    return (
      <slot></slot>
    );
  }
}