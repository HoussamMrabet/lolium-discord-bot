import {
  normalizePlatform,
  isSupportedPlatform,
  getMatchRoute,
  getAccountRoute,
  SUPPORTED_PLATFORMS,
} from '../../src/config/regions.js';

describe('regions / Riot routing', () => {
  it('normalizes casing and whitespace', () => {
    expect(normalizePlatform(' NA1 ')).toBe('na1');
    expect(normalizePlatform('EUW1')).toBe('euw1');
  });

  it('rejects unknown platforms', () => {
    expect(normalizePlatform('mars1')).toBeNull();
    expect(isSupportedPlatform('mars1')).toBe(false);
    expect(isSupportedPlatform('kr')).toBe(true);
  });

  it('maps platforms to the correct match (regional) route', () => {
    expect(getMatchRoute('na1')).toBe('americas');
    expect(getMatchRoute('euw1')).toBe('europe');
    expect(getMatchRoute('kr')).toBe('asia');
    expect(getMatchRoute('oc1')).toBe('sea');
  });

  it('routes account-v1 for SEA platforms to a supported cluster', () => {
    // account-v1 only serves americas/asia/europe — never sea.
    expect(getAccountRoute('oc1')).toBe('americas');
    expect(getAccountRoute('sg2')).toBe('asia');
    expect(['americas', 'asia', 'europe']).toContain(getAccountRoute('vn2'));
  });

  it('never returns "sea" as an account route for any platform', () => {
    for (const platform of SUPPORTED_PLATFORMS) {
      expect(getAccountRoute(platform)).not.toBe('sea');
    }
  });

  it('returns null routes for invalid input', () => {
    expect(getMatchRoute('nope')).toBeNull();
    expect(getAccountRoute(undefined)).toBeNull();
  });
});
