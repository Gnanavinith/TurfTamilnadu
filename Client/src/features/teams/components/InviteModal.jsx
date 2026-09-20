import { useState } from 'react'
import Modal from '../../../components/Modal'
import Button from '../../../components/Button'

export default function InviteModal({ open, onClose, onInvite, busy }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (/\S+@\S+\.\S+/.test(normalized) && password.length >= 8) {
      onInvite({ email: normalized, password })
      setEmail('')
      setPassword('')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a member"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" loading={busy}>
            Send invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Set a password (min 8 characters)"
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          An account is created for this email with the password above, and the
          credentials are emailed to them so they can log in.
        </p>
      </form>
    </Modal>
  )
}