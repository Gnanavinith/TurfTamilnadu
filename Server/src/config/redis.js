import { Redis } from 'ioredis'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

// Backoff so a down Redis doesn't spam error logs every second.
const retryStrategy = (times) => {
  if (times > 200) return null // give up after a long outage; clients stay silent
  return Math.min(1_000 * 1.5 ** (times - 1), 10_000)
}

const redactRedisUrl = (url = env.REDIS_URL) =>
  url.replace(/:(?:\/\/(?:[^:]+):[^@]+@|\/\/)/, '://***:***@')

/**
 * Creates an ioredis client with a quiet, transition-aware error path so a
 * down Redis logs once on failure and once on recovery instead of spamming a
 * stack per retry. NOTE: `client.duplicate()` copies options but NOT
 * listeners, so every client must come from this factory.
 */
export function createRedisClient({ label = 'Redis', lazyConnect = true } = {}) {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect,
    maxRetriesPerRequest: null,
    retryStrategy,
  })

  let up = true
  client.on('error', () => {
    if (up) {
      up = false
      logger.warn(
        { url: redactRedisUrl() },
        `${label} unavailable - running degraded (no queues/broadcast)`,
      )
    }
  })
  client.on('ready', () => {
    if (!up) {
      up = true
      logger.info({ url: redactRedisUrl() }, `${label} connected`)
    }
  })

  return client
}

export const redis = createRedisClient({ label: 'Redis' })
export const redisPub = createRedisClient({ label: 'Redis pub' })
export const redisSub = createRedisClient({ label: 'Redis sub' })

export async function connectRedis() {
  const results = await Promise.allSettled([
    redis.connect(),
    redisPub.connect(),
    redisSub.connect(),
  ])
  const ok = results.every((result) => result.status === 'fulfilled')
  logger.info(
    { url: redactRedisUrl() },
    ok ? 'Redis connected' : 'Redis unavailable - running in degraded mode',
  )
  return { redis, redisPub, redisSub }
}

export async function disconnectRedis() {
  const results = await Promise.allSettled([
    redis.quit(),
    redisPub.quit(),
    redisSub.quit(),
  ])
  logger.info('Redis disconnected')
  return results
}

export default redis