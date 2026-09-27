import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Team } from './team.model.js'
import { Membership } from './membership.model.js'
import { Invite } from './invite.model.js'
import { User } from '../users/user.model.js'
import { Match } from '../matches/match.model.js'
import { Innings } from '../matches/innings.model.js'
import { ApiError } from '../../utils/ApiError.js'
import { primaryClientUrl } from '../../config/cors.js'
import { sendInviteEmail } from '../../utils/mailer.js'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export async function createTeam({ name, shortName, city, members = [], createdBy }) {
  const slug = `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`
  const team = await Team.create({ name, shortName, slug, city, createdBy })

  // Creator is the first admin; the rest are stored directly by email.
  await Membership.create({
    teamId: team._id,
    userId: createdBy,
    role: 'admin',
    status: 'active',
  })

  const emails = [...new Set(members.map((member) => member.email))]
  const roleByEmail = new Map(members.map((member) => [member.email, member.role ?? 'member']))
  const specialtyByEmail = new Map(
    members.filter((member) => member.specialty).map((member) => [member.email, member.specialty]),
  )
  const passwordHashes = new Map(
    members
      .filter((member) => member.password)
      .map((member) => [member.email, bcrypt.hashSync(member.password, 10)]),
  )

  if (emails.length > 0) {
    // Idempotent user creation by email so memberships can reference real users.
    await User.bulkWrite(
      emails.map((email) => ({
        updateOne: {
          filter: { email },
          update: {
            $setOnInsert: {
              email,
              ...(passwordHashes.has(email) ? { password: passwordHashes.get(email) } : {}),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    )

    // Existing password-less stubs get the provided password too (never
    // overwrite a real account's credentials).
    const stubUpdates = members
      .filter((member) => member.password && passwordHashes.has(member.email))
      .map((member) => ({
        updateOne: {
          filter: { email: member.email, password: { $exists: false } },
          update: { $set: { password: passwordHashes.get(member.email) } },
        },
      }))

    if (stubUpdates.length > 0) {
      await User.bulkWrite(stubUpdates, { ordered: false })
    }

    const users = await User.find({ email: { $in: emails } }).select('_id email').lean()
    const userIdByEmail = new Map(users.map((user) => [String(user.email), user._id]))

    const membershipOps = emails
      .filter((email) => String(userIdByEmail.get(email)) !== String(createdBy))
      .map((email) => ({
        updateOne: {
          filter: { teamId: team._id, userId: userIdByEmail.get(email) },
          update: {
            $setOnInsert: {
              role: roleByEmail.get(email),
              status: 'active',
              joinedAt: new Date(),
              ...(specialtyByEmail.has(email)
                ? { specialty: specialtyByEmail.get(email) }
                : {}),
            },
          },
          upsert: true,
        },
      }))

    if (membershipOps.length > 0) {
      await Membership.bulkWrite(membershipOps, { ordered: false })
    }
  }

  return {
    ...team.toObject(),
    id: String(team._id),
    members: emails.map((email) => ({ email, role: roleByEmail.get(email) })),
  }
}

export async function listMyTeams(userId) {
  const memberships = await Membership.find({
    userId,
    status: 'active',
  })
    .select('teamId role')
    .lean()

  if (memberships.length === 0) return []

  const teamIds = memberships.map((m) => m.teamId)
  const roleMap = new Map(memberships.map((m) => [String(m.teamId), m.role]))

  const [teams, counts, adminMemberships] = await Promise.all([
    Team.find({ _id: { $in: teamIds } }).sort({ createdAt: -1 }).lean(),
    Membership.aggregate([
      { $match: { teamId: { $in: teamIds }, status: 'active' } },
      { $group: { _id: '$teamId', members: { $sum: 1 } } },
    ]),
    Membership.find({ teamId: { $in: teamIds }, role: 'admin', status: 'active' })
      .select('teamId userId')
      .lean(),
  ])

  const countMap = new Map(counts.map((c) => [String(c._id), c.members]))

  const adminUserIds = [...new Set(adminMemberships.map((m) => String(m.userId)))]
  const adminUsers = adminUserIds.length
    ? await User.find({ _id: { $in: adminUserIds } })
        .select('_id email name')
        .lean()
    : []
  const adminUserMap = new Map(adminUsers.map((u) => [String(u._id), u]))
  const adminsByTeam = new Map()
  for (const membership of adminMemberships) {
    const teamId = String(membership.teamId)
    const user = adminUserMap.get(String(membership.userId)) ?? {}
    if (!adminsByTeam.has(teamId)) adminsByTeam.set(teamId, [])
    adminsByTeam.get(teamId).push({
      id: String(membership.userId),
      name: user.name ?? user.email ?? null,
    })
  }

  return teams.map((team) => ({
    ...team,
    id: String(team._id),
    members: countMap.get(String(team._id)) ?? 0,
    role: roleMap.get(String(team._id)),
    admins: adminsByTeam.get(String(team._id)) ?? [],
  }))
}

const round1 = (n) => Math.round(n * 10) / 10

const emptyBatting = () => ({
  innings: 0,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  outs: 0,
  notOuts: 0,
})

const emptyBowling = () => ({
  innings: 0,
  balls: 0,
  runs: 0,
  wickets: 0,
  maidens: 0,
})

function pushHistory(history, userKey, matchId, date, opponent, entry) {
  const list = history.get(userKey) ?? []
  let row = list.find((r) => String(r.matchId) === String(matchId))
  if (!row) {
    row = { matchId: String(matchId), date, opponent, batting: null, bowling: null }
    list.push(row)
    history.set(userKey, list)
  }
  row.batting = row.batting ?? entry.batting ?? null
  row.bowling = row.bowling ?? entry.bowling ?? null
}

/**
 * Aggregates career batting / bowling stats (and per-match history) for every
 * member who has appeared for a team, rebuilt on demand from its innings.
 */
async function computeMemberStats(teamId) {
  const matches = await Match.find({
    $or: [{ teamAId: teamId }, { teamBId: teamId }],
  })
    .select('_id teamAId teamBId scheduledAt')
    .sort({ scheduledAt: 1, _id: 1 })
    .lean()

  const matchIds = matches.map((m) => m._id)
  const innings = matchIds.length
    ? await Innings.find({ matchId: { $in: matchIds } }).lean()
    : []

  const referredTeamIds = [...new Set(
    matches.flatMap((m) => [m.teamAId, m.teamBId]).filter(Boolean),
  )].map(String)
  const teams = referredTeamIds.length
    ? await Team.find({ _id: { $in: referredTeamIds } }).select('_id name').lean()
    : []
  const teamName = new Map(teams.map((t) => [String(t._id), t.name]))
  const matchById = new Map(matches.map((m) => [String(m._id), m]))

  const batting = new Map()
  const bowling = new Map()
  const history = new Map()

  for (const inning of innings) {
    const match = matchById.get(String(inning.matchId))
    if (!match) continue

    const isTeamBatting = String(inning.battingTeamId) === String(teamId)
    const isTeamBowling = String(inning.bowlingTeamId) === String(teamId)
    const opponentId = isTeamBatting ? inning.bowlingTeamId : inning.battingTeamId
    const opponent = teamName.get(String(opponentId)) ?? 'Unknown'

    if (isTeamBatting) {
      for (const entry of inning.batting ?? []) {
        if (!entry.userId) continue
        const userKey = String(entry.userId)
        const agg = batting.get(userKey) ?? emptyBatting()
        agg.innings += 1
        agg.runs += entry.runs ?? 0
        agg.balls += entry.balls ?? 0
        agg.fours += entry.fours ?? 0
        agg.sixes += entry.sixes ?? 0
        if (entry.status === 'out') agg.outs += 1
        else agg.notOuts += 1
        batting.set(userKey, agg)
        pushHistory(history, userKey, match._id, match.scheduledAt, opponent, {
          batting: {
            runs: entry.runs ?? 0,
            balls: entry.balls ?? 0,
            fours: entry.fours ?? 0,
            sixes: entry.sixes ?? 0,
            out: entry.status === 'out',
          },
        })
      }
    }

    if (isTeamBowling) {
      for (const entry of inning.bowling ?? []) {
        if (!entry.userId) continue
        const userKey = String(entry.userId)
        const agg = bowling.get(userKey) ?? emptyBowling()
        agg.innings += 1
        agg.balls += entry.balls ?? 0
        agg.runs += entry.runs ?? 0
        agg.wickets += entry.wickets ?? 0
        agg.maidens += entry.maidens ?? 0
        bowling.set(userKey, agg)
        pushHistory(history, userKey, match._id, match.scheduledAt, opponent, {
          bowling: {
            balls: entry.balls ?? 0,
            runs: entry.runs ?? 0,
            wickets: entry.wickets ?? 0,
            maidens: entry.maidens ?? 0,
          },
        })
      }
    }
  }

  const toBatting = (key) => {
    const agg = batting.get(key) ?? emptyBatting()
    return {
      ...agg,
      strikeRate: agg.balls ? round1((agg.runs / agg.balls) * 100) : 0,
      average: agg.outs ? round1(agg.runs / agg.outs) : null,
    }
  }

  const toBowling = (key) => {
    const agg = bowling.get(key) ?? emptyBowling()
    const overs = agg.balls ? Math.floor(agg.balls / 6) + (agg.balls % 6) / 10 : 0
    return {
      ...agg,
      overs,
      economy: agg.balls ? round1(agg.runs / (agg.balls / 6)) : 0,
      average: agg.wickets ? round1(agg.runs / agg.wickets) : null,
      strikeRate: agg.wickets ? round1(agg.balls / agg.wickets) : null,
    }
  }

  const keys = new Set([...batting.keys(), ...bowling.keys()])
  const playerStats = {}
  const playerHistory = {}
  for (const key of keys) {
    playerStats[key] = { batting: toBatting(key), bowling: toBowling(key) }
    playerHistory[key] = (history.get(key) ?? []).sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    ).reverse()
  }

  return { playerStats, playerHistory }
}

export async function getTeamDetail(teamId) {
  const team = await Team.findById(teamId).lean()
  if (!team) throw ApiError.notFound('Team not found')

  const memberships = await Membership.find({
    teamId,
    status: 'active',
  })
    .select('userId role joinedAt specialty designation avatarColor')
    .lean()

  const userIds = memberships.map((m) => m.userId)
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id email name avatarUrl role')
    .lean()

  const userMap = new Map(users.map((u) => [String(u._id), u]))

  const { playerStats, playerHistory } = await computeMemberStats(teamId)

  return {
    ...team,
    id: String(team._id),
    squad: memberships.map((m) => {
      const user = userMap.get(String(m.userId)) ?? {}
      return {
        id: String(m.userId),
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: m.role,
        specialty: m.specialty ?? '',
        designation: m.designation ?? null,
        avatarColor: m.avatarColor ?? '',
        joinedAt: m.joinedAt,
      }
    }),
    playerStats,
    playerHistory,
  }
}

export async function inviteMember({ teamId, email, password, invitedBy }) {
  const existing = await Invite.findOne({ teamId, email, status: 'pending' })
  if (existing) {
    throw ApiError.conflict('An invitation for this email is already pending')
  }

  let user = await User.findOne({ email }).select('+password')

  // A real account already exists — don't overwrite its password, just send
  // the invite link. New (or password-less stub) users get their login
  // credentials generated here and emailed to them.
  const credentials = user?.password ? null : { email, password }

  if (!user?.password) {
    const hashed = await bcrypt.hash(password, 10)
    if (user) {
      user.password = hashed
      await user.save()
    } else {
      user = await User.create({ email, name: email.split('@')[0], password: hashed })
    }
  }

  const token = crypto.randomBytes(24).toString('hex')
  const invite = await Invite.create({
    teamId,
    email,
    token,
    invitedBy,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  })

  const [team, inviter] = await Promise.all([
    Team.findById(teamId).select('name').lean(),
    User.findById(invitedBy).select('_id name email').lean(),
  ])

  await sendInviteEmail(email, {
    teamName: team?.name ?? 'a team',
    inviterName: inviter?.name ?? null,
    inviterEmail: inviter?.email ?? null,
    acceptUrl: `${primaryClientUrl}/invite/${token}`,
    loginUrl: `${primaryClientUrl}/login`,
    credentials,
  })

  return invite.toObject()
}

export async function getInviteInfo(token) {
  const invite = await Invite.findOne({ token }).lean()
  if (!invite) throw ApiError.notFound('Invite not found')

  const [team, inviter] = await Promise.all([
    Team.findById(invite.teamId).select('name').lean(),
    User.findById(invite.invitedBy).select('name email').lean(),
  ])

  return {
    token: String(invite.token),
    teamId: String(invite.teamId),
    teamName: team?.name ?? 'a team',
    inviterName: inviter?.name ?? null,
    inviterEmail: inviter?.email ?? null,
    email: invite.email,
    role: 'member',
    status: invite.status,
    expiresAt: invite.expiresAt,
  }
}

export async function acceptInvite({ token, userId }) {
  const invite = await Invite.findOne({ token })
  if (!invite) throw ApiError.notFound('Invite not found')

  if (invite.status !== 'pending' || invite.expiresAt < new Date()) {
    invite.status = 'expired'
    await invite.save()
    throw ApiError.badRequest('Invite has expired')
  }

  const user = await User.findById(userId)
  if (!user || user.email !== invite.email) {
    throw ApiError.forbidden('This invite is not meant for your account')
  }

  await Membership.findOneAndUpdate(
    { teamId: invite.teamId, userId },
    { $set: { role: 'member', status: 'active', joinedAt: new Date() } },
    { upsert: true },
  )

  invite.status = 'accepted'
  await invite.save()

  return invite.teamId
}

export async function updateMember({ teamId, memberId, updates, updaterId }) {
  const membership = await Membership.findOne({ teamId, userId: memberId })
  if (!membership || membership.status !== 'active') {
    throw ApiError.notFound('Member not found in this team')
  }

  // Team admins can edit anyone; a member can edit their own profile.
  const isAdmin = await Membership.exists({
    teamId,
    userId: updaterId,
    role: 'admin',
    status: 'active',
  })
  if (!isAdmin && String(memberId) !== String(updaterId)) {
    throw ApiError.forbidden('Only team admins can edit other members')
  }

  const memberUpdates = {}
  let designation = updates.designation
  if (designation === 'none') designation = null
  if (designation === 'captain' || designation === 'vice_captain') {
    // A team has a single captain and a single vice-captain.
    await Membership.updateMany(
      { teamId, userId: { $ne: memberId }, designation },
      { $set: { designation: null } },
    )
  }
  if (designation !== undefined) memberUpdates.designation = designation
  if (updates.specialty !== undefined) memberUpdates.specialty = updates.specialty
  if (updates.avatarColor !== undefined) memberUpdates.avatarColor = updates.avatarColor

  if (updates.name !== undefined) {
    const user = await User.findByIdAndUpdate(memberId, { $set: { name: updates.name } })
    if (!user) throw ApiError.notFound('Member not found')
  }

  const updated = await Membership.findByIdAndUpdate(membership._id, { $set: memberUpdates }, { new: true }).lean()

  return {
    id: String(updated.userId),
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    specialty: updated.specialty,
    designation: updated.designation,
    avatarColor: updated.avatarColor,
  }
}

export async function removeMember(teamId, memberId) {
  const result = await Membership.deleteOne({ teamId, userId: memberId })
  if (result.deletedCount === 0) {
    throw ApiError.notFound('Member not found in this team')
  }
}

export default {
  createTeam,
  listMyTeams,
  getTeamDetail,
  inviteMember,
  getInviteInfo,
  acceptInvite,
  removeMember,
}