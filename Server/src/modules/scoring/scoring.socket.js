import {
  recordBall,
  undoLastBall,
  setBatsman,
  setBowler,
  swapStrike,
  retireHurt,
  recallRetired,
} from './scoring.service.js'
import { matchRoom } from '../../sockets/rooms.js'
import { Membership } from '../teams/membership.model.js'
import { Match } from '../matches/match.model.js'
import { logger } from '../../utils/logger.js'

const SCORER_ROLES = ['scorer', 'admin']

/**
 * Scoring authority is per-match, not merely per-role. Holding the global
 * `scorer` role is not enough: without this check any scorer could record
 * deliveries for another account's live match by guessing its id.
 *
 * Allowed when the socket user is an admin on either side, or created the match.
 */
async function assertCanScore(socket, matchId) {
  const { user } = socket.data
  if (!user || !SCORER_ROLES.includes(user.role)) {
    throw new Error('Scorer access required')
  }
  if (!matchId) throw new Error('matchId is required')

  const match = await Match.findById(matchId).select('_id tenantId createdBy teamAId teamBId').lean()
  if (!match) throw new Error('Match not found')

  if (String(match.createdBy) === String(user.id)) return
  if (user.role === 'admin' && match.tenantId && String(match.tenantId) === String(user.tenantId)) {
    return
  }

  const adminOfTeam = await Membership.exists({
    userId: user.id,
    teamId: { $in: [match.teamAId, match.teamBId] },
    role: 'admin',
    status: 'active',
  })
  if (!adminOfTeam) throw new Error('You do not manage this match')
}

function ackFailure(ack, err) {
  logger.warn({ err: err.message }, 'Scoring socket error')
  ack?.({ success: false, error: err.message ?? 'Scoring failed' })
}

export function registerScoringHandlers(io, socket) {
  const broadcast = (matchId, payload) => {
    io.to(matchRoom(matchId)).emit('match:update', payload)
    io.to(matchRoom(matchId)).emit('match:score', payload)
  }

  socket.on('match:subscribe', (matchId) => {
    if (!matchId) return
    socket.join(matchRoom(matchId))
    logger.debug({ socketId: socket.id, matchId }, 'Joined match room')
  })

  socket.on('match:unsubscribe', (matchId) => {
    if (!matchId) return
    socket.leave(matchRoom(matchId))
  })

socket.on('scoring:record', async (payload, ack) => {
    try {
      await assertCanScore(socket, payload?.matchId)
      const result = await recordBall(payload.matchId, payload, socket.data.user.id)
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  socket.on('scoring:undo', async (matchId, ack) => {
    try {
      await assertCanScore(socket, matchId)
      const result = await undoLastBall(matchId, socket.data.user.id)
      broadcast(matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  // Crease management. These don't record a delivery — they just fix who is at
  // the crease or who has the ball, then broadcast the new state to everyone
  // watching the match.
  socket.on('scoring:setBatsman', async (payload, ack) => {
    try {
      await assertCanScore(socket, payload?.matchId)
      const result = await setBatsman(
        payload?.matchId,
        { strikerId: payload?.strikerId, nonStrikerId: payload?.nonStrikerId },
        socket.data.user.id,
      )
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  socket.on('scoring:setBowler', async (payload, ack) => {
    try {
      await assertCanScore(socket, payload?.matchId)
      const result = await setBowler(
        payload?.matchId,
        { bowlerId: payload?.bowlerId },
        socket.data.user.id,
      )
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  socket.on('scoring:swapStrike', async (payload, ack) => {
    try {
      await assertCanScore(socket, payload?.matchId)
      const result = await swapStrike(payload?.matchId, socket.data.user.id)
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  socket.on('scoring:retireHurt', async (payload, ack) => {
    try {
      await assertCanScore(socket, payload?.matchId)
      const result = await retireHurt(
        payload?.matchId,
        payload?.userId,
        socket.data.user.id,
      )
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  socket.on('scoring:recallRetired', async (payload, ack) => {
    try {
      await assertCanScore(socket, payload?.matchId)
      const result = await recallRetired(
        payload?.matchId,
        payload?.userId,
        socket.data.user.id,
      )
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })
}

export default registerScoringHandlers