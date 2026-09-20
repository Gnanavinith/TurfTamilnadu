import { Match } from '../modules/matches/match.model.js'
import { recomputeTeamStats } from '../modules/leaderboard/leaderboard.service.js'

/**
 * Recomputes leaderboard stats for both teams once a match completes.
 * Undo operations re-open a match and may re-trigger this job later,
 * so stats always converge to the current state.
 */
export async function updateTeamStatsJobHandler(job) {
  const { matchId } = job.data ?? {}
  if (!matchId) return

  const match = await Match.findById(matchId)
    .select('_id teamAId teamBId status')
    .lean()

  if (!match || match.status !== 'completed') return

  const teamIds = [
    match.teamAId,
    match.teamBId,
  ].filter(Boolean).map(String)

  const results = await Promise.all(
    teamIds.map((teamId) => recomputeTeamStats(teamId)),
  )

  return { teamIds: results.map((r) => r.teamId), matchId }
}