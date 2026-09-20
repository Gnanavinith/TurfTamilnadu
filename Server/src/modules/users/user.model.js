import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must be a valid email address'],
    },
    password: {
      type: String,
      select: false,
      minlength: 8,
      maxlength: 100,
    },
    name: { type: String, trim: true, maxlength: 60 },
    role: {
      type: String,
      enum: ['player', 'scorer', 'admin'],
      default: 'player',
      index: true,
    },
    avatarUrl: { type: String, trim: true },
    preferredTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  },
  { timestamps: true },
)

export const User = mongoose.model('User', userSchema)

export default User