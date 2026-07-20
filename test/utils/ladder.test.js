import {
  absoluteLp,
  compareRank,
  diffRanks,
  formatRank,
  tierIndex,
  divisionIndex,
  isApex,
} from '../../src/utils/ladder.js';

describe('ladder / absoluteLp', () => {
  it('encodes unranked as 0', () => {
    expect(absoluteLp(null)).toBe(0);
    expect(absoluteLp({ tier: null })).toBe(0);
  });

  it('is monotonic across a division promotion (the whole point)', () => {
    // Gold IV 98 -> Gold III 12 is a GAIN, not a loss.
    const before = { tier: 'GOLD', division: 'IV', lp: 98 };
    const after = { tier: 'GOLD', division: 'III', lp: 12 };
    expect(absoluteLp(after)).toBeGreaterThan(absoluteLp(before));
  });

  it('places Master directly above Diamond I 99', () => {
    const diamond1 = { tier: 'DIAMOND', division: 'I', lp: 99 };
    const master0 = { tier: 'MASTER', division: 'I', lp: 0 };
    expect(absoluteLp(master0)).toBe(absoluteLp(diamond1) + 1);
  });

  it('treats apex tiers as one continuous LP pool', () => {
    expect(absoluteLp({ tier: 'MASTER', lp: 100 })).toBe(
      absoluteLp({ tier: 'GRANDMASTER', lp: 100 }),
    );
    expect(absoluteLp({ tier: 'CHALLENGER', lp: 500 })).toBeGreaterThan(
      absoluteLp({ tier: 'MASTER', lp: 300 }),
    );
  });

  it('exposes helpers', () => {
    expect(tierIndex('IRON')).toBe(0);
    expect(tierIndex('CHALLENGER')).toBe(9);
    expect(divisionIndex('IV')).toBe(0);
    expect(divisionIndex('I')).toBe(3);
    expect(isApex('MASTER')).toBe(true);
    expect(isApex('GOLD')).toBe(false);
  });
});

describe('ladder / compareRank', () => {
  it('orders lower ranks below higher ranks', () => {
    expect(
      compareRank(
        { tier: 'SILVER', division: 'I', lp: 0 },
        { tier: 'GOLD', division: 'IV', lp: 0 },
      ),
    ).toBe(-1);
    expect(
      compareRank(
        { tier: 'GOLD', division: 'IV', lp: 50 },
        { tier: 'GOLD', division: 'IV', lp: 50 },
      ),
    ).toBe(0);
  });
});

describe('ladder / diffRanks', () => {
  it('detects a tier promotion', () => {
    const d = diffRanks(
      { tier: 'GOLD', division: 'I', lp: 100 },
      { tier: 'PLATINUM', division: 'IV', lp: 15 },
    );
    expect(d.promotion).toBe(true);
    expect(d.demotion).toBe(false);
    expect(d.direction).toBe('up');
    expect(d.tierChanged).toBe(true);
  });

  it('detects a tier demotion', () => {
    const d = diffRanks(
      { tier: 'PLATINUM', division: 'IV', lp: 0 },
      { tier: 'GOLD', division: 'I', lp: 88 },
    );
    expect(d.demotion).toBe(true);
    expect(d.promotion).toBe(false);
    expect(d.direction).toBe('down');
  });

  it('detects a within-tier division change without flagging promotion', () => {
    const d = diffRanks(
      { tier: 'GOLD', division: 'IV', lp: 90 },
      { tier: 'GOLD', division: 'III', lp: 10 },
    );
    expect(d.tierChanged).toBe(false);
    expect(d.divisionChanged).toBe(true);
    expect(d.promotion).toBe(false);
  });

  it('flags placement (unranked -> ranked)', () => {
    const d = diffRanks(
      { tier: null },
      { tier: 'SILVER', division: 'IV', lp: 20 },
    );
    expect(d.placement).toBe(true);
  });
});

describe('ladder / formatRank', () => {
  it('formats non-apex, apex, and unranked', () => {
    expect(formatRank({ tier: 'GOLD', division: 'II', lp: 45 })).toBe(
      'Gold II (45 LP)',
    );
    expect(formatRank({ tier: 'CHALLENGER', division: 'I', lp: 1204 })).toBe(
      'Challenger (1,204 LP)',
    );
    expect(formatRank(null)).toBe('Unranked');
  });
});
