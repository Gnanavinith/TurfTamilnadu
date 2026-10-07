import { BALLS_PER_OVER } from '../../../utils/constants'
import { ballRuns } from '../cricket'

/* -------------------------------------------------------------------------- */
/* Figure formatters. The snapshot stores overs as a single legal-ball count, */
/* so every figure is derived from balls rather than a separate overs number. */
/* -------------------------------------------------------------------------- */

/** "14.3" — 14 overs and 3 balls. */
export function ovStr(balls = 0) {
  return `${Math.floor(balls / BALLS_PER_OVER)}.${balls % BALLS_PER_OVER}`
}

/** Run rate for an innings or a bowler. */
export function rr(runs = 0, balls = 0) {
  return balls ? ((runs / balls) * BALLS_PER_OVER).toFixed(2) : '0.00'
}

/** Economy for a bowler — the same arithmetic as a run rate over legal balls. */
export function economy(runs = 0, balls = 0) {
  return rr(runs, balls)
}

/** Strike rate for a batter. */
export function sr(runs = 0, balls = 0) {
  return balls ? ((runs / balls) * 100).toFixed(2) : '0.00'
}

/* -------------------------------------------------------------------------- */
/* Player lookups                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Name / shirt-number lookups over a squad. Shirt numbers live on the team
 * membership and the snapshot resolves them per XI, so a player with no number
 * simply renders without the leading '#'.
 */
