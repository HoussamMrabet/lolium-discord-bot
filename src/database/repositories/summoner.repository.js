import { BaseRepository } from './base.repository.js';

export class SummonerRepository extends BaseRepository {
  findByPuuid(puuid) {
    return this.findOne({ puuid });
  }

  findByPuuids(puuids) {
    return this.find({ puuid: { $in: puuids } });
  }

  /** Create or refresh the identity fields of a globally-deduped summoner. */
  upsertIdentity({
    puuid,
    platform,
    regionalRoute,
    accountRoute,
    riotId,
    summonerLevel = 0,
    profileIconId = 0,
  }) {
    return this.upsert(
      { puuid },
      {
        $set: { platform, regionalRoute, accountRoute, riotId, summonerLevel, profileIconId },
        $setOnInsert: { nextCheckAt: new Date() },
      },
    );
  }

  updateRankedSnapshot(puuid, queueType, entry) {
    return this.updateOne(
      { puuid },
      { $set: { [`ranked.${queueType}`]: { ...entry, updatedAt: new Date() } } },
    );
  }

  /** Update polling bookkeeping after a check; only sets provided fields. */
  setPolling(puuid, fields) {
    const allowed = [
      'pollTier',
      'nextCheckAt',
      'lastPolledAt',
      'lastMatchId',
      'lastMatchStartAt',
    ];
    const set = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) set[key] = fields[key];
    }
    return this.updateOne({ puuid }, { $set: set });
  }

  updateStreak(puuid, streak) {
    return this.updateOne({ puuid }, { $set: { streak } });
  }

  incTrackedGuildCount(puuid, delta) {
    return this.findOneAndUpdate(
      { puuid },
      { $inc: { trackedGuildCount: delta } },
    );
  }

  /**
   * Fallback due-scan (the primary due-set lives in a Redis ZSET). Useful for
   * reconciliation and for seeding the ZSET on boot.
   */
  findDue(now = new Date(), limit = 500) {
    return this.model
      .find({ nextCheckAt: { $lte: now } })
      .sort({ nextCheckAt: 1 })
      .limit(limit)
      .exec();
  }
}

export default SummonerRepository;
