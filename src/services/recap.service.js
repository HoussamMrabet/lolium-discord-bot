import { buildGuildScope, displayFor } from './guildScope.js';

const DAY = 24 * 60 * 60 * 1000;
const WINDOW = { daily: DAY, weekly: 7 * DAY, monthly: 30 * DAY };

/**
 * Builds per-guild recap data (daily/weekly/monthly) by aggregating LP history
 * and PlayerMatch records over the period. Pure over repositories (no canvas,
 * no Discord) so it's unit-testable; the worker renders charts + posts.
 */
export function createRecapService({ repositories }) {
  function sinceFor(period, now = Date.now()) {
    return new Date(now - (WINDOW[period] ?? DAY));
  }

  async function buildRecap(guildId, period, now = Date.now()) {
    const scope = await buildGuildScope(repositories, guildId);
    const empty = {
      period,
      totalGames: 0,
      mostLpGained: null,
      mostLpLost: null,
      mostGames: null,
      bestKda: null,
      worstKda: null,
      biggestCarry: null,
      biggestInt: null,
      topLpGainers: [],
      playerOfPeriod: null,
    };
    if (!scope.summoners.length) return empty;

    const since = sinceFor(period, now);
    const [lpAgg, pmAgg, extremes] = await Promise.all([
      repositories.lpHistory.leaderboardAggregate(scope.summonerIds, since),
      repositories.playerMatches.leaderboardAggregate(scope.summonerIds, since),
      repositories.playerMatches.recapExtremes(scope.summonerIds, since),
    ]);

    if (!extremes.games) return empty;

    // --- LP gained / lost ---
    const lpSorted = [...lpAgg].sort((a, b) => b.total - a.total);
    const top = lpSorted[0];
    const bottom = lpSorted[lpSorted.length - 1];

    const lpEntry = (row, guard) => {
      if (!row || !guard(row.total)) return null;
      const s = scope.idToSummoner.get(String(row._id));
      if (!s) return null;
      return { ...displayFor(scope, s), summonerId: s._id, puuid: s.puuid, value: row.total };
    };

    // --- most games ---
    const mostGamesRow = [...pmAgg].sort((a, b) => b.games - a.games)[0];
    const mostGames = (() => {
      if (!mostGamesRow) return null;
      const s = scope.idToSummoner.get(String(mostGamesRow._id));
      return s ? { ...displayFor(scope, s), value: mostGamesRow.games } : null;
    })();

    // --- single-game extremes ---
    const gameEntry = (pm) => {
      if (!pm) return null;
      const s = scope.idToSummoner.get(String(pm.summonerId));
      if (!s) return null;
      return {
        ...displayFor(scope, s),
        championName: pm.championName,
        kills: pm.kills,
        deaths: pm.deaths,
        assists: pm.assists,
        kda: pm.kda,
        damageShare: pm.damageShare,
      };
    };

    const mostLpGained = lpEntry(top, (t) => t > 0);
    const topLpGainers = lpSorted
      .filter((r) => r.total > 0)
      .slice(0, 5)
      .map((r) => {
        const s = scope.idToSummoner.get(String(r._id));
        return s ? { displayName: displayFor(scope, s).displayName, value: r.total } : null;
      })
      .filter(Boolean);

    return {
      period,
      totalGames: extremes.games,
      mostLpGained,
      mostLpLost: lpEntry(bottom, (t) => t < 0),
      mostGames,
      bestKda: gameEntry(extremes.bestKda),
      worstKda: gameEntry(extremes.worstKda),
      biggestCarry: gameEntry(extremes.biggestCarry),
      biggestInt: gameEntry(extremes.biggestInt),
      topLpGainers,
      playerOfPeriod: mostLpGained
        ? { summonerId: mostLpGained.summonerId, puuid: mostLpGained.puuid, displayName: mostLpGained.displayName }
        : null,
    };
  }

  return { buildRecap, sinceFor };
}

export default createRecapService;
