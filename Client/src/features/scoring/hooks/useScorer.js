import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../../../lib/socketContext'

function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Not connected to the live feed. Reconnecting…'))
      return
    }
    socket.timeout(10_000).emit(event, payload, (err, res) => {
      if (err) return reject(new Error('Timed out waiting for the scorer'))
      if (res?.success) return resolve(res.data)
      return reject(new Error(res?.error ?? 'Scoring failed'))
    })
  })
}

/**
 * Every mutation the scorer needs. Each one writes through the socket and the
 * server broadcasts the new snapshot back to the room, so the scorer, the
 * spectators and any second scorer all converge on the same state.
 */
export function useScorer({ matchId, onRecorded }) {
  const socket = useSocket()
  const queryClient = useQueryClient()

  // Write the broadcast snapshot straight into the cache so the UI reacts the
  // moment a ball lands, without waiting for the next poll.
  const applySnapshot = (data) => {
    if (!data) return
    queryClient.setQueryData(['match', matchId], () => ({ data }))
    onRecorded?.(data)
  }

  const record = useMutation({
    mutationFn: (ball) => emitWithAck(socket, 'scoring:record', { matchId, ...ball }),
    onSuccess: applySnapshot,
  })

  const undo = useMutation({
    mutationFn: () => emitWithAck(socket, 'scoring:undo', matchId),
    onSuccess: applySnapshot,
  })

  const setBatsman = useMutation({
    mutationFn: ({ strikerId, nonStrikerId }) =>
      emitWithAck(socket, 'scoring:setBatsman', { matchId, strikerId, nonStrikerId }),
    onSuccess: applySnapshot,
  })

  const setBowler = useMutation({
    mutationFn: (bowlerId) => emitWithAck(socket, 'scoring:setBowler', { matchId, bowlerId }),
    onSuccess: applySnapshot,
  })

  const swapStrike = useMutation({
    mutationFn: () => emitWithAck(socket, 'scoring:swapStrike', { matchId }),
    onSuccess: applySnapshot,
  })

  const retireHurt = useMutation({
    mutationFn: (userId) => emitWithAck(socket, 'scoring:retireHurt', { matchId, userId }),
    onSuccess: applySnapshot,
  })

  const recallRetired = useMutation({
    mutationFn: (userId) => emitWithAck(socket, 'scoring:recallRetired', { matchId, userId }),
    onSuccess: applySnapshot,
  })

  return {
    record,
    undo,
    setBatsman,
    setBowler,
    swapStrike,
    retireHurt,
    recallRetired,
    error:
      record.error ??
      undo.error ??
      setBatsman.error ??
      setBowler.error ??
      swapStrike.error ??
      retireHurt.error ??
      recallRetired.error,
    isBusy:
      record.isPending ||
      undo.isPending ||
      setBatsman.isPending ||
      setBowler.isPending ||
      swapStrike.isPending ||
      retireHurt.isPending ||
      recallRetired.isPending,
  }
}

export default useScorer
