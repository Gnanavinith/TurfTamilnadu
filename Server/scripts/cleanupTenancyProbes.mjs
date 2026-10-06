/**
 * Removes leftover probe accounts from earlier httpTenancyCheck runs.
 * Only touches users whose email matches the strict e2e probe pattern.
 *
 * Usage: node scripts/cleanupTenancyProbes.mjs [--dry-run]
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { Account } from '../src/modules/accounts/account.model.js'
import { User } from '../src/modules/users/user.model.js'
import { Team } from '../src/modules/teams/team.model.js'
import { Match } from '../src/modules/matches/match.model.js'
import { Membership } from '../src/modules/teams/membership.model.js'

// Narrow on purpose: the stamp segment is hex from Date.now().
const PROBE = /^e2e-[ab]-[0-9a-z]+@test\.local$|^probe-[0-9]+@test\.local$/
const dryRun = process.argv.includes('--dry-run')

await connectDB()

const probes = await User.find({ email: PROBE }).select('_id email tenantId').lean()
if (probes.length === 0) {
  console.log('no probe accounts found')
  await disconnectDB()
  await mongoose.disconnect().catch(() => {})
  process.exit(0)
}

const ownerIds = probes.map((p) => p._id)
const accounts = await Account.find({ ownerId: { $in: ownerIds } }).select('_id').lean()
const accountIds = accounts.map((a) => a._id)

const teams = accountIds.length
  ? await Team.find({ tenantId: { $in: accountIds } }).select('_id name').lean()
  : []
const teamIds = teams.map((t) => t._id)

const matches = teamIds.length
  ? await Match.find({
      $or: [{ teamAId: { $in: teamIds } }, { teamBId: { $in: teamIds } }],
    }).select('_id').lean()
  : []

console.log(`\nprobe accounts: ${probes.length}`)
for (const p of probes) console.log(`  ${p.email}`)
console.log(`teams: ${teams.length}  matches: ${matches.length}`)
console.log(`mode: ${dryRun ? 'DRY RUN' : 'DELETE'}\n`)

if (!dryRun) {
  await Membership.deleteMany({ teamId: { $in: teamIds } })
  await Match.deleteMany({ _id: { $in: matches.map((m) => m._id) } })
  await Team.deleteMany({ _id: { $in: teamIds } })
  await User.deleteMany({ _id: { $in: ownerIds } })
  await Account.deleteMany({ _id: { $in: accountIds } })
  console.log('deleted\n')
}

await disconnectDB()
await mongoose.disconnect().catch(() => {})
