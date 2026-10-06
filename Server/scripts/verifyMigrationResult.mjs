/**
 * Post-migration sanity check: every pre-existing document still has a tenant,
 * the seeded squad is intact and grouped under one account, and no rows are
 * orphaned. Read-only.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { Account } from '../src/modules/accounts/account.model.js'
import { User } from '../src/modules/users/user.model.js'
import { Team } from '../src/modules/teams/team.model.js'
import { Match } from '../src/modules/matches/match.model.js'
import { Membership } from '../src/modules/teams/membership.model.js'

await connectDB()

const accounts = await Account.find({}).select('_id name ownerId').lean()
console.log(`\nACCOUNTS (${accounts.length})`)
for (const a of accounts) {
  const owner = await User.findById(a.ownerId).select('email').lean()
  const teams = await Team.countDocuments({ tenantId: a._id })
  const users = await User.countDocuments({ tenantId: a._id })
  const matches = await Match.countDocuments({ tenantId: a._id })
  console.log(`  ${a._id}  "${a.name}"  owner=${owner?.email}  teams=${teams} users=${users} matches=${matches}`)
}

const [teams, matches, users] = await Promise.all([
  Team.find({}).select('_id name tenantId').lean(),
  Match.find({}).select('_id status tenantId').lean(),
  User.find({}).select('_id email tenantId').lean(),
])

const orphanTeams = teams.filter((t) => !t.tenantId)
const orphanMatches = matches.filter((m) => !m.tenantId)
console.log(`\nORPHANS  teams=${orphanTeams.length} matches=${orphanMatches.length}`)
for (const t of orphanTeams) console.log(`  team ${t.name} has no tenant`)

const turfUsers = users.filter((u) => String(u.email).endsWith('@turf.com'))
const tenantedTurf = turfUsers.filter((u) => u.tenantId)
console.log(`\nSEEDED PLAYERS  ${tenantedTurf.length}/${turfUsers.length} carry a tenantId`)

const memberCounts = await Membership.aggregate([
  { $group: { _id: '$teamId', members: { $sum: 1 } } },
])
for (const t of teams) {
  const c = memberCounts.find((m) => String(m._id) === String(t._id))?.members ?? 0
  console.log(`  squad "${t.name}": ${c} members, tenant=${t.tenantId ? 'yes' : 'NO'}`)
}

console.log('')
await disconnectDB()
await mongoose.disconnect().catch(() => {})
