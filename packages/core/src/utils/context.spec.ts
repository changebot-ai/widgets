import { requestContext, dispatchAction } from './context';

describe('context utilities', () => {
  describe('requestContext', () => {
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
      requestContext(element, 'store', 'default');

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0] as CustomEvent;

      expect(event.type).toBe('changebot:context-request');
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.detail.key).toBe('store');
      expect(event.detail.scope).toBe('default');
      expect(typeof event.detail.provide).toBe('function');
    });

    it('should use default scope when not provided', () => {
      requestContext(element, 'config');

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.scope).toBe('default');
    });

    it('should return a promise that resolves with provided value', async () => {
      const mockStore = { state: { updates: [] } };

      const promise = requestContext(element, 'store');

      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      event.detail.provide(mockStore);

      const result = await promise;
      expect(result).toBe(mockStore);
    });

    it('should handle multiple concurrent requests', async () => {
      const mockStore = { state: { updates: [] } };
      const mockConfig = { endpoint: 'http://api.test' };

      const promise1 = requestContext(element, 'store');
      const promise2 = requestContext(element, 'config');

      const event1 = eventSpy.mock.calls[0][0] as CustomEvent;
      const event2 = eventSpy.mock.calls[1][0] as CustomEvent;

      event1.detail.provide(mockStore);
      event2.detail.provide(mockConfig);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(mockStore);
      expect(result2).toBe(mockConfig);
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
    it('should work with document-level listeners', async () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const mockStore = { state: { count: 0 } };
      let capturedEvent: CustomEvent | null = null;

      const listener = (event: Event) => {
        capturedEvent = event as CustomEvent;
        if (capturedEvent.detail.key === 'store') {
          capturedEvent.detail.provide(mockStore);
          event.stopPropagation();
        }
      };

      document.addEventListener('changebot:context-request', listener, true);

      const result = await requestContext(element, 'store');

      expect(result).toBe(mockStore);
      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.detail.key).toBe('store');

      document.removeEventListener('changebot:context-request', listener, true);
      document.body.removeChild(element);
    });
  });
});