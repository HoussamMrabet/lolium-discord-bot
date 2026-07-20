import {
  computePollTier,
  computeNextCheckAt,
  staggerFor,
} from '../services/polling.service.js';

const STAGGER_WINDOW_MS = 30_000;
const DORMANT_ORPHAN_MS = 6 * 60 * 60 * 1000;

/**
 * riot-fetch worker: for one due summoner, fetch recent match ids, enqueue
 * match-process jobs for the new ones (oldest-first), and reschedule the next
 * poll based on activity. The Riot rate limiter (inside the client) keeps total
 * throughput safe regardless of how many workers run.
 */
export function createRiotFetchProcessor({
  repositories,
  riot,
  matchProcessQueue,
  pollStore,
  logger,
}) {
  return async function process(job) {
    const { summonerId } = job.data;
    const summoner = await repositories.summoners.findById(summonerId);
    if (!summoner) {
      await pollStore.remove(summonerId);
      return { skipped: 'no-summoner' };
    }

    // Orphaned (no guild tracks it) — stop actively polling.
    if ((summoner.trackedGuildCount ?? 0) <= 0) {
      await pollStore.remove(summonerId);
      await repositories.summoners.setPolling(summoner.puuid, {
        pollTier: 'dormant',
        nextCheckAt: new Date(Date.now() + DORMANT_ORPHAN_MS),
      });
      return { skipped: 'orphan' };
    }

    const startTime = summoner.lastMatchStartAt
      ? Math.floor(summoner.lastMatchStartAt.getTime() / 1000)
      : undefined;
    // On first ever poll, only look at the most recent few to avoid backfilling
    // a whole match history.
    const count = startTime ? 10 : 3;

    let ids = await riot.getMatchIds({
      puuid: summoner.puuid,
      platform: summoner.platform,
      count,
      startTime,
    });
    ids = Array.isArray(ids) ? ids : [];

    const newIds = [];
    for (const id of ids) {
      const exists = await repositories.playerMatches.findOne({
        summonerId: summoner._id,
        matchId: id,
      });
      if (!exists) newIds.push(id);
    }
    newIds.reverse(); // process oldest -> newest for correct LP attribution

    for (const matchId of newIds) {
      await matchProcessQueue().add(
        'process',
        {
          matchId,
          platform: summoner.platform,
          summonerId: String(summoner._id),
          puuid: summoner.puuid,
        },
        { jobId: `mp:${summoner._id}:${matchId}` },
      );
    }

    const hadNewMatch = newIds.length > 0;
    const tier = computePollTier({
      lastMatchStartAt: summoner.lastMatchStartAt,
      hadNewMatch,
    });
    const nextCheckAt = computeNextCheckAt(
      tier,
      Date.now(),
      staggerFor(summoner.puuid, STAGGER_WINDOW_MS),
    );

    await repositories.summoners.setPolling(summoner.puuid, {
      pollTier: tier,
      nextCheckAt,
      lastPolledAt: new Date(),
    });
    await pollStore.schedule(String(summoner._id), nextCheckAt.getTime());

    logger.debug(
      { summonerId, newMatches: newIds.length, tier },
      'polled summoner',
    );
    return { newMatches: newIds.length, tier };
  };
}
