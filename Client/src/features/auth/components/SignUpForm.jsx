import { useState } from 'react'

export default function SignUpForm({ onSubmit, busy, defaultEmail = '' }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (name.trim() && normalized.includes('@') && password.length >= 8) {
      onSubmit({ name: name.trim(), email: normalized, password })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="g-field">
        <span className="g-label">Name</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          className="g-input"
        />
      </label>
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          className="g-input"
        />
      </label>
      <button type="submit" className="g-btn g-btn-block" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
