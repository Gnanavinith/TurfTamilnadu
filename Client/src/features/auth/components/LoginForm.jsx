import { useState } from 'react'

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
    <form onSubmit={handleSubmit}>
      <label className="g-field">
        <span className="g-label">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="g-input"
        />
      </label>
      <label className="g-field">
        <span className="g-label">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="g-input"
        />
      </label>
      <button type="submit" className="g-btn g-btn-block" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
