import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { allowedOrigins } from '../config/cors.js'
import { createRedisClient } from '../config/redis.js'
import { registerScoringHandlers } from '../modules/scoring/scoring.socket.js'
import { logger } from '../utils/logger.js'

export function initSocket(server, { redisAvailable = false } = {}) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  })

  if (redisAvailable) {
    try {
      const pubClient = createRedisClient({ label: 'Socket pub' })
      const subClient = createRedisClient({ label: 'Socket sub' })
      pubClient.connect().catch(() => {})
      subClient.connect().catch(() => {})
      io.adapter(createAdapter(pubClient, subClient))
      logger.info('Socket.IO redis adapter attached')
    } catch (err) {
      // Redis is optional for a local scaffold; falls back to in-memory adapter.
      logger.warn({ err }, 'Socket.IO redis adapter unavailable, using in-memory adapter')
    }
  } else {
    // Redis was unavailable at boot; don't mount pub/sub clients that would
    // unhandled-reject and crash the process when they queue commands.
    logger.warn('Socket.IO redis adapter skipped (Redis down), using in-memory adapter')
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role }
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket connected')
    registerScoringHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected')
    })
  })

  return io
}

export default initSocket