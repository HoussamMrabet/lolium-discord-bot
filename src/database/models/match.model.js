import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One participant's line in a match, trimmed to the fields we render or need for
 * derived metrics (MVP, team damage share, "most deaths on team" betting). All
 * 10 participants are kept so those team-relative computations are possible.
 */
const participantSchema = new Schema(
  {
    puuid: { type: String, required: true },
    gameName: { type: String, default: null },
    tagLine: { type: String, default: null },
    championId: { type: Number, required: true },
    championName: { type: String, required: true },
    teamId: { type: Number, required: true }, // 100 or 200
    teamPosition: { type: String, default: '' },
    win: { type: Boolean, required: true },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    totalDamageToChampions: { type: Number, default: 0 },
    totalMinionsKilled: { type: Number, default: 0 },
    neutralMinionsKilled: { type: Number, default: 0 },
    cs: { type: Number, default: 0 },
    csPerMin: { type: Number, default: 0 },
    visionScore: { type: Number, default: 0 },
    goldEarned: { type: Number, default: 0 },
    champLevel: { type: Number, default: 0 },
    items: { type: [Number], default: [] }, // 7 slots (6 items + trinket)
    summonerSpells: { type: [Number], default: [] }, // [spell1, spell2]
    perks: {
      primaryStyle: { type: Number, default: 0 },
      subStyle: { type: Number, default: 0 },
      keystone: { type: Number, default: 0 },
      selections: { type: [Number], default: [] },
      statPerks: { type: [Number], default: [] },
    },
    doubleKills: { type: Number, default: 0 },
    tripleKills: { type: Number, default: 0 },
    quadraKills: { type: Number, default: 0 },
    pentaKills: { type: Number, default: 0 },
    killParticipation: { type: Number, default: 0 },
    damageShare: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * Immutable canonical match record. `_id` is the Riot match id (e.g. NA1_123).
 * Fetched from Riot exactly once and kept forever — this permanent store is the
 * single biggest saver of Riot API budget (we never re-fetch a known match).
 */
const matchSchema = new Schema(
  {
    _id: { type: String, required: true }, // Riot match id
    queueId: { type: Number, required: true },
    gameMode: { type: String, default: null },
    gameType: { type: String, default: null },
    gameVersion: { type: String, default: null },
    platformId: { type: String, default: null },
    mapId: { type: Number, default: null },
    gameCreation: { type: Date, default: null },
    gameStartAt: { type: Date, default: null },
    gameEndAt: { type: Date, default: null },
    gameDuration: { type: Number, default: 0 }, // seconds
    participants: { type: [participantSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

matchSchema.index({ queueId: 1 });
matchSchema.index({ gameEndAt: -1 });
matchSchema.index({ 'participants.puuid': 1, gameEndAt: -1 });

export const Match =
  mongoose.models.Match || mongoose.model('Match', matchSchema);

export default Match;
