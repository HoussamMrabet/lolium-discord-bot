import { BaseRepository } from './base.repository.js';

export class UserRepository extends BaseRepository {
  /** Upsert a Discord profile on OAuth login. */
  upsertProfile({ id, username = null, globalName = null, avatar = null }) {
    return this.upsert(
      { _id: id },
      { $set: { username, globalName, avatar, lastLoginAt: new Date() } },
    );
  }
}

export default UserRepository;
