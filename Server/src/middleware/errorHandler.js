import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'
import { isProduction } from '../config/env.js'

export function errorHandler(err, req, res, _next) {
  let error = err

  if (err instanceof ZodError) {
    error = ApiError.badRequest(
      'Validation failed',
      err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    )
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for "${err.path}"`)
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = ApiError.badRequest(
      'Validation failed',
      Object.values(err.errors).map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    )
  } else if (err?.code === 11000) {
    error = ApiError.conflict('Duplicate value', {
      fields: Object.keys(err.keyValue ?? {}),
    })
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(500, 'Internal server error', undefined, false)
  }

  const status = error.statusCode ?? 500

  const wasHandled =
    err instanceof ApiError ||
    err instanceof ZodError ||
    err instanceof mongoose.Error.CastError ||
    err instanceof mongoose.Error.ValidationError ||
    err?.code === 11000

  if (!wasHandled) {
    // Log the true underlying error — transforming it above replaced the stack.
    logger.error({ err: err?.stack ?? err }, 'Unhandled error')
    logger.debug({ path: req.originalUrl, method: req.method }, error.message)
  } else {
    logger.debug({ path: req.originalUrl, method: req.method }, error.message)
  }

  const body = {
    success: false,
    error: {
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(!isProduction && status >= 500 && { stack: error.stack }),
    },
  }

  if (req.headers.accept === 'text/event-stream') {
    return
  }

  res.status(status).json(body)
}

export default errorHandler