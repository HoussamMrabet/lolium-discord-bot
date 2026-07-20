import { BaseRepository } from './base.repository.js';
import { BET_STATUS } from '../../config/constants.js';

export class BetRepository extends BaseRepository {
  place(bet) {
    return this.create(bet);
  }

  openByGame(gameId) {
    return this.find({ gameId, status: BET_STATUS.OPEN });
  }

  openByGuildGame(guildId, gameId) {
    return this.find({ guildId, gameId, status: BET_STATUS.OPEN });
  }

  /**
   * Resolve a bet atomically and exactly once: the update only matches while
   * status is still `open`, so a duplicate resolution attempt returns null and
   * cannot pay out twice.
   */
  resolve(betId, { status, payout = 0, matchId = null }) {
    return this.model
      .findOneAndUpdate(
        { _id: betId, status: BET_STATUS.OPEN },
        { $set: { status, payout, matchId, resolvedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  /** Void all still-open bets for a game (e.g. remake / unresolved). */
  voidOpenForGame(gameId, matchId = null) {
    return this.updateMany(
      { gameId, status: BET_STATUS.OPEN },
      { $set: { status: BET_STATUS.VOID, matchId, resolvedAt: new Date() } },
    );
  }

  userBets(guildId, discordUserId, seasonId, limit = 25) {
    return this.model
      .find({ guildId, createdBy: discordUserId, seasonId })
      .sort({ placedAt: -1 })
      .limit(limit)
      .exec();
  }
}

export default BetRepository;
