import { BALLS_PER_OVER } from '../../utils/constants'

/**
 * Presentation helpers for the ball ledger. The server sends each delivery with
 * a compact `token` ("4", "W", "Wd+2", "Nb+2", "Lb1", "2+W") plus the raw runs,
 * so the UI only has to map a token onto a colour.
 */
export function ballTone(token = '') {
  if (token === 'W' || token.endsWith('+W')) return 'g-w'
  if (token.startsWith('Wd')) return 'g-x'
  if (token.startsWith('Nb')) return 'g-x'
  if (token.startsWith('Lb') || (token.startsWith('B') && token !== 'B')) return 'g-x'
  if (token === '4') return 'g-four'
  if (token === '6') return 'g-six'
  return ''
}

/** Pair a stored ball with the tone class and tooltip used to render it. */
export function buildBallView(ball) {
  const token = ball?.token ?? '0'
  const runs = ballRuns(ball)
  const plural = runs === 1 ? '' : 's'

  return {
    token,
    tone: ballTone(token),
    title: ball?.wicketType
      ? `Wicket · ${String(ball.wicketType).replace('_', ' ')} · ${runs} run${plural}`
      : `${token} · ${runs} run${plural}`,
  }
}

/** Economy for a bowling entry, which is stored as a ball count. */
export function economy(entry) {
  const balls = entry?.balls ?? 0
  if (!balls) return '0.00'
  return (((entry?.runs ?? 0) / balls) * BALLS_PER_OVER).toFixed(2)
}

/** Strike rate for a batting entry. */
export function strikeRate(entry) {
  const balls = entry?.balls ?? 0
  if (!balls) return '0.00'
  return (((entry?.runs ?? 0) / balls) * 100).toFixed(1)
}

/**
 * Turn a dismissal into the scorecard's short description, e.g.
 * "c Smith b Patel" or "lbw b Khan".
 */
export function dismissalText(entry) {
  if (!entry) return ''
  if (entry.status === 'retired') return 'retired hurt'
  if (entry.status !== 'out') return ''

  const bowler = entry.bowlerName ?? null
  const fielder = entry.fielderName ?? null

  switch (entry.outType) {
    case 'bowled':
      return bowler ? `b ${bowler}` : 'bowled'
    case 'lbw':
      return bowler ? `lbw b ${bowler}` : 'lbw'
    case 'caught':
      if (fielder && bowler) return `c ${fielder} b ${bowler}`
      if (fielder) return `c ${fielder}`
      return bowler ? `c & b ${bowler}` : 'caught'
    case 'stumped':
      if (fielder && bowler) return `st ${fielder} b ${bowler}`
      return bowler ? `st b ${bowler}` : 'stumped'
    case 'run_out':
      return fielder ? `run out (${fielder})` : 'run out'
    case 'hit_wicket':
      return bowler ? `hit wkt b ${bowler}` : 'hit wicket'
    case 'retired':
      return 'retired'
    default:
      return 'out'
  }
}

/** Map a wicket type to the label shown on the button. */
export const WICKET_LABELS = {
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'LBW',
  run_out: 'Run out',
  stumped: 'Stumped',
  hit_wicket: 'Hit wicket',
}

/** Wickets that need a fielder to be named. */
export const FIELDER_WICKETS = new Set(['caught', 'run_out', 'stumped'])

/** Runs added by a single delivery, as stored on the ball. */
export function ballRuns(ball) {
  return (ball?.batterRuns ?? 0) + (ball?.extraRuns ?? 0)
}

/** Total runs in one completed over. */
export function overRuns(over) {
  return (over ?? []).reduce((sum, ball) => sum + ballRuns(ball), 0)
}
