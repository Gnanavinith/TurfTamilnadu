import { Match } from '../matches/match.model.js'
import { Innings } from '../matches/innings.model.js'
import { User } from '../users/user.model.js'
import { Ball } from './ball.model.js'
import { ApiError } from '../../utils/ApiError.js'
import { logger } from '../../utils/logger.js'
import { getMatchSnapshot } from '../matches/match.service.js'
import {
  BALLS_PER_OVER,
  NON_BALL_DELIVERIES,
  MAX_WICKETS,
  legalBallsPerOver,
  overNumber,
  ballInOver,
  isInningsEnded,
} from './scoring.utils.js'
import { addTeamStatsJob, areJobsStarted } from '../../jobs/queue.js'
import { recomputeAllTeamStats } from '../leaderboard/leaderboard.service.js'

const BOWLER_WICKETS = new Set(['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'])

function assertInPlayingXI(match, userId, teamId) {
  const xi =
    String(teamId) === String(match.teamAId)
      ? match.playingXI?.teamA
      : match.playingXI?.teamB

  if (!xi || xi.length === 0) return // XI not locked yet, skip check
  if (!xi.some((id) => String(id) === String(userId))) {
    throw ApiError.badRequest('Player is not in the playing XI for this team')
  }
}

/**
 * Returns the bowler who bowled the last delivery of the just-completed over,
 * or null when the innings isn't at an over boundary. Used to enforce the
 * standard rule that a bowler cannot bowl two consecutive overs.
 */
async function lastCompletedOverBowler(innings) {
  const legal = innings.score?.balls ?? 0
  if (legal <= 0 || legal % BALLS_PER_OVER !== 0) return null

  const prevOver = legal / BALLS_PER_OVER
  const lastBall = await Ball.findOne({
    inningsId: innings._id,
    over: prevOver,
  })
    .sort({ ball: -1 })
    .select('bowlerId')
    .lean()

  return lastBall?.bowlerId ?? null
}

function runsToBowler(ball) {
  return (
    (ball.batterRuns ?? 0) +
    (NON_BALL_DELIVERIES.has(ball.extraType) ? ball.extraRuns ?? 0 : 0)
  )
}

function computeMaidens(balls, bowlerKey) {
  const byOver = new Map()
  for (const ball of balls) {
    if (String(ball.bowlerId) !== bowlerKey) continue
    const over = byOver.get(ball.over) ?? { legal: 0, runs: 0 }
    if (ball.isLegal) over.legal += 1
    over.runs += runsToBowler(ball)
    byOver.set(ball.over, over)
  }
  let maidens = 0
  for (const over of byOver.values()) {
    if (over.legal === BALLS_PER_OVER && over.runs === 0) maidens += 1
  }
  return maidens
}

/**
 * Rebuilds an innings' score/batting/bowling from its ball records.
 * Single source of truth keeps record + undo trivial and consistent.
 */
async function recomputeInnings(inningsId) {
  const balls = await Ball.find({ inningsId })
    .sort({ createdAt: 1, _id: 1 })
    .lean()

  const agg = { runs: 0, wickets: 0, legalBalls: 0, extras: 0 }
  const batting = new Map()
  const bowling = new Map()

  for (const ball of balls) {
    agg.runs += ball.runs
    agg.extras += ball.extraRuns ?? 0
    if (ball.isLegal) agg.legalBalls += 1
    if (ball.wicket?.type) agg.wickets += 1

    const batKey = String(ball.batterId)
    const bat = batting.get(batKey) ?? {
      userId: ball.batterId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: 'batting',
      outType: null,
    }
    if (ball.isLegal) {
      bat.balls += 1
      bat.runs += ball.batterRuns ?? 0
      if (ball.batterRuns === 4) bat.fours += 1
      if (ball.batterRuns === 6) bat.sixes += 1
    }
    if (ball.wicket?.type && String(ball.wicket.batterId) === batKey) {
      bat.status = 'out'
      bat.outType = ball.wicket.type
    }
    batting.set(batKey, bat)

    const bowlKey = String(ball.bowlerId)
    const bowl = bowling.get(bowlKey) ?? {
      userId: ball.bowlerId,
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    }
    bowl.balls += ball.isLegal ? 1 : 0
    bowl.runs += runsToBowler(ball)
    if (ball.wicket?.type && BOWLER_WICKETS.has(ball.wicket.type)) {
      bowl.wickets += 1
    }
    bowl.maidens = computeMaidens(balls, bowlKey)
    bowling.set(bowlKey, bowl)
  }

  return {
    balls,
    agg,
    batting: [...batting.values()].sort((a, b) => b.runs - a.runs || a.balls - b.balls),
    bowling: [...bowling.values()].sort((a, b) => a.balls - b.balls || b.wickets - a.wickets),
  }
}

