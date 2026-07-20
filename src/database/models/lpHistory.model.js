import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Event/delta ledger: exactly what LP changed, tied to the match that caused it.
 * Answers "how much LP did I gain this week?" by summing `delta`. The unique
 * (summonerId, queueType, matchId) index makes recording idempotent — a match
 * can never double-count LP even if processed twice.
 */
const lpHistorySchema = new Schema(
  {
    summonerId: {
      type: Schema.Types.ObjectId,
      ref: 'Summoner',
      required: true,
    },
    queueType: { type: String, required: true },
    matchId: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    result: { type: String, enum: ['W', 'L'], required: true },
    lpBefore: { type: Number, default: 0 },
    lpAfter: { type: Number, default: 0 },
    delta: { type: Number, default: 0 },
    absoluteBefore: { type: Number, default: 0 },
    absoluteAfter: { type: Number, default: 0 },
    tierBefore: { type: String, default: null },
    divisionBefore: { type: String, default: null },
    tierAfter: { type: String, default: null },
    divisionAfter: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

lpHistorySchema.index({ summonerId: 1, queueType: 1, at: -1 });
lpHistorySchema.index(
  { summonerId: 1, queueType: 1, matchId: 1 },
  { unique: true },
);

export const LPHistory =
  mongoose.models.LPHistory || mongoose.model('LPHistory', lpHistorySchema);

export default LPHistory;
