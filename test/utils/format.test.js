import { winRate, kda, round1 } from '../../src/utils/format.js';

describe('winRate', () => {
  it('computes a whole-number percentage', () => {
    expect(winRate(3, 1)).toBe(75);
    expect(winRate(50, 50)).toBe(50);
  });
  it('is 0 with no games', () => {
    expect(winRate(0, 0)).toBe(0);
  });
});

describe('kda', () => {
  it('computes (kills+assists)/deaths', () => {
    expect(kda(5, 2, 5)).toBe(5);
  });
  it('treats a deathless game as perfect', () => {
    expect(kda(3, 0, 2)).toBe(5);
  });
});

describe('round1', () => {
  it('rounds to one decimal', () => {
    expect(round1(7.049)).toBe(7);
    expect(round1(7.05)).toBe(7.1);
  });
});
