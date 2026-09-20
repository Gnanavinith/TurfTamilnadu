import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket'],
})

export default socket