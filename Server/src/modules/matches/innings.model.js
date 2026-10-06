import mongoose from 'mongoose'

const batterEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['batting', 'out', 'did_not_bat', 'retired'],
      default: 'did_not_bat',
    },
    outType: { type: String, default: null },
  },
  { _id: false },
)

const bowlerEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    balls: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
  },
  { _id: false },
)

const inningsSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    order: { type: Number, required: true, min: 1, max: 2 },
    overs: { type: Number, required: true },
    battingTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    bowlingTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    target: { type: Number },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    score: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      extras: { type: Number, default: 0 },
    },
    extrasBreakdown: {
      wide: { type: Number, default: 0 },
      noBall: { type: Number, default: 0 },
      bye: { type: Number, default: 0 },
      legBye: { type: Number, default: 0 },
    },
    batting: { type: [batterEntrySchema], default: [] },
    bowling: { type: [bowlerEntrySchema], default: [] },
    // Live crease, maintained by the scorer so the scorecard always knows who is
    // on strike without re-deriving it from the ball ledger on every read.
    strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    previousBowlerId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
    retiredHurt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastManStanding: { type: Boolean, default: false },
  },
  { timestamps: true },
)

inningsSchema.index({ matchId: 1, order: 1 }, { unique: true })

export const Innings = mongoose.model('Innings', inningsSchema)

export default Innings