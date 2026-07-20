/**
 * Read-only statistics service. Aggregates the PlayerMatch read-model (populated
 * by match processing) into lifetime stats, champion pool, and role
 * distribution. Returns empty-ish results until matches have been processed.
 */
export function createStatsService({ repositories }) {
  async function lifetime(summonerId, { queueId } = {}) {
    const [stats, champions, roles] = await Promise.all([
      repositories.playerMatches.lifetimeStats(summonerId, { queueId }),
      repositories.playerMatches.championStats(summonerId, 5),
      repositories.playerMatches.roleDistribution(summonerId),
    ]);
    return { stats, champions, roles };
  }

  function recentGames(summonerId, limit = 10) {
    return repositories.playerMatches.recent(summonerId, limit);
  }

  return { lifetime, recentGames };
}

export default createStatsService;
