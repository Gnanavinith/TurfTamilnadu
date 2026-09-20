import mongoose from 'mongoose'

const teamStatsSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      unique: true,
      index: true,
    },
    season: { type: String, default: 'current' },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    runsScored: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wicketsTaken: { type: Number, default: 0 },
    wicketsLost: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const TeamStats = mongoose.model('TeamStats', teamStatsSchema)

export default TeamStats