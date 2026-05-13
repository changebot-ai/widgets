import { Services } from '../types';
import {
  registerStore,
  unregisterStore,
  onStoreReady,
  hasStore,
  getStore,
  clearRegistry,
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
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    clearRegistry();
    jest.restoreAllMocks();
    jest.useRealTimers();
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
      const onConnect = jest.fn();
      onStoreReady('s', onConnect);
      expect(onConnect).not.toHaveBeenCalled();

      const services = makeServices();
      registerStore('s', services);

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith(services);
    });

    it('notifies all pending subscribers in the same scope', () => {
      const a = jest.fn();
      const b = jest.fn();
      const c = jest.fn();
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
      const onS = jest.fn();
      const onT = jest.fn();
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

      const onConnect = jest.fn();
      onStoreReady('s', onConnect);

      expect(onConnect).not.toHaveBeenCalled();

      await flushMicrotasks();
      expect(onConnect).toHaveBeenCalledWith(services);
    });
  });

  describe('onStoreReady — unsubscribe', () => {
    it('does not fire onConnect when unsubscribed before provider registers', () => {
      const onConnect = jest.fn();
      const unsubscribe = onStoreReady('s', onConnect);

      unsubscribe();
      registerStore('s', makeServices());

      expect(onConnect).not.toHaveBeenCalled();
    });

    it('does not fire onConnect when unsubscribed AFTER register but before microtask drains', async () => {
      const services = makeServices();
      registerStore('s', services);

      const onConnect = jest.fn();
      const unsubscribe = onStoreReady('s', onConnect);
      unsubscribe();

      await flushMicrotasks();
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('is idempotent', () => {
      const onConnect = jest.fn();
      const unsubscribe = onStoreReady('s', onConnect);
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('leaves other subscribers in the same scope intact', () => {
      const a = jest.fn();
      const b = jest.fn();
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
      jest.useFakeTimers();
      const warn = jest.spyOn(console, 'warn').mockImplementation();

      const onConnect = jest.fn();
      onStoreReady('s', onConnect, { timeout: 1000 });

      jest.advanceTimersByTime(1000);
      expect(onConnect).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();

      // A later registerStore must NOT notify the dropped subscriber.
      registerStore('s', makeServices());
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('does not time out when timeout is 0', () => {
      jest.useFakeTimers();
      const onConnect = jest.fn();
      onStoreReady('s', onConnect, { timeout: 0 });

      jest.advanceTimersByTime(10_000);

      registerStore('s', makeServices());
      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe clears the pending timeout', () => {
      jest.useFakeTimers();
      const warn = jest.spyOn(console, 'warn').mockImplementation();

      const onConnect = jest.fn();
      const unsubscribe = onStoreReady('s', onConnect, { timeout: 1000 });
      unsubscribe();

      jest.advanceTimersByTime(2000);
      expect(warn).not.toHaveBeenCalled();
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('invokes onTimeout when the timeout fires', () => {
      jest.useFakeTimers();
      jest.spyOn(console, 'warn').mockImplementation();

      const onConnect = jest.fn();
      const onTimeout = jest.fn();
      onStoreReady('s', onConnect, { timeout: 1000, onTimeout });

      jest.advanceTimersByTime(1000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('does not invoke onTimeout when the store registers before the timeout', () => {
      jest.useFakeTimers();
      const onConnect = jest.fn();
      const onTimeout = jest.fn();
      onStoreReady('s', onConnect, { timeout: 1000, onTimeout });

      registerStore('s', makeServices());
      jest.advanceTimersByTime(2000);

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('does not invoke onTimeout when the subscriber unsubscribes first', () => {
      jest.useFakeTimers();
      jest.spyOn(console, 'warn').mockImplementation();

      const onTimeout = jest.fn();
      const unsubscribe = onStoreReady('s', jest.fn(), { timeout: 1000, onTimeout });
      unsubscribe();

      jest.advanceTimersByTime(2000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('unregisterStore', () => {
    it('removes the store from the registry but keeps pending listeners', () => {
      registerStore('s', makeServices('first'));
      unregisterStore('s');
      expect(hasStore('s')).toBe(false);

      const onConnect = jest.fn();
      onStoreReady('s', onConnect);

      const replacement = makeServices('second');
      registerStore('s', replacement);

      expect(onConnect).toHaveBeenCalledWith(replacement);
    });

    it('does not notify subscribers that registered before the original unregister', () => {
      const onConnect = jest.fn();
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
      const error = jest.spyOn(console, 'error').mockImplementation();
      const thrower = jest.fn(() => {
        throw new Error('boom');
      });
      const survivor = jest.fn();

      onStoreReady('s', thrower);
      onStoreReady('s', survivor);

      registerStore('s', makeServices());

      expect(thrower).toHaveBeenCalledTimes(1);
      expect(survivor).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalled();
    });

    it('does not propagate out of registerStore', () => {
      jest.spyOn(console, 'error').mockImplementation();
      onStoreReady('s', () => {
        throw new Error('boom');
      });

      expect(() => registerStore('s', makeServices())).not.toThrow();
    });
  });

  describe('clearRegistry', () => {
    it('drops registered stores and pending listeners', async () => {
      const onConnect = jest.fn();
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
