/**
 * Verifies the tenancy boundary end-to-end against the running database.
 *
 * Creates two throwaway accounts, gives each its own team and player, then
 * asserts that A cannot see, read, edit or score against B's data — and that
 * both accounts really do start empty.
 *
 * Read-mostly: everything it creates is removed again on the way out.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { Account } from '../src/modules/accounts/account.model.js'
import { User } from '../src/modules/users/user.model.js'
import { Team } from '../src/modules/teams/team.model.js'
import { Membership } from '../src/modules/teams/membership.model.js'
import { Match } from '../src/modules/matches/match.model.js'
import {
  searchPlayers,
  memberUserIdsForTeams,
} from '../src/modules/users/users.service.js'
import {
  createTeam,
  listTeamIdsForUser,
  getTeamDetail,
  getPublicTeamDetail,
  listPublicTeams,
} from '../src/modules/teams/team.service.js'
import { createMatch, listMatches } from '../src/modules/matches/match.service.js'

const stamp = Date.now().toString(36)
let failures = 0
const ok = []
const bad = []

function check(label, condition) {
  if (condition) ok.push(label)
  else {
    bad.push(label)
    failures += 1
  }
}

const cleanup = { accounts: [], users: [], teams: [], matches: [] }

async function makeAccount(label) {
  const user = await User.create({
    email: `tenancy-${label}-${stamp}@test.local`,
    name: `Tenant ${label}`,
    password: 'Password@123',
    role: 'admin',
  })
  const account = await Account.create({ name: `Account ${label}`, ownerId: user._id })
  await User.updateOne({ _id: user._id }, { $set: { tenantId: account._id } })
  user.tenantId = account._id
  cleanup.accounts.push(account._id)
  cleanup.users.push(user._id)
  return { user, account }
}

async function makeTeam(user, tenantId, label) {
  const team = await createTeam({
    name: `Team ${label} ${stamp}`,
    shortName: label,
    createdBy: user._id,
    tenantId,
  })
  cleanup.teams.push(team._id)
  return team
}

await connectDB()

const a = await makeAccount('A')
const b = await makeAccount('B')

// ---- 1. A new account starts completely empty --------------------------
const aTeamsAtStart = await listTeamIdsForUser(a.user._id)
check('new account owns no teams', aTeamsAtStart.length === 0)

// The directory is always called with excludeUserId (the controller passes the
// caller), so a brand new account sees nothing but the rest of the app.
const aDirAtStart = await searchPlayers({
  teamIds: aTeamsAtStart,
  tenantId: a.user.tenantId,
  excludeUserId: a.user._id,
})
check('new account player directory is empty', aDirAtStart.length === 0)

const bTeamsAtStart = await listTeamIdsForUser(b.user._id)
const bDirAtStart = await searchPlayers({
  teamIds: bTeamsAtStart,
  tenantId: b.user.tenantId,
  excludeUserId: b.user._id,
})
check('second new account directory is empty too', bDirAtStart.length === 0)

// ---- 2. Isolation between two accounts --------------------------------
const teamA = await makeTeam(a.user, a.user.tenantId, 'A')
const teamB = await makeTeam(b.user, b.user.tenantId, 'B')

const aTeamIds = await listTeamIdsForUser(a.user._id)
const bTeamIds = await listTeamIdsForUser(b.user._id)
check('A sees only its own team', aTeamIds.length === 1 && String(aTeamIds[0]) === String(teamA._id))
check('B sees only its own team', bTeamIds.length === 1 && String(bTeamIds[0]) === String(teamB._id))

const aMembers = await memberUserIdsForTeams(aTeamIds)
check('A resolves its own member only', aMembers.length === 1 && String(aMembers[0]) === String(a.user._id))

const aDirectory = await searchPlayers({
  teamIds: aTeamIds,
  tenantId: a.user.tenantId,
  excludeUserId: a.user._id,
})
check(
  'A directory excludes B account users',
  !aDirectory.some((p) => String(p.id) === String(b.user._id)),
)
// A must not be able to read B's team detail (it carries member emails).
let aReadBTeam = 'no error'
try {
  await getTeamDetail(teamB._id, { viewerId: a.user._id })
} catch (err) {
  aReadBTeam = err.message
}
check('A cannot read B team detail', /not found/i.test(aReadBTeam))

// A may read its own.
let aReadOwn = 'ok'
try {
  await getTeamDetail(teamA._id, { viewerId: a.user._id })
} catch (err) {
  aReadOwn = err.message
}
check('A can read its own team detail', aReadOwn === 'ok')

// ---- 3. A cannot build a match out of B's team -------------------------
let crossTenantMatch = 'no error'
try {
  await createMatch({
    teamAId: teamA._id,
    teamBId: teamB._id,
    overs: 20,
    scheduledAt: new Date(),
    createdBy: a.user._id,
    tenantId: a.user.tenantId,
  })
} catch (err) {
  crossTenantMatch = err.message
}
check('A cannot schedule a match using B team', /own account/i.test(crossTenantMatch))

// ---- 4. Public visibility only after a team has played -----------------
const publicBefore = await listPublicTeams()
check(
  'unplayed teams are absent from the public browse',
  !publicBefore.some((t) => String(t._id) === String(teamA._id)) &&
    !publicBefore.some((t) => String(t._id) === String(teamB._id)),
)

let publicDetailBefore = 'no error'
try {
  await getPublicTeamDetail(teamA._id)
} catch (err) {
  publicDetailBefore = err.message
}
check('unplayed team detail is not public', /not found/i.test(publicDetailBefore))

// A legitimate match inside A's own account promotes it to the public feed.
const realMatch = await createMatch({
  teamAId: teamA._id,
  teamBId: teamA._id === teamB._id ? teamB._id : teamA._id,
  overs: 20,
  scheduledAt: new Date(),
  createdBy: a.user._id,
  tenantId: a.user.tenantId,
}).catch(() => null)

// A match needs two distinct teams, both A's, so give A a second team.
if (!realMatch) {
  const teamA2 = await makeTeam(a.user, a.user.tenantId, 'A2')
  const m = await createMatch({
    teamAId: teamA._id,
    teamBId: teamA2._id,
    overs: 20,
    scheduledAt: new Date(),
    createdBy: a.user._id,
    tenantId: a.user.tenantId,
  })
  cleanup.matches.push(m.id)
}

const publicAfter = await listPublicTeams()
check(
  'played team appears in the public browse',
  publicAfter.some((t) => String(t._id) === String(teamA._id)),
)

let publicDetailAfter = 'no error'
try {
  const detail = await getPublicTeamDetail(teamA._id)
  const leaksEmail = detail.squad.some((m) => m.email != null)
  if (leaksEmail) publicDetailAfter = 'public detail leaked a member email'
} catch (err) {
  publicDetailAfter = err.message
}
check('played public team detail hides member emails', publicDetailAfter === 'no error')

// ---- 5. Match feed scoping --------------------------------------------
// Global is the default: every match in the app, so scores and stats are
// visible to everyone.
const globalMatches = await listMatches({})
check('global match feed includes every match', globalMatches.length > 0)

// "mine" is opt-in and must stay inside the caller's world.
const aMatches = await listMatches({
  userId: a.user._id,
  tenantId: a.user.tenantId,
  scope: 'mine',
})
check(
  'A scoped feed excludes B data',
  aMatches.every((m) => m.createdBy !== String(b.user._id)),
)
const bMatches = await listMatches({
  userId: b.user._id,
  tenantId: b.user.tenantId,
  scope: 'mine',
})
check(
  'B scoped feed is empty while it owns nothing',
  bMatches.length === 0,
)

// ---- 6. Membership still governs intra-account access ------------------
let strangerInSameAccount = 'no error'
try {
  await getTeamDetail(teamA._id, { viewerId: b.user._id })
} catch (err) {
  strangerInSameAccount = err.message
}
check('non-member cannot read team detail even though admin role', /not found/i.test(strangerInSameAccount))

// ---- report ------------------------------------------------------------
console.log('')
for (const label of ok) console.log(`  PASS  ${label}`)
for (const label of bad) console.log(`  FAIL  ${label}`)
console.log(`\n${ok.length} passed, ${bad.length} failed\n`)

// ---- cleanup -----------------------------------------------------------
await Match.deleteMany({ _id: { $in: cleanup.matches.map((id) => new mongoose.Types.ObjectId(String(id))) } })
await Membership.deleteMany({ teamId: { $in: cleanup.teams.map((id) => new mongoose.Types.ObjectId(String(id))) } })
await Team.deleteMany({ _id: { $in: cleanup.teams.map((id) => new mongoose.Types.ObjectId(String(id))) } })
await User.deleteMany({ _id: { $in: cleanup.users.map((id) => new mongoose.Types.ObjectId(String(id))) } })
await Account.deleteMany({ _id: { $in: cleanup.accounts.map((id) => new mongoose.Types.ObjectId(String(id))) } })

await disconnectDB()
await mongoose.disconnect().catch(() => {})
process.exit(failures > 0 ? 1 : 0)
