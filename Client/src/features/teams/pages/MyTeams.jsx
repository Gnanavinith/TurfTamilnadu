import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMyTeams } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import TeamCard from '../components/TeamCard'
import { CreateTeamModal } from '../components/CreateTeamModal'

export default function MyTeams() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchMyTeams,
  })

  const header = (
    <div className="g-hello">
      <small>Your squads</small>
      <h1>
        My <em>teams</em>
      </h1>
    </div>
  )

  if (error) {
    return (
      <div className="g-screen">
        {header}
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load teams')}
        </div>
        <div className="g-btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="g-btn g-btn-outline" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const teams = data?.data ?? []

  return (
    <div className="g-screen">
      {header}

      {isLoading ? (
        <div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="g-skel" />
          ))}
        </div>
      ) : (
        <>
          <div className="g-sec-head">
            <h2>{teams.length} teams</h2>
            <button type="button" className="g-note" onClick={() => setShowCreate(true)}>
              Create team
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="g-empty">
              <p>No teams yet.</p>
              <small>Create a squad, add players, and start playing.</small>
              <button type="button" className="g-btn" onClick={() => setShowCreate(true)}>
                Create your first team
              </button>
            </div>
          ) : (
            teams.map((team, i) => <TeamCard key={team.id} team={team} index={i} />)
          )}

          <div className="g-panel" style={{ marginTop: 18 }}>
            <div className="g-panel-head">Looking for a team?</div>
            <p className="g-note" style={{ margin: '0 0 12px' }}>
              Check the standings, find a squad that fits, and get yourself invited.
            </p>
            <Link to="/leaderboard" className="g-btn g-btn-outline g-btn-block">
              See where teams rank
            </Link>
          </div>
        </>
      )}

      <CreateTeamModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
