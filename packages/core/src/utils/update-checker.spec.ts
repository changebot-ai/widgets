import { findHighlightedUpdate } from './update-checker';
import { Update } from '../types';

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

const PUBLISHED = new Date('2025-06-01T12:00:00Z').getTime();

describe('findHighlightedUpdate', () => {
  it('finds nothing in an empty list', () => {
    const result = findHighlightedUpdate([], 'banner', null, undefined, 'Test');
    expect(result).toEqual({ newUpdate: undefined, shouldShow: false });
  });

  it('shows a matching update when lastViewed is null', () => {
    const banner = update({ highlight_target: 'banner' });
    const result = findHighlightedUpdate([banner], 'banner', null, undefined, 'Test');

    expect(result.shouldShow).toBe(true);
    expect(result.newUpdate).toBe(banner);
  });

  it('shows a matching update when lastViewed is 0', () => {
    const banner = update({ highlight_target: 'banner' });
    const result = findHighlightedUpdate([banner], 'banner', 0, undefined, 'Test');

    expect(result.shouldShow).toBe(true);
  });

  it('shows an update published after lastViewed', () => {
    const banner = update({ highlight_target: 'banner' });
    const result = findHighlightedUpdate([banner], 'banner', PUBLISHED - 1, undefined, 'Test');

    expect(result.shouldShow).toBe(true);
  });

  it('hides an update published at or before lastViewed', () => {
    const banner = update({ highlight_target: 'banner' });

    expect(findHighlightedUpdate([banner], 'banner', PUBLISHED, undefined, 'Test').shouldShow).toBe(false);
    expect(findHighlightedUpdate([banner], 'banner', PUBLISHED + 1, undefined, 'Test').shouldShow).toBe(false);
  });

  it('ignores updates targeting a different surface', () => {
    const toast = update({ highlight_target: 'toast' });
    const result = findHighlightedUpdate([toast], 'banner', null, undefined, 'Test');

    expect(result.shouldShow).toBe(false);
  });

  it('ignores updates with no highlight target', () => {
    const plain = update({ highlight_target: null });
    const result = findHighlightedUpdate([plain], 'banner', null, undefined, 'Test');

    expect(result.shouldShow).toBe(false);
  });

  it('does not re-show the update that is already displayed', () => {
    const banner = update({ id: 42, highlight_target: 'banner' });
    const result = findHighlightedUpdate([banner], 'banner', null, 42, 'Test');

    expect(result).toEqual({ newUpdate: undefined, shouldShow: false });
  });

  it('shows a different update than the one displayed', () => {
    const banner = update({ id: 43, highlight_target: 'banner' });
    const result = findHighlightedUpdate([banner], 'banner', null, 42, 'Test');

    expect(result.shouldShow).toBe(true);
    expect(result.newUpdate.id).toBe(43);
  });

  it('skips updates with a missing or invalid published_at', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const noDate = update({ id: 1, highlight_target: 'banner', published_at: undefined as any });
      const badDate = update({ id: 2, highlight_target: 'banner', published_at: 'not-a-date' });
      const valid = update({ id: 3, highlight_target: 'banner' });

      const result = findHighlightedUpdate([noDate, badDate, valid], 'banner', null, undefined, 'Test');

      expect(result.shouldShow).toBe(true);
      expect(result.newUpdate.id).toBe(3);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('picks the first matching update in list order', () => {
    const first = update({ id: 1, highlight_target: 'toast' });
    const second = update({ id: 2, highlight_target: 'toast' });

    const result = findHighlightedUpdate([first, second], 'toast', null, undefined, 'Test');

    expect(result.newUpdate.id).toBe(1);
  });
});
