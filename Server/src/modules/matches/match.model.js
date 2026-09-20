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
    completedAt: { type: Date },
  },
  { timestamps: true },
)

export const Match = mongoose.model('Match', matchSchema)

export default Match