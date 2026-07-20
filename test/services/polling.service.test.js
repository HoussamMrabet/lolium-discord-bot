import {
  computePollTier,
  computeNextCheckAt,
  staggerFor,
} from '../../src/services/polling.service.js';
import { POLL_TIERS, POLL_CADENCE_MS } from '../../src/config/constants.js';

const HOUR = 60 * 60 * 1000;
const now = 1_700_000_000_000;

describe('computePollTier', () => {
  it('is active when a new match was found', () => {
    expect(computePollTier({ hadNewMatch: true }, now)).toBe(POLL_TIERS.ACTIVE);
  });
  it('is active when last game was within the hour', () => {
    expect(
      computePollTier({ lastMatchStartAt: new Date(now - 30 * 60 * 1000) }, now),
    ).toBe(POLL_TIERS.ACTIVE);
  });
  it('is idle within a day', () => {
    expect(
      computePollTier({ lastMatchStartAt: new Date(now - 5 * HOUR) }, now),
    ).toBe(POLL_TIERS.IDLE);
  });
  it('is dormant when old or never played', () => {
    expect(
      computePollTier({ lastMatchStartAt: new Date(now - 3 * 24 * HOUR) }, now),
    ).toBe(POLL_TIERS.DORMANT);
    expect(computePollTier({ lastMatchStartAt: null }, now)).toBe(
      POLL_TIERS.DORMANT,
    );
  });
});

describe('computeNextCheckAt', () => {
  it('adds the tier cadence (plus stagger)', () => {
    const next = computeNextCheckAt(POLL_TIERS.ACTIVE, now, 0);
    expect(next.getTime()).toBe(now + POLL_CADENCE_MS[POLL_TIERS.ACTIVE]);
  });
});

describe('staggerFor', () => {
  it('is deterministic and within the window', () => {
    const w = 30_000;
    const a = staggerFor('PU-abc', w);
    const b = staggerFor('PU-abc', w);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(w);
  });
});
