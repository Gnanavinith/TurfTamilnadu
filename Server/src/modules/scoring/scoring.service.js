import mongoose from 'mongoose'
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
  EXTRA_BUCKETS,
  legalBallsPerOver,
  overNumber,
  ballInOver,
  isInningsEnded,
  emptyExtrasBreakdown,
  shouldRotateForDelivery,
  deriveCreaseState,
} from './scoring.utils.js'
import { addTeamStatsJob, areJobsStarted } from '../../jobs/queue.js'
import { recomputeAllTeamStats } from '../leaderboard/leaderboard.service.js'

// Dismissals that count towards the bowler's column.
const BOWLER_WICKETS = new Set(['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'])
// Dismissals that hand the innings a new batter.
const DISMISSALS = new Set(['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket'])

const oid = (value) => (value ? new mongoose.Types.ObjectId(String(value)) : null)
const sameId = (a, b) => Boolean(a) && Boolean(b) && String(a) === String(b)

function assertInPlayingXI(match, userId, teamId) {
  const xi =
    String(teamId) === String(match.teamAId) ? match.playingXI?.teamA : match.playingXI?.teamB

  if (!xi || xi.length === 0) return // XI not locked yet, skip check
  if (!xi.some((id) => String(id) === String(userId))) {
    throw ApiError.badRequest('Player is not in the playing XI for this team')
  }
}

/** The batting side's XI, straight off the match. */
export function battingXI(match, innings) {
  return String(innings.battingTeamId) === String(match.teamAId)
    ? (match.playingXI?.teamA ?? [])
    : (match.playingXI?.teamB ?? [])
}

/** The bowling side's XI, straight off the match. */
export function bowlingXI(match, innings) {
  return String(innings.bowlingTeamId) === String(match.teamAId)
    ? (match.playingXI?.teamA ?? [])
    : (match.playingXI?.teamB ?? [])
}

/**
 * Returns the bowler who bowled the last delivery of the just-completed over,
 * or null when the innings isn't at an over boundary. Enforces the standard
 * rule that a bowler cannot bowl two consecutive overs.
 */
async function lastCompletedOverBowler(innings) {
  const legal = innings.score?.balls ?? 0
  if (legal <= 0 || legal % BALLS_PER_OVER !== 0) return null

  const lastBall = await Ball.findOne({ inningsId: innings._id, over: legal / BALLS_PER_OVER })
    .sort({ ball: -1 })
    .select('bowlerId')
    .lean()

  return lastBall?.bowlerId ?? null
}

