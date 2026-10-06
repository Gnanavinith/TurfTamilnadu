import { connectDB, disconnectDB } from '../src/config/db.js'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { User } from '../src/modules/users/user.model.js'
import { Team } from '../src/modules/teams/team.model.js'
import { Membership } from '../src/modules/teams/membership.model.js'

const OWNER_ID = process.env.SEED_OWNER_ID ?? '6ac44f3fcc2a234ab0f8c822'
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? 'Player@123'

/**
 * DEV ONLY. The players below are real accounts and are stamped with the
 * owner's account, which is what keeps them out of every other tenant's player
 * directory. Never run this against production data.
 *
 * New accounts are created empty by serviceRegister; there is nothing to seed
 * for them.
 */

const TEAMS = [
  {
    teamName: 'Turf Warriors',
    shortName: 'TW',
    city: 'Chennai',
    players: [
      { name: 'Arun Kumar', email: 'arun@turf.com' },
      { name: 'Vignesh R', email: 'vignesh@turf.com' },
      { name: 'Karthik S', email: 'karthik@turf.com' },
      { name: 'Praveen M', email: 'praveen@turf.com' },
      { name: 'Sathish K', email: 'sathish@turf.com' },
      { name: 'Dinesh R', email: 'dinesh@turf.com' },
      { name: 'Ajay Kumar', email: 'ajay@turf.com' },
      { name: 'Manoj T', email: 'manoj@turf.com' },
      { name: 'Rahul V', email: 'rahul@turf.com' },
      { name: 'Surya P', email: 'surya@turf.com' },
      { name: 'Vijay Anand', email: 'vijay@turf.com' },
    ],
  },
  {
    teamName: 'Chennai Kings',
    shortName: 'CK',
    city: 'Chennai',
    players: [
      { name: 'Ravi Shankar', email: 'ravi@turf.com' },
      { name: 'Gokul S', email: 'gokul@turf.com' },
      { name: 'Naveen Kumar', email: 'naveen@turf.com' },
      { name: 'Vasanth R', email: 'vasanth@turf.com' },
      { name: 'Hari Prasad', email: 'hari@turf.com' },
      { name: 'Madhan K', email: 'madhan@turf.com' },
      { name: 'Sanjay V', email: 'sanjay@turf.com' },
      { name: 'Lokesh M', email: 'lokesh@turf.com' },
      { name: 'Deepak R', email: 'deepak@turf.com' },
      { name: 'Ashwin S', email: 'ashwin@turf.com' },
      { name: 'Mohan Raj', email: 'mohan@turf.com' },
    ],
  },
]

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

async function upsertUser({ name, email }, hashed, tenantId) {
  const existing = await User.findOne({ email }).select('+password')
  if (existing) {
    if (!existing.password) {
      existing.password = hashed
      existing.name = name
      await existing.save()
    }
    // Re-stamp so a re-run after the tenancy migration repairs any player that
    // was created before the tenant existed.
    if (tenantId) await User.updateOne({ _id: existing._id }, { $set: { tenantId } })
    return { id: existing._id, created: false }
  }
  const user = await User.create({
    email,
    name,
    password: hashed,
    role: 'player',
    tenantId: tenantId ?? null,
  })
  return { id: user._id, created: true }
}

try {
  await connectDB()

  const owner = await User.findById(OWNER_ID)
  if (!owner) {
    throw new Error(`Owner user ${OWNER_ID} not found — set SEED_OWNER_ID to a valid user id`)
  }

  // Seeded players belong to the owner's account, so they stay inside it.
  const { ensureAccountForUser } = await import('../src/modules/accounts/account.service.js')
  const account = await ensureAccountForUser(owner)
  const tenantId = account._id

  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  let usersCreated = 0
  const results = []

  for (const seed of TEAMS) {
    // Idempotent: re-running reuses the existing team by name.
    let team = await Team.findOne({ name: seed.teamName })

    if (!team) {
      team = await Team.create({
        name: seed.teamName,
        shortName: seed.shortName,
        city: seed.city,
        slug: `${slugify(seed.teamName)}-${crypto.randomBytes(2).toString('hex')}`,
        capacity: 15,
        createdBy: owner._id,
        tenantId,
      })
    } else if (!team.tenantId) {
      // Pre-tenancy team picked up by a re-run.
      await Team.updateOne({ _id: team._id }, { $set: { tenantId } })
    }

    // The owner is the team admin (same rule as createTeam).
    await Membership.updateOne(
      { teamId: team._id, userId: owner._id },
      { $set: { role: 'admin', status: 'active' } },
      { upsert: true },
    )

    const roster = []
    for (const player of seed.players) {
      const { id, created } = await upsertUser(player, hashed, tenantId)
      if (created) usersCreated += 1
      roster.push(id)
    }

    await Membership.bulkWrite(
      roster.map((userId, i) => ({
        updateOne: {
          filter: { teamId: team._id, userId },
          update: {
            $set: {
              role: 'member',
              status: 'active',
              jerseyNumber: i + 1,
              designation: i === 0 ? 'captain' : null,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    )

    const members = await Membership.countDocuments({
      teamId: team._id,
      status: 'active',
    })

    results.push({ team: team.name, id: String(team._id), members })
  }

  console.log(`Owner: ${owner.email} (${owner._id})`)
  console.log(`Users created: ${usersCreated} (password "${DEFAULT_PASSWORD}")`)
  for (const r of results) {
    console.log(`  ${r.team} [${r.id}]: ${r.members} active members`)
  }

  await disconnectDB()
  process.exit(0)
} catch (err) {
  console.error(err)
  try {
    await disconnectDB()
  } catch {}
  process.exit(1)
}