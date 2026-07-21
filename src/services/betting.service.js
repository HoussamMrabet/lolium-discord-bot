import { BET_MARKETS, BET_STATUS } from '../config/constants.js';
import { ValidationError, ConflictError } from '../core/errors.js';
import { kda } from '../utils/format.js';
import { createLogger } from '../core/logger.js';

const BETTING_WINDOW_SECONDS = 300; // bets allowed for the first ~5 min of a game
const PAYOUT_MULTIPLIER = 2; // even money: correct bet doubles the stake
const DEFAULT_SEASON = 'S1';

/**
 * Fake-gold match betting.
 *
 * Bets are placed on a tracked player's CURRENT live game (spectator-detected by
 * the command) and resolve automatically when that match is processed. Money
 * moves through atomic wallet ops; resolution is idempotent (a bet leaves `open`
 * exactly once), so reprocessing a match never pays out twice.
 */
export function createBettingService({ repositories, logger = createLogger('betting') }) {
  async function getSeasonId(guildId) {
    const settings = await repositories.guildSettings.getByGuild(guildId);
    return settings?.bettingSeasonId ?? DEFAULT_SEASON;
  }

  async function getWallet(guildId, discordUserId, seasonId) {
    const season = seasonId ?? (await getSeasonId(guildId));
    return repositories.bettingProfiles.getOrCreate(guildId, discordUserId, season);
  }

  function isWindowOpen(gameStartTime, now = Date.now()) {
    if (!gameStartTime) return true; // still on the loading screen
    return (now - gameStartTime) / 1000 < BETTING_WINDOW_SECONDS;
  }

  /** Evaluates all market outcomes for the subject player in a finished match. */
  function computeOutcome(match, subjectPuuid) {
    const subject = match.participants.find((p) => p.puuid === subjectPuuid);
    if (!subject) return null;
    const team = match.participants.filter((p) => p.teamId === subject.teamId);
    const maxDeaths = Math.max(...team.map((p) => p.deaths ?? 0));
    const maxDamage = Math.max(...team.map((p) => p.totalDamageToChampions ?? 0));
    const subjKda = kda(subject.kills, subject.deaths, subject.assists);

    return {
      [BET_MARKETS.WINNER]: Boolean(subject.win),
      [BET_MARKETS.MOST_DEATHS]: maxDeaths > 0 && (subject.deaths ?? 0) === maxDeaths,
      [BET_MARKETS.TOP_DAMAGE]:
        maxDamage > 0 && (subject.totalDamageToChampions ?? 0) === maxDamage,
      [BET_MARKETS.INTER]: (subject.deaths ?? 0) >= 8 && subjKda < 1.5,
    };
  }

  async function placeBet({
    guildId,
    discordUserId,
    subjectSummonerId,
    gameId,
    gameStartTime,
    market,
    prediction,
    stake,
  }) {
    if (!Object.values(BET_MARKETS).includes(market)) {
      throw new ValidationError('Unknown betting market.');
    }
    const amount = Math.floor(Number(stake));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Stake must be a positive whole number.');
    }
    if (!isWindowOpen(gameStartTime)) {
      throw new ValidationError('Betting is closed for this game — it started too long ago.');
    }

    const seasonId = await getSeasonId(guildId);

    const existing = await repositories.bets.findOne({
      guildId,
      createdBy: discordUserId,
      gameId,
      market,
      status: BET_STATUS.OPEN,
    });
    if (existing) {
      throw new ConflictError('You already have an open bet on that market for this game.');
    }

    await repositories.bettingProfiles.getOrCreate(guildId, discordUserId, seasonId);
    const wallet = await repositories.bettingProfiles.debit(guildId, discordUserId, seasonId, amount);
    if (!wallet) {
      throw new ValidationError('You don’t have enough gold for that bet.');
    }

    const bet = await repositories.bets.place({
      guildId,
      seasonId,
      gameId,
      subjectSummonerId,
      market,
      createdBy: discordUserId,
      prediction: Boolean(prediction),
      stake: amount,
      status: BET_STATUS.OPEN,
      placedAt: new Date(),
    });

    return { bet, wallet };
  }

  async function resolveForMatch({ match, subjectSummonerId, subjectPuuid }) {
    const outcome = computeOutcome(match, subjectPuuid);
    if (!outcome) return { resolved: 0, won: 0, lost: 0 };

    const gameId = String(match._id).split('_')[1] ?? String(match._id);
    const open = await repositories.bets.find({
      gameId,
      subjectSummonerId,
      status: BET_STATUS.OPEN,
    });

    let won = 0;
    let lost = 0;
    for (const bet of open) {
      const isWin = bet.prediction === outcome[bet.market];
      const payout = isWin ? bet.stake * PAYOUT_MULTIPLIER : 0;

      // Atomic + exactly-once: only resolves if still open.
      const resolved = await repositories.bets.resolve(bet._id, {
        status: isWin ? BET_STATUS.WON : BET_STATUS.LOST,
        payout,
        matchId: match._id,
      });
      if (!resolved) continue;

      if (isWin) {
        await repositories.bettingProfiles.settleWin(bet.guildId, bet.createdBy, bet.seasonId, payout);
        won += 1;
      } else {
        await repositories.bettingProfiles.settleLoss(bet.guildId, bet.createdBy, bet.seasonId);
        lost += 1;
      }
    }

    if (won || lost) logger.debug({ gameId, won, lost }, 'resolved bets');
    return { resolved: won + lost, won, lost };
  }

  async function leaderboard(guildId, limit = 10) {
    const seasonId = await getSeasonId(guildId);
    return repositories.bettingProfiles.leaderboard(guildId, seasonId, limit);
  }

  async function resetSeason(guildId) {
    const current = await getSeasonId(guildId);
    const n = Number.parseInt(String(current).replace(/^S/i, ''), 10) || 1;
    const next = `S${n + 1}`;
    await repositories.guildSettings.setBettingSeason(guildId, next);
    return { previous: current, current: next };
  }

  return {
    placeBet,
    resolveForMatch,
    computeOutcome,
    getWallet,
    getSeasonId,
    leaderboard,
    resetSeason,
    isWindowOpen,
  };
}

export default createBettingService;
