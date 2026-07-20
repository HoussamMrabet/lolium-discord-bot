import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

const repos = createRepositories(models);

const IDENTITY = {
  puuid: 'PUUID-1',
  platform: 'na1',
  regionalRoute: 'americas',
  accountRoute: 'americas',
  riotId: { gameName: 'Faker', tagLine: 'KR1' },
};

beforeAll(async () => {
  await startMemoryMongo();
}, 120_000);

afterAll(async () => {
  await stopMemoryMongo();
});

afterEach(async () => {
  await clearCollections();
});

describe('Summoner global dedup', () => {
  it('upserts the same puuid to a single document', async () => {
    const a = await repos.summoners.upsertIdentity(IDENTITY);
    const b = await repos.summoners.upsertIdentity({
      ...IDENTITY,
      summonerLevel: 500,
    });
    expect(String(a._id)).toBe(String(b._id));
    expect(await repos.summoners.countDocuments()).toBe(1);
    expect(b.summonerLevel).toBe(500);
  });
});

describe('Player links: cross-guild fan-out, one summoner', () => {
  it('finds every guild tracking a puuid', async () => {
    const s = await repos.summoners.upsertIdentity(IDENTITY);
    await repos.players.link({
      guildId: 'G1',
      discordUserId: 'U1',
      summonerId: s._id,
      puuid: s.puuid,
    });
    await repos.players.link({
      guildId: 'G2',
      discordUserId: 'U2',
      summonerId: s._id,
      puuid: s.puuid,
    });

    const guilds = await repos.players.findGuildsTrackingPuuid(s.puuid);
    expect(guilds.map((g) => g.guildId).sort()).toEqual(['G1', 'G2']);
    // Still exactly one polled summoner despite two guild links.
    expect(await repos.summoners.countDocuments()).toBe(1);
  });

  it('is idempotent for a repeated identical link', async () => {
    const s = await repos.summoners.upsertIdentity(IDENTITY);
    const link = {
      guildId: 'G1',
      discordUserId: 'U1',
      summonerId: s._id,
      puuid: s.puuid,
    };
    await repos.players.link(link);
    await repos.players.link(link);
    expect(await repos.players.countByUser('G1', 'U1')).toBe(1);
  });
});

describe('Match permanent store', () => {
  it('inserts a match once and reports subsequent calls as no-ops', async () => {
    const match = {
      _id: 'NA1_1',
      queueId: 420,
      gameEndAt: new Date(),
      participants: [
        {
          puuid: 'PUUID-1',
          championId: 1,
          championName: 'Annie',
          teamId: 100,
          win: true,
        },
      ],
    };
    const first = await repos.matches.insertIfAbsent(match);
    const second = await repos.matches.insertIfAbsent(match);
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(await repos.matches.countDocuments()).toBe(1);
  });
});

describe('Notification outbox: exactly-once', () => {
  it('only the first claim of a dedupeKey is inserted', async () => {
    const claim = {
      guildId: 'G1',
      channelId: 'C1',
      type: 'matchAlert',
      dedupeKey: 'matchAlert:G1:NA1_1:S1',
    };
    const a = await repos.notifications.claim(claim);
    const b = await repos.notifications.claim(claim);
    expect(a.inserted).toBe(true);
    expect(b.inserted).toBe(false);
    expect(await repos.notifications.countDocuments()).toBe(1);
  });
});

describe('LPHistory: idempotent LP accounting', () => {
  it('never double-counts LP for the same match/queue', async () => {
    const s = await repos.summoners.upsertIdentity(IDENTITY);
    const entry = {
      summonerId: s._id,
      queueType: 'RANKED_SOLO_5x5',
      matchId: 'NA1_1',
      result: 'W',
      delta: 20,
      lpBefore: 40,
      lpAfter: 60,
    };
    const r1 = await repos.lpHistory.record(entry);
    const r2 = await repos.lpHistory.record(entry);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();

    const sum = await repos.lpHistory.sumDelta(
      s._id,
      'RANKED_SOLO_5x5',
      new Date(0),
    );
    expect(sum.total).toBe(20);
    expect(sum.games).toBe(1);
  });
});

describe('BettingProfile: atomic overspend guard', () => {
  it('debits only when the balance can cover it', async () => {
    await repos.bettingProfiles.getOrCreate('G1', 'U1', 'S1'); // starts at 1000
    const ok = await repos.bettingProfiles.debit('G1', 'U1', 'S1', 600);
    expect(ok).not.toBeNull();
    expect(ok.balance).toBe(400);

    const insufficient = await repos.bettingProfiles.debit('G1', 'U1', 'S1', 600);
    expect(insufficient).toBeNull(); // balance unchanged, no overspend
  });
});
