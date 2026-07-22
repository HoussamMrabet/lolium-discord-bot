import mongoose from 'mongoose';
import {
  TIERS,
  LEADERBOARD_CATEGORIES,
  SNOWFLAKE_REGEX,
} from '../../config/constants.js';

const { Schema } = mongoose;

/**
 * Per-guild configuration, 1:1 with Guild but stored separately so it stays
 * small and independently cacheable in Redis. `roles` is a Map (tier -> role
 * snowflake) validated so only real tiers and real snowflakes are ever stored
 * (never trust Discord input — OWASP A05).
 */
const guildSettingsSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channels: {
      alerts: { type: String, default: null },
      leaderboard: { type: String, default: null },
      recaps: { type: String, default: null },
      betting: { type: String, default: null },
    },
    roles: {
      type: Map,
      of: String,
      default: () => new Map(),
      validate: {
        validator(map) {
          if (!map) return true;
          for (const [tier, roleId] of map) {
            if (!TIERS.includes(tier)) return false;
            if (!SNOWFLAKE_REGEX.test(roleId)) return false;
          }
          return true;
        },
        message: 'roles must map valid tiers to Discord role snowflakes',
      },
    },
    regions: { type: [String], default: [] },
    recap: {
      daily: { type: Boolean, default: true },
      weekly: { type: Boolean, default: true },
      monthly: { type: Boolean, default: false },
      timezone: { type: String, default: 'UTC' },
      hour: { type: Number, default: 9, min: 0, max: 23 },
    },
    features: {
      alerts: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      streaks: { type: Boolean, default: true },
      betting: { type: Boolean, default: false },
      roleSync: { type: Boolean, default: false },
    },
    streakThresholds: { type: [Number], default: [3, 5, 10] },
    enabledLeaderboards: {
      type: [String],
      default: () => Object.values(LEADERBOARD_CATEGORIES),
    },
    // Current betting season; wallets/bets are keyed by this so a reset simply
    // starts a fresh season while archiving the old one.
    bettingSeasonId: { type: String, default: 'S1' },
    // Dedupe markers for the last posted recap of each cadence (period -> key).
    lastRecap: {
      daily: { type: String, default: null },
      weekly: { type: String, default: null },
      monthly: { type: String, default: null },
    },
    locale: { type: String, default: 'en-US' },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

export const GuildSettings =
  mongoose.models.GuildSettings ||
  mongoose.model('GuildSettings', guildSettingsSchema);

export default GuildSettings;
