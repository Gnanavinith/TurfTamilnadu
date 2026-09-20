import { pino } from 'pino'
import { env } from '../config/env.js'

const isProd = env.NODE_ENV === 'production'
const isTest = env.NODE_ENV === 'test'

export const logger = pino(
  isTest
    ? { level: 'silent' }
    : {
        level: env.LOG_LEVEL,
        ...(!isProd && {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
        }),
      },
)

export default logger