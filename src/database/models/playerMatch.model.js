import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Per-tracked-summoner, per-match derived record — the FAST read model for
 * stats, leaderboards, and recaps. Aggregating these avoids ever scanning full
 * Match documents. Ranked-only fields (queueType/lpDelta/absoluteLpAfter) are
 * null for normal games.
 */
const playerMatchSchema = new Schema(
  {
    summonerId: {
      type: Schema.Types.ObjectId,
      ref: 'Summoner',
      required: true,
    },
    puuid: { type: String, required: true },
    matchId: { type: String, required: true, ref: 'Match' },
    queueId: { type: Number, required: true },
    gameEndAt: { type: Date, required: true },
    gameDuration: { type: Number, default: 0 },
    championId: { type: Number, default: 0 },
    championName: { type: String, default: null },
    role: { type: String, default: null },
    win: { type: Boolean, default: false },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    kda: { type: Number, default: 0 },
    damage: { type: Number, default: 0 },
    damageShare: { type: Number, default: 0 },
    cs: { type: Number, default: 0 },
    csPerMin: { type: Number, default: 0 },
    visionScore: { type: Number, default: 0 },
    killParticipation: { type: Number, default: 0 },
    goldEarned: { type: Number, default: 0 },
    pentaKills: { type: Number, default: 0 },
    multikillMax: { type: Number, default: 0 },
    mvp: { type: Boolean, default: false },
    performanceBucket: { type: String, default: null },
    // Ranked context (null for non-ranked queues)
    queueType: { type: String, default: null },
    lpDelta: { type: Number, default: null },
    absoluteLpAfter: { type: Number, default: null },
  },
  { timestamps: true, versionKey: false },
);

playerMatchSchema.index({ summonerId: 1, matchId: 1 }, { unique: true });
playerMatchSchema.index({ summonerId: 1, gameEndAt: -1 });
playerMatchSchema.index({ puuid: 1, gameEndAt: -1 });
playerMatchSchema.index({ queueId: 1, gameEndAt: -1 });

export const PlayerMatch =
  mongoose.models.PlayerMatch ||
  mongoose.model('PlayerMatch', playerMatchSchema);

export default PlayerMatch;
