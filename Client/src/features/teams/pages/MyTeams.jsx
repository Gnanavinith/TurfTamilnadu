import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMyTeams } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import TeamCard from '../components/TeamCard'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'
import { CreateTeamModal } from '../components/CreateTeamModal'

export default function MyTeams() {
  const [showCreate, setShowCreate] = useState(false)
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ['teams'], queryFn: fetchMyTeams })

  if (isLoading) return <Loader label="Loading teams…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Failed to load teams')}
        </p>
        <Button variant="outline" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const teams = data?.data ?? []

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">My Teams</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your squads
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Team</Button>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">No teams yet.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            Create your first team
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        Looking for a team to join?{' '}
        <Link to="/leaderboard" className="text-emerald-600 hover:underline">
          See where teams rank
        </Link>
      </p>

      <CreateTeamModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}