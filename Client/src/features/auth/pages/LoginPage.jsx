import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { signIn, signUp } from '../api'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../../../lib/axios'
import LoginForm from '../components/LoginForm'
import SignUpForm from '../components/SignUpForm'

export default function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/'

  const handleSignIn = async ({ email, password }) => {
    setError('')
    setBusy(true)
    try {
      const { data } = await signIn({ email, password })
      const payload = data.data
      login(payload.user, payload.accessToken, payload.refreshToken)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not sign in'))
    } finally {
      setBusy(false)
    }
  }

  const handleSignUp = async (account) => {
    setError('')
    setBusy(true)
    try {
      const { data } = await signUp(account)
      const payload = data.data
      login(payload.user, payload.accessToken, payload.refreshToken)
      navigate(from, { replace: true })
    } catch (err) {
      const message = getErrorMessage(err, 'Could not create account')
      setError(message)
      if (message.toLowerCase().includes('already exists')) setMode('signin')
    } finally {
      setBusy(false)
    }
  }

  const isSignin = mode === 'signin'

  return (
    <div className="gully">
      <div
        className="g-app"
        style={{ display: 'grid', placeItems: 'center', padding: '28px 18px' }}
      >
        <div style={{ width: '100%' }}>
          <div className="g-hello" style={{ textAlign: 'center' }}>
            <span className="g-ball-icon" style={{ display: 'block', margin: '0 auto 12px' }} />
            <h1>Turf</h1>
            <small>
              {isSignin ? 'Sign in to score and follow matches' : 'Create your account'}
            </small>
          </div>

          <div className="g-panel" style={{ marginTop: 0 }}>
            {isSignin ? (
              <LoginForm onSubmit={handleSignIn} busy={busy} />
            ) : (
              <SignUpForm onSubmit={handleSignUp} busy={busy} />
            )}

            <p className="g-note" style={{ textAlign: 'center', marginTop: 16 }}>
              {isSignin ? 'New to Turf? ' : 'Already have an account? '}
              <button
                type="button"
                className="g-link"
                onClick={() => {
                  setMode(isSignin ? 'signup' : 'signin')
                  setError('')
                }}
              >
                {isSignin ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </div>

          {error && (
            <div className="g-alert g-alert-error" style={{ textAlign: 'center' }}>
              {error}
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: 14 }}>
            <Link to="/home" className="g-note">
              Browse live matches without an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}