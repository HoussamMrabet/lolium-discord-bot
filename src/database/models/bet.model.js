import mongoose from 'mongoose';
import { BET_MARKETS, BET_STATUS } from '../../config/constants.js';

const { Schema } = mongoose;

/**
 * A single fake-gold wager on a live game. Resolution is idempotent and atomic:
 * a bet leaves `open` exactly once, guarded by `status` transitions on the
 * document (see BetRepository). `prediction` shape depends on `market`
 * (boolean for winner/inter, a puuid for topDamage/mostDeaths, etc.).
 */
const betSchema = new Schema(
  {
    guildId: { type: String, required: true },
    seasonId: { type: String, required: true },
    gameId: { type: String, default: null }, // spectator live-game id
    matchId: { type: String, default: null }, // set when resolved
    subjectSummonerId: {
      type: Schema.Types.ObjectId,
      ref: 'Summoner',
      default: null,
    },
    market: {
      type: String,
      enum: Object.values(BET_MARKETS),
      required: true,
    },
    createdBy: { type: String, required: true }, // discord user id
    prediction: { type: Schema.Types.Mixed, required: true },
    stake: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: Object.values(BET_STATUS),
      default: BET_STATUS.OPEN,
    },
    payout: { type: Number, default: 0 },
    placedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

betSchema.index({ guildId: 1, status: 1 });
betSchema.index({ createdBy: 1, guildId: 1, seasonId: 1 });
betSchema.index({ gameId: 1, status: 1 });
betSchema.index({ matchId: 1 });

export const Bet = mongoose.models.Bet || mongoose.model('Bet', betSchema);

export default Bet;
