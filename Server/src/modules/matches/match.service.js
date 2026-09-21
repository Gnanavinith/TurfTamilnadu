import { Match } from './match.model.js'
import { Innings } from './innings.model.js'
import { Ball } from '../scoring/ball.model.js'
import { Team } from '../teams/team.model.js'
import { Membership } from '../teams/membership.model.js'
import { User } from '../users/user.model.js'
import { ApiError } from '../../utils/ApiError.js'

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
  scheduledAt,
  venue,
  toss,
  playingXI,
  createdBy,
}) {
  if (String(teamAId) === String(teamBId)) {
    throw ApiError.badRequest('A team cannot play against itself')
  }
  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required')

  const match = await Match.create({
    teamAId,
    teamBId,
    overs,
    scheduledAt,
    venue,
    toss,
    playingXI,
    createdBy,
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

export async function listMatches({ userId, status, limit = 50 }) {
  const filter = status ? { status } : {}
  if (userId) {
    const memberships = await Membership.find({ userId, status: 'active' })
      .select('teamId')
      .lean()
    const teamIds = memberships.map((m) => m.teamId)
    const matches = await Match.find({
      $or: [
        { teamAId: { $in: teamIds } },
        { teamBId: { $in: teamIds } },
        { createdBy: userId },
      ],
      ...filter,
    })
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

  // Attach the live score so list cards can show e.g. "142/4 (16.3 ov)",
  // run rate, target and the chasing situation.
  const liveIds = list
    .filter((m) => m.status === MATCH_STATUS.LIVE)
    .map((m) => m.id)
  if (liveIds.length > 0) {
    const [liveInnings, firstInningsList] = await Promise.all([
      Innings.find({ matchId: { $in: liveIds }, status: 'in_progress' }).lean(),
      Innings.find({ matchId: { $in: liveIds }, order: 1 }).lean(),
    ])
    const firstByMatch = new Map(
      firstInningsList.map((inn) => [String(inn.matchId), inn]),
    )
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
            rr: balls ? Math.round((runs / (balls / 6)) * 100) / 100 : 0,
            target: inn.target ?? null,
            firstInningsRuns: first?.score?.runs ?? null,
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
  await Innings.updateOne(
    { _id: firstInnings._id },
    { $set: { status: 'in_progress' } },
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

function resolveXiPlayer(id, userMap) {
  const user = userMap.get(String(id))
  if (!user) return { id: String(id) }
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
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

  const innings = inningsList.map((inn) => ({
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
    batting: (inn.batting ?? []).map((entry) => ({
      ...entry,
      name: userMap.get(String(entry.userId))?.name ?? null,
    })),
    bowling: (inn.bowling ?? []).map((entry) => ({
      ...entry,
      name: userMap.get(String(entry.userId))?.name ?? null,
    })),
  }))

  const currentInnings = innings.find((inn) => inn.status === 'in_progress') ?? null

  const oversTimeline = buildOversTimeline(balls)

  return {
    id: String(match._id),
    teamA: { id: String(teamA?._id), name: teamA?.name ?? 'Team A', shortName: teamA?.shortName ?? null, city: teamA?.city, logoUrl: teamA?.logoUrl },
    teamB: { id: String(teamB?._id), name: teamB?.name ?? 'Team B', shortName: teamB?.shortName ?? null, city: teamB?.city, logoUrl: teamB?.logoUrl },
    overs: match.overs,
    status: match.status,
    venue: match.venue,
    scheduledAt: match.scheduledAt,
    toss: match.toss,
    playingXI: {
      teamA: (match.playingXI?.teamA ?? []).map((id) => resolveXiPlayer(id, userMap)),
      teamB: (match.playingXI?.teamB ?? []).map((id) => resolveXiPlayer(id, userMap)),
    },
    currentInnings,
    innings,
    oversTimeline,
  }
}

function buildOversTimeline(balls) {
  const groups = new Map()
  for (const ball of balls) {
    const key = String(ball.over)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({
      runs: ball.runs,
      kind: ball.extraType,
      wicket: ball.wicket?.type ?? null,
    })
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group)
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