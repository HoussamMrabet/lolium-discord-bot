import { BaseRepository } from './base.repository.js';

export class RankHistoryRepository extends BaseRepository {
  record(entry) {
    return this.create(entry);
  }

  latest(summonerId, queueType) {
    return this.model
      .findOne({ summonerId, queueType })
      .sort({ at: -1 })
      .exec();
  }

  /** Ordered ascending for graphing rank progression over a window. */
  series(summonerId, queueType, since) {
    return this.model
      .find({ summonerId, queueType, at: { $gte: since } })
      .sort({ at: 1 })
      .exec();
  }
}

export default RankHistoryRepository;
