import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeam } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import Modal from '../../../components/Modal'
import Button from '../../../components/Button'
import { SPECIALTY_OPTIONS } from '../constants'

let memberSeq = 0

export function CreateTeamModal({ open, onClose }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [city, setCity] = useState('')
  const [members, setMembers] = useState([])

  const mutation = useMutation({
    mutationFn: () =>
      createTeam({
        name,
        shortName: shortName.trim() || undefined,
        city,
        members: members
          .filter((member) => /\S+@\S+\.\S+/.test(member.email.trim()))
          .map((member) => ({
            email: member.email.trim().toLowerCase(),
            ...(member.password.length >= 8 ? { password: member.password } : {}),
            ...(member.specialty ? { specialty: member.specialty } : {}),
          })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setName('')
      setShortName('')
      setCity('')
      setMembers([])
      onClose()
    },
  })

  const errorText = mutation.error
    ? getErrorMessage(mutation.error, 'Could not create team')
    : null

  const handleSubmit = (event) => {
    event.preventDefault()
    if (name.trim().length < 2) return
    mutation.mutate()
  }

  const addMember = () => {
    setMembers((prev) => [...prev, { id: memberSeq++, email: '', password: '', specialty: '' }])
  }

  const updateMember = (id, field, value) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, [field]: value } : member)),
    )
  }

  const removeMember = (id) => {
    setMembers((prev) => prev.filter((member) => member.id !== id))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a team"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-team-form" loading={mutation.isPending}>
            Create
          </Button>
        </>
      }
    >
      <form id="create-team-form" onSubmit={handleSubmit} className="space-y-4">
        {errorText && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {errorText}
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Team name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Strike Force"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            minLength={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Short name <span className="font-normal text-slate-400">(optional, e.g. RCB)</span>
          </span>
          <input
            value={shortName}
            onChange={(event) => setShortName(event.target.value)}
            placeholder="e.g. RCB"
            autoCapitalize="characters"
            maxLength={12}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            City <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="e.g. Bengaluru"
            autoCapitalize="words"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <div>
          <span className="mb-1 flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
            Members <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="space-y-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={member.email}
                    onChange={(event) => updateMember(member.id, 'email', event.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="shrink-0 rounded-lg px-2 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                    aria-label="Remove member"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={member.password}
                  onChange={(event) => updateMember(member.id, 'password', event.target.value)}
                  placeholder="Set password (min 8 characters)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <select
                  value={member.specialty}
                  onChange={(event) => updateMember(member.id, 'specialty', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {SPECIALTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value ? `Role: ${option.label}` : 'Role: not set'}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addMember} className="w-full">
              Add member
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Give a member a password (min 8 characters) to create their login account.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  )
}