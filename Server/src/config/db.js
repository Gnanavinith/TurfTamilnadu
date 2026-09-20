import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

export async function connectDB() {
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
  })
  logger.info({ uri: env.MONGO_URI.split('@').pop() }, 'MongoDB connected')
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.disconnect()
  logger.info('MongoDB disconnected')
}