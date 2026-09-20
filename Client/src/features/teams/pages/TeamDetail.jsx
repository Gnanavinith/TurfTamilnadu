import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { fetchTeam, inviteMember } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'
import MemberList from '../components/MemberList'
import InviteModal from '../components/InviteModal'
import TeamStats from '../components/TeamStats'

export default function TeamDetail() {
  const { teamId } = useParams()
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId),
  })

  const inviteMutation = useMutation({
    mutationFn: (credentials) => inviteMember(teamId, credentials),
    onSuccess: () => {
      setShowInvite(false)
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
    },
  })

  if (isLoading) return <Loader label="Loading team…" />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/30">
        <p className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(error, 'Failed to load team')}
        </p>
        <Button variant="outline" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const team = data?.data
  if (!team) return null

  const inviteError = inviteMutation.error
    ? getErrorMessage(inviteMutation.error, 'Could not send invite')
    : null

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{team.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {team.squad?.length ?? team.members?.length ?? 0} players ·
            {team.city ? ` ${team.city}` : ' Squad'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowInvite(true)}>
          Invite
        </Button>
      </div>

      {inviteError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {inviteError}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Members
        </h2>
        <MemberList members={team.members ?? team.squad ?? []} />
      </section>

      <div className="mt-6">
        <TeamStats
          squad={team.squad ?? []}
          stats={team.playerStats ?? {}}
          history={team.playerHistory ?? {}}
        />
      </div>

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={(email) => inviteMutation.mutate(email)}
        busy={inviteMutation.isPending}
      />
    </div>
  )
}