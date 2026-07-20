import { classifyPerformance } from '../../src/services/performance.service.js';
import { PERFORMANCE_BUCKETS } from '../../src/config/constants.js';

describe('classifyPerformance', () => {
  it('a pentakill is always a hard carry', () => {
    expect(classifyPerformance({ pentaKills: 1, win: true })).toBe(
      PERFORMANCE_BUCKETS.HARD_CARRY,
    );
  });

  it('lots of deaths with a poor KDA is an int', () => {
    expect(
      classifyPerformance({ deaths: 12, kda: 0.5, win: false }),
    ).toBe(PERFORMANCE_BUCKETS.INT);
  });

  it('a dominant win is a hard carry', () => {
    expect(
      classifyPerformance({ win: true, kda: 6, damageShare: 0.35 }),
    ).toBe(PERFORMANCE_BUCKETS.HARD_CARRY);
  });

  it('a strong win with lower damage share is a carry', () => {
    expect(classifyPerformance({ win: true, kda: 5, damageShare: 0.2 })).toBe(
      PERFORMANCE_BUCKETS.CARRY,
    );
  });

  it('a quiet loss is rough', () => {
    expect(classifyPerformance({ win: false, kda: 1 })).toBe(
      PERFORMANCE_BUCKETS.ROUGH,
    );
  });
});
