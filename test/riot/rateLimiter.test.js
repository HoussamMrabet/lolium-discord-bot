import {
  parseLimitHeader,
  parseRetryAfter,
} from '../../src/riot/rateLimiter.js';

describe('parseLimitHeader', () => {
  it('parses count:seconds windows into [limit, ms]', () => {
    expect(parseLimitHeader('20:1,100:120')).toEqual([
      [20, 1000],
      [100, 120000],
    ]);
  });

  it('returns null for empty/absent input', () => {
    expect(parseLimitHeader('')).toBeNull();
    expect(parseLimitHeader(undefined)).toBeNull();
  });

  it('ignores malformed segments', () => {
    expect(parseLimitHeader('garbage')).toBeNull();
    expect(parseLimitHeader('20:1,bad')).toEqual([[20, 1000]]);
  });
});

describe('parseRetryAfter', () => {
  it('converts seconds to milliseconds', () => {
    expect(parseRetryAfter('5')).toBe(5000);
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('uses the fallback when missing/invalid', () => {
    expect(parseRetryAfter(undefined, 2000)).toBe(2000);
    expect(parseRetryAfter('nope', 1500)).toBe(1500);
  });
});
