import { BaseRepository } from './base.repository.js';

export class GuildSettingsRepository extends BaseRepository {
  getByGuild(guildId) {
    return this.findOne({ guildId });
  }

  /** Idempotently ensure a settings doc exists (schema defaults on insert). */
  getOrCreate(guildId) {
    return this.upsert({ guildId }, { $setOnInsert: { guildId } });
  }

  /** @param {'alerts'|'leaderboard'|'recaps'|'betting'} key */
  setChannel(guildId, key, channelId) {
    return this.upsert(
      { guildId },
      { $set: { [`channels.${key}`]: channelId } },
    );
  }

  setRole(guildId, tier, roleId) {
    return this.upsert({ guildId }, { $set: { [`roles.${tier}`]: roleId } });
  }

  removeRole(guildId, tier) {
    return this.upsert({ guildId }, { $unset: { [`roles.${tier}`]: '' } });
  }

  setFeature(guildId, feature, enabled) {
    return this.upsert(
      { guildId },
      { $set: { [`features.${feature}`]: Boolean(enabled) } },
    );
  }

  /** Apply a validated partial patch (e.g. recap schedule, locale). */
  patch(guildId, set) {
    return this.upsert({ guildId }, { $set: set });
  }

  /** Guilds that have a given channel configured (e.g. 'leaderboard'). */
  findWithChannel(key) {
    return this.find({ [`channels.${key}`]: { $ne: null } });
  }

  /** Guilds with automatic rank-role syncing enabled. */
  findRoleSyncEnabled() {
    return this.find({ 'features.roleSync': true });
  }

  setBettingSeason(guildId, seasonId) {
    return this.upsert({ guildId }, { $set: { bettingSeasonId: seasonId } });
  }

  /** Records that a recap for a given cadence has been dispatched (dedupe). */
  markRecap(guildId, period, key) {
    return this.upsert({ guildId }, { $set: { [`lastRecap.${period}`]: key } });
  }

  /** Guilds that have a recaps channel configured. */
  findWithRecaps() {
    return this.find({ 'channels.recaps': { $ne: null } });
  }
}

export default GuildSettingsRepository;
