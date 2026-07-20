import { BaseRepository } from './base.repository.js';

export class PlayerRepository extends BaseRepository {
  /** Link a Discord user to a summoner in a guild (idempotent). */
  link({ guildId, discordUserId, summonerId, puuid, primary = false, nickname = null }) {
    return this.upsert(
      { guildId, discordUserId, summonerId },
      {
        $set: { puuid, nickname },
        $setOnInsert: { primary },
      },
    );
  }

  unlink({ guildId, discordUserId, summonerId }) {
    return this.deleteOne({ guildId, discordUserId, summonerId });
  }

  listByUser(guildId, discordUserId) {
    return this.find({ guildId, discordUserId });
  }

  listByGuild(guildId, projection = null) {
    return this.find({ guildId }, projection);
  }

  /** Every guild-link for a puuid — the match-alert fan-out query. */
  findGuildsTrackingPuuid(puuid) {
    return this.find({ puuid });
  }

  countByUser(guildId, discordUserId) {
    return this.countDocuments({ guildId, discordUserId });
  }

  countByGuild(guildId) {
    return this.countDocuments({ guildId });
  }

  /** Distinct puuids tracked by a guild (for leaderboard scoping). */
  distinctPuuidsByGuild(guildId) {
    return this.distinct('puuid', { guildId });
  }

  isTrackedAnywhere(puuid) {
    return this.exists({ puuid });
  }
}

export default PlayerRepository;
