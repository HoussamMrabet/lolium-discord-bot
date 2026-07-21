import { BaseRepository, toObjectId } from './base.repository.js';

export class LPHistoryRepository extends BaseRepository {
  /**
   * Record an LP event. Idempotent via the unique
   * (summonerId, queueType, matchId) index — a duplicate silently no-ops and
   * returns null, so re-processing a match never double-counts LP.
   */
  async record(entry) {
    try {
      return await this.create(entry);
    } catch (err) {
      if (err?.code === 11000) return null;
      throw err;
    }
  }

  /** Sum LP gained/lost over a window (drives recaps and "Most LP Gained"). */
  async sumDelta(summonerId, queueType, since) {
    const [row] = await this.model.aggregate([
      {
        $match: {
          summonerId: toObjectId(summonerId),
          queueType,
          at: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$delta' },
          games: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'W'] }, 1, 0] } },
        },
      },
    ]);
    return row ?? { total: 0, games: 0, wins: 0 };
  }

  /** Net LP gained per summoner over a window (for the "Most LP Gained" board). */
  leaderboardAggregate(summonerIds, since) {
    return this.model
      .aggregate([
        {
          $match: {
            summonerId: { $in: summonerIds.map(toObjectId) },
            at: { $gte: since },
          },
        },
        { $group: { _id: '$summonerId', total: { $sum: '$delta' } } },
      ])
      .exec();
  }

  history(summonerId, queueType, limit = 50) {
    return this.model
      .find({ summonerId, queueType })
      .sort({ at: -1 })
      .limit(limit)
      .exec();
  }
}

export default LPHistoryRepository;
