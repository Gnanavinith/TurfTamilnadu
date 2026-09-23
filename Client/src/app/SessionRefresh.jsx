import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectToken, credentialsSet } from './store'
import { fetchMe } from '../features/auth/api'
import Loader from '../components/Loader'

/**
 * Validates the stored session once on boot before rendering the app shell,
 * and keeps the Redux user profile in sync (role changes made by an admin
 * take effect here). The interceptor transparently refreshes an expired
 * access token; if the refresh token is also dead it clears credentials and
 * the router bounces to /login — without a burst of parallel 401s from the
 * shell's queries and pollers.
 */
export default function SessionRefresh({ children }) {
  const dispatch = useDispatch()
  const token = useSelector(selectToken)
  const [ready, setReady] = useState(() => !token)

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false

    const sync = () => {
      fetchMe()
        .then(({ data }) => {
          if (!cancelled && data?.data) {
            dispatch(credentialsSet({ user: data.data }))
          }
        })
        .catch(() => {
          // Ignore transient failures (e.g. offline); the interceptor handles
          // expired tokens.
        })
        .finally(() => {
          if (!cancelled) setReady(true)
        })
      return undefined
    }

    sync()
    window.addEventListener('focus', sync)
    return () => {
      cancelled = true
      window.removeEventListener('focus', sync)
    }
  }, [token, dispatch])

  if (!ready) return <Loader full label="Restoring session…" />
  return children
}