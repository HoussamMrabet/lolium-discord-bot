import { LEADERBOARD_CATEGORIES } from '../config/constants.js';

const TOP_N = 10;
const MIN_GAMES_WIN_RATE = 10;
const MIN_GAMES_KDA = 5;
const DAY = 24 * 60 * 60 * 1000;

const C = LEADERBOARD_CATEGORIES;

/**
 * Computes server leaderboards by aggregating the guild's tracked summoners.
 * One PlayerMatch aggregation feeds most categories; rank/streak come from the
 * Summoner snapshot; LP-gained from the LPHistory ledger. Pure over
 * repositories (no Discord), so it's used both by the /leaderboard command and
 * the leaderboard-compute worker.
 */
export function createLeaderboardService({ repositories }) {
  function sinceFor(period) {
    const now = Date.now();
    if (period === 'daily') return new Date(now - DAY);
    if (period === 'weekly') return new Date(now - 7 * DAY);
    if (period === 'monthly') return new Date(now - 30 * DAY);
    return new Date(0); // all / season
  }

  async function guildContext(guildId) {
    const players = await repositories.players.listByGuild(guildId);
    if (!players.length) return { summoners: [], idToSummoner: new Map(), playerByPuuid: new Map() };

    const puuids = [...new Set(players.map((p) => p.puuid))];
    const summoners = await repositories.summoners.findByPuuids(puuids);

    const idToSummoner = new Map(summoners.map((s) => [String(s._id), s]));
    const playerByPuuid = new Map();
    for (const p of players) {
      if (!playerByPuuid.has(p.puuid)) playerByPuuid.set(p.puuid, p);
    }
    return { summoners, idToSummoner, playerByPuuid };
  }

  function toEntries(rows, playerByPuuid) {
    return rows
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_N)
      .map((r, i) => {
        const player = playerByPuuid.get(r.summoner.puuid);
        return {
          summonerId: r.summoner._id,
          discordUserId: player?.discordUserId ?? null,
          puuid: r.summoner.puuid,
          displayName:
            player?.nickname ||
            `${r.summoner.riotId.gameName}#${r.summoner.riotId.tagLine}`,
          value: r.value,
          rank: i + 1,
          meta: r.meta ?? {},
        };
      });
  }

  async function compute(guildId, category, period = 'all') {
    const ctx = await guildContext(guildId);
    if (!ctx.summoners.length) return { category, period, entries: [] };

    const summonerIds = ctx.summoners.map((s) => s._id);
    const since = sinceFor(period);
    const rows = [];

    if (category === C.HIGHEST_RANK) {
      for (const s of ctx.summoners) {
        const r = s.ranked?.RANKED_SOLO_5x5;
        if (r?.tier) {
          rows.push({
            summoner: s,
            value: r.absoluteLp,
            meta: { tier: r.tier, division: r.division, lp: r.lp },
          });
        }
      }
    } else if (category === C.LONGEST_WIN_STREAK) {
      for (const s of ctx.summoners) {
        const v = s.streak?.longestWin ?? 0;
        if (v > 0) rows.push({ summoner: s, value: v });
      }
    } else if (category === C.MOST_LP_GAINED) {
      const agg = await repositories.lpHistory.leaderboardAggregate(summonerIds, since);
      for (const a of agg) {
        const s = ctx.idToSummoner.get(String(a._id));
        if (s && a.total > 0) rows.push({ summoner: s, value: a.total });
      }
    } else {
      const agg = await repositories.playerMatches.leaderboardAggregate(summonerIds, since);
      for (const a of agg) {
        const s = ctx.idToSummoner.get(String(a._id));
        if (!s) continue;
        let value = null;
        let meta;
        switch (category) {
          case C.MOST_WINS:
            value = a.wins;
            break;
          case C.MOST_GAMES:
            value = a.games;
            break;
          case C.HIGHEST_WIN_RATE:
            if (a.games >= MIN_GAMES_WIN_RATE) {
              value = Math.round((a.wins / a.games) * 100);
              meta = { games: a.games };
            }
            break;
          case C.MOST_DAMAGE:
            value = a.totalDamage;
            break;
          case C.HIGHEST_KDA:
            if (a.games >= MIN_GAMES_KDA) {
              value = Math.round((a.avgKda ?? 0) * 100) / 100;
              meta = { games: a.games };
            }
            break;
          case C.MOST_VISION:
            value = a.totalVision;
            break;
          case C.MOST_PENTAKILLS:
            value = a.pentaKills;
            break;
          default:
            value = null;
        }
        if (value !== null && value > 0) rows.push({ summoner: s, value, meta });
      }
    }

    return { category, period, entries: toEntries(rows, ctx.playerByPuuid) };
  }

  async function computeAndSave(guildId, category, period = 'all') {
    const result = await compute(guildId, category, period);
    await repositories.leaderboards.save(guildId, category, period, result.entries);
    return result;
  }

  return { compute, computeAndSave, sinceFor };
}

export default createLeaderboardService;
