import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeam } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import Modal from '../../../components/Modal'
import TeamForm from './TeamForm'

const INITIAL = { name: '', shortName: '', city: '', players: [] }

/** Shirt numbers are typed as text in the form, so normalise before sending. */
function toPayload(form) {
  return {
    name: form.name.trim(),
    shortName: form.shortName.trim() || undefined,
    city: form.city.trim() || undefined,
    players: (form.players ?? []).map((player) => ({
      userId: String(player.userId),
      specialty: player.specialty || undefined,
      jerseyNumber: player.jerseyNumber ? Number(player.jerseyNumber) : null,
    })),
  }
}

export function CreateTeamModal({ open, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(INITIAL)

  const mutation = useMutation({
    mutationFn: (payload) => createTeam(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      setForm(INITIAL)
      onClose()
    },
  })

  const errorText = mutation.error
    ? getErrorMessage(mutation.error, 'Could not create team')
    : null

  return (
    <Modal open={open} onClose={onClose} title="Create a team">
      {errorText && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {errorText}
        </p>
      )}
      <TeamForm
        value={form}
        onChange={setForm}
        submitLabel="Create team"
        busy={mutation.isPending}
        submit={() => mutation.mutate(toPayload(form))}
        secondaryAction={
          <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>
            Cancel
          </button>
        }
      />
    </Modal>
  )
}

export default CreateTeamModal