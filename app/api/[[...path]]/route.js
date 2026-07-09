import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ---------------- Scoring helpers ----------------
// Each game (partij) is best-of-3 frames. Result 2-0 -> 3-0 pts, 2-1 -> 2-1 pts
function pointsForFrames(homeFrames, awayFrames) {
  const h = Number(homeFrames) || 0
  const a = Number(awayFrames) || 0
  if (h === 2 && a === 0) return { home: 3, away: 0 }
  if (h === 0 && a === 2) return { home: 0, away: 3 }
  if (h === 2 && a === 1) return { home: 2, away: 1 }
  if (h === 1 && a === 2) return { home: 1, away: 2 }
  return { home: 0, away: 0 }
}

function computeMatchTotals(games) {
  let home = 0, away = 0
  for (const g of games || []) {
    const p = pointsForFrames(g.home_frames, g.away_frames)
    home += p.home
    away += p.away
  }
  return { home, away }
}

function stripId(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

// ---------------- Seed ----------------
const SEED_TEAMS = [
  { name: 'Den Telstar', code: 'TEL-4928', players: ['Bob Dumont', 'Dirk Willems', 'Dave Hemmerechts', 'Feline Van Barel', 'Johan Thijs', 'Dirk Jacobs Pluto', 'Dirk Myncke', 'Peter Vertongen', 'Johannes Oksuz', 'Jesper Slegers', 'Rene Mattijns'] },
  { name: 'De Canada', code: 'CAN-7281', players: ['Marc De Vos', 'Kim Peeters', 'Tom Janssens', 'Sofie Claes', 'Bart Vermeulen', 'Els De Smet', 'Peter Aerts', 'Ann Beckers', 'Nick Wouters', 'Karel Maes', 'Lien Verhoeven'] },
  { name: 'Arena', code: 'ARE-1954', players: ['Paulo Costa', 'Monique Devos', 'Sandy Willems', 'Marc Peeters', 'Werner Smets', 'Christiane De Backer', 'Zelko Ivanovic', 'Ivan Petrov', 'Luc Janssen', 'Ria Vermeersch', 'Danny Coppens'] },
  { name: 'De Sportwereld', code: 'SPO-3672', players: ['Wim De Coster', 'Kathy Vermeire', 'Rudy Van den Berg', 'Nadine Segers', 'Guy Verhaegen', 'Linda De Cock', 'Franky Boonen', 'Martine Lauwers', 'Eddy Van Hoof', 'Chantal Verbist', 'Steve Michielsen'] },
  { name: 'Silver Balls', code: 'SIL-8340', players: ['Ronny Goossens', 'Vera Lambrechts', 'Patrick De Rijck', 'Ingrid Vercammen', 'Jos Timmermans', 'Greta Van Camp', 'Kris Baeten', 'Nele Hendrickx', 'Herman Van Gucht', 'Sabine Peeters', 'Freddy Devos'] },
]

function generateCalendar(teams, seasonId) {
  // Simple double round-robin. Odd -> one bye per round.
  const list = teams.slice()
  if (list.length % 2 === 1) list.push({ id: null, name: 'BYE' })
  const n = list.length
  const rounds = []
  const arr = list.slice()
  for (let r = 0; r < n - 1; r++) {
    const fixtures = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i]
      if (a.id && b.id) fixtures.push({ home: a.id, away: b.id })
    }
    rounds.push(fixtures)
    // rotate
    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop())
    arr.splice(0, arr.length, fixed, ...rest)
  }
  // Second half (reversed home/away)
  const secondHalf = rounds.map(rf => rf.map(f => ({ home: f.away, away: f.home })))
  const allRounds = [...rounds, ...secondHalf]
  const matches = []
  const startDate = new Date('2025-09-10T20:00:00')
  allRounds.forEach((fixtures, weekIdx) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + weekIdx * 7)
    for (const f of fixtures) {
      matches.push({
        id: uuidv4(),
        season_id: seasonId,
        week: weekIdx + 1,
        date: date.toISOString(),
        home_team_id: f.home,
        away_team_id: f.away,
        status: 'scheduled',
        games: null,
        points_home: 0,
        points_away: 0,
        submitted_by: null,
        submitted_at: null,
      })
    }
  })
  return matches
}

async function ensureSeed(db) {
  const teamsCount = await db.collection('teams').countDocuments()
  if (teamsCount > 0) return { seeded: false }

  const seasonId = uuidv4()
  await db.collection('seasons').insertOne({
    id: seasonId,
    name: '2025-2026',
    active: true,
    created_at: new Date(),
  })

  const teams = SEED_TEAMS.map(t => ({
    id: uuidv4(),
    name: t.name,
    code: t.code,
    season_id: seasonId,
    created_at: new Date(),
  }))
  await db.collection('teams').insertMany(teams)

  const players = []
  SEED_TEAMS.forEach((t, i) => {
    for (const pname of t.players) {
      players.push({
        id: uuidv4(),
        team_id: teams[i].id,
        name: pname,
        active: true,
        locked: true,
        joined_at: new Date().toISOString(),
      })
    }
  })
  await db.collection('players').insertMany(players)

  const matches = generateCalendar(teams, seasonId)
  if (matches.length) await db.collection('matches').insertMany(matches)

  await db.collection('settings').insertOne({
    id: uuidv4(),
    key: 'scoring',
    rules: {
      frames_2_0: [3, 0],
      frames_2_1: [2, 1],
      games_per_match: 10,
      enkel_games: 8,
      dubbel_games: 2,
    },
  })

  return { seeded: true }
}

