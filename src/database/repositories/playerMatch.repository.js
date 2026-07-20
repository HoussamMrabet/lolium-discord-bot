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
