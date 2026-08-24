import { Services } from '../types';
import {
  registerStore,
  unregisterStore,
  onStoreReady,
  hasStore,
  getStore,
  clearRegistry,
  connectConsumer,
} from './registry';

function makeServices(label: string = 'svc'): Services {
  return { __label: label } as unknown as Services;
}

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

describe('store/registry', () => {
  beforeEach(() => {
    clearRegistry();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    clearRegistry();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('registerStore + hasStore + getStore', () => {
    it('makes the store discoverable synchronously after register', () => {
      const services = makeServices();
      expect(hasStore('a')).toBe(false);
      expect(getStore('a')).toBeUndefined();

      registerStore('a', services);

      expect(hasStore('a')).toBe(true);
      expect(getStore('a')).toBe(services);
    });

    it('isolates scopes', () => {
      const svcA = makeServices('a');
      const svcB = makeServices('b');
      registerStore('a', svcA);
      registerStore('b', svcB);

      expect(getStore('a')).toBe(svcA);
      expect(getStore('b')).toBe(svcB);
      expect(getStore('c')).toBeUndefined();
    });
  });

  describe('onStoreReady — late-arriving provider', () => {
    it('fires onConnect when registerStore runs after subscribe', () => {
      const onConnect = vi.fn();
      onStoreReady('s', onConnect);
      expect(onConnect).not.toHaveBeenCalled();

      const services = makeServices();
      registerStore('s', services);

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith(services);
    });

    it('notifies all pending subscribers in the same scope', () => {
      const a = vi.fn();
      const b = vi.fn();
      const c = vi.fn();
      onStoreReady('s', a);
      onStoreReady('s', b);
      onStoreReady('s', c);

      const services = makeServices();
      registerStore('s', services);

      expect(a).toHaveBeenCalledWith(services);
      expect(b).toHaveBeenCalledWith(services);
      expect(c).toHaveBeenCalledWith(services);
    });

    it('only notifies subscribers for the registered scope', () => {
      const onS = vi.fn();
      const onT = vi.fn();
      onStoreReady('s', onS);
      onStoreReady('t', onT);

      registerStore('s', makeServices('s'));

      expect(onS).toHaveBeenCalledTimes(1);
      expect(onT).not.toHaveBeenCalled();
    });
  });

  describe('onStoreReady — already-registered provider', () => {
    it('defers onConnect to a microtask (not synchronous)', async () => {
      const services = makeServices();
      registerStore('s', services);

      const onConnect = vi.fn();
      onStoreReady('s', onConnect);

      expect(onConnect).not.toHaveBeenCalled();

      await flushMicrotasks();
      expect(onConnect).toHaveBeenCalledWith(services);
    });
  });

  describe('onStoreReady — unsubscribe', () => {
    it('does not fire onConnect when unsubscribed before provider registers', () => {
      const onConnect = vi.fn();
      const unsubscribe = onStoreReady('s', onConnect);

      unsubscribe();
      registerStore('s', makeServices());

      expect(onConnect).not.toHaveBeenCalled();
    });

    it('does not fire onConnect when unsubscribed AFTER register but before microtask drains', async () => {
      const services = makeServices();
      registerStore('s', services);

      const onConnect = vi.fn();
      const unsubscribe = onStoreReady('s', onConnect);
      unsubscribe();

      await flushMicrotasks();
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('is idempotent', () => {
      const onConnect = vi.fn();
      const unsubscribe = onStoreReady('s', onConnect);
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('leaves other subscribers in the same scope intact', () => {
      const a = vi.fn();
      const b = vi.fn();
      const unsubA = onStoreReady('s', a);
      onStoreReady('s', b);

      unsubA();
      registerStore('s', makeServices());

      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  describe('onStoreReady — timeout', () => {
    it('drops the subscription and logs a warn after the timeout', () => {
      vi.useFakeTimers();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const onConnect = vi.fn();
      onStoreReady('s', onConnect, { timeout: 1000 });

      vi.advanceTimersByTime(1000);
      expect(onConnect).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();

      // A later registerStore must NOT notify the dropped subscriber.
      registerStore('s', makeServices());
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('does not time out when timeout is 0', () => {
      vi.useFakeTimers();
      const onConnect = vi.fn();
      onStoreReady('s', onConnect, { timeout: 0 });

      vi.advanceTimersByTime(10_000);

      registerStore('s', makeServices());
      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe clears the pending timeout', () => {
      vi.useFakeTimers();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const onConnect = vi.fn();
      const unsubscribe = onStoreReady('s', onConnect, { timeout: 1000 });
      unsubscribe();

      vi.advanceTimersByTime(2000);
      expect(warn).not.toHaveBeenCalled();
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('invokes onTimeout when the timeout fires', () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const onConnect = vi.fn();
      const onTimeout = vi.fn();
      onStoreReady('s', onConnect, { timeout: 1000, onTimeout });

      vi.advanceTimersByTime(1000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('does not invoke onTimeout when the store registers before the timeout', () => {
      vi.useFakeTimers();
      const onConnect = vi.fn();
      const onTimeout = vi.fn();
      onStoreReady('s', onConnect, { timeout: 1000, onTimeout });

      registerStore('s', makeServices());
      vi.advanceTimersByTime(2000);

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('does not invoke onTimeout when the subscriber unsubscribes first', () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const onTimeout = vi.fn();
      const unsubscribe = onStoreReady('s', vi.fn(), { timeout: 1000, onTimeout });
      unsubscribe();

      vi.advanceTimersByTime(2000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('unregisterStore', () => {
    it('removes the store from the registry but keeps pending listeners', () => {
      registerStore('s', makeServices('first'));
      unregisterStore('s');
      expect(hasStore('s')).toBe(false);

      const onConnect = vi.fn();
      onStoreReady('s', onConnect);

      const replacement = makeServices('second');
      registerStore('s', replacement);

      expect(onConnect).toHaveBeenCalledWith(replacement);
    });

    it('does not notify subscribers that registered before the original unregister', () => {
      const onConnect = vi.fn();
      onStoreReady('s', onConnect);

      const first = makeServices('first');
      registerStore('s', first);
      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith(first);

      unregisterStore('s');
      registerStore('s', makeServices('second'));

      // The subscriber was already notified by the first registerStore; the
      // second registerStore must not re-fire it.
      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscriber exceptions', () => {
    it('does not orphan sibling subscribers when one throws', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const thrower = vi.fn(() => {
        throw new Error('boom');
      });
      const survivor = vi.fn();

      onStoreReady('s', thrower);
      onStoreReady('s', survivor);

      registerStore('s', makeServices());

      expect(thrower).toHaveBeenCalledTimes(1);
      expect(survivor).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalled();
    });

    it('does not propagate out of registerStore', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      onStoreReady('s', () => {
        throw new Error('boom');
      });

      expect(() => registerStore('s', makeServices())).not.toThrow();
    });
  });

  describe('connectConsumer', () => {
    it('sets data-changebot-state to waiting-for-provider initially', () => {
      const el = document.createElement('div');
      connectConsumer(el, 'default', vi.fn());
      expect(el.getAttribute('data-changebot-state')).toBe('waiting-for-provider');
    });

    it('sets data-changebot-state to connected when store registers', () => {
      const el = document.createElement('div');
      connectConsumer(el, 'default', vi.fn());
      registerStore('default', makeServices());
      expect(el.getAttribute('data-changebot-state')).toBe('connected');
    });

    it('sets data-changebot-state to provider-missing on timeout', () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const el = document.createElement('div');
      connectConsumer(el, 'default', vi.fn());
      vi.advanceTimersByTime(5000);
      expect(el.getAttribute('data-changebot-state')).toBe('provider-missing');
    });

    it('includes element tag name in error log when onConnected throws', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const el = document.createElement('changebot-badge');
      connectConsumer(el, 'default', () => {
        throw new Error('boom');
      });
      registerStore('default', makeServices());
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Consumer callback threw'),
        expect.objectContaining({ element: 'CHANGEBOT-BADGE' })
      );
    });
  });

  describe('clearRegistry', () => {
    it('drops registered stores and pending listeners', async () => {
      const onConnect = vi.fn();
      registerStore('a', makeServices('a'));
      onStoreReady('b', onConnect);

      clearRegistry();

      expect(hasStore('a')).toBe(false);
      // A new registerStore for 'b' must not notify the listener that was
      // pending before clearRegistry.
      registerStore('b', makeServices('b'));
      await flushMicrotasks();
      expect(onConnect).not.toHaveBeenCalled();
    });
  });
});
