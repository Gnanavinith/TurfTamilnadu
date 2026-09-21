import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectToken, credentialsSet } from './store'
import { fetchMe } from '../features/auth/api'

/**
 * Keeps the Redux user profile in sync with the server. Role changes made by
 * an admin take effect here without forcing anyone to sign out; the server
 * already reads the role from the DB on every request.
 */
export default function SessionRefresh() {
  const dispatch = useDispatch()
  const token = useSelector(selectToken)

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
    }

    sync()
    window.addEventListener('focus', sync)
    return () => {
      cancelled = true
      window.removeEventListener('focus', sync)
    }
  }, [token, dispatch])

  return null
}