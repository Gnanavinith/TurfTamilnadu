import http from 'node:http'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { connectRedis, disconnectRedis } from './config/redis.js'
import { initSocket } from './sockets/index.js'
import { startJobs } from './jobs/queue.js'
import { logger } from './utils/logger.js'
import { createApp } from './app.js'

async function bootstrap() {
  try {
    await connectDB()
    await connectRedis()
  } catch (err) {
    // Local scaffold tolerates Redis being down; Mongo/REDIS_URL failures surface in prod.
    logger.warn({ err }, 'Infrastructure connect warning')
  }

  const app = createApp()
  const server = http.createServer(app)
  const io = initSocket(server)

  try {
    startJobs()
  } catch (err) {
    logger.warn({ err }, 'Jobs failed to start, continuing without workers')
  }

  server.listen(env.PORT, () => {
    logger.info(`API ready on :${env.PORT}`)
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