import { Match } from './match.model.js'
import { Innings } from './innings.model.js'
import { Ball } from '../scoring/ball.model.js'
import { Team } from '../teams/team.model.js'
import { Membership } from '../teams/membership.model.js'
import { User } from '../users/user.model.js'
import { ApiError } from '../../utils/ApiError.js'
import { describeBall } from '../scoring/scoring.utils.js'

const MATCH_STATUS = { SCHEDULED: 'scheduled', LIVE: 'live', COMPLETED: 'completed', ABANDONED: 'abandoned' }
const MAX_WICKETS = 10

function battingOrder({ teamAId, teamBId, toss }) {
  if (toss?.winnerTeamId && toss?.decision) {
    const winnerBats = toss.decision === 'bat'
    const winner = String(toss.winnerTeamId) === String(teamAId) ? teamAId : teamBId
    const loser = String(winner) === String(teamAId) ? teamBId : teamAId
    return winnerBats ? [winner, loser] : [loser, winner]
  }
  // No toss recorded: Team A bats first.
  return [teamAId, teamBId]
}

export async function createMatch({
  teamAId,
  teamBId,
  overs,
  matchType,
  tournamentName,
  scheduledAt,
  venue,
  toss,
  playingXI,
  createdBy,
  tenantId,
}) {
  if (String(teamAId) === String(teamBId)) {
    throw ApiError.badRequest('A team cannot play against itself')
  }
  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required')
  if (matchType === 'tournament' && !(tournamentName ?? '').trim()) {
    throw ApiError.badRequest('tournamentName is required for a tournament match')
  }

  // Both sides must belong to the caller's own account. Without this an admin
  // could schedule a fixture using another tenant's team id and pull that team's
  // players into their match.
  if (!tenantId) {
    throw ApiError.forbidden('Your account cannot create matches yet')
  }
  const owned = await Team.find({
    _id: { $in: [teamAId, teamBId] },
    tenantId,
  })
    .select('_id')
    .lean()
  if (owned.length !== 2) {
    throw ApiError.badRequest('Both teams must be from your own account')
  }

  const match = await Match.create({
    teamAId,
    teamBId,
    overs,
    matchType,
    tournamentName:
      matchType === 'tournament' ? tournamentName.trim() : undefined,
    scheduledAt,
    venue,
    toss,
    playingXI,
    createdBy,
    tenantId,
  })

  const [firstBatting, secondBatting] = battingOrder({ teamAId, teamBId, toss })
  await Innings.create([
    {
      matchId: match._id,
      order: 1,
      overs,
      battingTeamId: firstBatting,
      bowlingTeamId: secondBatting,
    },
    {
      matchId: match._id,
      order: 2,
      overs,
      battingTeamId: secondBatting,
      bowlingTeamId: firstBatting,
    },
  ])

  return getMatchSnapshot(match._id)
}

/**
 * Match feed.
 *
 * Default: global. Every match in the app, signed in or not, because the
 * scorecards, team stats and player stats are meant to be visible to everyone —
 * this is also what promotes both teams to the public team list.
 *
 * `scope: 'mine'` narrows to what the caller is actually involved in: matches
 * between teams they belong to, plus any their account owns, plus the ones they
 * created. That is what the "Yours" filter on the home page uses.
 */
export async function listMatches({ userId, tenantId, scope, status, limit = 50 }) {
  const filter = status ? { status } : {}

  if (scope === 'mine' && userId) {
    const memberships = await Membership.find({ userId, status: 'active' })
      .select('teamId')
      .lean()
    const teamIds = memberships.map((m) => m.teamId)

    const visible = []
    if (teamIds.length > 0) {
      visible.push({ teamAId: { $in: teamIds } }, { teamBId: { $in: teamIds } })
    }
    if (tenantId) visible.push({ tenantId })
    visible.push({ createdBy: userId })

    const matches = await Match.find({ $or: visible, ...filter })
      .sort({ scheduledAt: -1 })
      .limit(limit)
      .lean()
    return decorateMatches(matches)
  }

  return decorateMatches(
    await Match.find(filter).sort({ scheduledAt: -1 }).limit(limit).lean(),
  )
}

