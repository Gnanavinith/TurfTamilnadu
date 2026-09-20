import { Queue, Worker } from 'bullmq'
import { redis } from '../config/redis.js'
import { logger } from '../utils/logger.js'
import { updateTeamStatsJobHandler } from './updateTeamStats.job.js'
import { cleanupJobHandler } from './cleanup.job.js'

// Give BullMQ its own connection options (not our shared lazy instance):
// BullMQ manages connect/waitUntilReady itself, so a down Redis surfaces as
// a handled error instead of an unhandled rejection from `client.connect()`.
const { lazyConnect: _lazyConnect, ...queueConnection } = redis.options

export const teamStatsQueue = new Queue('team-stats', { connection: queueConnection })
export const cleanupQueue = new Queue('cleanup', { connection: queueConnection })

// Errors are not fatal; consume them so BullMQ has a registered 'error' listener.
teamStatsQueue.on('error', () => {})
cleanupQueue.on('error', () => {})

let jobsStarted = false

export async function addTeamStatsJob(matchId) {
  if (!jobsStarted) return
  await teamStatsQueue.add(
    'update',
    { matchId },
    { removeOnComplete: 100, removeOnFail: 100 },
  )
}

export async function addCleanupJob() {
  if (!jobsStarted) return
  await cleanupQueue.add('periodic', {}, { attempts: 1 })
}

/**
 * Starts BullMQ workers used to rebroadcast team-stats recomputation.
 * Workers are deferred until Redis confirms it is ready: with Redis down,
 * BullMQ's internally-created clients retry forever and throw listener-less
 * errors that would spam stderr. Queue errors are logged, never fatal.
 */
export function startJobs() {
  if (jobsStarted) {
    logger.info('Jobs already started')
    return
  }
  if (redis.status !== 'ready') {
    logger.warn('Background jobs deferred until Redis is available')
    redis.once('ready', startJobs)
    return
  }
  jobsStarted = true

  const statsWorker = new Worker('team-stats', updateTeamStatsJobHandler, {
    connection: redis,
    concurrency: 2,
  })

  const cleanupWorker = new Worker('cleanup', cleanupJobHandler, {
    connection: redis,
  })

  statsWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'team-stats job failed')
  })
  cleanupWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'cleanup job failed')
  })

  scheduleCleanup()

  logger.info('Background jobs started')
  return { statsWorker, cleanupWorker }
}

async function scheduleCleanup() {
  try {
    await cleanupQueue.upsertJobScheduler('hourly-cleanup', { every: 60 * 60 * 1000 })
    logger.debug('Cleanup job scheduled hourly')
  } catch (err) {
    logger.warn({ err }, 'Could not schedule cleanup job')
  }
}

export default { startJobs, addTeamStatsJob }