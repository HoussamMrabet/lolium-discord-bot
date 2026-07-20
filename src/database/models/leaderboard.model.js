import mongoose from 'mongoose';
import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_PERIODS,
} from '../../config/constants.js';

const { Schema } = mongoose;

const leaderboardEntrySchema = new Schema(
  {
    summonerId: { type: Schema.Types.ObjectId, ref: 'Summoner' },
    discordUserId: { type: String, default: null },
    puuid: { type: String, default: null },
    displayName: { type: String, default: null },
    value: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    // Category-specific extras (e.g. { tier, division, lp } for highestRank).
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

/**
 * Precomputed leaderboard for one guild + category + period. Reads are O(1) and
 * the posted Discord message is edited in place on each refresh (message ref
 * stored here). The unique index guarantees exactly one row per slice.
 */
const leaderboardSchema = new Schema(
  {
    guildId: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(LEADERBOARD_CATEGORIES),
      required: true,
    },
    period: {
      type: String,
      enum: Object.values(LEADERBOARD_PERIODS),
      required: true,
      default: LEADERBOARD_PERIODS.ALL,
    },
    entries: { type: [leaderboardEntrySchema], default: [] },
    message: {
      channelId: { type: String, default: null },
      messageId: { type: String, default: null },
    },
    computedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

leaderboardSchema.index(
  { guildId: 1, category: 1, period: 1 },
  { unique: true },
);

export const Leaderboard =
  mongoose.models.Leaderboard ||
  mongoose.model('Leaderboard', leaderboardSchema);

export default Leaderboard;