async function decorateMatches(matches) {
  if (matches.length === 0) return []

  const teamIds = [
    ...new Set(matches.flatMap((m) => [String(m.teamAId), String(m.teamBId)])),
  ]
  const teams = await Team.find({ _id: { $in: teamIds } })
    .select('name shortName city logoUrl')
    .lean()
  const teamMap = new Map(teams.map((t) => [String(t._id), t]))

  const list = matches.map((match) => ({
    id: String(match._id),
    teamA: {
      id: String(match.teamAId),
      name: teamMap.get(String(match.teamAId))?.name ?? 'Team A',
      shortName: teamMap.get(String(match.teamAId))?.shortName ?? null,
      city: teamMap.get(String(match.teamAId))?.city ?? null,
      logoUrl: teamMap.get(String(match.teamAId))?.logoUrl ?? null,
    },
    teamB: {
      id: String(match.teamBId),
      name: teamMap.get(String(match.teamBId))?.name ?? 'Team B',
      shortName: teamMap.get(String(match.teamBId))?.shortName ?? null,
      city: teamMap.get(String(match.teamBId))?.city ?? null,
      logoUrl: teamMap.get(String(match.teamBId))?.logoUrl ?? null,
    },
    overs: match.overs,
    status: match.status,
    matchType: match.matchType ?? 'single',
    tournamentName: match.tournamentName ?? null,
    venue: match.venue ?? null,
    scheduledAt: match.scheduledAt,
    createdBy: String(match.createdBy),
    result: match.result
      ? {
          winnerTeamId: match.result.winnerTeamId
            ? String(match.result.winnerTeamId)
            : null,
          margin: match.result.margin ?? null,
        }
      : null,
  }))

  // Final scores per team, so a completed match card shows real numbers.
  const allInnings = await Innings.find({ matchId: { $in: list.map((m) => m.id) } })
    .sort({ order: 1 })
    .lean()
  const scoreByTeam = new Map()
  for (const inn of allInnings) {
    if (!inn.score || (inn.score.balls ?? 0) === 0) continue
    scoreByTeam.set(`${inn.matchId}:${inn.battingTeamId}`, inn.score)
  }
  for (const item of list) {
    item.innings = [item.teamA, item.teamB].map((team) => ({
      battingTeamId: team.id,
      score: scoreByTeam.get(`${item.id}:${team.id}`) ?? null,
    }))
  }

  // Attach the live score so list cards can show e.g. "142/4 (16.3 ov)",
  // run rate, target and the chasing situation.
  const liveIds = list
    .filter((m) => m.status === MATCH_STATUS.LIVE)
    .map((m) => m.id)
  if (liveIds.length > 0) {
    const [liveInnings, firstInningsList, liveBalls] = await Promise.all([
      Innings.find({ matchId: { $in: liveIds }, status: 'in_progress' }).lean(),
      Innings.find({ matchId: { $in: liveIds }, order: 1 }).lean(),
      Ball.find({ matchId: { $in: liveIds } }).sort({ createdAt: 1, _id: 1 }).lean(),
    ])
    const firstByMatch = new Map(
      firstInningsList.map((inn) => [String(inn.matchId), inn]),
    )
    const ballsByMatch = new Map()
    for (const ball of liveBalls) {
      const key = String(ball.matchId)
      if (!ballsByMatch.has(key)) ballsByMatch.set(key, [])
      ballsByMatch.get(key).push(ball)
    }
    const scoreByMatch = new Map(
      liveInnings.map((inn) => {
        const runs = inn.score?.runs ?? 0
        const balls = inn.score?.balls ?? 0
        const first = firstByMatch.get(String(inn.matchId))
        return [
          String(inn.matchId),
          {
            battingTeamId: String(inn.battingTeamId),
            bowlingTeamId: String(inn.bowlingTeamId),
            runs,
            wickets: inn.score?.wickets ?? 0,
            balls,
            extras: inn.score?.extras ?? 0,
            extrasBreakdown: inn.extrasBreakdown ?? {
              wide: 0,
              noBall: 0,
              bye: 0,
              legBye: 0,
            },
            rr: balls ? Math.round((runs / (balls / 6)) * 100) / 100 : 0,
            target: inn.target ?? null,
            firstInningsRuns: first?.score?.runs ?? null,
            firstInningsWickets: first?.score?.wickets ?? 0,
            strikerId: inn.strikerId ? String(inn.strikerId) : null,
            bowlerId: inn.bowlerId ? String(inn.bowlerId) : null,
            thisOver: describeThisOver(ballsByMatch.get(String(inn.matchId)) ?? [], inn._id),
          },
        ]
      }),
    )
    for (const item of list) {
      const score = scoreByMatch.get(item.id)
      if (score) item.score = score
    }
  }

  return list
}

/** The deliveries bowled in the over currently in progress, for list cards. */
function describeThisOver(balls, inningsId) {
  const own = balls.filter((b) => String(b.inningsId) === String(inningsId))
  if (own.length === 0) return []
  const liveOver = own[own.length - 1].over
  return own.filter((b) => b.over === liveOver).map(describeBall)
}

