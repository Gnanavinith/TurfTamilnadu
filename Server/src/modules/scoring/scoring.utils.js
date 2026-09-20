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

export default {
  BALLS_PER_OVER,
  MAX_WICKETS,
  WICKET_TYPES,
  EXTRA_TYPES,
  NON_BALL_DELIVERIES,
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
}