import { env } from './env.js'
import { logger } from '../utils/logger.js'

export const allowedOrigins = env.CLIENT_URL.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

// First entry is treated as the canonical frontend origin (used to build links).
export const primaryClientUrl = allowedOrigins[0] ?? ''

const warnedOrigins = new Set()

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true)

    // Reject without throwing: an Error here becomes a 500 and is logged as an
    // unhandled error, which hides the real cause (a stale CLIENT_URL on the host).
    if (!warnedOrigins.has(origin)) {
      warnedOrigins.add(origin)
      logger.warn(
        { origin, allowedOrigins },
        'CORS origin rejected: add it to CLIENT_URL (comma separated) and restart',
      )
    }
    return callback(null, false)
  },
  credentials: true,
  optionsSuccessStatus: 200,
}

logger.info({ allowedOrigins }, 'CORS allowlist loaded')

export default corsOptions