// ---------------- Standings ----------------
async function computeStandings(db) {
  const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
  const matches = (await db.collection('matches').find({ status: { $in: ['confirmed', 'submitted'] } }).toArray()).map(stripId)

  const stats = {}
  for (const t of teams) {
    stats[t.id] = {
      team_id: t.id,
      team_name: t.name,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      points_for: 0,
      points_against: 0,
      saldo: 0,
      total_points: 0,
    }
  }
  for (const m of matches) {
    if (!m.games) continue
    const s = stats[m.home_team_id]
    const s2 = stats[m.away_team_id]
    if (!s || !s2) continue
    s.played += 1
    s2.played += 1
    s.points_for += m.points_home
    s.points_against += m.points_away
    s2.points_for += m.points_away
    s2.points_against += m.points_home
    if (m.points_home > m.points_away) { s.won += 1; s2.lost += 1 }
    else if (m.points_home < m.points_away) { s2.won += 1; s.lost += 1 }
    else { s.drawn += 1; s2.drawn += 1 }
  }
  for (const id in stats) {
    stats[id].saldo = stats[id].points_for - stats[id].points_against
    stats[id].total_points = stats[id].points_for // punten voor = klassementspunten
  }
  const list = Object.values(stats).sort((a, b) => b.total_points - a.total_points || b.saldo - a.saldo || b.won - a.won)
  return list
}

// ---------------- Player stats ----------------
async function computePlayerStats(db) {
  const players = (await db.collection('players').find({}).toArray()).map(stripId)
  const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const matches = (await db.collection('matches').find({ status: { $in: ['confirmed', 'submitted'] } }).toArray()).map(stripId)

  const stats = {}
  for (const p of players) {
    stats[p.id] = {
      player_id: p.id,
      name: p.name,
      team_id: p.team_id,
      team_name: teamMap[p.team_id] || '',
      played: 0, won: 0, lost: 0,
      enkel_played: 0, enkel_won: 0,
      dubbel_played: 0, dubbel_won: 0,
      points: 0,
    }
  }
  for (const m of matches) {
    if (!m.games) continue
    for (const g of m.games) {
      const pts = pointsForFrames(g.home_frames, g.away_frames)
      const homeWon = pts.home > pts.away
      const awayWon = pts.away > pts.home
      const homeIds = g.home_players || []
      const awayIds = g.away_players || []
      for (const pid of homeIds) {
        const s = stats[pid]; if (!s) continue
        s.played += 1
        s.points += pts.home
        if (homeWon) s.won += 1; else if (awayWon) s.lost += 1
        if (g.type === 'enkel') { s.enkel_played += 1; if (homeWon) s.enkel_won += 1 }
        else { s.dubbel_played += 1; if (homeWon) s.dubbel_won += 1 }
      }
      for (const pid of awayIds) {
        const s = stats[pid]; if (!s) continue
        s.played += 1
        s.points += pts.away
        if (awayWon) s.won += 1; else if (homeWon) s.lost += 1
        if (g.type === 'enkel') { s.enkel_played += 1; if (awayWon) s.enkel_won += 1 }
        else { s.dubbel_played += 1; if (awayWon) s.dubbel_won += 1 }
      }
    }
  }
  const list = Object.values(stats).map(s => ({
    ...s,
    win_pct: s.played ? Math.round((s.won / s.played) * 100) : 0,
  })).sort((a, b) => b.points - a.points || b.won - a.won)
  return list
}