async function saveInningsState(innings, state, status) {
  innings.score = {
    runs: state.agg.runs,
    wickets: state.agg.wickets,
    balls: state.agg.legalBalls,
    extras: state.agg.extras,
  }
  innings.batting = state.batting
  innings.bowling = state.bowling
  innings.status = status
  await innings.save()
}

export async function recordBall(matchId, payload, recordedBy) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  if (match.status !== 'live') throw ApiError.badRequest('Match is not live')

  const innings = await Innings.findById(match.currentInningsId)
  if (!innings || innings.status !== 'in_progress') {
    throw ApiError.badRequest('No innings currently in progress')
  }

  const { batterId, nonStrikerId, bowlerId, fielderId } = payload
  const batterRuns = Math.max(0, payload.batterRuns ?? 0)
  const extraType = payload.extraType ?? null
  const extraRuns = Math.max(0, payload.extraRuns ?? 0)
  const wicketType = payload.wicketType ?? null

  if (!batterId || !bowlerId) {
    throw ApiError.badRequest('batterId and bowlerId are required')
  }
  if (String(batterId) === String(bowlerId)) {
    throw ApiError.badRequest('Batter and bowler must be different players')
  }

  assertInPlayingXI(match, batterId, innings.battingTeamId)
  assertInPlayingXI(match, bowlerId, innings.bowlingTeamId)

  const previousOverBowler = await lastCompletedOverBowler(innings)
  if (previousOverBowler && String(bowlerId) === String(previousOverBowler)) {
    throw ApiError.badRequest(
      'A bowler cannot bowl two consecutive overs. Pick a different bowler.',
    )
  }

  const maxLegalBalls = legalBallsPerOver(innings.overs)
  if (innings.score.balls >= maxLegalBalls) {
    throw ApiError.badRequest('Innings over limit reached')
  }
  if (innings.score.wickets >= MAX_WICKETS) {
    throw ApiError.badRequest('Innings is all out')
  }

  const isLegal = !NON_BALL_DELIVERIES.has(extraType)
  const totalRuns = batterRuns + extraRuns

  await Ball.create({
    matchId,
    inningsId: innings._id,
    over: overNumber(innings.score.balls),
    ball: ballInOver(innings.score.balls),
    batterId,
    nonStrikerId,
    bowlerId,
    runs: totalRuns,
    batterRuns,
    extraType,
    extraRuns,
    isLegal,
    wicket: wicketType ? { type: wicketType, batterId, fielderId } : undefined,
    recordedBy,
  })

  return finalizeAfterBall(match, innings)
}

