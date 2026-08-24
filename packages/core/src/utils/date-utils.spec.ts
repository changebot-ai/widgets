import { formatDisplayDate, validatePublishedAt } from './date-utils';

describe('formatDisplayDate', () => {
  it('formats an ISO timestamp as "Mon D, YYYY"', () => {
    expect(formatDisplayDate('2025-03-05T12:00:00Z')).toBe('Mar 5, 2025');
  });

  it('formats a YYYY-MM-DD date', () => {
    // Plain dates parse as UTC midnight; any test-runner timezone between
    // UTC-11 and UTC+14 still renders March 2025.
    expect(formatDisplayDate('2025-03-05')).toMatch(/^Mar [456], 2025$/);
  });
});

describe('validatePublishedAt', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns the timestamp in milliseconds for a valid date', () => {
    expect(validatePublishedAt('2025-06-01T12:00:00Z', 'Test')).toBe(new Date('2025-06-01T12:00:00Z').getTime());
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it.each([null, undefined, ''])('returns null and warns for %p', value => {
    expect(validatePublishedAt(value as any, 'Test', 'Some title')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null and warns for an unparseable date', () => {
    expect(validatePublishedAt('not-a-date', 'Test')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('treats the epoch itself as invalid', () => {
    expect(validatePublishedAt('1970-01-01T00:00:00Z', 'Test')).toBeNull();
  });
});
