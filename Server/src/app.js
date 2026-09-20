import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { corsOptions } from './config/cors.js'
import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import routes from './routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.use(
    pinoHttp({
      logger,
      customLogLevel(_req, res) {
        return res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
      },
      autoLogging: env.NODE_ENV === 'production',
    }),
  )

  app.use('/api/v1', routes)
  app.use('/api/v1', notFound)
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export default createApp