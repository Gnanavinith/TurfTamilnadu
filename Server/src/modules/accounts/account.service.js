import { Account } from './account.model.js'
import { User } from '../users/user.model.js'
import { Team } from '../teams/team.model.js'
import { ApiError } from '../../utils/ApiError.js'

/**
 * Derive a readable account name from the admin who is creating it: their own
 * display name, else the local part of their email. Keeps the signup form to
 * just name + email + password without inventing a new required field.
 */
function defaultAccountName(user) {
  const fromName = (user.name ?? '').trim()
  if (fromName.length >= 2) return fromName
  return String(user.email ?? '').split('@')[0] || 'New account'
}

/**
 * Get the account a user owns, creating it on first use. Called on sign-up, and
 * defensively on sign-in, so a user created before tenancy existed (or by an
 * older build) still resolves to exactly one account.
 */
export async function ensureAccountForUser(user) {
  const existing = await Account.findOne({ ownerId: user._id })
  if (existing) return existing

  const account = await Account.create({
    name: defaultAccountName(user),
    ownerId: user._id,
  })

  await User.updateOne({ _id: user._id }, { $set: { tenantId: account._id } })
  return account
}

/**
 * The tenant id to scope a request by. Returns null when the caller has no
 * account yet, which callers must treat as "owns nothing" rather than
 * "owns everything" — never widen a query when this is missing.
 */
export async function tenantIdForUser(userId) {
  if (!userId) return null
  const user = await User.findById(userId).select('tenantId').lean()
  if (!user) return null

  if (user.tenantId) return user.tenantId

  const account = await Account.findOne({ ownerId: userId }).select('_id').lean()
  if (!account) return null

  // Backfill the link so subsequent requests skip the lookup.
  await User.updateOne({ _id: userId }, { $set: { tenantId: account._id } })
  return account._id
}

/**
 * Guard for tenant-scoped writes: a team may only be touched by the account that
 * owns it. Membership remains the authority for who administers a team *within*
 * the tenant (a captain may manage the squad without owning the account).
 */
export async function assertTenantOwnsTeam(tenantId, teamId) {
  if (!tenantId) {
    throw ApiError.forbidden('Your account cannot manage teams yet')
  }
  const team = await Team.findById(teamId).select('tenantId').lean()
  if (!team) throw ApiError.notFound('Team not found')
  if (String(team.tenantId) !== String(tenantId)) {
    throw ApiError.notFound('Team not found')
  }
  return team
}

export default {
  ensureAccountForUser,
  tenantIdForUser,
  assertTenantOwnsTeam,
}
