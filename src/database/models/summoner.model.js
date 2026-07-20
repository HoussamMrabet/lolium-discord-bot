import mongoose from 'mongoose';
import { TIERS, DIVISIONS, POLL_TIERS } from '../../config/constants.js';

const { Schema } = mongoose;

/**
 * A snapshot of a summoner's standing in one ranked queue. Embedded on Summoner
 * (current state); historical values live in RankHistory / LPHistory.
 */
const rankedEntrySchema = new Schema(
  {
    tier: { type: String, enum: [...TIERS, null], default: null },
    division: { type: String, enum: [...DIVISIONS, null], default: null },
    lp: { type: Number, default: 0 },
    absoluteLp: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    hotStreak: { type: Boolean, default: false },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);

/**
 * GLOBAL Riot account identity — exactly one per real account, deduplicated
 * across every guild that tracks it. This is the anti-rate-limit collection:
 * we poll Riot once per Summoner and fan the result out to all linked guilds.
 */
const summonerSchema = new Schema(
  {
    puuid: { type: String, required: true, unique: true },
    platform: { type: String, required: true }, // e.g. na1
    regionalRoute: { type: String, required: true }, // match-v5 cluster, e.g. americas
    accountRoute: { type: String, required: true }, // account-v1 cluster
    riotId: {
      gameName: { type: String, required: true },
      tagLine: { type: String, required: true },
    },
    summonerLevel: { type: Number, default: 0 },
    profileIconId: { type: Number, default: 0 },
    ranked: {
      RANKED_SOLO_5x5: { type: rankedEntrySchema, default: () => ({}) },
      RANKED_FLEX_SR: { type: rankedEntrySchema, default: () => ({}) },
    },
    lastMatchId: { type: String, default: null },
    lastMatchStartAt: { type: Date, default: null },
    pollTier: {
      type: String,
      enum: Object.values(POLL_TIERS),
      default: POLL_TIERS.IDLE,
    },
    nextCheckAt: { type: Date, default: Date.now },
    lastPolledAt: { type: Date, default: null },
    streak: {
      current: { type: Number, default: 0 }, // +N win streak, -N loss streak
      longestWin: { type: Number, default: 0 },
      longestLoss: { type: Number, default: 0 },
    },
    // Denormalized count of Player links; when it hits 0 we can stop polling.
    trackedGuildCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

// puuid already uniquely-indexed via `unique: true`.
summonerSchema.index({ nextCheckAt: 1, pollTier: 1 }); // fallback due-scan
summonerSchema.index({
  'riotId.gameName': 1,
  'riotId.tagLine': 1,
  platform: 1,
});

export const Summoner =
  mongoose.models.Summoner || mongoose.model('Summoner', summonerSchema);

export default Summoner;
