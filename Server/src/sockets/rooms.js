export const matchRoom = (matchId) => `match:${matchId}`

export function joinMatchRoom(socket, matchId) {
  socket.join(matchRoom(matchId))
}

export function leaveMatchRoom(socket, matchId) {
  socket.leave(matchRoom(matchId))
}

export function emitToMatch(io, matchId, event, payload) {
  io.to(matchRoom(matchId)).emit(event, payload)
}

export default { matchRoom, joinMatchRoom, leaveMatchRoom, emitToMatch }