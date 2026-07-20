import { absoluteLp } from '../utils/ladder.js';
import { RANKED_QUEUE_KEYS } from '../config/constants.js';

/**
 * Translates Riot league-v4 entries into our internal ranked-snapshot shape and
 * computes `absoluteLp`. Pure (no I/O) so it's trivially unit-testable and
 * reused by both linking (Phase 6) and match processing (Phase 7).
 */
export class RankService {
  /** @param {object|null} leagueEntry a league-v4 entry, or null when unranked */
  toRankedEntry(leagueEntry) {
    if (!leagueEntry || !leagueEntry.tier) {
      return {
        tier: null,
        division: null,
        lp: 0,
        absoluteLp: 0,
        wins: 0,
        losses: 0,
        hotStreak: false,
      };
    }
    const {
      tier,
      rank: division = null,
      leaguePoints: lp = 0,
      wins = 0,
      losses = 0,
      hotStreak = false,
    } = leagueEntry;
    return {
      tier,
      division,
      lp,
      absoluteLp: absoluteLp({ tier, division, lp }),
      wins,
      losses,
      hotStreak,
    };
  }

  /** Builds { RANKED_SOLO_5x5, RANKED_FLEX_SR } snapshots from entries-by-queue. */
  snapshotsFromEntries(byQueue = {}) {
    const out = {};
    for (const queue of RANKED_QUEUE_KEYS) {
      out[queue] = this.toRankedEntry(byQueue[queue]);
    }
    return out;
  }
}

export default RankService;
