import { BaseRepository } from './base.repository.js';

export class GuildRepository extends BaseRepository {
  /** Create or refresh a guild record when the bot joins / on ready. */
  upsertOnJoin({
    id,
    name,
    iconHash = null,
    ownerId = null,
    shardId = 0,
    locale = 'en-US',
    memberCount = 0,
  }) {
    return this.upsert(
      { _id: id },
      {
        $set: { name, iconHash, ownerId, shardId, locale, memberCount, active: true, leftAt: null },
        $setOnInsert: { joinedAt: new Date() },
      },
    );
  }

  /** Soft-delete on guildDelete — keep history, stop treating as active. */
  markInactive(guildId) {
    return this.updateOne(
      { _id: guildId },
      { $set: { active: false, leftAt: new Date() } },
    );
  }

  findActive(projection = null) {
    return this.find({ active: true }, projection);
  }

  countActive() {
    return this.countDocuments({ active: true });
  }
}

export default GuildRepository;
