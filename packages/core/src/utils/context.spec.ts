import { requestServices, dispatchAction } from './context';

describe('context utilities', () => {
  describe('requestServices', () => {
    let element: HTMLElement;
    let eventSpy: jest.SpyInstance;

    beforeEach(() => {
      element = document.createElement('div');
      eventSpy = jest.spyOn(element, 'dispatchEvent');
    });

    afterEach(() => {
      eventSpy.mockRestore();
    });

    it('should dispatch a changebot:context-request event with correct details', () => {
      const callback = jest.fn();
      requestServices(element, 'default', callback);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0] as CustomEvent;

      expect(event.type).toBe('changebot:context-request');
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.detail.scope).toBe('default');
      expect(event.detail.callback).toBe(callback);
    });

    it('should use default scope when undefined is provided', () => {
      const callback = jest.fn();
      requestServices(element, undefined, callback);

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.scope).toBe('default');
    });

    it('should use custom scope when provided', () => {
      const callback = jest.fn();
      requestServices(element, 'custom-scope', callback);

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.scope).toBe('custom-scope');
    });

    it('should invoke callback when provider responds', () => {
      const callback = jest.fn();
      const mockServices = {
        store: { state: { updates: [] } },
        actions: {},
        config: {},
      };

      requestServices(element, 'default', callback);

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      event.detail.callback(mockServices);

      expect(callback).toHaveBeenCalledWith(mockServices);
    });
  });

  describe('dispatchAction', () => {
    let element: HTMLElement;
    let eventSpy: jest.SpyInstance;

    beforeEach(() => {
      element = document.createElement('div');
      eventSpy = jest.spyOn(element, 'dispatchEvent');
    });

    afterEach(() => {
      eventSpy.mockRestore();
    });

    it('should dispatch a changebot:action event with correct details', () => {
      const payload = { id: 1, viewed: true };
      dispatchAction(element, 'markViewed', payload, 'default');

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0] as CustomEvent;

      expect(event.type).toBe('changebot:action');
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.detail.type).toBe('markViewed');
      expect(event.detail.payload).toBe(payload);
      expect(event.detail.scope).toBe('default');
    });

    it('should use default scope when not provided', () => {
      dispatchAction(element, 'loadUpdates');

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.scope).toBe('default');
    });

    it('should handle actions without payload', () => {
      dispatchAction(element, 'refreshAll');

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.type).toBe('refreshAll');
      expect(event.detail.payload).toBeUndefined();
    });

    it('should handle different payload types', () => {
      dispatchAction(element, 'action1', 'string payload');
      dispatchAction(element, 'action2', 123);
      dispatchAction(element, 'action3', { complex: { nested: 'object' } });
      dispatchAction(element, 'action4', ['array', 'payload']);

      expect(eventSpy).toHaveBeenCalledTimes(4);

      const events = eventSpy.mock.calls.map(call => call[0] as CustomEvent);

      expect(events[0].detail.payload).toBe('string payload');
      expect(events[1].detail.payload).toBe(123);
      expect(events[2].detail.payload).toEqual({ complex: { nested: 'object' } });
      expect(events[3].detail.payload).toEqual(['array', 'payload']);
    });
  });

  describe('integration', () => {
    it('should work with document-level listeners', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const mockServices = {
        store: { state: { count: 0 } },
        actions: {},
        config: {},
      };
      let capturedEvent: CustomEvent | null = null;
      const callback = jest.fn();

      const listener = (event: Event) => {
        capturedEvent = event as CustomEvent;
        capturedEvent.detail.callback(mockServices);
        event.stopPropagation();
      };

      document.addEventListener('changebot:context-request', listener, true);

      requestServices(element, 'default', callback);

      expect(callback).toHaveBeenCalledWith(mockServices);
      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.detail.scope).toBe('default');

      document.removeEventListener('changebot:context-request', listener, true);
      document.body.removeChild(element);
    });
  });
});
