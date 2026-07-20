import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createNotificationService } from '../../src/services/notification.service.js';
import { logger } from '../../src/core/logger.js';
import { toMatchDocument } from '../../src/services/matchTransform.js';
import { PERFORMANCE_BUCKETS } from '../../src/config/constants.js';
import { sampleMatchDto, TRACKED_PUUID } from '../fixtures/sampleMatch.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

const doc = toMatchDocument(sampleMatchDto);
const participant = doc.participants.find((p) => p.puuid === TRACKED_PUUID);

let repos;
let jobs;
let notifications;
let summoner;

function makeResult() {
  return {
    participant,
    match: doc,
    queueType: 'RANKED_SOLO_5x5',
    performanceBucket: PERFORMANCE_BUCKETS.HARD_CARRY,
    mvp: true,
    kda: 7.5,
    rankEvent: {
      lpDelta: 20,
      promotion: false,
      demotion: false,
      after: { tier: 'GOLD', division: 'II', lp: 65 },
    },
    streakEvent: { streak: { current: 5 } }, // hits the default [3,5,10] threshold
  };
}

beforeAll(async () => {
  await startMemoryMongo();
}, 120_000);

afterAll(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  repos = createRepositories(models);
  jobs = [];
  const notifyQueue = () => ({
    add: (name, data, opts) => {
      jobs.push({ name, data, opts });
    },
  });
  notifications = createNotificationService({ repositories: repos, notifyQueue, logger });

  summoner = await repos.summoners.upsertIdentity({
    puuid: TRACKED_PUUID,
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Faker', tagLine: 'KR1' },
  });

  // G1: alerts channel configured (should receive alerts).
  await repos.guildSettings.getOrCreate('G1');
  await repos.guildSettings.setChannel('G1', 'alerts', 'C1');
  await repos.players.link({
    guildId: 'G1',
    discordUserId: 'U1',
    summonerId: summoner._id,
    puuid: TRACKED_PUUID,
  });

  // G2: tracks the same summoner but has NO alert channel (should be skipped).
  await repos.guildSettings.getOrCreate('G2');
  await repos.players.link({
    guildId: 'G2',
    discordUserId: 'U2',
    summonerId: summoner._id,
    puuid: TRACKED_PUUID,
  });
});

afterEach(async () => {
  await clearCollections();
});

describe('fanOutMatch', () => {
  it('creates outbox rows + jobs only for configured guilds', async () => {
    const { enqueued } = await notifications.fanOutMatch({
      puuid: TRACKED_PUUID,
      summonerId: summoner._id,
      result: makeResult(),
    });

    // G1: match alert + streak milestone (promotion=false). G2: skipped.
    expect(enqueued).toBe(2);
    expect(await repos.notifications.countDocuments()).toBe(2);
    expect(jobs).toHaveLength(2);

    const alert = await repos.notifications.findOne({
      dedupeKey: `matchAlert:G1:NA1_100:${summoner._id}`,
    });
    expect(alert).not.toBeNull();
    expect(alert.channelId).toBe('C1');
    expect(alert.payload.embeds[0].title).toContain('Yasuo');
  });

  it('is exactly-once — re-fanning the same match enqueues nothing new', async () => {
    await notifications.fanOutMatch({
      puuid: TRACKED_PUUID,
      summonerId: summoner._id,
      result: makeResult(),
    });
    const before = await repos.notifications.countDocuments();
    jobs.length = 0;

    const { enqueued } = await notifications.fanOutMatch({
      puuid: TRACKED_PUUID,
      summonerId: summoner._id,
      result: makeResult(),
    });

    expect(enqueued).toBe(0);
    expect(await repos.notifications.countDocuments()).toBe(before);
    expect(jobs).toHaveLength(0);
  });
});
