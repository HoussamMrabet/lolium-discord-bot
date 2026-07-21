import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createLeaderboardService } from '../../src/services/leaderboard.service.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

let repos;
let lb;
let A;
let B;

async function addGame(summonerId, matchId, over = {}) {
  await repos.playerMatches.upsertForMatch(summonerId, matchId, {
    puuid: 'x',
    queueId: 420,
    gameEndAt: new Date(),
    win: true,
    kills: 5,
    deaths: 2,
    assists: 5,
    kda: 3,
    damage: 15000,
    visionScore: 20,
    pentaKills: 0,
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
  lb = createLeaderboardService({ repositories: repos });

  A = await repos.summoners.upsertIdentity({
    puuid: 'P-A',
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Alpha', tagLine: 'NA1' },
  });
  await repos.summoners.updateRankedSnapshot('P-A', 'RANKED_SOLO_5x5', {
    tier: 'GOLD',
    division: 'II',
    lp: 40,
    absoluteLp: 1440,
  });
  await repos.summoners.updateStreak('P-A', { current: 0, longestWin: 5, longestLoss: 1 });

  B = await repos.summoners.upsertIdentity({
    puuid: 'P-B',
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Bravo', tagLine: 'NA1' },
  });
  await repos.summoners.updateRankedSnapshot('P-B', 'RANKED_SOLO_5x5', {
    tier: 'PLATINUM',
    division: 'IV',
    lp: 10,
    absoluteLp: 1610,
  });
  await repos.summoners.updateStreak('P-B', { current: 0, longestWin: 2, longestLoss: 0 });

  await repos.players.link({ guildId: 'G1', discordUserId: 'U1', summonerId: A._id, puuid: 'P-A' });
  await repos.players.link({ guildId: 'G1', discordUserId: 'U2', summonerId: B._id, puuid: 'P-B' });

  // A: 3 games (2 wins), 1 pentakill.
  await addGame(A._id, 'M-A1', { win: true, pentaKills: 1 });
  await addGame(A._id, 'M-A2', { win: true });
  await addGame(A._id, 'M-A3', { win: false });
  // B: 5 games, all wins.
  for (let i = 1; i <= 5; i += 1) await addGame(B._id, `M-B${i}`, { win: true });

  // LP gained
  await repos.lpHistory.record({ summonerId: A._id, queueType: 'RANKED_SOLO_5x5', matchId: 'M-A2', at: new Date(), result: 'W', delta: 40 });
  await repos.lpHistory.record({ summonerId: B._id, queueType: 'RANKED_SOLO_5x5', matchId: 'M-B1', at: new Date(), result: 'W', delta: 10 });
});

afterEach(async () => {
  await clearCollections();
});

describe('leaderboard.compute', () => {
  it('ranks by highest rank (Platinum over Gold)', async () => {
    const { entries } = await lb.compute('G1', 'highestRank', 'all');
    expect(entries).toHaveLength(2);
    expect(String(entries[0].summonerId)).toBe(String(B._id));
    expect(entries[0].meta.tier).toBe('PLATINUM');
  });

  it('ranks by most wins', async () => {
    const { entries } = await lb.compute('G1', 'mostWins', 'all');
    expect(String(entries[0].summonerId)).toBe(String(B._id));
    expect(entries[0].value).toBe(5);
  });

  it('ranks by most pentakills (only players with any)', async () => {
    const { entries } = await lb.compute('G1', 'mostPentakills', 'all');
    expect(entries).toHaveLength(1);
    expect(String(entries[0].summonerId)).toBe(String(A._id));
    expect(entries[0].value).toBe(1);
  });

  it('ranks by longest win streak', async () => {
    const { entries } = await lb.compute('G1', 'longestWinStreak', 'all');
    expect(String(entries[0].summonerId)).toBe(String(A._id));
    expect(entries[0].value).toBe(5);
  });

  it('ranks by most LP gained', async () => {
    const { entries } = await lb.compute('G1', 'mostLpGained', 'all');
    expect(String(entries[0].summonerId)).toBe(String(A._id));
    expect(entries[0].value).toBe(40);
  });

  it('persists computed entries', async () => {
    await lb.computeAndSave('G1', 'mostWins', 'all');
    const saved = await repos.leaderboards.get('G1', 'mostWins', 'all');
    expect(saved.entries.length).toBe(2);
  });
});
