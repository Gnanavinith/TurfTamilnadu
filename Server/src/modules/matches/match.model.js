import mongoose from 'mongoose'

const matchSchema = new mongoose.Schema(
  {
    teamAId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    teamBId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    overs: { type: Number, required: true, default: 10, min: 1, max: 50 },
    matchType: {
      type: String,
      enum: ['single', 'tournament'],
      default: 'single',
      index: true,
    },
    tournamentName: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'abandoned'],
      default: 'scheduled',
      index: true,
    },
    toss: {
      winnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      decision: { type: String, enum: ['bat', 'bowl'] },
    },
    playingXI: {
      teamA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      teamB: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    currentInningsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Innings',
    },
    result: {
      winnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      margin: { type: String },
    },
    scheduledAt: { type: Date, required: true },
    venue: { type: String, trim: true, maxlength: 120 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // A match always inherits the owning account of the two teams, so the whole
    // fixture — and its innings, ball ledger and stats — stays inside one tenant.
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

export const Match = mongoose.model('Match', matchSchema)

export default Match