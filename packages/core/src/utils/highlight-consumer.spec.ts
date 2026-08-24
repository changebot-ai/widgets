import { checkForHighlightedUpdate, markUpdateAsViewed } from './highlight-consumer';
import { StoreActions, Update } from '../types';

function update(overrides: Partial<Update>): Update {
  return {
    id: 1,
    title: 'Update',
    content: '<p>Body</p>',
    display_date: '2025-06-01',
    published_at: '2025-06-01T12:00:00Z',
    expires_on: null,
    highlight_target: null,
    hosted_url: null,
    tags: [],
    ...overrides,
  };
}

const silentLog = {
  debug: () => {},
  info: () => {},
  error: () => {},
};

describe('checkForHighlightedUpdate', () => {
  function callbacks() {
    return { onShow: jest.fn(), onHide: jest.fn() };
  }

  it('calls onShow with a new matching update', () => {
    const banner = update({ highlight_target: 'banner' });
    const cbs = callbacks();

    checkForHighlightedUpdate([banner], 'banner', null, undefined, cbs, 'Test');

    expect(cbs.onShow).toHaveBeenCalledWith(banner);
    expect(cbs.onHide).not.toHaveBeenCalled();
  });

  it('calls onHide when no update matches', () => {
    const plain = update({ highlight_target: null });
    const cbs = callbacks();

    checkForHighlightedUpdate([plain], 'banner', null, undefined, cbs, 'Test');

    expect(cbs.onShow).not.toHaveBeenCalled();
    expect(cbs.onHide).toHaveBeenCalled();
  });

  it('calls onHide when the only matching update is already viewed', () => {
    const banner = update({ highlight_target: 'banner' });
    const viewedAfter = new Date(banner.published_at).getTime() + 1;
    const cbs = callbacks();

    checkForHighlightedUpdate([banner], 'banner', viewedAfter, undefined, cbs, 'Test');

    expect(cbs.onShow).not.toHaveBeenCalled();
    expect(cbs.onHide).toHaveBeenCalled();
  });
});

describe('markUpdateAsViewed', () => {
  function actionsStub(): StoreActions {
    return {
      loadUpdates: jest.fn(),
      loadMockUpdates: jest.fn(),
      markViewed: jest.fn(),
      markAllViewed: jest.fn(),
      markBannerViewed: jest.fn(),
      markToastViewed: jest.fn(),
      openDisplay: jest.fn(),
      closeDisplay: jest.fn(),
      toggleDisplay: jest.fn(),
      calculateNewCount: jest.fn(),
    };
  }

  it('marks the update viewed at its published_at time', () => {
    const actions = actionsStub();
    const u = update({ published_at: '2025-06-01T12:00:00Z' });

    const result = markUpdateAsViewed(u, actions, silentLog, 'Test');

    expect(result).toBe(true);
    expect(actions.markViewed).toHaveBeenCalledWith(new Date('2025-06-01T12:00:00Z').getTime());
  });

  it('refuses an update with an invalid published_at', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const actions = actionsStub();
      const u = update({ published_at: 'not-a-date' });

      const result = markUpdateAsViewed(u, actions, silentLog, 'Test');

      expect(result).toBe(false);
      expect(actions.markViewed).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
