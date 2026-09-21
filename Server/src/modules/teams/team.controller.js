import { asyncHandler } from '../../utils/asyncHandler.js'
import {
  createTeam,
  listMyTeams,
  getTeamDetail,
  inviteMember,
  getInviteInfo,
  acceptInvite,
  updateMember,
  removeMember,
} from './team.service.js'

export const createTeamHandler = asyncHandler(async (req, res) => {
  const team = await createTeam({
    name: req.body.name,
    shortName: req.body.shortName,
    city: req.body.city,
    members: req.body.members,
    createdBy: req.user._id,
  })
  res.status(201).json({ success: true, data: team })
})

export const myTeamsHandler = asyncHandler(async (req, res) => {
  const teams = await listMyTeams(req.user._id)
  res.json({ success: true, data: teams })
})

export const getTeamHandler = asyncHandler(async (req, res) => {
  const team = await getTeamDetail(req.params.teamId)
  res.json({ success: true, data: team })
})

export const inviteHandler = asyncHandler(async (req, res) => {
  const invite = await inviteMember({
    teamId: req.params.teamId,
    email: req.body.email,
    invitedBy: req.user._id,
  })
  res.status(201).json({ success: true, data: invite })
})

export const inviteInfoHandler = asyncHandler(async (req, res) => {
  const info = await getInviteInfo(req.params.token)
  res.json({ success: true, data: info })
})

export const acceptInviteHandler = asyncHandler(async (req, res) => {
  const teamId = await acceptInvite({
    token: req.body.token,
    userId: req.user._id,
  })
  res.json({ success: true, data: { teamId } })
})

export const updateMemberHandler = asyncHandler(async (req, res) => {
  const updated = await updateMember({
    teamId: req.params.teamId,
    memberId: req.params.memberId,
    updates: req.body,
    updaterId: req.user._id,
  })
  res.json({ success: true, data: updated })
})

export const removeMemberHandler = asyncHandler(async (req, res) => {
  await removeMember(req.params.teamId, req.params.memberId)
  res.status(204).send()
})

export default {
  createTeamHandler,
  myTeamsHandler,
  getTeamHandler,
  inviteHandler,
  inviteInfoHandler,
  acceptInviteHandler,
  updateMemberHandler,
  removeMemberHandler,
}