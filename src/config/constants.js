/**
 * Domain constants and enums shared across every process.
 *
 * Keeping these centralized (instead of scattering magic strings/numbers) means
 * a value like a cache TTL or a queue name has exactly one definition, and the
 * repository / service / worker layers all agree on it.
 */

// ---------------------------------------------------------------------------
// Ranked ladder
// ---------------------------------------------------------------------------

export const RANKED_QUEUES = Object.freeze({
  RANKED_SOLO_5x5: { id: 420, key: 'RANKED_SOLO_5x5', label: 'Ranked Solo/Duo' },
  RANKED_FLEX_SR: { id: 440, key: 'RANKED_FLEX_SR', label: 'Ranked Flex' },
});

export const RANKED_QUEUE_KEYS = Object.freeze(Object.keys(RANKED_QUEUES));

/** Ordered low -> high. Index doubles as the tier's rank for comparisons. */
export const TIERS = Object.freeze([
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
]);

/** Apex tiers use a single continuous LP pool (no divisions). */
export const APEX_TIERS = Object.freeze(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

/** Ordered low -> high (IV is the lowest division within a tier). */
export const DIVISIONS = Object.freeze(['IV', 'III', 'II', 'I']);

// ---------------------------------------------------------------------------
// Adaptive polling
// ---------------------------------------------------------------------------

export const POLL_TIERS = Object.freeze({
  ACTIVE: 'active',
  IDLE: 'idle',
  DORMANT: 'dormant',
});

/** How long to wait before re-checking a summoner, per poll tier (ms). */
export const POLL_CADENCE_MS = Object.freeze({
  [POLL_TIERS.ACTIVE]: 2.5 * 60 * 1000, // ~2.5 min — likely in/near a game
  [POLL_TIERS.IDLE]: 20 * 60 * 1000, // ~20 min — plays regularly
  [POLL_TIERS.DORMANT]: 2 * 60 * 60 * 1000, // ~2 h — no recent activity
});

// ---------------------------------------------------------------------------
// Queues (BullMQ)
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = Object.freeze({
  RIOT_FETCH: 'riot-fetch', // suffixed per region at runtime, e.g. riot-fetch:na1
  MATCH_PROCESS: 'match-process',
  NOTIFY_DISPATCH: 'notify-dispatch',
  ROLE_SYNC: 'role-sync',
  LEADERBOARD_COMPUTE: 'leaderboard-compute',
  RECAP_GENERATE: 'recap-generate',
  DEAD_LETTER: 'dead-letter',
});

/** Builds the per-region riot-fetch queue name. */
export function riotFetchQueueName(region) {
  return `${QUEUE_NAMES.RIOT_FETCH}:${region}`;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = Object.freeze({
  MATCH_ALERT: 'matchAlert',
  PROMOTION: 'promotion',
  DEMOTION: 'demotion',
  STREAK: 'streak',
  RECAP: 'recap',
  LEADERBOARD: 'leaderboard',
  BETTING: 'betting',
});

// ---------------------------------------------------------------------------
// Performance buckets (drive the template-based "funny descriptions")
// ---------------------------------------------------------------------------

export const PERFORMANCE_BUCKETS = Object.freeze({
  HARD_CARRY: 'hardCarry',
  CARRY: 'carry',
  SOLID: 'solid',
  AVERAGE: 'average',
  ROUGH: 'rough',
  INT: 'int',
  VISION_GOD: 'visionGod',
  AFK_FARM: 'afkFarm',
  COMEBACK: 'comeback',
  CHOKED_LEAD: 'chokedLead',
});

// ---------------------------------------------------------------------------
// Leaderboards
// ---------------------------------------------------------------------------

export const LEADERBOARD_CATEGORIES = Object.freeze({
  HIGHEST_RANK: 'highestRank',
  MOST_WINS: 'mostWins',
  HIGHEST_WIN_RATE: 'highestWinRate',
  MOST_LP_GAINED: 'mostLpGained',
  LONGEST_WIN_STREAK: 'longestWinStreak',
  MOST_GAMES: 'mostGames',
  MOST_DAMAGE: 'mostDamage',
  HIGHEST_KDA: 'highestKda',
  MOST_VISION: 'mostVision',
  MOST_PENTAKILLS: 'mostPentakills',
});

export const LEADERBOARD_PERIODS = Object.freeze({
  ALL: 'all',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  SEASON: 'season',
});

// ---------------------------------------------------------------------------
// Betting
// ---------------------------------------------------------------------------

export const BET_MARKETS = Object.freeze({
  WINNER: 'winner',
  INTER: 'inter', // who ints (most deaths)
  TOP_DAMAGE: 'topDamage',
  MOST_DEATHS: 'mostDeaths',
});

export const BET_STATUS = Object.freeze({
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
  VOID: 'void',
});

/** Starting fake-gold balance for a fresh betting profile. */
export const BETTING_STARTING_BALANCE = 1000;

// ---------------------------------------------------------------------------
// Caching — TTLs in SECONDS (matched to how fast each datum actually changes)
// ---------------------------------------------------------------------------

export const CACHE_TTL = Object.freeze({
  ACCOUNT: 24 * 60 * 60, // riot id <-> puuid (effectively immutable)
  SUMMONER: 12 * 60 * 60, // level / icon (slow-moving)
  LEAGUE: 90, // tier/div/lp (only to dedupe bursts; DB is source of truth)
  MATCH_IDS: 45, // highest-frequency poll; short cache kills duplicates
  MATCH_DETAIL: 7 * 24 * 60 * 60, // hot cache; Mongo is the permanent store
  STATIC_DATA: 24 * 60 * 60, // Data Dragon version-pinned assets
});

/** Redis key builders for cached Riot responses. */
export const CACHE_KEYS = Object.freeze({
  account: (route, gameName, tagLine) =>
    `riot:account:${route}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`,
  summoner: (platform, puuid) => `riot:summoner:${platform}:${puuid}`,
  league: (platform, puuid) => `riot:league:${platform}:${puuid}`,
  matchIds: (route, puuid) => `riot:matchids:${route}:${puuid}`,
  matchDetail: (route, matchId) => `riot:match:${route}:${matchId}`,
  spectator: (platform, puuid) => `riot:spectator:${platform}:${puuid}`,
});

// ---------------------------------------------------------------------------
// Redis operational keys (non-cache: scheduler, limiter, locks, leaderboards)
// ---------------------------------------------------------------------------

export const REDIS_KEYS = Object.freeze({
  POLL_DUE: 'poll:due', // ZSET scored by nextCheckAt
  rateLimitApp: (region) => `ratelimit:${region}:app`,
  rateLimitMethod: (region, method) => `ratelimit:${region}:method:${method}`,
  regionPause: (region) => `ratelimit:${region}:paused`,
  leaderboardZ: (guildId, category, period) =>
    `lb:${guildId}:${category}:${period}`,
  lock: (name) => `lock:${name}`,
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Header used to correlate a request across interaction -> job -> API call. */
export const CORRELATION_HEADER = 'x-correlation-id';

/** Discord snowflake: 17–20 digit numeric string. */
export const SNOWFLAKE_REGEX = /^\d{17,20}$/;
