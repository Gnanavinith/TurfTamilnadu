import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { acceptInvite, getInvite } from '../api'
import { signIn, signUp } from '../../auth/api'
import { useAuth } from '../../auth/hooks/useAuth'
import { getErrorMessage } from '../../../lib/axios'
import LoginForm from '../../auth/components/LoginForm'
import SignUpForm from '../../auth/components/SignUpForm'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, login, logout } = useAuth()
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const {
    data: inviteQuery,
    isLoading,
    error: inviteError,
    refetch,
  } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => getInvite(token),
    retry: false,
  })

  const acceptMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: (res) => {
      navigate(`/teams/${res.data?.teamId}`, { replace: true })
    },
  })

  const invite = inviteQuery?.data
  const expired = Boolean(
    invite && (invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()),
  )

  const finish = async ({ user, accessToken, refreshToken }) => {
    login(user, accessToken, refreshToken)
    const res = await acceptInvite(token)
    navigate(`/teams/${res.data?.teamId}`, { replace: true })
  }

  const handleSignIn = async (account) => {
    setError('')
    setBusy(true)
    try {
      const { data } = await signIn(account)
      await finish(data.data)
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
      await finish(data.data)
    } catch (err) {
      const message = getErrorMessage(err, 'Could not create account')
      setError(message)
      if (message.toLowerCase().includes('already exists')) setMode('signin')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) return <Loader label="Loading invite…" />

  const heading = invite ? `Join ${invite.teamName}` : 'Invitation'
  const byLine = invite?.inviterName || invite?.inviterEmail
  const isSignin = mode === 'signin'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white">
            🏏
          </div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          {byLine && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {byLine} invited you to play together.
            </p>
          )}
        </div>

        {!invite ? (
          <div className="mt-6 text-center">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {getErrorMessage(inviteError, 'Invite not found')}
            </p>
            <Button variant="outline" onClick={refetch} className="mt-4">
              Retry
            </Button>
          </div>
        ) : expired ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            This invitation is no longer active.
          </p>
        ) : isAuthenticated && user && user.email !== invite.email ? (
          <div className="mt-6 space-y-4 text-center">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              This invite was sent to <strong>{invite.email}</strong>. You&apos;re
              signed in as <strong>{user.email}</strong>.
            </p>
            <Button variant="outline" onClick={logout} className="w-full">
              Use a different account
            </Button>
          </div>
        ) : isAuthenticated ? (
          <Button
            className="mt-6 w-full"
            loading={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate(token)}
          >
            Accept invite
          </Button>
        ) : (
          <>
            {isSignin ? (
              <LoginForm
                onSubmit={handleSignIn}
                busy={busy}
                defaultEmail={invite.email}
              />
            ) : (
              <SignUpForm
                onSubmit={handleSignUp}
                busy={busy}
                defaultEmail={invite.email}
              />
            )}

            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              {isSignin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(isSignin ? 'signup' : 'signin')
                  setError('')
                }}
                className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {isSignin ? 'Create one' : 'Sign in'}
              </button>
            </p>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}