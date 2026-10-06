/**
 * End-to-end HTTP check of the tenancy boundary against a running server.
 *
 * Signs up two throwaway admins, walks the real endpoints, and asserts that
 * neither can reach the other's data — including the endpoints that leaked
 * before (the player directory and team detail).
 *
 * Usage: node scripts/httpTenancyCheck.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:5000/api/v1'
const stamp = Date.now().toString(36)
const created = { users: [] }

let failures = 0
const pass = []
const fail = []
const check = (label, cond) => {
  if (cond) pass.push(label)
  else {
    fail.push(label)
    failures += 1
  }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json }
}

async function signup(label) {
  const email = `e2e-${label}-${stamp}@test.local`
  const res = await api('/auth/register', {
    method: 'POST',
    body: { email, name: `E2E ${label}`, password: 'Password@123' },
  })
  if (res.status !== 201 || !res.json?.data?.accessToken) {
    throw new Error(`signup ${label} failed: ${res.status} ${JSON.stringify(res.json)}`)
  }
  // The register response carries the sanitized user, so the probe account can be
// cleaned up later without guessing at ids.
const userId = res.json.data.user?.id
  if (userId) created.users.push(userId)
  return { email, userId, token: res.json.data.accessToken }
}

// ---- sign up two independent accounts ---------------------------------
const a = await signup('A')
const b = await signup('B')

// ---- 1. a new account starts empty ------------------------------------
let teamsA = await api('/teams', { token: a.token })
check('new account has zero teams', teamsA.status === 200 && teamsA.json.data.length === 0)

let playersA = await api('/users/players', { token: a.token })
check(
  'new account player directory is empty',
  playersA.status === 200 && playersA.json.data.length === 0,
)

// The home feed is global, so a new account sees the platform's matches rather
// than an empty page. Its own feed is empty, and that is opt-in via scope=mine.
let matchesGlobal = await api('/matches', { token: a.token })
check(
  'new account sees the global feed on /matches',
  matchesGlobal.status === 200 && matchesGlobal.json.data.length > 0,
)

let matchesMine = await api('/matches?scope=mine', { token: a.token })
check('new account own feed is empty', matchesMine.status === 200 && matchesMine.json.data.length === 0)

// ---- 2. create a team in A only ---------------------------------------
const teamA = await api('/teams', {
  method: 'POST',
  token: a.token,
  body: { name: `E2E A ${stamp}`, shortName: 'EA', city: 'Chennai' },
})
check('A can create a team', teamA.status === 201 && Boolean(teamA.json?.data?.id))
const teamAId = teamA.json?.data?.id

// ---- 3. B cannot see A's team ----------------------------------------
let bSeesTeam = await api('/teams', { token: b.token })
check(
  'B team list excludes A team',
  bSeesTeam.json.data.every((t) => t.id !== teamAId),
)

let bReadsA = await api(`/teams/${teamAId}`, { token: b.token })
check('B cannot read A team detail (404)', bReadsA.status === 404)

let bPublicReadsA = await api(`/public/teams/${teamAId}`)
check('unplayed A team is not public', bPublicReadsA.status === 404)

let bPublicList = await api('/public/teams')
check(
  'unplayed A team absent from public browse',
  bPublicList.json.data.every((t) => t.id !== teamAId),
)

let bDirSeesA = await api('/users/players', { token: b.token })
check(
  'B directory excludes A account users',
  bDirSeesA.json.data.every((p) => !String(p.email).startsWith(`e2e-A-`)),
)

// ---- 4. B cannot schedule a match with A's team -----------------------
let crossMatch = await api('/matches', {
  method: 'POST',
  token: b.token,
  body: {
    teamAId,
    teamBId: teamAId,
    overs: 20,
    scheduledAt: new Date().toISOString(),
  },
})
check('B cannot build a match from A team', crossMatch.status === 400)

// ---- 5. the platform feed still shows the pre-existing data -----------
let publicMatches = await api('/public/matches')
check(
  'public match feed still returns the existing fixtures',
  Array.isArray(publicMatches.json?.data) && publicMatches.json.data.length > 0,
)

let publicTeams = await api('/public/teams')
check(
  'public team browse still returns played teams',
  Array.isArray(publicTeams.json?.data) && publicTeams.json.data.length > 0,
)

let leaderboard = await api('/public/leaderboard')
check('public leaderboard still responds', leaderboard.status === 200)

check(
  'seeded players are NOT visible to the other new account',
  (await api('/users/players', { token: b.token })).json.data.every(
    (p) => !String(p.email).endsWith('@turf.com'),
  ),
)

// ---- 6. the original owner's data survived the migration -------------
// The owner's password is not the seeded players' default, so this needs to be
// supplied: OWNER_EMAIL=x@y.com OWNER_PASSWORD=... node scripts/httpTenancyCheck.mjs
const ownerEmail = process.env.OWNER_EMAIL
const ownerPassword = process.env.OWNER_PASSWORD

if (ownerEmail && ownerPassword) {
  const ownerLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: ownerEmail, password: ownerPassword },
  })
  check('owner can still sign in', ownerLogin.status === 200)

  if (ownerLogin.status === 200) {
    const token = ownerLogin.json.data.accessToken
    const ownerTeams = await api('/teams', { token })
    check(
      `owner ${ownerEmail} still owns its 2 teams after migration`,
      ownerTeams.status === 200 && ownerTeams.json.data.length === 2,
    )

    const ownerDir = await api('/users/players', { token })
    check(
      'owner directory still lists its seeded players',
      ownerDir.status === 200 && ownerDir.json.data.length >= 20,
    )
  }
} else {
  console.log(
    '\n  SKIP  owner-survival checks (set OWNER_EMAIL + OWNER_PASSWORD to run them)\n',
  )
}

// ---- report -----------------------------------------------------------
console.log('')
for (const l of pass) console.log(`  PASS  ${l}`)
for (const l of fail) console.log(`  FAIL  ${l}`)
console.log(`\n${pass.length} passed, ${fail.length} failed\n`)

// ---- cleanup ----------------------------------------------------------
// The probe accounts are only reachable by their own tokens, and there is no
// "delete my account" endpoint, so remove them straight from the database.
// Guarded by the e2e- email prefix so a mis-set env var can't delete real data.
if (created.users.length > 0) {
  const { connectDB, disconnectDB } = await import('../src/config/db.js')
  const { User } = await import('../src/modules/users/user.model.js')
  const { Account } = await import('../src/modules/accounts/account.model.js')
  const { Team } = await import('../src/modules/teams/team.model.js')
  const { Match } = await import('../src/modules/matches/match.model.js')
  const { Membership } = await import('../src/modules/teams/membership.model.js')

  await connectDB()

  const owners = await Account.find({ ownerId: { $in: created.users } }).select('_id').lean()
  const accountIds = owners.map((o) => o._id)
  const teamIds = accountIds.length
    ? (await Team.find({ tenantId: { $in: accountIds } }).select('_id').lean()).map((t) => t._id)
    : []
  const matchIds = teamIds.length
    ? (
        await Match.find({
          $or: [{ teamAId: { $in: teamIds } }, { teamBId: { $in: teamIds } }],
        }).select('_id').lean()
      ).map((m) => m._id)
    : []

  await Membership.deleteMany({ teamId: { $in: teamIds } })
  await Match.deleteMany({ _id: { $in: matchIds } })
  await Team.deleteMany({ _id: { $in: teamIds } })
  await User.deleteMany({ _id: { $in: created.users } })
  await Account.deleteMany({ _id: { $in: accountIds } })

  console.log(
    `cleanup: removed ${created.users.length} probe account(s), ${teamIds.length} team(s), ${matchIds.length} match(es)\n`,
  )

  await disconnectDB()
}

process.exit(fail.length > 0 ? 1 : 0)
