import { TeamStats } from './teamStats.model.js'
import { Team } from '../teams/team.model.js'
import { Match } from '../matches/match.model.js'
import { Innings } from '../matches/innings.model.js'
import { logger } from '../../utils/logger.js'

const WIN_POINTS = 2
const TIE_POINTS = 1

/**
 * Rebuilds a team's season stats from completed matches.
 * Read-model approach: recompute on demand (after each ball via queue),
 * which stays correct through ball undo operations.
 */
export async function recomputeTeamStats(teamId) {
  const matches = await Match.find({
    $or: [{ teamAId: teamId }, { teamBId: teamId }],
    status: 'completed',
  })
    .select('_id teamAId teamBId result')
    .lean()

  const matchIds = matches.map((m) => m._id)
  const innings = await Innings.find({ matchId: { $in: matchIds } }).lean()

  const stats = {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    tied: 0,
    runsScored: 0,
    runsConceded: 0,
    wicketsTaken: 0,
    wicketsLost: 0,
  }

  for (const match of matches) {
    stats.matchesPlayed += 1

    const winnerId = match.result?.winnerTeamId
    if (!winnerId) {
      stats.tied += 1
    } else if (String(winnerId) === String(teamId)) {
      stats.matchesWon += 1
    } else {
      stats.matchesLost += 1
    }

    for (const inningsRow of innings) {
      if (String(inningsRow.matchId) !== String(match._id)) continue
      if (String(inningsRow.battingTeamId) === String(teamId)) {
        stats.runsScored += inningsRow.score?.runs ?? 0
        stats.wicketsLost += inningsRow.score?.wickets ?? 0
      } else {
        stats.runsConceded += inningsRow.score?.runs ?? 0
        stats.wicketsTaken += inningsRow.score?.wickets ?? 0
      }
    }
  }

  const points = stats.matchesWon * WIN_POINTS + stats.tied * TIE_POINTS
  const rating = stats.matchesPlayed
    ? Math.round((points / (stats.matchesPlayed * WIN_POINTS)) * 100)
    : 0

  await TeamStats.updateOne(
    { teamId },
    {
      $set: {
        season: 'current',
        ...stats,
        points,
        rating,
      },
    },
    { upsert: true },
  )

  return { teamId, ...stats, points, rating }
}

export async function recomputeAllTeamStats(teamIds) {
  for (const teamId of teamIds) {
    try {
      await recomputeTeamStats(teamId)
    } catch (err) {
      logger.error({ err, teamId }, 'recomputeTeamStats failed')
    }
  }
}

export async function getLeaderboard(limit = 10) {
  let stats = await TeamStats.find()
    .sort({ rating: -1, points: -1, runsScored: -1 })
    .limit(limit)
    .lean()

  // Self-heal: if nothing is in the standings but matches have completed
  // (e.g. recompute never ran because Redis/workers were unavailable), build
  // the stats on demand so the leaderboard is never silently empty.
  if (stats.length === 0) {
    const [teamAIds, teamBIds] = await Promise.all([
      Match.distinct('teamAId', { status: 'completed' }),
      Match.distinct('teamBId', { status: 'completed' }),
    ])
    const teamIds = [...new Set([...teamAIds, ...teamBIds])].filter(Boolean)
    if (teamIds.length > 0) {
      await recomputeAllTeamStats(teamIds.map(String))
      stats = await TeamStats.find()
        .sort({ rating: -1, points: -1, runsScored: -1 })
        .limit(limit)
        .lean()
    }
  }

  if (stats.length === 0) return []

  const teamIds = stats.map((s) => s.teamId)
  const teams = await Team.find({ _id: { $in: teamIds } })
    .select('name shortName city logoUrl')
    .lean()

  const teamMap = new Map(teams.map((t) => [String(t._id), t]))

  return stats.map((s, index) => ({
    rank: index + 1,
    team: teamMap.get(String(s.teamId)) ?? { name: 'Unknown' },
    matchesPlayed: s.matchesPlayed,
    matchesWon: s.matchesWon,
    matchesLost: s.matchesLost,
    tied: s.tied,
    runsScored: s.runsScored,
    runsConceded: s.runsConceded,
    wicketsTaken: s.wicketsTaken,
    wicketsLost: s.wicketsLost,
    points: s.points,
    rating: s.rating,
  }))
}

export default { recomputeTeamStats, recomputeAllTeamStats, getLeaderboard }