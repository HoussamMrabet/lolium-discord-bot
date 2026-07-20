import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createServices } from '../../src/services/index.js';
import { logger } from '../../src/core/logger.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

/** Fake Riot facade returning canned data (no HTTP). */
function makeRiot() {
  return {
    getAccountByRiotId: ({ gameName, tagLine }) => {
      if (gameName === 'Ghost') {
        const err = new Error('not found');
        err.code = 'RIOT_NOT_FOUND';
        throw err;
      }
      return { puuid: `PU-${gameName}-${tagLine}`, gameName, tagLine };
    },
    getSummonerByPuuid: ({ puuid }) => ({
      puuid,
      summonerLevel: 200,
      profileIconId: 10,
    }),
    getRankedEntries: () => ({
      RANKED_SOLO_5x5: {
        queueType: 'RANKED_SOLO_5x5',
        tier: 'GOLD',
        rank: 'II',
        leaguePoints: 45,
        wins: 50,
        losses: 40,
        hotStreak: false,
      },
    }),
  };
}

let repos;
let services;

beforeAll(async () => {
  await startMemoryMongo();
}, 120_000);

afterAll(async () => {
  await stopMemoryMongo();
});

beforeEach(() => {
  repos = createRepositories(models);
  services = createServices({ riot: makeRiot(), repositories: repos, logger });
});

afterEach(async () => {
  await clearCollections();
});

const link = (over = {}) =>
  services.linking.linkAccount({
    guildId: 'G1',
    discordUserId: 'U1',
    gameName: 'Faker',
    tagLine: 'KR1',
    platform: 'na1',
    ...over,
  });

describe('linkAccount', () => {
  it('creates a deduped summoner, a primary link, and a baseline rank', async () => {
    const res = await link();
    expect(res.alreadyLinked).toBe(false);
    expect(res.summoner.ranked.RANKED_SOLO_5x5.tier).toBe('GOLD');
    expect(res.summoner.ranked.RANKED_SOLO_5x5.absoluteLp).toBeGreaterThan(0);
    expect(res.link.primary).toBe(true);

    expect(await repos.summoners.countDocuments()).toBe(1);
    expect(await repos.players.countByGuild('G1')).toBe(1);

    const s = await repos.summoners.findByPuuid(res.summoner.puuid);
    expect(s.trackedGuildCount).toBe(1);
    expect(s.pollTier).toBe('active');

    const baseline = await repos.rankHistory.latest(res.summoner._id, 'RANKED_SOLO_5x5');
    expect(baseline.source).toBe('baseline');
  });

  it('dedupes the summoner across guilds and counts trackers', async () => {
    await link({ guildId: 'G1', discordUserId: 'U1' });
    await link({ guildId: 'G2', discordUserId: 'U2' });
    expect(await repos.summoners.countDocuments()).toBe(1);
    const s = await repos.summoners.findByPuuid('PU-Faker-KR1');
    expect(s.trackedGuildCount).toBe(2);
  });

  it('is idempotent for the same guild/user/account', async () => {
    await link();
    const again = await link();
    expect(again.alreadyLinked).toBe(true);
    expect(await repos.players.countByGuild('G1')).toBe(1);
  });

  it('rejects an unknown Riot account', async () => {
    await expect(link({ gameName: 'Ghost', tagLine: '000' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects an invalid region', async () => {
    await expect(link({ platform: 'mars' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('enforces the max accounts per user', async () => {
    for (let i = 0; i < 10; i += 1) {
      await link({ gameName: `Acc${i}`, tagLine: 'EUW', platform: 'euw1' });
    }
    await expect(
      link({ gameName: 'Acc10', tagLine: 'EUW', platform: 'euw1' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await repos.players.countByGuild('G1')).toBe(10);
  });
});
