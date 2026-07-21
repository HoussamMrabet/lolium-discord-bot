/**
 * match-process worker: persist a match and the tracked summoner's derived
 * record (LP/rank/streak via the match-processing service), then hand the result
 * to the notification service to fan out per-guild alerts.
 *
 * Notifications only fire for freshly-processed games (`!alreadyProcessed`), so
 * reprocessing never re-alerts; the outbox dedupeKey is the final safety net.
 */
export function createMatchProcessProcessor({ services, notifications, roleTrigger, logger }) {
  return async function process(job) {
    const { matchId, platform, summonerId, puuid } = job.data;
    const result = await services.matchProcessing.processMatchForSummoner({
      matchId,
      platform,
      summonerId,
      puuid,
    });
    if (!result) return { skipped: true };

    let enqueued = 0;
    if (notifications && !result.alreadyProcessed) {
      ({ enqueued } = await notifications.fanOutMatch({ puuid, summonerId, result }));
    }

    // On a tier change, reconcile rank roles for this member in each guild.
    const rankEvent = result.rankEvent;
    if (
      roleTrigger &&
      !result.alreadyProcessed &&
      rankEvent &&
      (rankEvent.promotion || rankEvent.demotion)
    ) {
      await roleTrigger.onRankChange({ puuid });
    }

    logger.debug(
      {
        matchId,
        summonerId,
        bucket: result.performanceBucket,
        lpDelta: result.rankEvent?.lpDelta ?? null,
        promotion: result.rankEvent?.promotion ?? false,
        enqueued,
      },
      'processed match',
    );
    return { processed: true, alreadyProcessed: result.alreadyProcessed, enqueued };
  };
}