export function createPlayerHelpers(players = []) {
  const byId = new Map(players.map((player) => [String(player.id), player]))
  const lookup = (pid) => byId.get(String(pid))

  return {
    getPlayerName: (pid) => lookup(pid)?.name ?? lookup(pid)?.email ?? 'Unknown Player',
    getPlayerJersey: (pid) => lookup(pid)?.jerseyNumber ?? null,
    /** "#7", or '' when the player has no shirt number. */
    getJerseyLabel: (pid) => {
      const jersey = lookup(pid)?.jerseyNumber
      return jersey == null ? '' : `#${jersey}`
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Ball tokens                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Colour a ball token. The vocabulary matches the server's `describeBall`:
 * "0".."6", "W", "<n>+W", "Wd", "Wd+2", "Nb", "Nb+2", "B1", "Lb1".
 */
export function getBallBadgeStyles(val = '') {
  if (val === 'W' || val.includes('+W') || val.includes('W+')) {
    return 'bg-red-500 text-white font-black'
  }
  if (val.startsWith('Nb+')) {
    return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
  }
  if (val.startsWith('Wd+')) {
    return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
  }
  if (val.startsWith('Lb')) {
    return 'bg-sky-50 text-sky-700 border border-sky-200 font-bold'
  }
  if (val.startsWith('B') && val.length <= 2 && val !== 'B') {
    return 'bg-sky-50 text-sky-700 border border-sky-200 font-bold'
  }
  switch (val) {
    case '0':
      return 'bg-neutral-100 text-neutral-600 border border-neutral-200'
    case '1':
    case '2':
    case '3':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case '4':
      return 'bg-emerald-500 text-neutral-950 font-black'
    case '6':
      return 'bg-purple-600 text-white font-black'
    case 'Wd':
    case 'Nb':
      return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
    default:
      return 'bg-neutral-100 text-neutral-600'
  }
}

/** Runs scored off one over. */
export function overRuns(over = []) {
  return over.reduce((sum, ball) => sum + ballRuns(ball), 0)
}

/**
 * Split a flat, chronological list of deliveries into overs.
 *
 * The snapshot's `oversTimeline` spans every innings in the match and drops the
 * server's own `over` field when describing a ball, so over boundaries are
 * recovered by counting legal balls — an over is six legal deliveries, however
 * many wides and no-balls sit inside it.
 */
export function groupIntoOvers(balls = []) {
  const overs = []
  let current = null
  let legal = 0
  // Once a legal ball completes the sixth, the *next* delivery opens a fresh
  // over — including an illegal one. Testing the running count instead would
  // open a second over for every wide that followed the sixth ball.
  let startNewOver = true

  for (const ball of balls) {
    if (startNewOver) {
      current = []
      overs.push(current)
      startNewOver = false
    }
    current.push(ball)
    if (ball.isLegal !== false) {
      legal += 1
      if (legal % BALLS_PER_OVER === 0) startNewOver = true
    }
  }

  return overs
}

/* -------------------------------------------------------------------------- */
/* Squad selection                                                            */
/* -------------------------------------------------------------------------- */

/** The batting side's XI for one innings, as player objects. */
export function battingXI(match, innings) {
  if (!match || !innings) return []
  const side =
    String(innings.battingTeamId) === String(match.teamA?.id) ? 'teamA' : 'teamB'
  return match.playingXI?.[side] ?? []
}

/** The bowling side's XI for one innings, as player objects. */
export function bowlingXI(match, innings) {
  if (!match || !innings) return []
  const side =
    String(innings.bowlingTeamId) === String(match.teamA?.id) ? 'teamA' : 'teamB'
  return match.playingXI?.[side] ?? []
}

/** Ids of everyone who can no longer come to the crease. */
export function unavailableBatterIds(innings) {
  const out = (innings?.batting ?? [])
    .filter((entry) => ['out', 'retired'].includes(entry.status))
    .map((entry) => String(entry.userId))
  const retired = (innings?.retiredHurt ?? []).map((player) => String(player.id))
  return [...out, ...retired]
}

/** Ids of everyone still able to take a turn in this innings. */
export function availableBatterIds(match, innings) {
  const unavailable = unavailableBatterIds(innings)
  return battingXI(match, innings)
    .map((player) => String(player.id))
    .filter((id) => !unavailable.includes(id))
}

/**
 * Deliveries belonging to one innings.
 *
 * A ball carries no innings id, but its batter does — and a batter only ever
 * bats in a single innings of a match, so the batting XI identifies the innings
 * a delivery belongs to.
 */
export function ballsForInnings(match, innings, timeline) {
  const batters = new Set(battingXI(match, innings).map((player) => String(player.id)))
  return (timeline ?? []).filter((ball) => batters.has(String(ball.batterId)))
}

/* -------------------------------------------------------------------------- */
/* Outcome -> ball payload                                                    */
/* -------------------------------------------------------------------------- */

/** Display labels for dismissals, mapped to the server's stored keys. */
export const WICKET_KEYS = {
  Bowled: 'bowled',
  Caught: 'caught',
  LBW: 'lbw',
  'Run Out': 'run_out',
  Stumped: 'stumped',
  'Hit Wicket': 'hit_wicket',
  Retired: 'retired',
}

/** The dismissal types a wicket can actually be. */
export const WICKET_TYPES = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket']

/** Dismissals that need a fielder named alongside the bowler. */
export const FIELDER_WICKETS = new Set(['caught', 'run_out', 'stumped'])

/**
 * Translate a scoring-pad outcome into the payload `scoring:record` expects.
 *
 * Byes and leg byes send their runs entirely as extras so they never reach the
 * batter's column. A no-ball is the mirror image: the penalty run is the extra,
 * and anything the batter hit off it stays with them.
 */
export function outcomeToPayload(outcome, wicket = null) {
  if (outcome === 'W') {
    const wicketType = WICKET_KEYS[wicket?.type] ?? 'bowled'
    return {
      wicketType,
      outBatterId: wicket?.outPlayerId ?? null,
      fielderId: wicket?.helperId ?? undefined,
      batterRuns: wicketType === 'run_out' ? (wicket?.runOutRuns ?? 0) : 0,
    }
  }

  if (outcome.startsWith('Nb+')) {
    return { extraType: 'no_ball', extraRuns: 1, batterRuns: Number(outcome.slice(3)) || 0 }
  }
  if (outcome === 'Nb') {
    return { extraType: 'no_ball', extraRuns: 1, batterRuns: 0 }
  }
  if (outcome.startsWith('Wd+')) {
    return { extraType: 'wide', extraRuns: 1 + (Number(outcome.slice(3)) || 0) }
  }
  if (outcome === 'Wd') {
    return { extraType: 'wide', extraRuns: 1 }
  }
  if (outcome.startsWith('Lb')) {
    return { extraType: 'leg_bye', extraRuns: Number(outcome.slice(2)) || 0, batterRuns: 0 }
  }
  if (/^B\d+$/.test(outcome)) {
    return { extraType: 'bye', extraRuns: Number(outcome.slice(1)) || 0, batterRuns: 0 }
  }

  return { batterRuns: Number(outcome) || 0 }
}