import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectToken } from '../../../app/store'

/**
 * Opens the sign-in dialog from anywhere in the app. The layout watches the
 * router state for `auth`, so prompting is just a navigation.
 */
export function useAuthPrompt() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = Boolean(useSelector(selectToken))
  const state = location.state

  const promptAuth = useCallback(
    (mode = 'signin') => {
      if (isAuthenticated) return false
      navigate(location.pathname, { replace: true, state: { ...(state ?? {}), auth: true, mode } })
      return true
    },
    [isAuthenticated, navigate, location.pathname, state],
  )

  return { isAuthenticated, promptAuth }
}

export default useAuthPrompt