/** Wides and no-balls cost the bowler runs; byes and leg-byes do not. */
function runsToBowler(ball) {
  return (
    (ball.batterRuns ?? 0) + (NON_BALL_DELIVERIES.has(ball.extraType) ? ball.extraRuns ?? 0 : 0)
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

function bucketExtras(balls) {
  const breakdown = emptyExtrasBreakdown()
  for (const ball of balls) {
    const bucket = EXTRA_BUCKETS[ball.extraType]
    if (bucket) breakdown[bucket] += ball.extraRuns ?? 0
  }
  return breakdown
}

/** Everyone in the batting XI who is still capable of coming to the crease. */
export function availableBatters(innings, xi) {
  const unavailable = [
    ...(innings.retiredHurt ?? []).map(String),
    ...(innings.batting ?? [])
      .filter((entry) => ['out', 'retired'].includes(entry.status))
      .map((entry) => String(entry.userId)),
  ]
  return xi
    .map(String)
    .filter(
      (id) =>
        !unavailable.includes(id) &&
        !sameId(id, innings.strikerId) &&
        !sameId(id, innings.nonStrikerId),
    )
}

/**
 * Rebuild an innings' score, extras split, batting and bowling cards from its
 * ball records. The ledger is the single source of truth, which keeps recording
 * a ball and undoing one trivially consistent.
 */
async function recomputeInnings(inningsId) {
  const balls = await Ball.find({ inningsId }).sort({ createdAt: 1, _id: 1 }).lean()

  const agg = { runs: 0, wickets: 0, legalBalls: 0, extras: 0 }
  const batting = new Map()
  const bowling = new Map()

  for (const ball of balls) {
    agg.runs += ball.runs ?? 0
    agg.extras += ball.extraRuns ?? 0
    if (ball.isLegal) agg.legalBalls += 1
    if (ball.wicket?.type) agg.wickets += 1

    // On a run out the dismissed batter may be the non-striker, and any runs
    // completed on that ball belong to them — not to the striker we recorded.
    const runOutBatterId =
      ball.wicket?.type === 'run_out' && ball.wicket.batterId
        ? String(ball.wicket.batterId)
        : null

    const batKey = String(runOutBatterId ?? ball.batterId)
    const bat = batting.get(batKey) ?? {
      userId: runOutBatterId ? ball.wicket.batterId : ball.batterId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: 'batting',
      outType: null,
    }
    // Runs off the bat always belong to the batter, even off a no-ball. Only the
    // ball faced depends on the delivery being legal.
    bat.runs += ball.batterRuns ?? 0
    if (ball.isLegal) bat.balls += 1
    if (ball.batterRuns === 4) bat.fours += 1
    if (ball.batterRuns === 6) bat.sixes += 1
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
    if (ball.wicket?.type && BOWLER_WICKETS.has(ball.wicket.type)) bowl.wickets += 1
    bowling.set(bowlKey, bowl)
  }

  for (const [key, bowl] of bowling) {
    bowl.maidens = computeMaidens(balls, key)
  }

  return {
    balls,
    agg: { ...agg, extrasBreakdown: bucketExtras(balls) },
    batting: [...batting.values()].sort((a, b) => b.runs - a.runs || a.balls - b.balls),
    bowling: [...bowling.values()].sort((a, b) => a.balls - b.balls || b.wickets - a.wickets),
  }
}

function applyScore(innings, state, status) {
  innings.score = {
    runs: state.agg.runs,
    wickets: state.agg.wickets,
    balls: state.agg.legalBalls,
    extras: state.agg.extras,
  }
  innings.extrasBreakdown = state.agg.extrasBreakdown
  innings.batting = state.batting
  innings.bowling = state.bowling
  innings.status = status
}

/**
 * The recompute rebuilds the batting card from balls alone, so retired-hurt
 * batters would show as still batting. Re-mark them from the crease record.
 */
function reapplyRetirements(innings) {
  for (const id of innings.retiredHurt ?? []) {
    const entry = (innings.batting ?? []).find((b) => sameId(b.userId, id))
    if (entry && entry.status !== 'out') entry.status = 'retired'
  }
}

function swapEnds(innings) {
  const swap = innings.strikerId
  innings.strikerId = innings.nonStrikerId
  innings.nonStrikerId = swap
}

/**
 * Move the crease on after a delivery. Single place that knows the laws of
 * strike rotation, over ends and last-man-standing promotion, so explicit
 * scorer actions (swap, retire, pick a new batter) can't drift from the ledger.
 */
function advanceCrease(innings, ball, xi) {
  if (shouldRotateForDelivery(ball)) swapEnds(innings)

  if (ball.wicket?.type && DISMISSALS.has(ball.wicket.type)) {
    if (sameId(ball.wicket.batterId, innings.strikerId)) innings.strikerId = null
    else innings.nonStrikerId = null
  }

  innings.bowlerId = oid(ball.bowlerId) ?? innings.bowlerId

  const legalBallsAfter = innings.score?.balls ?? 0
  if (ball.isLegal && legalBallsAfter % BALLS_PER_OVER === 0) {
    // Over finished: the bowler must change and the ends swap.
    innings.previousBowlerId = oid(ball.bowlerId) ?? innings.previousBowlerId
    innings.bowlerId = null
    if (innings.strikerId && innings.nonStrikerId) swapEnds(innings)
  }

  refreshLastManStanding(innings, xi)
}

/**
 * With everyone else dismissed or retired, the last batter carries the bat
 * through alone — promote them so the innings can continue.
 */
function refreshLastManStanding(innings, xi) {
  const remaining = availableBatters(innings, xi)
  innings.lastManStanding = remaining.length === 0

  if (remaining.length === 0) {
    if (!innings.strikerId && innings.nonStrikerId) {
      innings.strikerId = innings.nonStrikerId
      innings.nonStrikerId = null
    } else if (!innings.strikerId && !innings.nonStrikerId) {
      innings.lastManStanding = true
    }
  }
}

/** Seed the opening pair from the XI when an innings starts. */
function seedOpeningPair(innings, xi) {
  const [first, second] = xi.map(String)
  innings.strikerId = oid(first)
  innings.nonStrikerId = xi.length > 1 ? oid(second) : null
  refreshLastManStanding(innings, xi)
}

async function loadLiveContext(matchId) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  if (match.status !== 'live') throw ApiError.badRequest('Match is not live')

  const innings = await Innings.findById(match.currentInningsId)
  if (!innings || innings.status !== 'in_progress') {
    throw ApiError.badRequest('No innings currently in progress')
  }

  return { match, innings }
}

export async function recordBall(matchId, payload, recordedBy) {
  const { match, innings } = await loadLiveContext(matchId)

  const batterRuns = Math.max(0, payload.batterRuns ?? 0)
  const extraRuns = Math.max(0, payload.extraRuns ?? 0)
  const extraType = payload.extraType ?? null
  const wicketType = payload.wicketType ?? null

  const batterId = payload.batterId ?? innings.strikerId
  const nonStrikerId = payload.nonStrikerId ?? innings.nonStrikerId
  const bowlerId = payload.bowlerId ?? innings.bowlerId

  if (!batterId) throw ApiError.badRequest('Select a striker before scoring')
  if (!bowlerId) throw ApiError.badRequest('Select a bowler before scoring')
  if (sameId(batterId, bowlerId)) {
    throw ApiError.badRequest('Batter and bowler must be different players')
  }

  if (wicketType && !DISMISSALS.has(wicketType)) {
    throw ApiError.badRequest('Retirements go through the retire action, not a wicket')
  }
  if (wicketType && !batterId) {
    throw ApiError.badRequest('Select who was dismissed')
  }

  assertInPlayingXI(match, batterId, innings.battingTeamId)
  assertInPlayingXI(match, bowlerId, innings.bowlingTeamId)
  if (nonStrikerId) assertInPlayingXI(match, nonStrikerId, innings.battingTeamId)

  const outBatterId = wicketType ? (payload.outBatterId ?? batterId) : null
  if (wicketType === 'run_out' || wicketType === 'stumped' || wicketType === 'caught') {
    if (!payload.fielderId) {
      throw ApiError.badRequest(`Select the fielder for a ${wicketType.replace('_', ' ')}`)
    }
  }

  const previousOverBowler = await lastCompletedOverBowler(innings)
  if (previousOverBowler && sameId(bowlerId, previousOverBowler)) {
    throw ApiError.badRequest(
      'A bowler cannot bowl two consecutive overs. Pick a different bowler.',
    )
  }

  if ((innings.score.balls ?? 0) >= legalBallsPerOver(innings.overs)) {
    throw ApiError.badRequest('Innings over limit reached')
  }
  if ((innings.score.wickets ?? 0) >= MAX_WICKETS) {
    throw ApiError.badRequest('Innings is all out')
  }

  const isLegal = !NON_BALL_DELIVERIES.has(extraType)
  const ball = await Ball.create({
    matchId,
    inningsId: innings._id,
    over: overNumber(innings.score.balls),
    ball: ballInOver(innings.score.balls),
    batterId: oid(batterId),
    nonStrikerId: oid(nonStrikerId),
    bowlerId: oid(bowlerId),
    runs: batterRuns + extraRuns,
    batterRuns,
    extraType,
    extraRuns,
    isLegal,
    wicket: wicketType
      ? { type: wicketType, batterId: oid(outBatterId), fielderId: oid(payload.fielderId) }
      : undefined,
    recordedBy,
  })

  return finalizeAfterBall(match, innings, { ball, xi: battingXI(match, innings) })
}

async function finalizeAfterBall(match, innings, { ball, xi }) {
  const state = await recomputeInnings(innings._id)
  const maxLegalBalls = legalBallsPerOver(innings.overs)
  const ended = isInningsEnded({
    legalBalls: state.agg.legalBalls,
    wickets: state.agg.wickets,
    maxLegalBalls,
  })

  if (!ended) {
    applyScore(innings, state, 'in_progress')
    reapplyRetirements(innings)
    advanceCrease(innings, ball.toObject(), xi)
    await innings.save()
    await maybeScheduleStats(match._id)
    return { match: await getMatchSnapshot(match._id) }
  }

  const allInnings = await Innings.find({ matchId: match._id }).sort({ order: 1 })
  const nextInnings = allInnings.find((i) => i.order === innings.order + 1)

  applyScore(innings, state, 'completed')
  innings.bowlerId = null

  if (nextInnings) {
    await innings.save()

    nextInnings.status = 'in_progress'
    nextInnings.target = state.agg.runs + 1
    nextInnings.strikerId = null
    nextInnings.nonStrikerId = null
    nextInnings.bowlerId = null
    nextInnings.previousBowlerId = null
    seedOpeningPair(nextInnings, battingXI(match, nextInnings))
    await nextInnings.save()

    match.currentInningsId = nextInnings._id
    await match.save()
  } else {
    await innings.save()
    applyResult(match, innings, allInnings, state)
  }

  await refreshTeamStats(match._id)
  return { match: await getMatchSnapshot(match._id) }
}

/** Work out who won, and by how much, once the chase is done. */
function applyResult(match, innings, allInnings, state) {
  const runsScored = state.agg.runs
  const target = innings.target ?? (allInnings.find((i) => i.order === 1)?.score?.runs ?? 0) + 1

  let result
  if (runsScored >= target) {
    const wicketsLeft = MAX_WICKETS - state.agg.wickets
    result = {
      winnerTeamId: innings.battingTeamId,
      margin: `${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`,
    }
  } else {
    const runsShort = target - runsScored
    result = {
      winnerTeamId: innings.bowlingTeamId,
      margin: `${runsShort} run${runsShort === 1 ? '' : 's'}`,
    }
  }

  match.status = 'completed'
  match.completedAt = new Date()
  match.result = result
  return match.save()
}

async function persist(match, innings) {
  await innings.save()
  return { match: await getMatchSnapshot(match._id) }
}

/** Explicitly put a batter on one end. Used after a wicket or a retirement. */
export async function setBatsman(matchId, { strikerId, nonStrikerId }, changedBy) {
  const { match, innings } = await loadLiveContext(matchId)
  const xi = battingXI(match, innings)

  // Each end can be set on its own, so work out the resulting pair before
  // validating: a batter already at the crease is a legal choice (it is how the
  // scorer corrects a mistake or moves a player between ends).
  const nextStrikerId = strikerId ? oid(strikerId) : innings.strikerId
  const nextNonStrikerId = nonStrikerId ? oid(nonStrikerId) : innings.nonStrikerId

  if (sameId(nextStrikerId, nextNonStrikerId)) {
    throw ApiError.badRequest('The same batter cannot be at both ends')
  }

  // availableBatters excludes the current pair, so add them back before checking.
  const selectable = [
    ...availableBatters(innings, xi),
    ...[innings.strikerId, innings.nonStrikerId].filter(Boolean).map(String),
  ]

  for (const [label, id] of [
    ['striker', strikerId],
    ['non-striker', nonStrikerId],
  ]) {
    if (!id) continue
    assertInPlayingXI(match, id, innings.battingTeamId)
    if (!selectable.includes(String(id))) {
      throw ApiError.badRequest(
        `That ${label} is already dismissed or retired and cannot bat again`,
      )
    }
  }

  innings.strikerId = nextStrikerId
  innings.nonStrikerId = nextNonStrikerId

  refreshLastManStanding(innings, xi)
  logger.info({ matchId, strikerId, nonStrikerId, changedBy }, 'Batsmen updated')
  return persist(match, innings)
}

/** Explicitly pick the bowler for the current or next over. */
export async function setBowler(matchId, { bowlerId }, changedBy) {
  const { match, innings } = await loadLiveContext(matchId)
  assertInPlayingXI(match, bowlerId, innings.bowlingTeamId)

  const previous = await lastCompletedOverBowler(innings)
  if (previous && sameId(bowlerId, previous)) {
    throw ApiError.badRequest(
      'A bowler cannot bowl two consecutive overs. Pick a different bowler.',
    )
  }

  innings.bowlerId = oid(bowlerId)
  logger.info({ matchId, bowlerId, changedBy }, 'Bowler updated')
  return persist(match, innings)
}

/** Swap the ends without recording a delivery (mid-over tactics, or a mistake). */
export async function swapStrike(matchId, changedBy) {
  const { match, innings } = await loadLiveContext(matchId)
  if (!innings.strikerId || !innings.nonStrikerId) {
    throw ApiError.badRequest('Both batters must be at the crease to swap strike')
  }
  swapEnds(innings)
  logger.info({ matchId, changedBy }, 'Strike swapped')
  return persist(match, innings)
}

/**
 * Retire a batter hurt. Not a wicket: the innings keeps batting, and the batter
 * can be recalled later without losing their runs.
 */
export async function retireHurt(matchId, userId, changedBy) {
  const { match, innings } = await loadLiveContext(matchId)
  const xi = battingXI(match, innings)
  assertInPlayingXI(match, userId, innings.battingTeamId)

  const retired = (innings.retiredHurt ?? []).map(String)
  if (retired.includes(String(userId))) return persist(match, innings)

  innings.retiredHurt.push(oid(userId))
  if (sameId(userId, innings.strikerId)) innings.strikerId = null
  if (sameId(userId, innings.nonStrikerId)) innings.nonStrikerId = null

  const entry = (innings.batting ?? []).find((b) => sameId(b.userId, userId))
  if (entry) entry.status = 'retired'

  refreshLastManStanding(innings, xi)
  logger.info({ matchId, userId, changedBy }, 'Batter retired hurt')
  return persist(match, innings)
}

/** Bring a retired-hurt batter back into the innings. */
export async function recallRetired(matchId, userId, changedBy) {
  const { match, innings } = await loadLiveContext(matchId)
  innings.retiredHurt = (innings.retiredHurt ?? []).filter((id) => !sameId(id, userId))
  const entry = (innings.batting ?? []).find((b) => sameId(b.userId, userId))
  if (entry && entry.status === 'retired') entry.status = 'batting'
  refreshLastManStanding(innings, battingXI(match, innings))
  logger.info({ matchId, userId, changedBy }, 'Batter recalled')
  return persist(match, innings)
}

// Manually close a match (no-play, rain, or a scoring error that can't be walked
// back). Marked abandoned with no result — standings are unaffected because
// abandoned matches never count as played.
export async function endMatch(matchId) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  if (match.status === 'completed') throw ApiError.badRequest('Match already completed')
  if (match.status === 'abandoned') throw ApiError.badRequest('Match is already abandoned')

  if (match.currentInningsId) {
    await Innings.updateOne(
      { _id: match.currentInningsId },
      { $set: { status: 'completed', bowlerId: null } },
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

  // Walk back through the innings so an undo at an innings boundary also undoes
  // the transition into the previous one.
  let innings = await Innings.findById(match.currentInningsId)
  if (!innings) throw ApiError.badRequest('Nothing to undo')

  const targetInnings = await findUndoableInnings(match, innings)
  if (!targetInnings) throw ApiError.badRequest('Nothing to undo')

  const lastBall = await Ball.findOne({ inningsId: targetInnings._id }).sort({
    createdAt: -1,
    _id: -1,
  })
  if (!lastBall) throw ApiError.badRequest('This innings has no balls to undo')

  if (requestedBy && String(requestedBy) !== String(lastBall.recordedBy)) {
    const scorer = await User.findById(requestedBy)
    if (scorer?.role !== 'admin') {
      throw ApiError.forbidden('Only the scorer of this ball (or an admin) can undo it')
    }
  }

  await Ball.deleteOne({ _id: lastBall._id })

  const state = await recomputeInnings(targetInnings._id)
  const stillEnded = isInningsEnded({
    legalBalls: state.agg.legalBalls,
    wickets: state.agg.wickets,
    maxLegalBalls: legalBallsPerOver(targetInnings.overs),
  })

  applyScore(targetInnings, state, stillEnded ? 'completed' : 'in_progress')
  await restoreCrease(match, targetInnings)
  reapplyRetirements(targetInnings)
  await targetInnings.save()

  // Undoing across an innings boundary rewinds the match to that innings too.
  if (match.status === 'completed' || String(targetInnings._id) !== String(innings._id)) {
    match.currentInningsId = targetInnings._id
    match.status = 'live'
    match.completedAt = null
    match.result = undefined
    await match.save()

    // Any later innings that were already in progress goes back on deck.
    await Innings.updateMany(
      { matchId: match._id, order: { $gt: targetInnings.order } },
      { $set: { status: 'not_started', target: null } },
    )
  }

  await refreshTeamStats(match._id)

  logger.info({ matchId, ballId: String(lastBall._id) }, 'Ball undone')

  return { match: await getMatchSnapshot(match._id) }
}

/** Find the most recent innings that still has a ball to undo. */
async function findUndoableInnings(match, currentInnings) {
  const candidates = await Innings.find({ matchId: match._id }).sort({ order: -1 })
  for (const innings of candidates) {
    if (String(innings._id) === String(currentInnings._id)) return innings
    const hasBalls = await Ball.exists({ inningsId: innings._id })
    if (hasBalls) return innings
  }
  return currentInnings
}

/**
 * After an undo, replay the surviving balls to work out exactly who is on
 * strike, who is bowling and where the over ended.
 */
async function restoreCrease(match, innings) {
  const balls = await Ball.find({ inningsId: innings._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean()

  const xi = battingXI(match, innings)
  // Retirements are explicit scorer actions, not ledger entries, so they're set
  // aside while the balls are replayed and re-applied afterwards.
  const savedRetired = (innings.retiredHurt ?? []).map(oid)

  innings.retiredHurt = []

  if (balls.length === 0) {
    innings.retiredHurt = savedRetired
    seedOpeningPair(innings, xi)
    return
  }

  const replayed = deriveCreaseState(balls, { xi })
  innings.strikerId = oid(replayed.strikerId)
  innings.nonStrikerId = oid(replayed.nonStrikerId)
  innings.bowlerId = oid(replayed.bowlerId)
  innings.previousBowlerId = oid(replayed.previousBowlerId)

  // Anyone who had retired hurt is no longer available at the crease.
  for (const id of savedRetired) {
    if (sameId(id, innings.strikerId)) innings.strikerId = null
    if (sameId(id, innings.nonStrikerId)) innings.nonStrikerId = null
  }
  innings.retiredHurt = savedRetired
  refreshLastManStanding(innings, xi)
}

// Always recompute the standings inline the moment a match completes (or is
// undone), so the leaderboard is correct even without Redis or background
// workers. Enqueuing the BullMQ job is only a best-effort nudge for any extra
// instances that may be running.
export async function refreshTeamStats(matchId) {
  try {
    const match = await Match.findById(matchId).select('teamAId teamBId').lean()
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

export default {
  recordBall,
  undoLastBall,
  endMatch,
  setBatsman,
  setBowler,
  swapStrike,
  retireHurt,
  recallRetired,
}
