import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createServices } from '../../src/services/index.js';
import { logger } from '../../src/core/logger.js';
import { absoluteLp } from '../../src/utils/ladder.js';
import { PERFORMANCE_BUCKETS } from '../../src/config/constants.js';
import { sampleMatchDto, TRACKED_PUUID } from '../fixtures/sampleMatch.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

/** Fake Riot facade: canned match + post-game ranked entry (GOLD II 65). */
function makeRiot() {
  return {
    getMatch: () => sampleMatchDto,
    getRankedEntries: () => ({
      RANKED_SOLO_5x5: {
        tier: 'GOLD',
        rank: 'II',
        leaguePoints: 65,
        wins: 51,
        losses: 40,
        hotStreak: false,
      },
    }),
  };
}

let repos;
let services;
let summoner;

beforeAll(async () => {
  await startMemoryMongo();
}, 120_000);

afterAll(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  repos = createRepositories(models);
  services = createServices({ riot: makeRiot(), repositories: repos, logger });

  summoner = await repos.summoners.upsertIdentity({
    puuid: TRACKED_PUUID,
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Faker', tagLine: 'KR1' },
  });
  // Prior ranked standing: Gold II 45 LP.
  await repos.summoners.updateRankedSnapshot(TRACKED_PUUID, 'RANKED_SOLO_5x5', {
    tier: 'GOLD',
    division: 'II',
    lp: 45,
    absoluteLp: absoluteLp({ tier: 'GOLD', division: 'II', lp: 45 }),
    wins: 50,
    losses: 40,
  });
});

afterEach(async () => {
  await clearCollections();
});

const process = () =>
  services.matchProcessing.processMatchForSummoner({
    matchId: 'NA1_100',
    platform: 'na1',
    summonerId: summoner._id,
    puuid: TRACKED_PUUID,
  });

describe('processMatchForSummoner', () => {
  it('persists the match, player-match, LP/rank, and streak', async () => {
    const result = await process();

    expect(result.performanceBucket).toBe(PERFORMANCE_BUCKETS.HARD_CARRY);
    expect(result.mvp).toBe(true); // top damage on the winning team
    expect(result.rankEvent.lpDelta).toBe(20); // 65 - 45

    expect(await repos.matches.countDocuments()).toBe(1);

    const pm = await repos.playerMatches.findOne({
      summonerId: summoner._id,
      matchId: 'NA1_100',
    });
    expect(pm.win).toBe(true);
    expect(pm.lpDelta).toBe(20);
    expect(pm.queueType).toBe('RANKED_SOLO_5x5');

    const lp = await repos.lpHistory.sumDelta(
      summoner._id,
      'RANKED_SOLO_5x5',
      new Date(0),
    );
    expect(lp.total).toBe(20);
    expect(lp.games).toBe(1);

    const s = await repos.summoners.findByPuuid(TRACKED_PUUID);
    expect(s.ranked.RANKED_SOLO_5x5.lp).toBe(65);
    expect(s.streak.current).toBe(1);
    expect(s.lastMatchId).toBe('NA1_100');
  });

  it('is idempotent — reprocessing does not double-count LP or streak', async () => {
    await process();
    const again = await process();

    expect(again.alreadyProcessed).toBe(true);

    const lp = await repos.lpHistory.sumDelta(
      summoner._id,
      'RANKED_SOLO_5x5',
      new Date(0),
    );
    expect(lp.total).toBe(20); // still just one game
    const s = await repos.summoners.findByPuuid(TRACKED_PUUID);
    expect(s.streak.current).toBe(1);
  });

  it('returns null when the summoner is not in the match', async () => {
    const result = await services.matchProcessing.processMatchForSummoner({
      matchId: 'NA1_100',
      platform: 'na1',
      summonerId: summoner._id,
      puuid: 'not-in-this-game',
    });
    expect(result).toBeNull();
  });
});
