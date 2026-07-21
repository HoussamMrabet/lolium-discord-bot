import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createBettingService } from '../../src/services/betting.service.js';
import { toMatchDocument } from '../../src/services/matchTransform.js';
import { sampleMatchDto, TRACKED_PUUID } from '../fixtures/sampleMatch.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

const doc = toMatchDocument(sampleMatchDto);

let repos;
let betting;
let subject;

beforeAll(async () => {
  await startMemoryMongo();
}, 120_000);
afterAll(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  repos = createRepositories(models);
  betting = createBettingService({ repositories: repos });
  subject = await repos.summoners.upsertIdentity({
    puuid: TRACKED_PUUID,
    platform: 'na1',
    regionalRoute: 'americas',
    accountRoute: 'americas',
    riotId: { gameName: 'Faker', tagLine: 'KR1' },
  });
});

afterEach(async () => {
  await clearCollections();
});

describe('computeOutcome', () => {
  it('evaluates every market for the subject', () => {
    const o = betting.computeOutcome(doc, TRACKED_PUUID);
    expect(o).toEqual({
      winner: true,
      topDamage: true, // 30000 is the team's max
      mostDeaths: false, // ally died more (3 > 2)
      inter: false, // only 2 deaths
    });
  });
});

describe('placeBet', () => {
  const liveNow = () => ({
    guildId: 'G1',
    discordUserId: 'U1',
    subjectSummonerId: subject._id,
    gameId: '100',
    gameStartTime: Date.now(),
    market: 'winner',
    prediction: true,
    stake: 100,
  });

  it('debits the wallet and records the bet', async () => {
    await betting.getWallet('G1', 'U1'); // seed 1000
    const { wallet, bet } = await betting.placeBet(liveNow());
    expect(wallet.balance).toBe(900);
    expect(bet.status).toBe('open');
    expect(bet.stake).toBe(100);
  });

  it('rejects a duplicate market bet on the same game', async () => {
    await betting.getWallet('G1', 'U1');
    await betting.placeBet(liveNow());
    await expect(betting.placeBet(liveNow())).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects insufficient funds', async () => {
    await betting.getWallet('G1', 'U1');
    await expect(betting.placeBet({ ...liveNow(), stake: 100000 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects a closed betting window', async () => {
    await betting.getWallet('G1', 'U1');
    await expect(
      betting.placeBet({ ...liveNow(), gameStartTime: Date.now() - 10 * 60 * 1000 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

describe('resolveForMatch', () => {
  function openBet(market, prediction, stake) {
    return repos.bets.place({
      guildId: 'G1',
      seasonId: 'S1',
      gameId: '100',
      subjectSummonerId: subject._id,
      market,
      createdBy: 'U1',
      prediction,
      stake,
      status: 'open',
      placedAt: new Date(),
    });
  }

  it('pays out winners and marks losers, exactly once', async () => {
    await betting.getWallet('G1', 'U1'); // 1000
    const winBet = await openBet('winner', true, 100); // correct -> +200
    const loseBet = await openBet('mostDeaths', true, 50); // wrong -> lost

    const res = await betting.resolveForMatch({
      match: doc,
      subjectSummonerId: subject._id,
      subjectPuuid: TRACKED_PUUID,
    });
    expect(res).toEqual({ resolved: 2, won: 1, lost: 1 });

    const w = await repos.bets.findById(winBet._id);
    const l = await repos.bets.findById(loseBet._id);
    expect(w.status).toBe('won');
    expect(w.payout).toBe(200);
    expect(l.status).toBe('lost');

    const wallet = await betting.getWallet('G1', 'U1');
    expect(wallet.balance).toBe(1200); // 1000 + 200 payout

    // Idempotent: nothing left open to resolve.
    const again = await betting.resolveForMatch({
      match: doc,
      subjectSummonerId: subject._id,
      subjectPuuid: TRACKED_PUUID,
    });
    expect(again.resolved).toBe(0);
    const wallet2 = await betting.getWallet('G1', 'U1');
    expect(wallet2.balance).toBe(1200);
  });
});

describe('resetSeason', () => {
  it('bumps the season id', async () => {
    const { previous, current } = await betting.resetSeason('G1');
    expect(previous).toBe('S1');
    expect(current).toBe('S2');
    expect(await betting.getSeasonId('G1')).toBe('S2');
  });
});
