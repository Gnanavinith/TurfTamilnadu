import mongoose from 'mongoose'

const membershipSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'invited'],
      default: 'active',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

membershipSchema.index({ teamId: 1, userId: 1 }, { unique: true })

export const Membership = mongoose.model('Membership', membershipSchema)

export default Membership