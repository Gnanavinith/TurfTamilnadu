import http from 'node:http'
import dns from 'node:dns'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { connectRedis, disconnectRedis } from './config/redis.js'
import { initSocket } from './sockets/index.js'
import { startJobs } from './jobs/queue.js'
import { logger } from './utils/logger.js'
import { createApp } from './app.js'

// A stale DHCP DNS (10.99.68.37 / 192.168.1.1) leaks into Node's resolver and breaks mongodb+srv lookups
dns.setServers(['8.8.8.8', '8.8.4.4'])

async function bootstrap() {
  let redisAvailable = false
  try {
    await connectDB()
    const infra = await connectRedis()
    redisAvailable = infra.available
  } catch (err) {
    // Local scaffold tolerates Redis being down; Mongo/REDIS_URL failures surface in prod.
    logger.warn({ err }, 'Infrastructure connect warning')
  }

  const app = createApp()
  const server = http.createServer(app)
  const io = initSocket(server, { redisAvailable })

  try {
    startJobs()
  } catch (err) {
    logger.warn({ err }, 'Jobs failed to start, continuing without workers')
  }

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`API ready on 0.0.0.0:${env.PORT}`)
  })

  const shutdown = (signal) => async () => {
    logger.info({ signal }, 'Shutting down')
    io.close()
    server.close(async () => {
      try {
        await disconnectDB()
        await disconnectRedis()
      } catch {
        // best-effort teardown
      }
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown('SIGTERM'))
  process.on('SIGINT', shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal bootstrap error')
  process.exit(1)
})

export { bootstrap }