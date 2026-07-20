import { BaseRepository } from './base.repository.js';

export class RoleSyncRepository extends BaseRepository {
  log(entry) {
    return this.create({ ...entry, at: new Date() });
  }

  recentForUser(guildId, discordUserId, limit = 20) {
    return this.model
      .find({ guildId, discordUserId })
      .sort({ at: -1 })
      .limit(limit)
      .exec();
  }

  recentForGuild(guildId, limit = 50) {
    return this.model.find({ guildId }).sort({ at: -1 }).limit(limit).exec();
  }
}

export default RoleSyncRepository;
