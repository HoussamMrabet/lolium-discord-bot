import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Audit log of applied Discord role changes (the tier->role config itself lives
 * on GuildSettings.roles). Gives observability and a paper trail for permission
 * failures, and lets the reconciler avoid re-applying no-op changes.
 */
const roleSyncSchema = new Schema(
  {
    guildId: { type: String, required: true },
    discordUserId: { type: String, required: true },
    action: { type: String, enum: ['add', 'remove'], required: true },
    roleId: { type: String, required: true },
    tier: { type: String, default: null },
    reason: { type: String, default: null },
    success: { type: Boolean, default: false },
    error: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

roleSyncSchema.index({ guildId: 1, at: -1 });
roleSyncSchema.index({ guildId: 1, discordUserId: 1, at: -1 });

export const RoleSync =
  mongoose.models.RoleSync || mongoose.model('RoleSync', roleSyncSchema);

export default RoleSync;
