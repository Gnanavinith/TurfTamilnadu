import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true },
)

// Hash is looked up directly, never iterated.
refreshTokenSchema.index({ userId: 1, revokedAt: 1 })

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)

export default RefreshToken