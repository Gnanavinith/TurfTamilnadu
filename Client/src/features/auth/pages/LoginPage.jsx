import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white">
            🏏
          </div>
          <h1 className="text-2xl font-bold">Turf</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isSignin ? 'Sign in with your email and password' : 'Create your account'}
          </p>
        </div>

        {isSignin ? (
          <LoginForm onSubmit={handleSignIn} busy={busy} />
        ) : (
          <SignUpForm onSubmit={handleSignUp} busy={busy} />
        )}

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {isSignin ? 'New to Turf?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignin ? 'signup' : 'signin')
              setError('')
            }}
            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            {isSignin ? 'Create an account' : 'Sign in'}
          </button>
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}