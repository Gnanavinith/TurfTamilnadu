import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  fetchTeam,
  inviteMember,
  updateMember,
  removeMember,
  updateTeam,
} from '../api'
import { fetchPublicTeam } from '../../public/api'
import { useAuthPrompt } from '../../auth/hooks/useAuthPrompt'
import { getErrorMessage } from '../../../lib/axios'
import { selectUser } from '../../../app/store'
import MemberList from '../components/MemberList'
import TeamSummary from '../components/TeamSummary'
import TeamForm from '../components/TeamForm'
import AddPlayerBar from '../components/AddPlayerBar'
import InviteModal from '../components/InviteModal'
import MemberEditModal from '../components/MemberEditModal'
import ConfirmDialog from '../../../components/ConfirmDialog'
import PlayerProfileModal from '../components/PlayerProfileModal'
import TeamStats from '../components/TeamStats'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/ToastContext'

/** Squad rows as the edit form expects them: keyed by userId, plus name. */
function toFormPlayers(squad) {
  return squad.map((member) => ({
    userId: String(member.id),
    name: member.name ?? member.email,
    specialty: member.specialty ?? '',
    jerseyNumber: member.jerseyNumber ?? '',
  }))
}

export default function TeamDetail() {
  const { teamId } = useParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const currentUser = useSelector(selectUser)
  const { isAuthenticated } = useAuthPrompt()

  const [showInvite, setShowInvite] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editMember, setEditMember] = useState(null)
  const [profileMember, setProfileMember] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['team', teamId, isAuthenticated],
    // The authenticated endpoint requires membership (it carries member emails
    // and full career stats). A signed-in visitor who is not on the squad still
    // gets to read any team that has played, so fall back to the public view
    // rather than showing a 404.
    queryFn: async () => {
      if (!isAuthenticated) return fetchPublicTeam(teamId)
      try {
        return await fetchTeam(teamId)
      } catch (err) {
        if (err?.response?.status === 404) return fetchPublicTeam(teamId)
        throw err
      }
    },
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

  const editTeamMutation = useMutation({
    mutationFn: (payload) => updateTeam(teamId, payload),
    onSuccess: () => {
      setShowEdit(false)
      setEditForm(null)
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      showToast('Team updated')
    },
    onError: (err) => {
      showToast(getErrorMessage(err, 'Could not update team'), 'error')
    },
  })

  const openEdit = () => {
    const team = data?.data
    if (!team) return
    setEditForm({
      name: team.name ?? '',
      shortName: team.shortName ?? '',
      city: team.city ?? '',
      players: toFormPlayers(team.squad ?? []),
    })
    setShowEdit(true)
  }

  const editMutation = useMutation({
    mutationFn: ({ memberId, payload }) => updateMember(teamId, memberId, payload),
    onSuccess: (_data, variables) => {
      setEditMember(null)

      if (variables.payload.name) {
        queryClient.setQueryData(['team', teamId, true], (prev) => {
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
  const isAdmin =
    isAuthenticated &&
    squad.some(
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
          {squad.length} {squad.length === 1 ? 'player' : 'players'} on roster
          {team.city ? ` · ${team.city}` : ''}
        </small>
        <h1>{team.name}</h1>
      </div>

      {isAdmin && (
        <div className="g-btn-row" style={{ marginBottom: 14 }}>
          <button type="button" className="g-btn" onClick={openEdit}>
            Edit team
          </button>
        </div>
      )}

      <div className="g-panel" style={{ marginTop: 0 }}>
        <TeamSummary summary={team.teamSummary} rosterSize={squad.length} />
      </div>

      <div className="g-panel">
        <div className="g-panel-head">Squad</div>
        <MemberList
          members={squad}
          onProfile={setProfileMember}
          renderActions={renderActions}
        />
      </div>

      <div className="g-sec-head">
        <h2>Player stats</h2>
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

      {isAdmin && showEdit && editForm && (
        <Modal open onClose={() => setShowEdit(false)} title="Edit team">
          {editTeamMutation.error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {getErrorMessage(editTeamMutation.error, 'Could not update team')}
            </p>
          )}
          <TeamForm
            value={editForm}
            onChange={setEditForm}
            submitLabel="Save changes"
            busy={editTeamMutation.isPending}
            submit={() =>
              editTeamMutation.mutate({
                name: editForm.name.trim(),
                shortName: editForm.shortName.trim() || undefined,
                city: editForm.city.trim() || undefined,
                players: (editForm.players ?? []).map((player) => ({
                  userId: String(player.userId),
                  specialty: player.specialty || undefined,
                  jerseyNumber: player.jerseyNumber ? Number(player.jerseyNumber) : null,
                })),
              })
            }
            secondaryAction={
              <button
                type="button"
                className="g-btn g-btn-ghost"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>
            }
          />
        </Modal>
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

      <AddPlayerBar
        team={team}
        squad={squad}
        isAdmin={isAdmin}
        onInvite={() => setShowInvite(true)}
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