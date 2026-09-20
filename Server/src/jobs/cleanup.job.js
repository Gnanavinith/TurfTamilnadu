import { Invite } from '../modules/teams/invite.model.js'
import { MATCH_STATUS } from '../modules/matches/match.service.js'
import { Match } from '../modules/matches/match.model.js'
import { RefreshToken } from '../modules/auth/refreshToken.model.js'
import { logger } from '../utils/logger.js'

export const STALE_MATCH_HOURS = 6

/**
 * Housekeeping:
 * - expires outstanding team invites
 * - abandons live matches untouched for > 6 hours
 */
export async function cleanupJobHandler(_job) {
  const now = new Date()

  const expired = await Invite.updateMany(
    { status: 'pending', expiresAt: { $lt: now } },
    { $set: { status: 'expired' } },
  )

  const staleCutoff = new Date(now.getTime() - STALE_MATCH_HOURS * 60 * 60 * 1000)
  const abandoned = await Match.updateMany(
    { status: MATCH_STATUS.LIVE, updatedAt: { $lt: staleCutoff } },
    { $set: { status: MATCH_STATUS.ABANDONED } },
  )

  const purgeCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const staleTokens = await RefreshToken.deleteMany({
    $or: [{ expiresAt: { $lt: now } }, { revokedAt: { $lt: purgeCutoff } }],
  })

  logger.info(
    {
      expired: expired.modifiedCount,
      abandoned: abandoned.modifiedCount,
      purgedTokens: staleTokens.deletedCount,
    },
    'Cleanup job ran',
  )

  return {
    expiredInvites: expired.modifiedCount,
    abandonedMatches: abandoned.modifiedCount,
    purgedRefreshTokens: staleTokens.deletedCount,
  }
}