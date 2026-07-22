import { z } from 'zod';
import { TIERS } from '../../config/constants.js';
import { SUPPORTED_PLATFORMS } from '../../config/regions.js';
import { isValidTimezone } from '../../utils/time.js';

const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord snowflake');
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'must be a valid id');
const channelId = snowflake.nullable();

export const guildParams = z.object({ guildId: snowflake });

export const playerParams = z.object({
  guildId: snowflake,
  discordUserId: snowflake,
  summonerId: objectId,
});

export const summonerStatsParams = z.object({
  guildId: snowflake,
  summonerId: objectId,
});

export const settingsPatch = z
  .object({
    channels: z
      .object({
        alerts: channelId,
        leaderboard: channelId,
        recaps: channelId,
        betting: channelId,
      })
      .partial(),
    features: z
      .object({
        alerts: z.boolean(),
        promotions: z.boolean(),
        streaks: z.boolean(),
        betting: z.boolean(),
        roleSync: z.boolean(),
      })
      .partial(),
    recap: z
      .object({
        daily: z.boolean(),
        weekly: z.boolean(),
        monthly: z.boolean(),
        hour: z.number().int().min(0).max(23),
        timezone: z.string().refine(isValidTimezone, 'invalid IANA timezone'),
      })
      .partial(),
    roles: z.record(z.enum(TIERS), snowflake.nullable()),
    streakThresholds: z.array(z.number().int().positive()).max(10),
    enabledLeaderboards: z.array(z.string()).max(20),
    locale: z.string().max(16),
  })
  .partial()
  .strict();

export const leaderboardQuery = z.object({
  category: z.string().max(32).optional(),
  period: z.enum(['all', 'daily', 'weekly', 'monthly']).default('all'),
});

export const matchesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// --- Public (website) endpoints ---

export const lookupQuery = z.object({
  riotId: z.string().min(3).max(50),
  region: z.enum(SUPPORTED_PLATFORMS),
});

export const championParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9]+$/, 'invalid champion id').max(32),
});
