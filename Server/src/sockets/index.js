import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { createRedisClient } from '../config/redis.js'
import { registerScoringHandlers } from '../modules/scoring/scoring.socket.js'
import { logger } from '../utils/logger.js'

export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL.split(',').map((origin) => origin.trim()),
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  })

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