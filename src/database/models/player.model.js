import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * The JOIN between a Discord user and a Summoner, scoped to one guild.
 *
 * This is what enables:
 *  - multiple Riot accounts per Discord user (many Players, same discordUserId)
 *  - the same Riot account tracked in many guilds while polled once
 *    (many Players -> one Summoner)
 *
 * `puuid` is denormalized from Summoner so match fan-out ("which guilds track
 * this puuid?") is a single indexed query with no populate.
 */
const playerSchema = new Schema(
  {
    guildId: { type: String, required: true },
    discordUserId: { type: String, required: true },
    summonerId: {
      type: Schema.Types.ObjectId,
      ref: 'Summoner',
      required: true,
    },
    puuid: { type: String, required: true },
    verified: { type: Boolean, default: false },
    primary: { type: Boolean, default: false },
    nickname: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

// A user cannot link the same summoner twice in one guild.
playerSchema.index(
  { guildId: 1, discordUserId: 1, summonerId: 1 },
  { unique: true },
);
playerSchema.index({ summonerId: 1 }); // fan-out on match processing
playerSchema.index({ puuid: 1 }); // fan-out without populate
playerSchema.index({ guildId: 1 }); // guild management / leaderboards
playerSchema.index({ guildId: 1, discordUserId: 1 }); // a user's accounts in a guild

export const Player =
  mongoose.models.Player || mongoose.model('Player', playerSchema);

export default Player;
