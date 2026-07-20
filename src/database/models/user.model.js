import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Global Discord user profile (across all guilds). Primarily supports dashboard
 * OAuth login and cross-guild identity. `_id` is the Discord user snowflake.
 */
const userSchema = new Schema(
  {
    _id: { type: String, required: true }, // Discord user id (snowflake)
    username: { type: String, default: null },
    globalName: { type: String, default: null },
    avatar: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
