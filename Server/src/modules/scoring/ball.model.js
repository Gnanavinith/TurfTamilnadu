import mongoose from 'mongoose'

const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired']
const EXTRA_TYPES = ['wide', 'no_ball', 'bye', 'leg_bye']

const ballSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    inningsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Innings',
      required: true,
      index: true,
    },
    over: { type: Number, required: true },
    ball: { type: Number, required: true },
    batterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    runs: { type: Number, default: 0 },
    batterRuns: { type: Number, default: 0 },
    extraType: { type: String, enum: EXTRA_TYPES, default: null },
    extraRuns: { type: Number, default: 0 },
    isLegal: { type: Boolean, default: true },
    wicket: {
      type: { type: String, enum: WICKET_TYPES },
      batterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fielderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

ballSchema.index({ inningsId: 1, createdAt: 1 })
ballSchema.index({ matchId: 1, inningsId: 1, over: 1, ball: 1 })

export const Ball = mongoose.model('Ball', ballSchema)

export default Ball