export async function startMatch(matchId) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  if (match.status === MATCH_STATUS.COMPLETED) {
    throw ApiError.badRequest('Match already completed')
  }

  const innings = await Innings.find({ matchId: match._id })
    .sort({ order: 1 })
    .lean()

  if (innings.length < 2) {
    throw ApiError.badRequest('Match has no innings configured')
  }

  const firstInnings = innings[0]
  const xi =
    String(firstInnings.battingTeamId) === String(match.teamAId)
      ? (match.playingXI?.teamA ?? [])
      : (match.playingXI?.teamB ?? [])

  await Innings.updateOne(
    { _id: firstInnings._id },
    {
      $set: {
        status: 'in_progress',
        // Open the innings with the first two batters from the XI.
        strikerId: xi[0] ?? null,
        nonStrikerId: xi[1] ?? null,
      },
    },
  )
  match.status = MATCH_STATUS.LIVE
  match.currentInningsId = firstInnings._id
  await match.save()

  return getMatchSnapshot(match._id)
}

export async function getMatch(matchId) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')
  return getMatchSnapshot(match._id)
}

function resolveXiPlayer(id, userMap, jerseyNumber = null) {
  const user = userMap.get(String(id))
  if (!user) return { id: String(id), jerseyNumber }
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    jerseyNumber,
  }
}

async function buildSnapshot(match, inningsList, balls) {
  const [teamA, teamB] = await Promise.all([
    Team.findById(match.teamAId).select('name shortName city logoUrl').lean(),
    Team.findById(match.teamBId).select('name shortName city logoUrl').lean(),
  ])

  const xiUserIds = [
    ...(match.playingXI?.teamA ?? []),
    ...(match.playingXI?.teamB ?? []),
  ]
  const users = xiUserIds.length
    ? await User.find({ _id: { $in: xiUserIds } })
        .select('_id email name avatarUrl')
        .lean()
    : []
  const userMap = new Map(users.map((u) => [String(u._id), u]))

  // Shirt numbers live on the membership, not the user, so pull them for both
  // squads. The scorer picks players by "#7 Arjun", and a number is scoped to a
  // team, so key the map by team + user.
  const jerseyByKey = new Map()
  if (xiUserIds.length) {
    const memberships = await Membership.find({
      userId: { $in: xiUserIds },
      teamId: { $in: [match.teamAId, match.teamBId] },
    })
      .select('teamId userId jerseyNumber')
      .lean()
    for (const m of memberships) {
      if (m.jerseyNumber == null) continue
      jerseyByKey.set(`${m.teamId}:${m.userId}`, m.jerseyNumber)
    }
  }
  const jerseyOf = (teamId, userId) => jerseyByKey.get(`${teamId}:${userId}`) ?? null

  const byId = (id) => (id ? String(id) : null)
  const nameOf = (id) => userMap.get(String(id))?.name ?? null

  // Who took each wicket, so the scorecard can print "c Smith b Patel".
  const dismissalInfo = new Map()
  for (const ball of balls) {
    if (!ball.wicket?.type) continue
    const key = `${ball.inningsId}:${ball.wicket.batterId}`
    if (dismissalInfo.has(key)) continue
    dismissalInfo.set(key, {
      bowlerName: nameOf(ball.bowlerId),
      fielderName: ball.wicket.fielderId ? nameOf(ball.wicket.fielderId) : null,
    })
  }

  const innings = inningsList.map((inn) => {
    const xi = xiIdsFor(match, inn)
    const dismissed = (inn.batting ?? [])
      .filter((entry) => ['out', 'retired'].includes(entry.status))
      .map((entry) => String(entry.userId))
    const retired = (inn.retiredHurt ?? []).map(String)
    const unavailable = [...dismissed, ...retired]

    return {
      id: String(inn._id),
      order: inn.order,
      overs: inn.overs,
      target: inn.target ?? null,
      status: inn.status,
      battingTeamId: String(inn.battingTeamId),
      bowlingTeamId: String(inn.bowlingTeamId),
      battingTeam: {
        id: String(inn.battingTeamId),
        name:
          String(inn.battingTeamId) === String(match.teamAId)
            ? teamA?.name ?? 'Team A'
            : teamB?.name ?? 'Team B',
      },
      bowlingTeam: {
        id: String(inn.bowlingTeamId),
        name:
          String(inn.bowlingTeamId) === String(match.teamAId)
            ? teamA?.name ?? 'Team A'
            : teamB?.name ?? 'Team B',
      },
      score: inn.score,
      extrasBreakdown: inn.extrasBreakdown ?? { wide: 0, noBall: 0, bye: 0, legBye: 0 },
      // Live crease, so scorers and spectators see the same picture.
      strikerId: byId(inn.strikerId),
      nonStrikerId: byId(inn.nonStrikerId),
      bowlerId: byId(inn.bowlerId),
      previousBowlerId: byId(inn.previousBowlerId),
      lastManStanding: Boolean(inn.lastManStanding),
      availableBatters: xi
        .map(String)
        .filter((id) => !unavailable.includes(id)),
      retiredHurt: retired.map((id) => ({ id, name: nameOf(id) })),
      batting: (inn.batting ?? []).map((entry) => ({
        ...entry,
        name: nameOf(entry.userId),
        ...dismissalInfo.get(`${inn._id}:${entry.userId}`),
      })),
      bowling: (inn.bowling ?? []).map((entry) => ({
        ...entry,
        name: nameOf(entry.userId),
      })),
    }
  })

  const currentInnings = innings.find((inn) => inn.status === 'in_progress') ?? null

  const oversTimeline = buildOversTimeline(balls)
  // Balls bowled in the over that is currently in progress.
  const liveBalls = currentInnings
    ? balls.filter((b) => String(b.inningsId) === currentInnings.id)
    : []
  const liveOver = liveBalls.length ? liveBalls[liveBalls.length - 1].over : 1
  const thisOver = liveBalls.filter((b) => b.over === liveOver).map(describeBall)

  const legalBalls = currentInnings?.score?.balls ?? 0
  const maxLegalBalls = (currentInnings?.overs ?? match.overs) * 6

  return {
    id: String(match._id),
    teamA: { id: String(teamA?._id), name: teamA?.name ?? 'Team A', shortName: teamA?.shortName ?? null, city: teamA?.city, logoUrl: teamA?.logoUrl },
    teamB: { id: String(teamB?._id), name: teamB?.name ?? 'Team B', shortName: teamB?.shortName ?? null, city: teamB?.city, logoUrl: teamB?.logoUrl },
    overs: match.overs,
    status: match.status,
    matchType: match.matchType ?? 'single',
    tournamentName: match.tournamentName ?? null,
    venue: match.venue,
    scheduledAt: match.scheduledAt,
    completedAt: match.completedAt ?? null,
    toss: match.toss,
    playingXI: {
      teamA: (match.playingXI?.teamA ?? []).map((id) =>
        resolveXiPlayer(id, userMap, jerseyOf(match.teamAId, id)),
      ),
      teamB: (match.playingXI?.teamB ?? []).map((id) =>
        resolveXiPlayer(id, userMap, jerseyOf(match.teamBId, id)),
      ),
    },
    currentInnings,
    innings,
    oversTimeline,
    thisOver,
    extras: currentInnings?.extrasBreakdown ?? null,
    chase: chaseState(innings, match),
    completedOvers: Math.floor(legalBalls / 6),
    ballsRemaining: Math.max(maxLegalBalls - legalBalls, 0),
  }
}

