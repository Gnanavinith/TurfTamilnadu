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

/**
 * Squad entries are picked from existing accounts. Rejects unknown ids rather
 * than silently creating placeholder users, and drops duplicate players so the
 * roster can't list the same person twice.
 */
function normalizePlayers(players, createdBy) {
  const seen = new Set([String(createdBy)])
  return players.filter((player) => {
    const id = String(player.userId)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export async function createTeam({ name, shortName, city, players = [], createdBy, tenantId }) {
  if (!tenantId) {
    throw ApiError.forbidden('Your account cannot create teams yet')
  }

  const slug = `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`
  const team = await Team.create({ name, shortName, slug, city, createdBy, tenantId })

  // The creator is always the first admin, so they're seeded here and then
  // excluded from the selected roster.
  await Membership.create({
    teamId: team._id,
    userId: createdBy,
    role: 'admin',
    status: 'active',
  })

  const selected = normalizePlayers(players, createdBy)
  if (selected.length > 0) {
    const users = await User.find({ _id: { $in: selected.map((p) => p.userId) } })
      .select('_id')
      .lean()
    const known = new Set(users.map((u) => String(u._id)))
    const missing = selected.filter((p) => !known.has(String(p.userId)))
    if (missing.length > 0) {
      await Team.deleteOne({ _id: team._id })
      await Membership.deleteMany({ teamId: team._id })
      throw ApiError.badRequest('One or more selected players no longer exist')
    }

    await Membership.insertMany(
      selected.map((player) => ({
        teamId: team._id,
        userId: player.userId,
        role: player.role ?? 'member',
        status: 'active',
        joinedAt: new Date(),
        ...(player.specialty ? { specialty: player.specialty } : {}),
        ...(player.jerseyNumber ? { jerseyNumber: player.jerseyNumber } : {}),
      })),
      { ordered: false },
    )
  }

  return {
    ...team.toObject(),
    id: String(team._id),
  }
}

/**
 * Rewrites the squad roster: players in the payload stay (updated), players
 * dropped are removed. Admins are never dropped, since an orphaned team can't
 * be managed afterwards.
 */
export async function updateTeam({ teamId, updates, updaterId }) {
  const team = await Team.findById(teamId)
  if (!team) throw ApiError.notFound('Team not found')

  const { name, shortName, city, players } = updates
  if (name !== undefined) team.name = name
  if (shortName !== undefined) team.shortName = shortName || undefined
  if (city !== undefined) team.city = city || undefined
  await team.save()

  if (players !== undefined) {
    const selected = normalizePlayers(players, updaterId)
    const users = await User.find({ _id: { $in: selected.map((p) => p.userId) } })
      .select('_id')
      .lean()
    const known = new Set(users.map((u) => String(u._id)))
    if (selected.some((p) => !known.has(String(p.userId)))) {
      throw ApiError.badRequest('One or more selected players no longer exist')
    }

    const keepIds = new Set([...selected.map((p) => String(p.userId)), String(updaterId)])

    // Admins are preserved even when absent from the payload.
    const admins = await Membership.find({ teamId, role: 'admin', status: 'active' })
      .select('userId')
      .lean()
    for (const admin of admins) keepIds.add(String(admin.userId))

    await Membership.deleteMany({ teamId, userId: { $nin: [...keepIds] } })

    await Promise.all(
      selected.map((player) =>
        Membership.findOneAndUpdate(
          { teamId, userId: player.userId },
          {
            $set: {
              status: 'active',
              role: player.role ?? 'member',
              ...(player.specialty !== undefined
                ? { specialty: player.specialty }
                : {}),
              ...(player.jerseyNumber !== undefined
                ? { jerseyNumber: player.jerseyNumber }
                : {}),
            },
            $setOnInsert: { joinedAt: new Date() },
          },
          { upsert: true },
        ),
      ),
    )
  }

  return getTeamDetail(teamId)
}

/**
 * Headline record (played / won / lost / win % / runs / wickets) for many
 * teams in one pass. Same maths as computeMemberStats' teamSummary, but batched
 * so a list endpoint doesn't fan out into a query per team.
 */
async function listTeamSummaries(teamIds) {
  const keys = teamIds.map(String)
  if (keys.length === 0) return new Map()

  const matches = await Match.find({
    $or: [{ teamAId: { $in: keys } }, { teamBId: { $in: keys } }],
  })
    .select('_id teamAId teamBId status result')
    .lean()

  const matchIds = matches.map((m) => m._id)
  const innings = matchIds.length
    ? await Innings.find({ matchId: { $in: matchIds } })
        .select('matchId battingTeamId score')
        .lean()
    : []

  const summaries = new Map(
    keys.map((key) => [
      key,
      { played: 0, won: 0, lost: 0, tied: 0, runsScored: 0, wicketsTaken: 0, winPct: 0 },
    ]),
  )

  for (const match of matches) {
    for (const side of [match.teamAId, match.teamBId]) {
      const summary = summaries.get(String(side))
      if (!summary) continue
      summary.played += 1
      if (match.status !== 'completed') continue
      const winnerId = match.result?.winnerTeamId
      if (!winnerId) summary.tied += 1
      else if (String(winnerId) === String(side)) summary.won += 1
      else summary.lost += 1
    }
  }

  const matchKey = new Map(matches.map((m) => [String(m._id), m]))
  for (const inning of innings) {
    const match = matchKey.get(String(inning.matchId))
    if (!match) continue
    const runs = inning.score?.runs ?? 0
    const wickets = inning.score?.wickets ?? 0
    const bat = summaries.get(String(inning.battingTeamId))
    if (bat) bat.runsScored += runs
    // The fielding side is whichever team was not batting.
    const bowlId = String(inning.battingTeamId) === String(match.teamAId) ? match.teamBId : match.teamAId
    const bowl = summaries.get(String(bowlId))
    if (bowl) bowl.wicketsTaken += wickets
  }

  for (const summary of summaries.values()) {
    const decided = summary.won + summary.lost
    summary.winPct = decided ? Math.round((summary.won / decided) * 100) : 0
  }

  return summaries
}

/**
 * Roster preview for the team list: jersey number + name per active member,
 * numbered players first. Emails are left out so this is safe to expose on the
 * public browse.
 */
async function listSquadPreviews(teamIds) {
  if (teamIds.length === 0) return new Map()

  const memberships = await Membership.find({ teamId: { $in: teamIds }, status: 'active' })
    .select('teamId userId jerseyNumber')
    .lean()

  const userIds = [...new Set(memberships.map((m) => String(m.userId)))]
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select('_id name').lean()
    : []
  const nameByUser = new Map(users.map((u) => [String(u._id), u.name]))

  const byTeam = new Map(teamIds.map((id) => [String(id), []]))
  for (const membership of memberships) {
    byTeam.get(String(membership.teamId))?.push({
      name: nameByUser.get(String(membership.userId)) ?? null,
      jerseyNumber: membership.jerseyNumber ?? null,
    })
  }

  for (const squad of byTeam.values()) {
    squad.sort((a, b) => {
      if (a.jerseyNumber && b.jerseyNumber) return a.jerseyNumber - b.jerseyNumber
      if (a.jerseyNumber) return -1
      if (b.jerseyNumber) return 1
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }

  return byTeam
}

/**
 * The ids of every team the user has an active membership on. This is the
 * per-user slice of the world — narrower than an account (which owns teams the
 * user may not be a member of) and wider than a single team.
 */
export async function listTeamIdsForUser(userId) {
  if (!userId) return []
  const memberships = await Membership.find({ userId, status: 'active' })
    .select('teamId')
    .lean()
  return memberships.map((m) => m.teamId)
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

  const [summaryMap, squadMap] = await Promise.all([
    listTeamSummaries(teams.map((t) => t._id)),
    listSquadPreviews(teams.map((t) => t._id)),
  ])

  return teams.map((team) => ({
    ...team,
    id: String(team._id),
    members: countMap.get(String(team._id)) ?? 0,
    role: roleMap.get(String(team._id)),
    admins: adminsByTeam.get(String(team._id)) ?? [],
    teamSummary: summaryMap.get(String(team._id)) ?? null,
    squad: squadMap.get(String(team._id)) ?? [],
  }))
}

/**
 * Teams in the public browse: only those that have actually appeared in a
 * match. A brand new account's teams stay private until it schedules a fixture,
 * which is what promotes them to the global feed.
 */
export async function listPublicTeams() {
  const playedTeamIds = await Match.distinct('teamAId').then(async (asA) => {
    const asB = await Match.distinct('teamBId')
    return [...new Set([...asA, ...asB])]
  })

  if (playedTeamIds.length === 0) return []

  const [teams, counts] = await Promise.all([
    Team.find({ _id: { $in: playedTeamIds } }).sort({ name: 1 }).lean(),
    Membership.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$teamId', members: { $sum: 1 } } },
    ]),
  ])

  const countMap = new Map(counts.map((c) => [String(c._id), c.members]))

  const [summaryMap, squadMap] = await Promise.all([
    listTeamSummaries(teams.map((t) => t._id)),
    listSquadPreviews(teams.map((t) => t._id)),
  ])

  return teams.map(({ createdBy: _createdBy, ...team }) => ({
    ...team,
    id: String(team._id),
    members: countMap.get(String(team._id)) ?? 0,
    teamSummary: summaryMap.get(String(team._id)) ?? null,
    squad: squadMap.get(String(team._id)) ?? [],
  }))
}

/**
 * Team detail without member emails, for the signed-out public browse. Also
 * hides a team that has never played: those are only reachable by their owner.
 */
export async function getPublicTeamDetail(teamId) {
  const played = await Match.exists({
    $or: [{ teamAId: teamId }, { teamBId: teamId }],
  })
  if (!played) throw ApiError.notFound('Team not found')

  const { createdBy: _createdBy, tenantId: _tenantId, ...team } = await getTeamDetail(teamId)
  return {
    ...team,
    squad: team.squad.map(({ email: _email, ...member }) => member),
  }
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
    .select('_id teamAId teamBId scheduledAt status result')
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

  // Headline numbers for the team card: played / won / lost / win % plus runs
  // and wickets. Recomputed here from the same innings the member stats use,
  // so the two can never disagree.
  const teamSummary = {
    played: matches.length,
    won: 0,
    lost: 0,
    tied: 0,
    runsScored: 0,
    wicketsTaken: 0,
    winPct: 0,
  }

  for (const match of matches) {
    if (match.status === 'completed') {
      const winnerId = match.result?.winnerTeamId
      if (!winnerId) teamSummary.tied += 1
      else if (String(winnerId) === String(teamId)) teamSummary.won += 1
      else teamSummary.lost += 1
    }
  }
  // Win % ignores ties and abandoned games, matching the leaderboard's rating.
  const decided = teamSummary.won + teamSummary.lost
  teamSummary.winPct = decided ? Math.round((teamSummary.won / decided) * 100) : 0

  for (const inning of innings) {
    const match = matchById.get(String(inning.matchId))
    if (!match) continue

    if (String(inning.battingTeamId) === String(teamId)) {
      teamSummary.runsScored += inning.score?.runs ?? 0
    } else {
      teamSummary.wicketsTaken += inning.score?.wickets ?? 0
    }

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

  return { playerStats, playerHistory, teamSummary }
}

/**
 * Team detail with the full roster, member emails and career stats.
 *
 * Membership is required: this returns every member's email and complete
 * batting/bowling history, so it must never be readable by a signed-in stranger
 * who guessed a team id. Callers on the public path use getPublicTeamDetail,
 * which re-checks that the team has played and strips the emails.
 */
export async function getTeamDetail(teamId, { viewerId = null } = {}) {
  if (viewerId) {
    const member = await Membership.exists({
      teamId,
      userId: viewerId,
      status: 'active',
    })
    if (!member) throw ApiError.notFound('Team not found')
  }

  const team = await Team.findById(teamId).lean()
  if (!team) throw ApiError.notFound('Team not found')

  const memberships = await Membership.find({
    teamId,
    status: 'active',
  })
    .select('userId role joinedAt specialty designation avatarColor jerseyNumber')
    .lean()

  const userIds = memberships.map((m) => m.userId)
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id email name avatarUrl role')
    .lean()

  const userMap = new Map(users.map((u) => [String(u._id), u]))

  const { playerStats, playerHistory, teamSummary } = await computeMemberStats(teamId)

  return {
    ...team,
    id: String(team._id),
    squad: memberships
      .map((m) => {
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
          jerseyNumber: m.jerseyNumber ?? null,
          joinedAt: m.joinedAt,
        }
      })
      // Numbered players first, then by name, so the roster reads like a sheet.
      .sort((a, b) => {
        if (a.jerseyNumber && b.jerseyNumber) return a.jerseyNumber - b.jerseyNumber
        if (a.jerseyNumber) return -1
        if (b.jerseyNumber) return 1
        return (a.name ?? '').localeCompare(b.name ?? '')
      }),
    teamSummary,
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
  if (updates.jerseyNumber !== undefined) {
    memberUpdates.jerseyNumber = updates.jerseyNumber
    // Shirt numbers are unique within a squad, so clear any existing holder.
    if (updates.jerseyNumber) {
      await Membership.updateMany(
        { teamId, jerseyNumber: updates.jerseyNumber, userId: { $ne: memberId } },
        { $set: { jerseyNumber: null } },
      )
    }
  }

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
    jerseyNumber: updated.jerseyNumber ?? null,
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
  updateTeam,
  listMyTeams,
  getTeamDetail,
  inviteMember,
  getInviteInfo,
  acceptInvite,
  removeMember,
}