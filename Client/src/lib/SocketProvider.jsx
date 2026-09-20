import { useEffect } from 'react'
import { socket } from './socket'
import { store } from '../app/store'
import { SocketContext } from './socketContext'

export default function SocketProvider({ children }) {
  useEffect(() => {
    const applyAuth = () => {
      const token = store.getState().auth.token
      if (token && !socket.connected) {
        socket.auth = { token }
        socket.connect()
      } else if (!token && socket.connected) {
        socket.disconnect()
      }
    }

    applyAuth()
    const unsubscribe = store.subscribe(applyAuth)

    return () => {
      unsubscribe()
    }
  }, [])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}