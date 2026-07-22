import { getLocalParts, formatDuration, isValidTimezone } from '../../src/utils/time.js';

describe('getLocalParts', () => {
  it('extracts hour/day and dedupe keys in UTC', () => {
    const p = getLocalParts(new Date('2026-07-22T13:30:00Z'), 'UTC');
    expect(p.hour).toBe(13);
    expect(p.day).toBe(22);
    expect(p.dateKey).toBe('2026-07-22');
    expect(p.monthKey).toBe('2026-07');
    expect(p.weekday).toBe(3); // Wednesday
  });

  it('applies the timezone offset (crossing midnight)', () => {
    // 02:30 UTC is 22:30 the previous day in New York (EDT, -4).
    const p = getLocalParts(new Date('2026-07-22T02:30:00Z'), 'America/New_York');
    expect(p.hour).toBe(22);
    expect(p.day).toBe(21);
  });
});

describe('formatDuration / isValidTimezone', () => {
  it('formats seconds as M:SS', () => {
    expect(formatDuration(1800)).toBe('30:00');
    expect(formatDuration(65)).toBe('1:05');
  });
  it('validates timezones', () => {
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('Not/AZone')).toBe(false);
  });
});
