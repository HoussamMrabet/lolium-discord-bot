import { BaseRepository } from './base.repository.js';

export class BettingProfileRepository extends BaseRepository {
  getOrCreate(guildId, discordUserId, seasonId) {
    return this.upsert(
      { guildId, discordUserId, seasonId },
      { $setOnInsert: { guildId, discordUserId, seasonId } },
    );
  }

  /**
   * Atomically debit a stake, but only if the balance can cover it — the
   * `balance: { $gte: amount }` guard makes overspend impossible under
   * concurrency. Returns the updated profile, or null if funds were insufficient.
   */
  debit(guildId, discordUserId, seasonId, amount) {
    return this.model
      .findOneAndUpdate(
        { guildId, discordUserId, seasonId, balance: { $gte: amount } },
        { $inc: { balance: -amount, lifetimeStaked: amount } },
        { new: true },
      )
      .exec();
  }

  /** Credit a winning payout and bump win counters/streak. */
  settleWin(guildId, discordUserId, seasonId, payout) {
    return this.model
      .findOneAndUpdate(
        { guildId, discordUserId, seasonId },
        {
          $inc: {
            balance: payout,
            lifetimeWon: payout,
            betsWon: 1,
            currentStreak: 1,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /** Record a losing bet (stake already debited) and reset the win streak. */
  settleLoss(guildId, discordUserId, seasonId) {
    return this.model
      .findOneAndUpdate(
        { guildId, discordUserId, seasonId },
        { $inc: { betsLost: 1 }, $set: { currentStreak: 0 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  leaderboard(guildId, seasonId, limit = 10) {
    return this.model
      .find({ guildId, seasonId })
      .sort({ balance: -1 })
      .limit(limit)
      .exec();
  }

  /** Season reset: archive is a caller concern; this zeroes the season slice. */
  resetSeason(guildId, oldSeasonId) {
    return this.deleteMany({ guildId, seasonId: oldSeasonId });
  }
}

export default BettingProfileRepository;
