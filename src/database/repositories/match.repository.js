import { BaseRepository } from './base.repository.js';

export class MatchRepository extends BaseRepository {
  findByMatchId(matchId) {
    return this.findById(matchId);
  }

  existsByMatchId(matchId) {
    return this.exists({ _id: matchId });
  }

  /**
   * Insert a match only if we've never seen it. Returns `{ inserted }` so the
   * caller knows whether a Riot fetch was actually needed / whether to process.
   */
  async insertIfAbsent(match) {
    const res = await this.model
      .updateOne({ _id: match._id }, { $setOnInsert: match }, { upsert: true })
      .exec();
    return { inserted: (res.upsertedCount ?? 0) > 0 };
  }

  /** Given candidate ids, return the subset we already have stored. */
  async findExistingIds(ids) {
    const docs = await this.model
      .find({ _id: { $in: ids } }, { _id: 1 })
      .lean()
      .exec();
    return docs.map((d) => d._id);
  }

  findByPuuid(puuid, limit = 20) {
    return this.model
      .find({ 'participants.puuid': puuid })
      .sort({ gameEndAt: -1 })
      .limit(limit)
      .exec();
  }
}

export default MatchRepository;
