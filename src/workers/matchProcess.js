/**
 * match-process worker: persist a match and the tracked summoner's derived
 * record, and update LP/rank/streak (via the match-processing service).
 *
 * Notification fan-out (match alerts, promotions, streak milestones) is added in
 * Phase 7b — this worker will then hand `result` to the notification service.
 */
export function createMatchProcessProcessor({ services, logger }) {
  return async function process(job) {
    const { matchId, platform, summonerId, puuid } = job.data;
    const result = await services.matchProcessing.processMatchForSummoner({
      matchId,
      platform,
      summonerId,
      puuid,
    });
    if (!result) return { skipped: true };

    logger.debug(
      {
        matchId,
        summonerId,
        bucket: result.performanceBucket,
        lpDelta: result.rankEvent?.lpDelta ?? null,
        promotion: result.rankEvent?.promotion ?? false,
      },
      'processed match',
    );
    return { processed: true, alreadyProcessed: result.alreadyProcessed };
  };
}
