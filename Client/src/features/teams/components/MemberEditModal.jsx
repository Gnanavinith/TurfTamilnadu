import { useState } from 'react'
import Modal from '../../../components/Modal'
import Button from '../../../components/Button'
import {
  SPECIALTY_OPTIONS,
  DESIGNATION_OPTIONS,
  AVATAR_COLORS,
} from '../constants'

export default function MemberEditModal({ open, onClose, member, busy, onSubmit }) {
  const [name, setName] = useState(member?.name ?? '')
  const [specialty, setSpecialty] = useState(member?.specialty ?? '')
  const [designation, setDesignation] = useState(member?.designation ?? 'none')
  const [avatarColor, setAvatarColor] = useState(member?.avatarColor ?? '')

  if (!member) return null

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      name: name.trim(),
      specialty,
      designation,
      avatarColor,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${member.name ?? 'member'}`}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
            style={avatarColor ? { backgroundColor: avatarColor, color: '#fff' } : undefined}
          >
            {(name.trim() || member.name || member.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium" htmlFor="member-name">
              Name
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={60}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="member-specialty">
            Playing role
          </label>
          <select
            id="member-specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            {SPECIALTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="member-designation">
            Designation
          </label>
          <select
            id="member-designation"
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            {DESIGNATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            A team has one captain and one vice-captain.
          </p>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">Profile color</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAvatarColor('')}
              className={`h-8 w-8 rounded-full border ${
                avatarColor === ''
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                  : 'border-slate-200 dark:border-slate-700'
              } bg-slate-100 dark:bg-slate-800`}
              aria-label="Default color"
            />
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`h-8 w-8 rounded-full border ${
                  avatarColor === color
                    ? 'border-white ring-2 ring-emerald-500/60'
                    : 'border-black/10'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}