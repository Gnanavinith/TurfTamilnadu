import mongoose from 'mongoose'

/**
 * A turf ground owner's account. Every admin who signs up gets exactly one, and
 * it is the isolation boundary for the whole app: teams, matches and the players
 * an admin creates all hang off it. A brand new account owns nothing, so it
 * starts completely empty.
 *
 * Tenancy is deliberately *not* derived from team membership. A player can sit on
 * squads belonging to two different accounts, so membership cannot answer "whose
 * data is this?" — only the account can.
 */
const accountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    // The admin who created the account. Kept for audit; ownership of the data
    // is expressed by tenantId on the documents themselves.
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
)

export const Account = mongoose.model('Account', accountSchema)

export default Account
