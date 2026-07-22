import { jest } from '@jest/globals';
import { createLookupService } from '../../src/services/lookup.service.js';
import { RankService } from '../../src/services/rank.service.js';
import { sampleMatchDto, TRACKED_PUUID } from '../fixtures/sampleMatch.js';

function memRedis() {
  const m = new Map();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
  };
}

function makeRiot() {
  return {
    getAccountByRiotId: jest.fn(() => ({
      puuid: TRACKED_PUUID,
      gameName: 'Faker',
      tagLine: 'KR1',
    })),
    getSummonerByPuuid: jest.fn(() => ({
      puuid: TRACKED_PUUID,
      summonerLevel: 500,
      profileIconId: 7,
    })),
    getRankedEntries: jest.fn(() => ({
      RANKED_SOLO_5x5: { tier: 'CHALLENGER', rank: 'I', leaguePoints: 1200, wins: 300, losses: 200 },
    })),
    getMatchIds: jest.fn(() => ['NA1_100']),
    getMatch: jest.fn(() => sampleMatchDto),
  };
}

const rank = new RankService();

describe('lookup.getProfile', () => {
  it('assembles a public profile with ranked + recent matches', async () => {
    const riot = makeRiot();
    const service = createLookupService({ riot, rank, redis: memRedis() });

    const profile = await service.getProfile({ gameName: 'Faker', tagLine: 'KR1', platform: 'na1' });

    expect(profile.summonerLevel).toBe(500);
    expect(profile.ranked.RANKED_SOLO_5x5.tier).toBe('CHALLENGER');
    expect(profile.recentMatches).toHaveLength(1);
    expect(profile.recentMatches[0]).toMatchObject({
      championName: 'Yasuo',
      win: true,
      kda: 7.5,
    });
  });

  it('serves a repeat lookup from cache (no extra Riot calls)', async () => {
    const riot = makeRiot();
    const service = createLookupService({ riot, rank, redis: memRedis() });

    await service.getProfile({ gameName: 'Faker', tagLine: 'KR1', platform: 'na1' });
    await service.getProfile({ gameName: 'Faker', tagLine: 'KR1', platform: 'na1' });

    expect(riot.getAccountByRiotId).toHaveBeenCalledTimes(1);
    expect(riot.getMatch).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown account', async () => {
    const riot = makeRiot();
    riot.getAccountByRiotId = jest.fn(() => {
      const err = new Error('nf');
      err.code = 'RIOT_NOT_FOUND';
      throw err;
    });
    const service = createLookupService({ riot, rank, redis: memRedis() });
    await expect(
      service.getProfile({ gameName: 'Ghost', tagLine: '000', platform: 'na1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects an invalid region', async () => {
    const service = createLookupService({ riot: makeRiot(), rank, redis: memRedis() });
    await expect(
      service.getProfile({ gameName: 'Faker', tagLine: 'KR1', platform: 'mars' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
