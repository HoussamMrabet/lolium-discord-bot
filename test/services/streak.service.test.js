import { applyResult, streakMilestone } from '../../src/services/streak.service.js';

describe('applyResult', () => {
  it('extends a win streak and tracks the longest', () => {
    let s = { current: 0, longestWin: 0, longestLoss: 0 };
    s = applyResult(s, true);
    s = applyResult(s, true);
    expect(s.current).toBe(2);
    expect(s.longestWin).toBe(2);
  });

  it('flips a win streak to -1 on a loss (keeps longest win)', () => {
    const s = applyResult({ current: 3, longestWin: 3, longestLoss: 0 }, false);
    expect(s.current).toBe(-1);
    expect(s.longestWin).toBe(3);
  });

  it('tracks the longest loss streak', () => {
    let s = { current: 0 };
    s = applyResult(s, false);
    s = applyResult(s, false);
    expect(s.current).toBe(-2);
    expect(s.longestLoss).toBe(2);
  });
});

describe('streakMilestone', () => {
  it('fires exactly on thresholds', () => {
    expect(streakMilestone(5)).toEqual({ magnitude: 5, type: 'win' });
    expect(streakMilestone(-3)).toEqual({ magnitude: 3, type: 'loss' });
  });
  it('is null off a threshold', () => {
    expect(streakMilestone(4)).toBeNull();
    expect(streakMilestone(0)).toBeNull();
  });
});
