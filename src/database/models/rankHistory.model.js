import mongoose from 'mongoose';
import { TIERS, DIVISIONS } from '../../config/constants.js';

const { Schema } = mongoose;

/**
 * State-snapshot log: the summoner's standing at a point in time, including
 * non-match events (decay, periodic refresh, initial baseline). Answers "draw
 * my rank graph" and drives promotion/demotion detection. Distinct from
 * LPHistory, which is the match-attributed delta ledger.
 */
const rankHistorySchema = new Schema(
  {
    summonerId: {
      type: Schema.Types.ObjectId,
      ref: 'Summoner',
      required: true,
    },
    queueType: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    tier: { type: String, enum: [...TIERS, null], default: null },
    division: { type: String, enum: [...DIVISIONS, null], default: null },
    lp: { type: Number, default: 0 },
    absoluteLp: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['match', 'decay', 'refresh', 'baseline'],
      default: 'match',
    },
    matchId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

rankHistorySchema.index({ summonerId: 1, queueType: 1, at: -1 });

export const RankHistory =
  mongoose.models.RankHistory ||
  mongoose.model('RankHistory', rankHistorySchema);

export default RankHistory;
