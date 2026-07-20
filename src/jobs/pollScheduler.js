import { createLogger } from '../core/logger.js';

const BATCH = 500;
const REQUEUE_MS = 5 * 60 * 1000;

/**
 * The adaptive polling loop.
 *
 *  reconcile()   — seed the Redis ZSET from Mongo (NX), so newly-linked or
 *                  restarted accounts self-heal into the due-set.
 *  dispatchDue() — pull members due now, tentatively push them forward (so a
 *                  slow poll job isn't re-popped), and enqueue riot-fetch jobs.
 *
 * NOTE: for correctness with multiple scheduler replicas, wrap tick() in a Redis
 * leader lock (a future hardening). The tentative-requeue + job-id dedupe already
 * make accidental double-dispatch cheap rather than harmful.
 */
export function createPollScheduler({
  pollStore,
  repositories,
  riotFetchQueue,
  logger = createLogger('poll-scheduler'),
}) {
  async function reconcile() {
    const due = await repositories.summoners.findDue(new Date(), BATCH);
    if (!due.length) return 0;
    const pairs = due.map((s) => [
      s.nextCheckAt?.getTime() ?? Date.now(),
      String(s._id),
    ]);
    await pollStore.scheduleNewOnly(pairs);
    return due.length;
  }

  async function dispatchDue() {
    const now = Date.now();
    const members = await pollStore.dueBefore(now, BATCH);
    if (!members.length) return 0;

    await pollStore.tentativeRequeue(members, now + REQUEUE_MS);

    const bucket = Math.floor(now / 1000);
    for (const summonerId of members) {
      await riotFetchQueue().add(
        'poll',
        { summonerId },
        { jobId: `poll:${summonerId}:${bucket}` },
      );
    }
    return members.length;
  }

  async function tick() {
    try {
      const seeded = await reconcile();
      const dispatched = await dispatchDue();
      if (seeded || dispatched) {
        logger.debug({ seeded, dispatched }, 'poll tick');
      }
    } catch (err) {
      logger.error({ err }, 'poll tick failed');
    }
  }

  return { tick, reconcile, dispatchDue };
}
