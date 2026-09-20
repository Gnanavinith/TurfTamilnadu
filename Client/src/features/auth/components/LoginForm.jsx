import { useState } from 'react'
import Button from '../../../components/Button'

export default function LoginForm({ onSubmit, busy, defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (normalized.includes('@') && password.length > 0) {
      onSubmit({ email: normalized, password })
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Email
        </span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Password
        </span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </label>
      <Button type="submit" loading={busy} className="w-full">
        Sign in
      </Button>
    </form>
  )
}