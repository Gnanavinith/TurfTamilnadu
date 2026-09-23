import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMatch } from '../../matches/api'
import { useSocket } from '../../../lib/socketContext'

export function useLiveMatch(matchId) {
  const socketClient = useSocket()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => fetchMatch(matchId),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!matchId || !socketClient) return undefined

    const key = ['match', matchId]
    const onUpdate = (payload) => {
      queryClient.setQueryData(key, () => ({ data: payload }))
    }
    const onScored = (payload) => {
      queryClient.setQueryData(key, (old) => {
        const merged = old?.data ?? {}
        return { data: { ...merged, ...payload } }
      })
    }
    const subscribe = () => {
      if (socketClient.connected) {
        socketClient.emit('match:subscribe', matchId)
      }
    }

    subscribe()
    socketClient.on('connect', subscribe)
    socketClient.on('match:update', onUpdate)
    socketClient.on('match:score', onScored)

    return () => {
      if (socketClient.connected) {
        socketClient.emit('match:unsubscribe', matchId)
      }
      socketClient.off('connect', subscribe)
      socketClient.off('match:update', onUpdate)
      socketClient.off('match:score', onScored)
    }
  }, [matchId, socketClient, queryClient])

  return {
    match: query.data?.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export default useLiveMatch