async function finalizeAfterBall(match, innings) {
  const state = await recomputeInnings(innings._id)
  const maxLegalBalls = legalBallsPerOver(innings.overs)
  const ended = isInningsEnded({
    legalBalls: state.agg.legalBalls,
    wickets: state.agg.wickets,
    maxLegalBalls,
  })

  if (!ended) {
    await saveInningsState(innings, state, 'in_progress')
    await maybeScheduleStats(match._id)
    return { match: await getMatchSnapshot(match._id) }
  }

  // Innings is complete — advance to the next one or finish the match.
  const allInnings = await Innings.find({ matchId: match._id }).sort({ order: 1 })
  const nextInnings = allInnings.find((i) => i.order === innings.order + 1)

  await saveInningsState(innings, state, 'completed')

  if (nextInnings) {
    nextInnings.status = 'in_progress'
    nextInnings.target = state.agg.runs + 1
    await nextInnings.save()
    match.currentInningsId = nextInnings._id
    await match.save()
  } else {
    const firstInnings = allInnings.find((i) => i.order === 1)
    const firstRuns = firstInnings?.score?.runs ?? 0
    const isChaser = match.currentInningsId === innings._id
    const runsScored = state.agg.runs
    const target = innings.target ?? firstRuns + 1

    let result = { winnerTeamId: null, margin: null }
    if (isChaser) {
      if (runsScored >= target) {
        result = {
          winnerTeamId: innings.battingTeamId,
          margin: `${MAX_WICKETS - state.agg.wickets} wickets`,
        }
      } else if (runsScored < target) {
        result = {
          winnerTeamId: innings.bowlingTeamId,
          margin: `${Math.max(target - runsScored, 0)} runs`,
        }
      }
    } else {
      result = {
        winnerTeamId: runsScored >= target ? innings.battingTeamId : innings.bowlingTeamId,
        margin: runsScored >= target ? 'first innings' : 'runs',
      }
    }

    match.status = 'completed'
    match.completedAt = new Date()
    match.result = result
    await match.save()
  }

  await refreshTeamStats(match._id)
  return { match: await getMatchSnapshot(match._id) }
}

// Manually close a match (e.g. no-play, rain, or a scoring error that can't be
// walked back). Marks it abandoned with no result — standings are unaffected
// because abandoned matches never count as played.
export async function endMatch(matchId) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  if (match.status === 'completed') {
    throw ApiError.badRequest('Match already completed')
  }
  if (match.status === 'abandoned') {
    throw ApiError.badRequest('Match is already abandoned')
  }

  if (match.currentInningsId) {
    await Innings.updateOne(
      { _id: match.currentInningsId },
      { $set: { status: 'completed' } },
    )
  }

  match.status = 'abandoned'
  match.completedAt = new Date()
  match.result = undefined
  await match.save()

  await refreshTeamStats(match._id)

  return { match: await getMatchSnapshot(match._id) }
}

export async function undoLastBall(matchId, requestedBy) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  if (match.status === 'abandoned') throw ApiError.badRequest('Match is abandoned')

  const innings = await Innings.findById(match.currentInningsId)
  if (!innings) throw ApiError.badRequest('Nothing to undo')

  const lastBall = await Ball.findOne({ inningsId: innings._id }).sort({
    createdAt: -1,
    _id: -1,
  })

  if (!lastBall) {
    throw ApiError.badRequest('This innings has no balls to undo')
  }

  if (requestedBy && String(requestedBy) !== String(lastBall.recordedBy)) {
    const scorer = await User.findById(requestedBy)
    if (scorer?.role !== 'admin') {
      throw ApiError.forbidden('Only the scorer of this ball (or an admin) can undo it')
    }
  }

  await Ball.deleteOne({ _id: lastBall._id })

  const state = await recomputeInnings(innings._id)
  await saveInningsState(innings, state, 'in_progress')

  if (match.status === 'completed') {
    match.status = 'live'
    match.completedAt = null
    match.result = undefined
    await match.save()
  }

  await refreshTeamStats(match._id)

  logger.info({ matchId, ballId: String(lastBall._id) }, 'Ball undone')

  return { match: await getMatchSnapshot(match._id) }
}

// Always recompute the standings inline the moment a match completes (or is
// undone), so the leaderboard is correct even without Redis or background
// workers. Enqueuing the BullMQ job is only a best-effort nudge for any extra
// instances that may be running.
export async function refreshTeamStats(matchId) {
  try {
    const match = await Match.findById(matchId)
      .select('teamAId teamBId')
      .lean()
    if (!match) return
    await recomputeAllTeamStats(
      [match.teamAId, match.teamBId].filter(Boolean).map(String),
    )

    if (areJobsStarted()) {
      await addTeamStatsJob(matchId).catch(() => {})
    }
  } catch (err) {
    logger.warn({ err, matchId }, 'Failed to refresh team stats')
  }
}

async function maybeScheduleStats(matchId) {
  try {
    await addTeamStatsJob(matchId)
  } catch (err) {
    logger.warn({ err }, 'Failed to enqueue team stats job')
  }
}

export default { recordBall, undoLastBall, endMatch }