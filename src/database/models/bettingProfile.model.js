import mongoose from 'mongoose';
import { BETTING_STARTING_BALANCE } from '../../config/constants.js';

const { Schema } = mongoose;

/**
 * A member's fake-gold wallet, scoped to a guild and a betting season. Balance
 * mutations are done with atomic `$inc` so concurrent bets/payouts can never
 * corrupt it. The (guildId, seasonId, balance) index backs the betting
 * leaderboard.
 */
const bettingProfileSchema = new Schema(
  {
    guildId: { type: String, required: true },
    discordUserId: { type: String, required: true },
    seasonId: { type: String, required: true },
    balance: { type: Number, default: BETTING_STARTING_BALANCE },
    lifetimeWon: { type: Number, default: 0 },
    lifetimeStaked: { type: Number, default: 0 },
    betsWon: { type: Number, default: 0 },
    betsLost: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

bettingProfileSchema.index(
  { guildId: 1, discordUserId: 1, seasonId: 1 },
  { unique: true },
);
bettingProfileSchema.index({ guildId: 1, seasonId: 1, balance: -1 });

export const BettingProfile =
  mongoose.models.BettingProfile ||
  mongoose.model('BettingProfile', bettingProfileSchema);

export default BettingProfile;
