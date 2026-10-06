export const BALLS_PER_OVER = 6
export const MAX_WICKETS = 10
export const LEGAL_OVERS_MIN = 1
export const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired']
export const EXTRA_TYPES = ['wide', 'no_ball', 'bye', 'leg_bye']
export const NON_BALL_DELIVERIES = new Set(['wide', 'no_ball'])

export const legalBallsPerOver = (inningsOvers) =>
  (inningsOvers ?? LEGAL_OVERS_MIN) * BALLS_PER_OVER

export const isLegalBall = (batterRuns, extraType) => !NON_BALL_DELIVERIES.has(extraType)

export const formatOvers = (legalBalls) =>
  `${Math.floor(legalBalls / BALLS_PER_OVER)}.${legalBalls % BALLS_PER_OVER}`

export const overNumber = (legalBalls) => Math.floor(legalBalls / BALLS_PER_OVER) + 1

export const ballInOver = (legalBalls) => (legalBalls % BALLS_PER_OVER) + 1

export const isOverComplete = (legalBalls) =>
  legalBalls > 0 && legalBalls % BALLS_PER_OVER === 0

export const shouldRotateForRun = (batterRuns) => batterRuns % 2 === 1

export const rotateStrike = (strikerId, nonStrikerId) => ({
  strikerId: nonStrikerId,
  nonStrikerId: strikerId,
})

export const calculateRunRate = (runs, legalBalls) =>
  legalBalls > 0 ? (runs / legalBalls) * BALLS_PER_OVER : 0

export const isInningsEnded = ({ legalBalls, wickets, maxLegalBalls }) =>
  legalBalls >= maxLegalBalls || wickets >= MAX_WICKETS

export const EXTRA_BUCKETS = { wide: 'wide', no_ball: 'noBall', bye: 'bye', leg_bye: 'legBye' }

export const emptyExtrasBreakdown = () => ({ wide: 0, noBall: 0, bye: 0, legBye: 0 })

/**
 * Was the strike swapped at the end of this delivery?
 * Mirrors real cricket: odd runs off the bat rotate, odd byes/leg-byes rotate,
 * and a wide or no-ball only rotates when the *total* added is odd.
 */
export function shouldRotateForDelivery(ball) {
  const batterRuns = ball?.batterRuns ?? 0
  const extraRuns = ball?.extraRuns ?? 0

  // A no-ball rotates on the *total* added (batter runs + the penalty run), so it
  // has to be judged before the odd-runs-off-the-bat check.
  if (ball?.extraType === 'no_ball') return (batterRuns + extraRuns) % 2 === 1

  if (batterRuns % 2 === 1) return true

  switch (ball?.extraType) {
    case 'leg_bye':
    case 'bye':
    case 'wide':
      return extraRuns % 2 === 1
    default:
      return false
  }
}

/**
 * Walk the ball ledger to reconstruct the live crease: who is on strike, who is
 * at the non-striker's end, who is bowling the current over, who bowled the
 * previous one, the extras split, and who is still to bat.
 *
 * The ledger is the source of truth, so this keeps the scorer honest across
 * reloads, reconnects and multi-scorer sessions.
 */
export function deriveCreaseState(balls, { xi = [] } = {}) {
  const extras = emptyExtrasBreakdown()
  const dismissed = []

  let strikerId = xi[0] ? String(xi[0]) : null
  let nonStrikerId = xi[1] ? String(xi[1]) : null
  let bowlerId = null
  let previousBowlerId = null
  let legalBalls = 0
  let wickets = 0
  let thisOver = 0

  for (const ball of balls) {
    const bucket = EXTRA_BUCKETS[ball.extraType]
    if (bucket) extras[bucket] += ball.extraRuns ?? 0

    if (strikerId && nonStrikerId && shouldRotateForDelivery(ball)) {
      const swap = strikerId
      strikerId = nonStrikerId
      nonStrikerId = swap
    }

    if (ball.wicket?.type) {
      wickets += 1
      const outId = String(ball.wicket.batterId ?? ball.batterId ?? '')
      if (outId && !dismissed.includes(outId)) dismissed.push(outId)
      if (outId && outId === strikerId) strikerId = null
      else if (outId && outId === nonStrikerId) nonStrikerId = null
    }

    if (ball.isLegal) legalBalls += 1

    const overComplete = legalBalls > 0 && legalBalls % BALLS_PER_OVER === 0
    if (overComplete) {
      previousBowlerId = ball.bowlerId ? String(ball.bowlerId) : previousBowlerId
      bowlerId = null
      thisOver = 0
      if (strikerId && nonStrikerId) {
        const swap = strikerId
        strikerId = nonStrikerId
        nonStrikerId = swap
      }
    } else {
      if (ball.bowlerId) bowlerId = String(ball.bowlerId)
      thisOver += 1
    }
  }

  const xiIds = xi.map((id) => String(id))
  const unavailable = dismissed
  const availableBatters = xiIds.filter(
    (id) => !unavailable.includes(id) && id !== strikerId && id !== nonStrikerId,
  )

  return {
    strikerId,
    nonStrikerId,
    bowlerId,
    previousBowlerId,
    legalBalls,
    wickets,
    extras,
    thisOverBalls: thisOver,
    dismissed,
    availableBatters,
  }
}

/**
 * Turn a stored ball into the compact token the UI renders ("4", "W", "Wd+2",
 * "Lb1", "2+W") plus the running total of runs the delivery added.
 */
export function describeBall(ball) {
  const batterRuns = ball?.batterRuns ?? 0
  const extraRuns = ball?.extraRuns ?? 0
  const wicketType = ball?.wicket?.type ?? null

  let token = '0'
  if (ball?.extraType === 'wide') token = extraRuns > 1 ? `Wd+${extraRuns - 1}` : 'Wd'
  else if (ball?.extraType === 'no_ball') token = batterRuns ? `Nb+${batterRuns}` : 'Nb'
  else if (ball?.extraType === 'bye') token = `B${batterRuns + extraRuns}`
  else if (ball?.extraType === 'leg_bye') token = `Lb${batterRuns + extraRuns}`
  else token = String(batterRuns)

  if (wicketType) token = batterRuns ? `${batterRuns}+W` : 'W'

  return {
    token,
    runs: ball?.runs ?? 0,
    batterRuns,
    extraRuns,
    extraType: ball?.extraType ?? null,
    wicketType,
    isLegal: ball?.isLegal !== false,
    batterId: ball?.batterId ? String(ball.batterId) : null,
    bowlerId: ball?.bowlerId ? String(ball.bowlerId) : null,
    fielderId: ball?.wicket?.fielderId ? String(ball.wicket.fielderId) : null,
    outBatterId: ball?.wicket?.batterId ? String(ball.wicket.batterId) : null,
  }
}

export default {
  BALLS_PER_OVER,
  MAX_WICKETS,
  WICKET_TYPES,
  EXTRA_TYPES,
  NON_BALL_DELIVERIES,
  EXTRA_BUCKETS,
  legalBallsPerOver,
  isLegalBall,
  formatOvers,
  overNumber,
  ballInOver,
  isOverComplete,
  shouldRotateForRun,
  rotateStrike,
  calculateRunRate,
  isInningsEnded,
  emptyExtrasBreakdown,
  shouldRotateForDelivery,
  deriveCreaseState,
  describeBall,
}