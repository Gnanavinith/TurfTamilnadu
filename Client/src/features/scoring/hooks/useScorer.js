import { useMutation } from '@tanstack/react-query'
import { useSocket } from '../../../lib/socketContext'

function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10_000).emit(event, payload, (err, res) => {
      if (err) return reject(new Error('Timed out waiting for the scorer'))
      if (res?.success) return resolve(res.data)
      return reject(new Error(res?.error ?? 'Scoring failed'))
    })
  })
}

export function useScorer({ matchId, onRecorded }) {
  const socket = useSocket()

  const record = useMutation({
    mutationFn: (ball) => emitWithAck(socket, 'scoring:record', { matchId, ...ball }),
    onSuccess: (data) => onRecorded?.(data),
  })

  const undo = useMutation({
    mutationFn: () => emitWithAck(socket, 'scoring:undo', matchId),
    onSuccess: () => onRecorded?.(null),
  })

  return {
    record,
    undo,
    error: record.error ?? undo.error,
  }
}

export default useScorer