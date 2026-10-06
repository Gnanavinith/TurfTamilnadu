import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    shortName: {
      type: String,
      trim: true,
      maxlength: 12,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    city: { type: String, trim: true, maxlength: 60 },
    logoUrl: { type: String, trim: true },
    capacity: { type: Number, default: 15, min: 1, max: 40 },
    captainId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Owning account. A team is only ever visible inside its tenant until it
    // appears in a match, which is what promotes it to the public feed.
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
)

export const Team = mongoose.model('Team', teamSchema)

export default Team