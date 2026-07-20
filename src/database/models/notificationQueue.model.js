import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../../config/constants.js';

const { Schema } = mongoose;

/**
 * Durable outbox for every Discord message the system sends. BullMQ provides
 * at-least-once delivery; the unique `dedupeKey` here upgrades that to
 * effectively-once — the same alert can never be posted twice, even across
 * retries, restarts, or duplicate jobs.
 *
 * dedupeKey convention: `${type}:${guildId}:${matchId}:${summonerId}`.
 */
const notificationQueueSchema = new Schema(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    dedupeKey: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    scheduledFor: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    messageId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

// dedupeKey already uniquely-indexed via `unique: true`.
notificationQueueSchema.index({ status: 1, scheduledFor: 1 });
notificationQueueSchema.index({ guildId: 1, type: 1, createdAt: -1 });

export const NotificationQueue =
  mongoose.models.NotificationQueue ||
  mongoose.model('NotificationQueue', notificationQueueSchema);

export default NotificationQueue;
