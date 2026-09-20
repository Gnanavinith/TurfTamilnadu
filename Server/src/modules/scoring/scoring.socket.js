import { recordBall, undoLastBall } from './scoring.service.js'
import { matchRoom } from '../../sockets/rooms.js'
import { logger } from '../../utils/logger.js'

const SCORER_ROLES = ['scorer', 'admin']

function assertCanScore(socket) {
  if (!socket.data.user || !SCORER_ROLES.includes(socket.data.user.role)) {
    throw new Error('Scorer access required')
  }
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
      assertCanScore(socket)
      if (!payload?.matchId) throw new Error('matchId is required')
      const result = await recordBall(payload.matchId, payload, socket.data.user.id)
      broadcast(payload.matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })

  socket.on('scoring:undo', async (matchId, ack) => {
    try {
      assertCanScore(socket)
      if (!matchId) throw new Error('matchId is required')
      const result = await undoLastBall(matchId, socket.data.user.id)
      broadcast(matchId, result.match)
      ack?.({ success: true, data: result.match })
    } catch (err) {
      ackFailure(ack, err)
    }
  })
}

export default registerScoringHandlers