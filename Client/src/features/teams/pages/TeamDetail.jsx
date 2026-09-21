import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { fetchTeam, inviteMember, updateMember, removeMember } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { selectUser } from '../../../app/store'
import MemberList from '../components/MemberList'
import InviteModal from '../components/InviteModal'
import MemberEditModal from '../components/MemberEditModal'
import ConfirmDialog from '../../../components/ConfirmDialog'
import PlayerProfileModal from '../components/PlayerProfileModal'
import TeamStats from '../components/TeamStats'
import { useToast } from '../../../components/ToastContext'

export default function TeamDetail() {
  const { teamId } = useParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const currentUser = useSelector(selectUser)

  const [showInvite, setShowInvite] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [profileMember, setProfileMember] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

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
      showToast('Invite sent')
    },
    onError: (err) => {
      showToast(getErrorMessage(err, 'Could not send invite'), 'error')
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ memberId, payload }) => updateMember(teamId, memberId, payload),
    onSuccess: (_data, variables) => {
      setEditMember(null)

      if (variables.payload.name) {
        queryClient.setQueryData(['team', teamId], (prev) => {
          if (!prev?.data?.squad) return prev
          return {
            ...prev,
            data: {
              ...prev.data,
              squad: prev.data.squad.map((squadMember) =>
                squadMember.id === variables.memberId
                  ? { ...squadMember, name: variables.payload.name }
                  : squadMember,
              ),
            },
          }
        })
      }

      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      showToast('Member updated')
    },
    onError: (err) => {
      showToast(getErrorMessage(err, 'Could not update member'), 'error')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (memberId) => removeMember(teamId, memberId),
    onSuccess: () => {
      setRemoveTarget(null)
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      showToast('Member removed')
    },
    onError: (err) => {
      showToast(getErrorMessage(err, 'Could not remove member'), 'error')
    },
  })

  if (isLoading) {
    return (
      <div className="g-screen">
        <div className="g-skel" />
        <div className="g-skel" />
        <div className="g-skel" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="g-screen">
        <div className="g-alert g-alert-error">
          {getErrorMessage(error, 'Failed to load team')}
        </div>
        <div className="g-btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="g-btn g-btn-outline" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const team = data?.data
  if (!team) return null

  const squad = team.squad ?? team.members ?? []
  const currentUserId = String(currentUser?.id ?? '')
  const isAdmin = squad.some(
    (squadMember) => String(squadMember.id) === currentUserId && squadMember.role === 'admin',
  )

  const renderActions = (member) => {
    if (!isAdmin && String(member.id) !== currentUserId) return null
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setEditMember(member)
          }}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Edit
        </button>
        {isAdmin && String(member.id) !== currentUserId && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setRemoveTarget(member)
            }}
            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Remove
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="g-screen">
      <div className="g-hello">
        <small>
          {squad.length} players
          {team.city ? ` · ${team.city}` : ''}
        </small>
        <h1>{team.name}</h1>
      </div>

      {isAdmin && (
        <div className="g-btn-row" style={{ marginBottom: 14 }}>
          <button type="button" className="g-btn" onClick={() => setShowInvite(true)}>
            Invite player
          </button>
        </div>
      )}

      <div className="g-panel" style={{ marginTop: 0 }}>
        <div className="g-panel-head">Members</div>
        <MemberList
          members={squad}
          onProfile={setProfileMember}
          renderActions={renderActions}
        />
      </div>

      <div className="g-sec-head">
        <h2>Stats</h2>
      </div>
      <TeamStats
        squad={squad}
        stats={team.playerStats ?? {}}
        history={team.playerHistory ?? {}}
      />

      {isAdmin && (
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          onInvite={(email) => inviteMutation.mutate(email)}
          busy={inviteMutation.isPending}
        />
      )}

      {editMember && (
        <MemberEditModal
          key={editMember.id}
          open
          member={editMember}
          busy={editMutation.isPending}
          onClose={() => setEditMember(null)}
          onSubmit={(payload) =>
            editMutation.mutate({ memberId: editMember.id, payload })
          }
        />
      )}

      <PlayerProfileModal
        open={Boolean(profileMember)}
        onClose={() => setProfileMember(null)}
        member={profileMember}
        stats={team.playerStats ?? {}}
        history={team.playerHistory ?? {}}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Remove ${removeTarget?.name ?? 'member'}?`}
        message="They'll lose access to this team and its matches. This can't be undone."
        confirmLabel="Remove"
        busy={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(removeTarget.id)}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  )
}