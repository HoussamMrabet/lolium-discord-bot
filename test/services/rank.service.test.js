import { RankService } from '../../src/services/rank.service.js';
import { absoluteLp } from '../../src/utils/ladder.js';

const rank = new RankService();

describe('RankService.toRankedEntry', () => {
  it('returns an unranked snapshot for null', () => {
    expect(rank.toRankedEntry(null)).toMatchObject({ tier: null, absoluteLp: 0 });
  });

  it('maps a league-v4 entry (rank -> division) and computes absoluteLp', () => {
    const entry = rank.toRankedEntry({
      tier: 'GOLD',
      rank: 'II',
      leaguePoints: 45,
      wins: 50,
      losses: 40,
      hotStreak: true,
    });
    expect(entry).toMatchObject({
      tier: 'GOLD',
      division: 'II',
      lp: 45,
      wins: 50,
      losses: 40,
      hotStreak: true,
    });
    expect(entry.absoluteLp).toBe(
      absoluteLp({ tier: 'GOLD', division: 'II', lp: 45 }),
    );
  });
});

describe('RankService.snapshotsFromEntries', () => {
  it('fills both queues, defaulting the missing one to unranked', () => {
    const snaps = rank.snapshotsFromEntries({
      RANKED_SOLO_5x5: { tier: 'PLATINUM', rank: 'I', leaguePoints: 12 },
    });
    expect(snaps.RANKED_SOLO_5x5.tier).toBe('PLATINUM');
    expect(snaps.RANKED_FLEX_SR.tier).toBeNull();
  });
});
