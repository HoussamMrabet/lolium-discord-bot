import { BaseRepository } from './base.repository.js';

export class LeaderboardRepository extends BaseRepository {
  get(guildId, category, period) {
    return this.findOne({ guildId, category, period });
  }

  /** Store freshly computed entries for a slice. */
  save(guildId, category, period, entries) {
    return this.upsert(
      { guildId, category, period },
      { $set: { entries, computedAt: new Date() } },
    );
  }

  /** Remember which message to edit in place on the next refresh. */
  setMessageRef(guildId, category, period, channelId, messageId) {
    return this.upsert(
      { guildId, category, period },
      {
        $set: {
          'message.channelId': channelId,
          'message.messageId': messageId,
        },
      },
    );
  }

  listByGuild(guildId) {
    return this.find({ guildId });
  }
}

export default LeaderboardRepository;
