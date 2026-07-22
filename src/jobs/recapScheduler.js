import { getLocalParts } from '../utils/time.js';
import { createLogger } from '../core/logger.js';

/**
 * Timezone-aware recap scheduling. On each tick, for every guild with a recaps
 * channel, checks whether the guild's LOCAL time matches its configured recap
 * hour and whether each cadence is due (daily every day, weekly on Monday,
 * monthly on the 1st). A persisted `lastRecap` marker guarantees one post per
 * occurrence even though the scheduler ticks several times an hour.
 */
export function createRecapScheduler({
  repositories,
  recapQueue,
  logger = createLogger('recap-scheduler'),
}) {
  async function enqueueDue(now = new Date()) {
    const guilds = await repositories.guildSettings.findWithRecaps();
    let enqueued = 0;

    for (const s of guilds) {
      const tz = s.recap?.timezone || 'UTC';
      const local = getLocalParts(now, tz);
      if (local.hour !== (s.recap?.hour ?? 9)) continue;

      const due = [];
      if (s.recap?.daily && s.lastRecap?.daily !== local.dateKey) {
        due.push(['daily', local.dateKey]);
      }
      if (s.recap?.weekly && local.weekday === 1 && s.lastRecap?.weekly !== local.weekKey) {
        due.push(['weekly', local.weekKey]);
      }
      if (s.recap?.monthly && local.day === 1 && s.lastRecap?.monthly !== local.monthKey) {
        due.push(['monthly', local.monthKey]);
      }

      for (const [period, key] of due) {
        await recapQueue().add(
          'generate',
          { guildId: s.guildId, period },
          { jobId: `recap:${s.guildId}:${period}:${key}` },
        );
        await repositories.guildSettings.markRecap(s.guildId, period, key);
        enqueued += 1;
      }
    }

    if (enqueued) logger.info({ enqueued }, 'enqueued recaps');
    return enqueued;
  }

  return { enqueueDue };
}

export default createRecapScheduler;