function xiIdsFor(match, inn) {
  return String(inn.battingTeamId) === String(match.teamAId)
    ? (match.playingXI?.teamA ?? [])
    : (match.playingXI?.teamB ?? [])
}

/**
 * Second-innings chasing picture: what is needed, from how many balls, and the
 * run rate required. Drives the "need X from Y" card in the UI.
 */
function chaseState(innings, match) {
  const live = innings.find((inn) => inn.status === 'in_progress' && inn.target != null)
  if (!live) return null

  const runs = live.score?.runs ?? 0
  const balls = live.score?.balls ?? 0
  const maxBalls = (live.overs ?? match.overs) * 6
  const needed = live.target - runs
  const ballsLeft = Math.max(maxBalls - balls, 0)

  return {
    battingTeamId: live.battingTeamId,
    needed: Math.max(needed, 0),
    ballsRemaining: ballsLeft,
    target: live.target,
    requiredRunRate: ballsLeft > 0 ? Number(((needed / ballsLeft) * 6).toFixed(2)) : null,
  }
}

/**
 * Group the ledger into overs, keyed per innings so the second innings doesn't
 * blend into the first. Each ball keeps its full description (token, runs,
 * dismissal, fielder) so the client can render ball-by-ball chips.
 */
function buildOversTimeline(balls) {
  const groups = new Map()
  for (const ball of balls) {
    const key = `${ball.inningsId}:${ball.over}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(describeBall(ball))
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const [inningsA, overA] = a[0].split(':')
      const [inningsB, overB] = b[0].split(':')
      if (inningsA !== inningsB) return inningsA < inningsB ? -1 : 1
      return Number(overA) - Number(overB)
    })
    .map(([, group]) => group)
}

export async function getMatchSnapshot(matchId) {
  const match = await Match.findById(matchId)
  if (!match) throw ApiError.notFound('Match not found')

  const [inningsList, balls] = await Promise.all([
    Innings.find({ matchId: match._id }).sort({ order: 1 }).lean(),
    Ball.find({ matchId: match._id }).sort({ createdAt: 1, _id: 1 }).lean(),
  ])

  return buildSnapshot(match, inningsList, balls)
}

export { MAX_WICKETS, MATCH_STATUS }

export default {
  createMatch,
  listMatches,
  startMatch,
  getMatch,
  getMatchSnapshot,
}