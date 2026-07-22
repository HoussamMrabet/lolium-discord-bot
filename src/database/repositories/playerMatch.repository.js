import { BaseRepository, toObjectId } from './base.repository.js';

export class PlayerMatchRepository extends BaseRepository {
  /** Idempotent write of a tracked player's line for a match. */
  upsertForMatch(summonerId, matchId, data) {
    return this.upsert({ summonerId, matchId }, { $set: { ...data, summonerId, matchId } });
  }

  recent(summonerId, limit = 10) {
    return this.model
      .find({ summonerId })
      .sort({ gameEndAt: -1 })
      .limit(limit)
      .exec();
  }

  /** Recent games across a set of summoners (for the dashboard match feed). */
  recentForSummoners(summonerIds, limit = 20) {
    return this.model
      .find({ summonerId: { $in: summonerIds.map(toObjectId) } })
      .sort({ gameEndAt: -1 })
      .limit(limit)
      .exec();
  }

  recentByQueue(summonerId, queueId, limit = 10) {
    return this.model
      .find({ summonerId, queueId })
      .sort({ gameEndAt: -1 })
      .limit(limit)
      .exec();
  }

  /** Lifetime aggregate stats for /stats and profile embeds. */
  async lifetimeStats(summonerId, { queueId } = {}) {
    const match = { summonerId: toObjectId(summonerId) };
    if (queueId) match.queueId = queueId;
    const [row] = await this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          games: { $sum: 1 },
          wins: { $sum: { $cond: ['$win', 1, 0] } },
          kills: { $sum: '$kills' },
          deaths: { $sum: '$deaths' },
          assists: { $sum: '$assists' },
          avgCsPerMin: { $avg: '$csPerMin' },
          avgVision: { $avg: '$visionScore' },
          avgDamage: { $avg: '$damage' },
          avgKp: { $avg: '$killParticipation' },
          pentaKills: { $sum: '$pentaKills' },
        },
      },
    ]);
    return row ?? null;
  }

  /** Per-champion breakdown, most-played first (champion pool / favorite). */
  championStats(summonerId, limit = 20) {
    return this.model
      .aggregate([
        { $match: { summonerId: toObjectId(summonerId) } },
        {
          $group: {
            _id: { championId: '$championId', championName: '$championName' },
            games: { $sum: 1 },
            wins: { $sum: { $cond: ['$win', 1, 0] } },
            kills: { $sum: '$kills' },
            deaths: { $sum: '$deaths' },
            assists: { $sum: '$assists' },
          },
        },
        { $sort: { games: -1 } },
        { $limit: limit },
      ])
      .exec();
  }

  /**
   * One aggregation that feeds most leaderboard categories: per summoner, over a
   * time window, the games/wins/damage/kda/vision/pentas.
   */
  leaderboardAggregate(summonerIds, since) {
    return this.model
      .aggregate([
        {
          $match: {
            summonerId: { $in: summonerIds.map(toObjectId) },
            gameEndAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$summonerId',
            games: { $sum: 1 },
            wins: { $sum: { $cond: ['$win', 1, 0] } },
            totalDamage: { $sum: '$damage' },
            avgKda: { $avg: '$kda' },
            totalVision: { $sum: '$visionScore' },
            pentaKills: { $sum: '$pentaKills' },
          },
        },
      ])
      .exec();
  }

  /**
   * Single-game extremes over a window (best/worst KDA, biggest int, biggest
   * carry) for recaps, in one query via $facet.
   */
  async recapExtremes(summonerIds, since) {
    const match = {
      summonerId: { $in: summonerIds.map(toObjectId) },
      gameEndAt: { $gte: since },
    };
    const [row] = await this.model.aggregate([
      { $match: match },
      {
        $facet: {
          bestKda: [{ $sort: { kda: -1 } }, { $limit: 1 }],
          worstKda: [{ $sort: { kda: 1 } }, { $limit: 1 }],
          biggestInt: [{ $sort: { deaths: -1 } }, { $limit: 1 }],
          biggestCarry: [{ $sort: { damageShare: -1 } }, { $limit: 1 }],
          totals: [{ $group: { _id: null, games: { $sum: 1 } } }],
        },
      },
    ]);
    return {
      bestKda: row?.bestKda?.[0] ?? null,
      worstKda: row?.worstKda?.[0] ?? null,
      biggestInt: row?.biggestInt?.[0] ?? null,
      biggestCarry: row?.biggestCarry?.[0] ?? null,
      games: row?.totals?.[0]?.games ?? 0,
    };
  }

  /** Role/position distribution for the stats embed. */
  roleDistribution(summonerId) {
    return this.model
      .aggregate([
        { $match: { summonerId: toObjectId(summonerId), role: { $ne: null } } },
        { $group: { _id: '$role', games: { $sum: 1 } } },
        { $sort: { games: -1 } },
      ])
      .exec();
  }
}

export default PlayerMatchRepository;
