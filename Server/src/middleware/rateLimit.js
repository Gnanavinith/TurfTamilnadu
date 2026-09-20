import { rateLimit as expressRateLimit } from 'express-rate-limit'

/**
 * Thin wrapper over express-rate-limit with safe defaults.
 * Rate limits return a JSON body instead of the default text/plain.
 */
export const rateLimit = (options = {}) =>
  expressRateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: 'Too many requests, please try again later' },
    },
    ...options,
  })

export default rateLimit