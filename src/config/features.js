import { LEADERBOARD_CATEGORIES } from './constants.js';

/**
 * Default per-guild settings, applied when a guild first adds the bot.
 * Stored on the GuildSettings document (Phase 3) and editable via /settings and
 * the dashboard API. Kept here so the "out-of-the-box" behavior is one obvious
 * place, not buried in a schema default.
 */
export const DEFAULT_GUILD_SETTINGS = Object.freeze({
  channels: {
    alerts: null,
    leaderboard: null,
    recaps: null,
    betting: null,
  },
  // Tier (IRON..CHALLENGER) -> Discord role id. Empty until an admin configures it.
  roles: {},
  // Platform ids this guild tracks (e.g. ['euw1']). Empty = infer per linked account.
  regions: [],
  recap: {
    daily: true,
    weekly: true,
    monthly: false,
    timezone: 'UTC',
    hour: 9, // local hour (0–23) to post the daily/weekly recap
  },
  features: {
    alerts: true,
    promotions: true,
    streaks: true,
    betting: false,
    roleSync: false,
  },
  // Streak lengths that trigger a celebratory (or commiserating) alert.
  streakThresholds: [3, 5, 10],
  // Which leaderboard categories are auto-posted/updated for this guild.
  enabledLeaderboards: Object.values(LEADERBOARD_CATEGORIES),
  locale: 'en-US',
});
