import { jest } from '@jest/globals';
import nock from 'nock';
import { createRiotService } from '../../src/riot/index.js';

/** In-memory cache implementing the RiotCache interface for tests. */
class MemoryCache {
  constructor() {
    this.map = new Map();
  }
  get(key) {
    return this.map.has(key) ? this.map.get(key) : undefined;
  }
  set(key, value) {
    this.map.set(key, value);
  }
  del(key) {
    this.map.delete(key);
    return 1;
  }
}

const PLATFORM_HOST = 'https://na1.api.riotgames.com';
const REGIONAL_HOST = 'https://americas.api.riotgames.com';

let riot;
let limiter;
let cache;

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1'); // allow local (other suites' mongo)
});

afterAll(() => {
  nock.enableNetConnect();
  nock.restore();
});

beforeEach(() => {
  limiter = {
    take: jest.fn(async () => {}),
    syncFromHeaders: jest.fn(),
    pauseRegion: jest.fn(async () => {}),
  };
  cache = new MemoryCache();
  riot = createRiotService({
    apiKey: 'RGAPI-test',
    limiter,
    cache,
    maxRetries: 2,
  });
});

afterEach(() => {
  nock.cleanAll();
});

describe('account / caching', () => {
  it('fetches by Riot ID via the regional host and caches the result', async () => {
    const scope = nock(REGIONAL_HOST)
      .get('/riot/account/v1/accounts/by-riot-id/Faker/KR1')
      .reply(
        200,
        { puuid: 'PUUID-1', gameName: 'Faker', tagLine: 'KR1' },
        { 'x-app-rate-limit': '20:1,100:120' },
      );

    const acc = await riot.getAccountByRiotId({
      gameName: 'Faker',
      tagLine: 'KR1',
      platform: 'na1',
    });
    expect(acc.puuid).toBe('PUUID-1');
    expect(limiter.take).toHaveBeenCalledWith('americas');
    expect(limiter.syncFromHeaders).toHaveBeenCalled();
    expect(scope.isDone()).toBe(true);

    // Second call is served from cache — no new HTTP, no new limiter slot.
    const again = await riot.getAccountByRiotId({
      gameName: 'Faker',
      tagLine: 'KR1',
      platform: 'na1',
    });
    expect(again.puuid).toBe('PUUID-1');
    expect(limiter.take).toHaveBeenCalledTimes(1);
  });
});

describe('summoner / league', () => {
  it('fetches a summoner via the platform host', async () => {
    nock(PLATFORM_HOST)
      .get('/lol/summoner/v4/summoners/by-puuid/PUUID-1')
      .reply(200, { puuid: 'PUUID-1', summonerLevel: 321, profileIconId: 5 });

    const s = await riot.getSummonerByPuuid({ puuid: 'PUUID-1', platform: 'na1' });
    expect(s.summonerLevel).toBe(321);
    expect(limiter.take).toHaveBeenCalledWith('na1');
  });

  it('returns an empty array for an unranked player', async () => {
    nock(PLATFORM_HOST)
      .get('/lol/league/v4/entries/by-puuid/NR')
      .reply(200, []);

    const entries = await riot.getLeagueEntriesByPuuid({
      puuid: 'NR',
      platform: 'na1',
    });
    expect(entries).toEqual([]);
    const byQueue = await riot.getRankedEntries({ puuid: 'NR', platform: 'na1' });
    expect(byQueue).toEqual({});
  });
});

describe('match ids', () => {
  it('passes query params and returns ids', async () => {
    nock(REGIONAL_HOST)
      .get('/lol/match/v5/matches/by-puuid/PUUID-1/ids')
      .query({ start: 0, count: 5 })
      .reply(200, ['NA1_1', 'NA1_2']);

    const ids = await riot.getMatchIds({
      puuid: 'PUUID-1',
      platform: 'na1',
      count: 5,
    });
    expect(ids).toEqual(['NA1_1', 'NA1_2']);
  });
});

describe('error mapping', () => {
  it('maps 404 to RiotNotFoundError', async () => {
    nock(PLATFORM_HOST)
      .get('/lol/summoner/v4/summoners/by-puuid/UNKNOWN')
      .reply(404, { status: { message: 'Data not found', status_code: 404 } });

    await expect(
      riot.getSummonerByPuuid({ puuid: 'UNKNOWN', platform: 'na1' }),
    ).rejects.toMatchObject({ code: 'RIOT_NOT_FOUND' });
  });

  it('maps 429 to RiotRateLimitError and pauses the region', async () => {
    nock(PLATFORM_HOST)
      .get('/lol/summoner/v4/summoners/by-puuid/RL')
      .reply(429, {}, { 'retry-after': '2' });

    await expect(
      riot.getSummonerByPuuid({ puuid: 'RL', platform: 'na1' }),
    ).rejects.toMatchObject({ code: 'RIOT_RATE_LIMITED', retryAfter: 2 });
    expect(limiter.pauseRegion).toHaveBeenCalledWith('na1', 2000);
  });

  it('retries transient 5xx then succeeds', async () => {
    const scope = nock(PLATFORM_HOST)
      .get('/lol/summoner/v4/summoners/by-puuid/RETRY')
      .reply(500, {})
      .get('/lol/summoner/v4/summoners/by-puuid/RETRY')
      .reply(200, { summonerLevel: 10 });

    const s = await riot.getSummonerByPuuid({ puuid: 'RETRY', platform: 'na1' });
    expect(s.summonerLevel).toBe(10);
    expect(scope.isDone()).toBe(true);
  });
});

describe('spectator', () => {
  it('returns null when the player is not in a game (404)', async () => {
    nock(PLATFORM_HOST)
      .get('/lol/spectator/v5/active-games/by-summoner/IDLE')
      .reply(404, {});

    const game = await riot.getActiveGame({ puuid: 'IDLE', platform: 'na1' });
    expect(game).toBeNull();
  });
});
