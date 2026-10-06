/**
 * Tenancy backfill.
 *
 * Adds tenantId to User / Team / Match and creates the owning Account. Existing
 * rows are stamped with the account of the admin who created the data, so a
 * current dev database keeps working inside one tenant instead of being wiped.
 *
 * Idempotent: re-running is a no-op once every row carries a tenant.
 *
 * Usage:
 *   node scripts/backfillTenancy.mjs --owner=<userId> [--name="Turf TN"] [--dry-run]
 *
 * With no --owner it picks the account with the most teams and falls back to the
 * most recently created admin, and prints what it chose.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { Account } from '../src/modules/accounts/account.model.js'
import { User } from '../src/modules/users/user.model.js'
import { Team } from '../src/modules/teams/team.model.js'
import { Match } from '../src/modules/matches/match.model.js'

const args = process.argv.slice(2)
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const dryRun = args.includes('--dry-run')
const ownerArg = flag('owner')
const accountName = flag('name')

await connectDB()

/** The admin who owns the most existing teams, else the newest admin. */
async function pickOwner() {
  if (ownerArg) {
    const explicit = await User.findById(ownerArg).select('_id email name role').lean()
    if (!explicit) throw new Error(`--owner ${ownerArg} is not a known user`)
    if (explicit.role !== 'admin') {
      throw new Error(`--owner ${ownerArg} (${explicit.email}) is not an admin`)
    }
    return explicit
  }

  const teamsByCreator = await Team.aggregate([
    { $group: { _id: '$createdBy', teams: { $sum: 1 } } },
    { $sort: { teams: -1 } },
  ])

  if (teamsByCreator.length > 0) {
    const top = teamsByCreator[0]
    const owner = await User.findById(top._id).select('_id email name role').lean()
    if (owner) return owner
  }

  const newest = await User.findOne({ role: 'admin' }).sort({ createdAt: -1 }).lean()
  if (!newest) throw new Error('No admin user found to own the account')
  return newest
}

const owner = await pickOwner()

let account = await Account.findOne({ ownerId: owner._id })
if (!account) {
  const name = accountName ?? ((owner.name ?? '').trim() || String(owner.email).split('@')[0])
  if (dryRun) {
    console.log(`[dry-run] would create Account "${name}" for ${owner.email}`)
  } else {
    account = await Account.create({ name, ownerId: owner._id })
    console.log(`created Account ${account._id} "${account.name}" for ${owner.email}`)
  }
}

const tenantId = account?._id ?? new mongoose.Types.ObjectId()

// Every user that is a member of one of the owner's teams joins that account, so
// the existing squad stays visible in the owner's player directory.
const teamIds = (await Team.find({}).select('_id').lean()).map((t) => t._id)
const memberUserIds = teamIds.length
  ? (
      await mongoose.connection.db
        .collection('memberships')
        .find({ teamId: { $in: teamIds.map((id) => new mongoose.Types.ObjectId(String(id))) } }, { projection: { userId: 1 } })
        .toArray()
    ).map((m) => m.userId)
  : []

const stampUsers = [...new Set([owner._id, ...memberUserIds].map(String))].map(
  (id) => new mongoose.Types.ObjectId(id),
)

const plan = [
  ['users', stampUsers.length],
  ['teams', teamIds.length],
  ['matches', await Match.countDocuments({})],
]

console.log(`\nowner: ${owner.email} (${owner._id}) -> tenant ${tenantId}`)
console.log(`mode:  ${dryRun ? 'DRY RUN (nothing written)' : 'WRITE'}\n`)

for (const [label, count] of plan) {
  console.log(`  ${label.padEnd(9)} ${count} document(s) -> tenantId`)
}

if (dryRun) {
  console.log('\n[dry-run] no writes performed. Re-run without --dry-run to apply.')
} else {
  const r1 = await User.updateMany(
    { _id: { $in: stampUsers } },
    { $set: { tenantId } },
  )
  const r2 = await Team.updateMany({ _id: { $in: teamIds } }, { $set: { tenantId } })
  const r3 = await Match.updateMany({}, { $set: { tenantId } })

  console.log(
    `\nupdated: users=${r1.modifiedCount} teams=${r2.modifiedCount} matches=${r3.modifiedCount}`,
  )

  const [unstampedUsers, unstampedTeams, unstampedMatches] = await Promise.all([
    User.countDocuments({ tenantId: null }),
    Team.countDocuments({ tenantId: null }),
    Match.countDocuments({ tenantId: null }),
  ])
  console.log(
    `remaining unstamped: users=${unstampedUsers} teams=${unstampedTeams} matches=${unstampedMatches}`,
  )
  if (unstampedTeams > 0 || unstampedMatches > 0) {
    console.log(
      'NOTE: unstamped teams/matches belong to no account and will fail the new\n' +
        'required tenantId validation on create. Inspect them before deploying.',
    )
  }
}

await disconnectDB()
await mongoose.disconnect().catch(() => {})
