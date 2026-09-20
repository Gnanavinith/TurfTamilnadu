import { connectDB, disconnectDB } from '../src/config/db.js'
import bcrypt from 'bcryptjs'
import { User } from '../src/modules/users/user.model.js'
import { Team } from '../src/modules/teams/team.model.js'
import { Membership } from '../src/modules/teams/membership.model.js'

const TEAM_NAMES = ['rcb', 'csk']
const DEFAULT_PASSWORD = 'Admin@1234'
const COUNT = 15

try {
  await connectDB()

  const teams = await Team.find({
    name: { $regex: new RegExp(`^(${TEAM_NAMES.join('|')})$`, 'i') },
  })
  .select('_id name')
  .lean()
  if (teams.length !== TEAM_NAMES.length) {
    throw new Error(`Expected ${TEAM_NAMES.length} teams, found ${teams.length}: ${teams.map((t) => t.name).join(', ')}`)
  }

  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  const emails = Array.from({ length: COUNT }, (_, i) => `dummy${i + 1}@example.com`)
  const names = Array.from({ length: COUNT }, (_, i) => `Dummy Player ${i + 1}`)

  await User.bulkWrite(
    emails.map((email, i) => ({
      updateOne: {
        filter: { email },
        update: { $setOnInsert: { email, password: hashed, name: names[i] } },
        upsert: true,
      },
    })),
    { ordered: false },
  )

  const users = await User.find({ email: { $in: emails } }).select('_id email').lean()
  const userIds = users.map((u) => u._id)

  // Remove orphaned memberships (e.g. from a previous seed whose user docs were
  // deleted but the membership rows survived) so counts stay exact.
  const validUserIds = await User.distinct('_id')
  const orphanRemoved = await Membership.deleteMany({
    teamId: { $in: teams.map((t) => t._id) },
    _id: { $nin: [] },
    userId: { $nin: validUserIds },
  })

  let membershipsAdded = 0
  for (const team of teams) {
    const res = await Membership.bulkWrite(
      userIds.map((userId) => ({
        updateOne: {
          filter: { teamId: team._id, userId },
          update: { $set: { role: 'member', status: 'active', joinedAt: new Date() } },
          upsert: true,
        },
      })),
      { ordered: false },
    )
    membershipsAdded += res.upsertedCount + res.modifiedCount
  }

  const counts = await Promise.all(
    teams.map(async (team) => ({
      team: team.name,
      members: await Membership.countDocuments({ teamId: team._id, status: 'active' }),
    })),
  )

  console.log(`Seeded ${users.length} dummy users (password "${DEFAULT_PASSWORD}")`)
  console.log(`Orphaned memberships removed: ${orphanRemoved.deletedCount}`)
  console.log(`Memberships written: ${membershipsAdded}`)
  for (const c of counts) console.log(`  ${c.team}: ${c.members} active members`)

  await disconnectDB()
  process.exit(0)
} catch (err) {
  console.error(err)
  try { await disconnectDB() } catch {}
  process.exit(1)
}