// ---------------- Router ----------------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()
    await ensureSeed(db)

    if (route === '/root' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Pool Competitie API' }))
    }

    // ---- Teams ----
    if (route === '/teams' && method === 'GET') {
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId).map(t => ({ id: t.id, name: t.name }))
      return handleCORS(NextResponse.json(teams))
    }

    if (route.startsWith('/teams/') && method === 'GET') {
      const id = path[1]
      const team = stripId(await db.collection('teams').findOne({ id }))
      if (!team) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const players = (await db.collection('players').find({ team_id: id }).toArray()).map(stripId)
      // hide code from public
      const { code, ...pub } = team
      return handleCORS(NextResponse.json({ ...pub, players }))
    }

    // ---- Players ----
    if (route === '/players' && method === 'GET') {
      const stats = await computePlayerStats(db)
      return handleCORS(NextResponse.json(stats))
    }

    // ---- Standings ----
    if (route === '/standings' && method === 'GET') {
      const st = await computeStandings(db)
      return handleCORS(NextResponse.json(st))
    }

    // ---- Matches ----
    if (route === '/matches' && method === 'GET') {
      const matches = (await db.collection('matches').find({}).sort({ week: 1, date: 1 }).toArray()).map(stripId)
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      const enriched = matches.map(m => ({
        ...m,
        home_team_name: tmap[m.home_team_id],
        away_team_name: tmap[m.away_team_id],
      }))
      return handleCORS(NextResponse.json(enriched))
    }

    if (route.startsWith('/matches/') && method === 'GET') {
      const id = path[1]
      const m = stripId(await db.collection('matches').findOne({ id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const home = stripId(await db.collection('teams').findOne({ id: m.home_team_id }))
      const away = stripId(await db.collection('teams').findOne({ id: m.away_team_id }))
      const homePlayers = (await db.collection('players').find({ team_id: m.home_team_id }).toArray()).map(stripId)
      const awayPlayers = (await db.collection('players').find({ team_id: m.away_team_id }).toArray()).map(stripId)
      return handleCORS(NextResponse.json({
        ...m,
        home_team_name: home?.name,
        away_team_name: away?.name,
        home_players: homePlayers,
        away_players: awayPlayers,
      }))
    }

    // Submit match result (team portal)
    if (route.startsWith('/matches/') && path.length === 3 && path[2] === 'submit' && method === 'POST') {
      const id = path[1]
      const body = await request.json()
      const { team_code, games, remarks } = body
      const m = stripId(await db.collection('matches').findOne({ id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'match not found' }, { status: 404 }))
      // Verify team_code belongs to home or away team
      const homeTeam = stripId(await db.collection('teams').findOne({ id: m.home_team_id }))
      const awayTeam = stripId(await db.collection('teams').findOne({ id: m.away_team_id }))
      if (!team_code || (team_code !== homeTeam?.code && team_code !== awayTeam?.code)) {
        return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 403 }))
      }
      const totals = computeMatchTotals(games)
      await db.collection('matches').updateOne(
        { id },
        {
          $set: {
            games,
            points_home: totals.home,
            points_away: totals.away,
            status: 'confirmed', // Phase 1: auto-confirm; Phase 2: 'submitted' + await confirmation
            remarks: remarks || '',
            submitted_by: team_code === homeTeam?.code ? 'home' : 'away',
            submitted_at: new Date().toISOString(),
          },
        }
      )
      await db.collection('audit_logs').insertOne({
        id: uuidv4(),
        ts: new Date().toISOString(),
        actor: team_code === homeTeam?.code ? homeTeam.name : awayTeam.name,
        action: 'match_submitted',
        entity: 'match',
        entity_id: id,
        details: { points_home: totals.home, points_away: totals.away },
      })
      return handleCORS(NextResponse.json({ ok: true, points_home: totals.home, points_away: totals.away }))
    }

    // ---- Auth team ----
    if (route === '/auth/team' && method === 'POST') {
      const body = await request.json()
      const code = (body.code || '').trim().toUpperCase()
      if (!code) return handleCORS(NextResponse.json({ error: 'code required' }, { status: 400 }))
      const team = stripId(await db.collection('teams').findOne({ code }))
      if (!team) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 401 }))
      const players = (await db.collection('players').find({ team_id: team.id }).toArray()).map(stripId)
      const matches = (await db.collection('matches').find({
        $or: [{ home_team_id: team.id }, { away_team_id: team.id }],
      }).sort({ week: 1 }).toArray()).map(stripId)
      const allTeams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(allTeams.map(t => [t.id, t.name]))
      const enriched = matches.map(m => ({
        ...m,
        home_team_name: tmap[m.home_team_id],
        away_team_name: tmap[m.away_team_id],
      }))
      return handleCORS(NextResponse.json({
        team: { id: team.id, name: team.name, code: team.code },
        players,
        matches: enriched,
      }))
    }

    // ---- Calendar ----
    if (route === '/calendar' && method === 'GET') {
      const matches = (await db.collection('matches').find({}).sort({ week: 1, date: 1 }).toArray()).map(stripId)
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      const enriched = matches.map(m => ({
        ...m,
        home_team_name: tmap[m.home_team_id],
        away_team_name: tmap[m.away_team_id],
      }))
      return handleCORS(NextResponse.json(enriched))
    }

    // ---- Reset (dev) ----
    if (route === '/reset' && method === 'POST') {
      await db.collection('teams').deleteMany({})
      await db.collection('players').deleteMany({})
      await db.collection('matches').deleteMany({})
      await db.collection('seasons').deleteMany({})
      await db.collection('settings').deleteMany({})
      await db.collection('audit_logs').deleteMany({})
      await ensureSeed(db)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error', detail: String(error?.message || error) }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
