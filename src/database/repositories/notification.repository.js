import { BaseRepository } from './base.repository.js';

export class NotificationRepository extends BaseRepository {
  /**
   * Claim a dedupeKey. Uses an upsert with `$setOnInsert` so only the FIRST
   * caller creates the row; `inserted` tells the dispatcher whether it owns the
   * send. This is what guarantees a match alert posts to a guild exactly once,
   * even across retries, restarts, and duplicate jobs.
   *
   * @returns {Promise<{ inserted: boolean }>}
   */
  async claim({ guildId, channelId, type, dedupeKey, payload = {}, scheduledFor = new Date() }) {
    const res = await this.model
      .updateOne(
        { dedupeKey },
        {
          $setOnInsert: {
            guildId,
            channelId,
            type,
            dedupeKey,
            payload,
            status: 'pending',
            attempts: 0,
            scheduledFor,
          },
        },
        { upsert: true },
      )
      .exec();
    return { inserted: (res.upsertedCount ?? 0) > 0 };
  }

  markSent(dedupeKey, messageId) {
    return this.updateOne(
      { dedupeKey },
      { $set: { status: 'sent', sentAt: new Date(), messageId, lastError: null } },
    );
  }

  markFailed(dedupeKey, error) {
    return this.updateOne(
      { dedupeKey },
      {
        $set: { status: 'failed', lastError: String(error).slice(0, 500) },
        $inc: { attempts: 1 },
      },
    );
  }

  markSkipped(dedupeKey, reason = null) {
    return this.updateOne(
      { dedupeKey },
      { $set: { status: 'skipped', lastError: reason } },
    );
  }

  /** Transient failure: bump the attempt counter but keep it pending for retry. */
  recordFailure(dedupeKey, error) {
    return this.updateOne(
      { dedupeKey },
      { $inc: { attempts: 1 }, $set: { lastError: String(error).slice(0, 500) } },
    );
  }

  findPending(limit = 100) {
    return this.model
      .find({ status: 'pending', scheduledFor: { $lte: new Date() } })
      .sort({ scheduledFor: 1 })
      .limit(limit)
      .exec();
  }
}

export default NotificationRepository;
