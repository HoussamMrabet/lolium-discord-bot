import { createLogger } from '../core/logger.js';

const REFRESH_BUCKET_MS = 15 * 60 * 1000;

/**
 * Periodically enqueues a leaderboard-compute job for every guild that has a
 * leaderboard channel configured. The per-bucket jobId dedupes overlapping ticks.
 */
export function createLeaderboardScheduler({
  repositories,
  leaderboardQueue,
  logger = createLogger('leaderboard-scheduler'),
}) {
  async function enqueueDueGuilds() {
    const settings = await repositories.guildSettings.findWithChannel('leaderboard');
    if (!settings.length) return 0;
    const bucket = Math.floor(Date.now() / REFRESH_BUCKET_MS);
    for (const s of settings) {
      await leaderboardQueue().add(
        'compute',
        { guildId: s.guildId, period: 'all' },
        { jobId: `lb:${s.guildId}:${bucket}` },
      );
    }
    logger.debug({ guilds: settings.length }, 'enqueued leaderboard refreshes');
    return settings.length;
  }

  return { enqueueDueGuilds };
}

export default createLeaderboardScheduler;
