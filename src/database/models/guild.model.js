import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A Discord server the bot belongs to. `_id` is the Discord guild snowflake, so
 * lookups by guild id are index-free primary-key hits. `active` flips to false
 * on guildDelete instead of hard-deleting, preserving history.
 */
const guildSchema = new Schema(
  {
    _id: { type: String, required: true }, // Discord guild id (snowflake)
    name: { type: String, required: true },
    iconHash: { type: String, default: null },
    ownerId: { type: String, default: null },
    shardId: { type: Number, default: 0 },
    locale: { type: String, default: 'en-US' },
    premiumTier: { type: Number, default: 0 },
    memberCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

guildSchema.index({ active: 1 });
guildSchema.index({ ownerId: 1 });

export const Guild =
  mongoose.models.Guild || mongoose.model('Guild', guildSchema);

export default Guild;
