import { useEffect, useState } from 'react'
import { signIn, signUp } from '../api'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../../../lib/axios'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'

/**
 * Sign in / create account dialog used by the sign-in gate, so the app never
 * needs a dedicated /login screen.
 */
export default function AuthModal({ open, mode, onModeChange, onClose, onSuccess }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const isSignin = mode === 'signin'

  const switchMode = () => {
    onModeChange(isSignin ? 'signup' : 'signin')
    setError('')
  }

  const showValidationHint = () => {
    setError(
      isSignin
        ? 'Enter your email and password to sign in.'
        : 'Enter your name, a valid email and a password of at least 8 characters.',
    )
  }

  const finish = (payload) => {
    login(payload.user, payload.accessToken, payload.refreshToken)
    onClose()
    onSuccess?.()
  }

  const handleSignIn = async ({ email, password }) => {
    setError('')
    setBusy(true)
    try {
      const { data } = await signIn({ email, password })
      finish(data.data)
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
      finish(data.data)
    } catch (err) {
      const message = getErrorMessage(err, 'Could not create account')
      setError(message)
      if (message.toLowerCase().includes('already exists')) onModeChange('signin')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="g-auth-overlay" role="dialog" aria-modal="true">
      <div className="g-auth-backdrop" onClick={onClose} />
      <div className="g-auth-card">
        <div className="g-auth-head">
          <span className="g-ball-icon g-auth-ball" aria-hidden="true" />
          <h2>{isSignin ? 'Sign in to Turf' : 'Create your account'}</h2>
          <small>{isSignin ? 'Score and follow matches' : 'Join your turf league'}</small>
        </div>

        {isSignin ? (
          <LoginForm
            onSubmit={handleSignIn}
            onInvalid={showValidationHint}
            busy={busy}
          />
        ) : (
          <SignUpForm
            onSubmit={handleSignUp}
            onInvalid={showValidationHint}
            busy={busy}
          />
        )}

        {error && <div className="g-alert g-alert-error">{error}</div>}

        <p className="g-note g-auth-switch">
          {isSignin ? 'New to Turf? ' : 'Already have an account? '}
          <button type="button" className="g-link" onClick={switchMode}>
            {isSignin ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
