import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createRecapService } from '../../src/services/recap.service.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

let repos;
let recap;
let A;
let B;

async function addGame(summonerId, matchId, over = {}) {
  await repos.playerMatches.upsertForMatch(summonerId, matchId, {
    puuid: 'x',
    queueId: 420,
    gameEndAt: new Date(),
    win: true,
    kills: 5,
    deaths: 3,
    assists: 5,
    kda: 3,
    damage: 15000,
    damageShare: 0.2,
    visionScore: 20,
    pentaKills: 0,
    championName: 'Ahri',
    ...over,
  });
}

beforeAll(async () => {
  await startMemoryMongo();
}, 120_000);
afterAll(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  repos = createRepositories(models);
  recap = createRecapService({ repositories: repos });

  A = await repos.summoners.upsertIdentity({
    puuid: 'P-A',
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Alpha', tagLine: 'NA1' },
  });
  B = await repos.summoners.upsertIdentity({
    puuid: 'P-B',
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Bravo', tagLine: 'NA1' },
  });
  await repos.players.link({ guildId: 'G1', discordUserId: 'U1', summonerId: A._id, puuid: 'P-A' });
  await repos.players.link({ guildId: 'G1', discordUserId: 'U2', summonerId: B._id, puuid: 'P-B' });

  // A: a great carry game + a normal one.
  await addGame(A._id, 'M-A1', { win: true, kills: 12, deaths: 1, assists: 6, kda: 18, damageShare: 0.5, championName: 'Yasuo' });
  await addGame(A._id, 'M-A2', { win: true, kda: 3 });
  // B: an int game.
  await addGame(B._id, 'M-B1', { win: false, kills: 1, deaths: 11, assists: 2, kda: 0.27, damageShare: 0.1, championName: 'Teemo' });

  await repos.lpHistory.record({ summonerId: A._id, queueType: 'RANKED_SOLO_5x5', matchId: 'M-A1', at: new Date(), result: 'W', delta: 40 });
  await repos.lpHistory.record({ summonerId: B._id, queueType: 'RANKED_SOLO_5x5', matchId: 'M-B1', at: new Date(), result: 'L', delta: -20 });
});

afterEach(async () => {
  await clearCollections();
});

describe('buildRecap', () => {
  it('aggregates highlights across the guild', async () => {
    const data = await recap.buildRecap('G1', 'weekly');

    expect(data.totalGames).toBe(3);
    expect(data.mostLpGained).toMatchObject({ discordUserId: 'U1', value: 40 });
    expect(data.mostLpLost).toMatchObject({ discordUserId: 'U2', value: -20 });
    expect(data.mostGames).toMatchObject({ discordUserId: 'U1', value: 2 });

    expect(data.bestKda.kda).toBe(18);
    expect(data.bestKda.championName).toBe('Yasuo');
    expect(data.biggestInt.deaths).toBe(11);
    expect(data.biggestCarry.championName).toBe('Yasuo');

    expect(data.topLpGainers[0]).toMatchObject({ displayName: 'Alpha#NA1', value: 40 });
    expect(data.playerOfPeriod.displayName).toBe('Alpha#NA1');
  });

  it('returns an empty recap for a guild with no games', async () => {
    const data = await recap.buildRecap('G-empty', 'daily');
    expect(data.totalGames).toBe(0);
    expect(data.mostLpGained).toBeNull();
  });
});
