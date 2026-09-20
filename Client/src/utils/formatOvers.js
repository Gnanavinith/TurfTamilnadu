const BALLS_PER_OVER = 6

export function formatOvers(totalBalls) {
  const balls = Number.isFinite(totalBalls) ? totalBalls : 0
  const overs = Math.floor(balls / BALLS_PER_OVER)
  const remain = balls % BALLS_PER_OVER
  return `${overs}.${remain}`
}

export function formatScore(runs, wickets) {
  return `${runs}/${wickets}`
}

export function formatRunRate(runs, totalBalls) {
  if (!totalBalls) return '0.00'
  return ((runs / totalBalls) * BALLS_PER_OVER).toFixed(2)
}