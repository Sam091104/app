import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

let client, db
async function connectToMongo() {
  if (!client) { client = new MongoClient(process.env.MONGO_URL); await client.connect(); db = client.db(process.env.DB_NAME) }
  return db
}
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}
export async function OPTIONS() { return handleCORS(new NextResponse(null, { status: 200 })) }
const stripId = (d) => { if (!d) return d; const { _id, ...r } = d; return r }

// -------- Scoring --------
async function getScoring(db) {
  const s = await db.collection('settings').findOne({ key: 'scoring' })
  return s?.rules || { frames_2_0: [3, 0], frames_2_1: [2, 1] }
}
function pointsForFrames(hf, af, rules) {
  const h = Number(hf) || 0, a = Number(af) || 0
  const [win2_0, lose2_0] = rules.frames_2_0 || [3, 0]
  const [win2_1, lose2_1] = rules.frames_2_1 || [2, 1]
  if (h === 2 && a === 0) return { home: win2_0, away: lose2_0 }
  if (h === 0 && a === 2) return { home: lose2_0, away: win2_0 }
  if (h === 2 && a === 1) return { home: win2_1, away: lose2_1 }
  if (h === 1 && a === 2) return { home: lose2_1, away: win2_1 }
  return { home: 0, away: 0 }
}
function computeMatchTotals(games, rules) {
  let home = 0, away = 0
  for (const g of games || []) { const p = pointsForFrames(g.home_frames, g.away_frames, rules); home += p.home; away += p.away }
  return { home, away }
}

// -------- Seed --------
const SEED_TEAMS = [
  { name: 'Den Telstar', code: 'TEL-4928', players: ['Bob Dumont','Dirk Willems','Dave Hemmerechts','Feline Van Barel','Johan Thijs','Dirk Jacobs Pluto','Dirk Myncke','Peter Vertongen','Johannes Oksuz','Jesper Slegers','Rene Mattijns'] },
  { name: 'De Canada', code: 'CAN-7281', players: ['Marc De Vos','Kim Peeters','Tom Janssens','Sofie Claes','Bart Vermeulen','Els De Smet','Peter Aerts','Ann Beckers','Nick Wouters','Karel Maes','Lien Verhoeven'] },
  { name: 'Arena', code: 'ARE-1954', players: ['Paulo Costa','Monique Devos','Sandy Willems','Marc Peeters','Werner Smets','Christiane De Backer','Zelko Ivanovic','Ivan Petrov','Luc Janssen','Ria Vermeersch','Danny Coppens'] },
  { name: 'De Sportwereld', code: 'SPO-3672', players: ['Wim De Coster','Kathy Vermeire','Rudy Van den Berg','Nadine Segers','Guy Verhaegen','Linda De Cock','Franky Boonen','Martine Lauwers','Eddy Van Hoof','Chantal Verbist','Steve Michielsen'] },
  { name: 'Silver Balls', code: 'SIL-8340', players: ['Ronny Goossens','Vera Lambrechts','Patrick De Rijck','Ingrid Vercammen','Jos Timmermans','Greta Van Camp','Kris Baeten','Nele Hendrickx','Herman Van Gucht','Sabine Peeters','Freddy Devos'] },
]
function generateCalendar(teams, seasonId) {
  const list = teams.slice(); if (list.length % 2 === 1) list.push({ id: null })
  const n = list.length; const rounds = []; const arr = list.slice()
  for (let r = 0; r < n - 1; r++) {
    const fixtures = []
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; if (a.id && b.id) fixtures.push({ home: a.id, away: b.id }) }
    rounds.push(fixtures)
    const fixed = arr[0]; const rest = arr.slice(1); rest.unshift(rest.pop()); arr.splice(0, arr.length, fixed, ...rest)
  }
  const secondHalf = rounds.map(rf => rf.map(f => ({ home: f.away, away: f.home })))
  const allRounds = [...rounds, ...secondHalf]
  const matches = []; const start = new Date('2025-09-10T20:00:00')
  allRounds.forEach((fixtures, wi) => {
    const date = new Date(start); date.setDate(start.getDate() + wi * 7)
    for (const f of fixtures) matches.push({ id: uuidv4(), season_id: seasonId, week: wi + 1, date: date.toISOString(), home_team_id: f.home, away_team_id: f.away, status: 'scheduled', games: null, points_home: 0, points_away: 0, submitted_by: null, submitted_at: null, confirmed_at: null })
  })
  return matches
}
async function ensureSeed(db) {
  const c = await db.collection('teams').countDocuments()
  if (c > 0) {
    // ensure admin code exists
    const admin = await db.collection('settings').findOne({ key: 'admin' })
    if (!admin) await db.collection('settings').insertOne({ id: uuidv4(), key: 'admin', code: 'ADMIN-9999' })
    return { seeded: false }
  }
  const seasonId = uuidv4()
  await db.collection('seasons').insertOne({ id: seasonId, name: '2025-2026', active: true, created_at: new Date().toISOString() })
  const teams = SEED_TEAMS.map(t => ({ id: uuidv4(), name: t.name, code: t.code, season_id: seasonId, created_at: new Date().toISOString() }))
  await db.collection('teams').insertMany(teams)
  const players = []
  SEED_TEAMS.forEach((t, i) => { for (const n of t.players) players.push({ id: uuidv4(), team_id: teams[i].id, name: n, active: true, locked: true, joined_at: new Date().toISOString(), can_play_from: new Date().toISOString() }) })
  await db.collection('players').insertMany(players)
  const matches = generateCalendar(teams, seasonId)
  if (matches.length) await db.collection('matches').insertMany(matches)
  await db.collection('settings').insertOne({ id: uuidv4(), key: 'scoring', rules: { frames_2_0: [3, 0], frames_2_1: [2, 1], games_per_match: 10, enkel_games: 8, dubbel_games: 2 } })
  await db.collection('settings').insertOne({ id: uuidv4(), key: 'admin', code: 'ADMIN-9999' })
  return { seeded: true }
}

// -------- Audit --------
async function logAudit(db, entry) {
  await db.collection('audit_logs').insertOne({ id: uuidv4(), ts: new Date().toISOString(), ...entry })
}

// -------- Standings & players --------
async function computeStandings(db) {
  const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
  const matches = (await db.collection('matches').find({ status: { $in: ['confirmed', 'admin_approved'] } }).toArray()).map(stripId)
  const stats = {}
  for (const t of teams) stats[t.id] = { team_id: t.id, team_name: t.name, played: 0, won: 0, lost: 0, drawn: 0, points_for: 0, points_against: 0, frames_won: 0, frames_lost: 0, framebalans: 0, saldo: 0, comp_points: 0, total_points: 0 }
  for (const m of matches) {
    if (!m.games) continue
    const s = stats[m.home_team_id], s2 = stats[m.away_team_id]; if (!s || !s2) continue
    s.played += 1; s2.played += 1
    s.points_for += m.points_home; s.points_against += m.points_away
    s2.points_for += m.points_away; s2.points_against += m.points_home
    for (const g of m.games) {
      const hf = Number(g.home_frames) || 0, af = Number(g.away_frames) || 0
      s.frames_won += hf; s.frames_lost += af
      s2.frames_won += af; s2.frames_lost += hf
    }
    if (m.points_home > m.points_away) { s.won += 1; s.comp_points += 3; s2.lost += 1 }
    else if (m.points_home < m.points_away) { s2.won += 1; s2.comp_points += 3; s.lost += 1 }
    else { s.drawn += 1; s2.drawn += 1; s.comp_points += 1; s2.comp_points += 1 }
  }
  for (const id in stats) { stats[id].framebalans = stats[id].frames_won - stats[id].frames_lost; stats[id].saldo = stats[id].points_for - stats[id].points_against; stats[id].total_points = stats[id].comp_points }
  return Object.values(stats).sort((a, b) => b.comp_points - a.comp_points || b.framebalans - a.framebalans || b.frames_won - a.frames_won || a.team_name.localeCompare(b.team_name))
}
async function computePlayerStats(db) {
  const players = (await db.collection('players').find({}).toArray()).map(stripId)
  const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
  const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
  const rules = await getScoring(db)
  const matches = (await db.collection('matches').find({ status: { $in: ['confirmed', 'admin_approved'] } }).toArray()).map(stripId)
  const stats = {}
  for (const p of players) stats[p.id] = { player_id: p.id, name: p.name, team_id: p.team_id, team_name: tmap[p.team_id] || '', is_placeholder: !!p.is_placeholder, can_play_from: p.can_play_from || null, joined_at: p.joined_at || null, played: 0, won: 0, lost: 0, enkel_played: 0, enkel_won: 0, enkel_frames_won: 0, enkel_frames_lost: 0, enkel_points: 0, dubbel_played: 0, dubbel_won: 0, dubbel_frames_won: 0, dubbel_frames_lost: 0, dubbel_points: 0, points: 0 }
  for (const m of matches) {
    if (!m.games) continue
    for (const g of m.games) {
      const pts = pointsForFrames(g.home_frames, g.away_frames, rules)
      const homeWon = pts.home > pts.away, awayWon = pts.away > pts.home
      const hf = Number(g.home_frames) || 0, af = Number(g.away_frames) || 0
      for (const pid of g.home_players || []) { const s = stats[pid]; if (!s) continue; s.played += 1; s.points += pts.home; if (homeWon) s.won += 1; else if (awayWon) s.lost += 1; if (g.type === 'enkel') { s.enkel_played += 1; s.enkel_points += pts.home; s.enkel_frames_won += hf; s.enkel_frames_lost += af; if (homeWon) s.enkel_won += 1 } else { s.dubbel_played += 1; s.dubbel_points += pts.home; s.dubbel_frames_won += hf; s.dubbel_frames_lost += af; if (homeWon) s.dubbel_won += 1 } }
      for (const pid of g.away_players || []) { const s = stats[pid]; if (!s) continue; s.played += 1; s.points += pts.away; if (awayWon) s.won += 1; else if (homeWon) s.lost += 1; if (g.type === 'enkel') { s.enkel_played += 1; s.enkel_points += pts.away; s.enkel_frames_won += af; s.enkel_frames_lost += hf; if (awayWon) s.enkel_won += 1 } else { s.dubbel_played += 1; s.dubbel_points += pts.away; s.dubbel_frames_won += af; s.dubbel_frames_lost += hf; if (awayWon) s.dubbel_won += 1 } }
    }
  }
  return Object.values(stats).filter(s => !s.is_placeholder).map(s => { const tfw = s.enkel_frames_won + s.dubbel_frames_won; const tfl = s.enkel_frames_lost + s.dubbel_frames_lost; return { ...s, total_frames_won: tfw, total_frames_lost: tfl, framebalans: tfw - tfl, win_pct: s.played ? Math.round((s.won / s.played) * 100) : 0 } }).sort((a, b) => b.points - a.points || b.total_frames_won - a.total_frames_won || b.framebalans - a.framebalans || a.name.localeCompare(b.name))
}

// -------- Auth helpers --------
async function verifyAdmin(db, code) {
  const s = await db.collection('settings').findOne({ key: 'admin' })
  return s && s.code === (code || '').trim().toUpperCase()
}
async function verifyTeam(db, code) {
  return stripId(await db.collection('teams').findOne({ code: (code || '').trim().toUpperCase() }))
}

// -------- Router --------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  try {
    const db = await connectToMongo()
    await ensureSeed(db)

    if (route === '/root' && method === 'GET') return handleCORS(NextResponse.json({ message: 'Pool API v2' }))

    // ---- Public ----
    if (route === '/teams' && method === 'GET') {
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId).map(t => ({ id: t.id, name: t.name }))
      return handleCORS(NextResponse.json(teams))
    }
    if (route.startsWith('/teams/') && path.length === 2 && method === 'GET') {
      const id = path[1]
      const team = stripId(await db.collection('teams').findOne({ id }))
      if (!team) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const players = (await db.collection('players').find({ team_id: id }).toArray()).map(stripId)
      const { code, ...pub } = team
      return handleCORS(NextResponse.json({ ...pub, players }))
    }
    if (route === '/players' && method === 'GET') return handleCORS(NextResponse.json(await computePlayerStats(db)))
    if (route === '/standings' && method === 'GET') return handleCORS(NextResponse.json(await computeStandings(db)))

    if (route === '/matches' && method === 'GET') {
      const matches = (await db.collection('matches').find({}).sort({ week: 1, date: 1 }).toArray()).map(stripId)
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      return handleCORS(NextResponse.json(matches.map(m => ({ ...m, home_team_name: tmap[m.home_team_id], away_team_name: tmap[m.away_team_id] }))))
    }
    if (route.startsWith('/matches/') && path.length === 2 && method === 'GET') {
      const id = path[1]
      const m = stripId(await db.collection('matches').findOne({ id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const home = stripId(await db.collection('teams').findOne({ id: m.home_team_id }))
      const away = stripId(await db.collection('teams').findOne({ id: m.away_team_id }))
      const hp = (await db.collection('players').find({ team_id: m.home_team_id }).toArray()).map(stripId)
      const ap = (await db.collection('players').find({ team_id: m.away_team_id }).toArray()).map(stripId)
      return handleCORS(NextResponse.json({ ...m, home_team_name: home?.name, away_team_name: away?.name, home_players: hp, away_players: ap }))
    }

    // Submit match (home OR away submits initial result -> status submitted, awaiting other team)
    if (route.startsWith('/matches/') && path.length === 3 && path[2] === 'submit' && method === 'POST') {
      const id = path[1]
      const body = await request.json()
      const m = stripId(await db.collection('matches').findOne({ id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'match not found' }, { status: 404 }))
      const home = stripId(await db.collection('teams').findOne({ id: m.home_team_id }))
      const away = stripId(await db.collection('teams').findOne({ id: m.away_team_id }))
      const code = (body.team_code || '').trim().toUpperCase()
      if (code !== home?.code && code !== away?.code) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 403 }))
      if (m.status !== 'scheduled') return handleCORS(NextResponse.json({ error: 'already submitted' }, { status: 400 }))
      const rules = await getScoring(db)
      const totals = computeMatchTotals(body.games, rules)
      const submittedBy = code === home?.code ? 'home' : 'away'
      await db.collection('matches').updateOne({ id }, { $set: { games: body.games, points_home: totals.home, points_away: totals.away, status: 'submitted', remarks: body.remarks || '', submitted_by: submittedBy, submitted_at: new Date().toISOString() } })
      await logAudit(db, { actor: submittedBy === 'home' ? home.name : away.name, action: 'match_submitted', entity: 'match', entity_id: id, old_value: null, new_value: { points_home: totals.home, points_away: totals.away, submitted_by: submittedBy } })
      return handleCORS(NextResponse.json({ ok: true, status: 'submitted', points_home: totals.home, points_away: totals.away }))
    }

    // Confirm or dispute (other team)
    if (route.startsWith('/matches/') && path.length === 3 && path[2] === 'confirm' && method === 'POST') {
      const id = path[1]
      const body = await request.json()
      const m = stripId(await db.collection('matches').findOne({ id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'match not found' }, { status: 404 }))
      const home = stripId(await db.collection('teams').findOne({ id: m.home_team_id }))
      const away = stripId(await db.collection('teams').findOne({ id: m.away_team_id }))
      const code = (body.team_code || '').trim().toUpperCase()
      if (code !== home?.code && code !== away?.code) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 403 }))
      const confirmer = code === home?.code ? 'home' : 'away'
      if (confirmer === m.submitted_by) return handleCORS(NextResponse.json({ error: 'must be confirmed by the other team' }, { status: 400 }))
      if (m.status !== 'submitted') return handleCORS(NextResponse.json({ error: 'not in submitted state' }, { status: 400 }))
      const agree = !!body.agree
      const newStatus = agree ? 'confirmed' : 'disputed'
      await db.collection('matches').updateOne({ id }, { $set: { status: newStatus, confirmed_at: agree ? new Date().toISOString() : null, dispute_reason: agree ? null : (body.reason || 'Geen reden opgegeven') } })
      await logAudit(db, { actor: confirmer === 'home' ? home.name : away.name, action: agree ? 'match_confirmed' : 'match_disputed', entity: 'match', entity_id: id, old_value: { status: 'submitted' }, new_value: { status: newStatus, reason: body.reason || null } })
      return handleCORS(NextResponse.json({ ok: true, status: newStatus }))
    }

    // ---- Team auth ----
    if (route === '/auth/team' && method === 'POST') {
      const body = await request.json()
      const team = await verifyTeam(db, body.code)
      if (!team) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 401 }))
      const players = (await db.collection('players').find({ team_id: team.id }).toArray()).map(stripId)
      const matches = (await db.collection('matches').find({ $or: [{ home_team_id: team.id }, { away_team_id: team.id }] }).sort({ week: 1 }).toArray()).map(stripId)
      const allTeams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(allTeams.map(t => [t.id, t.name]))
      const enriched = matches.map(m => ({ ...m, home_team_name: tmap[m.home_team_id], away_team_name: tmap[m.away_team_id] }))
      const pending = (await db.collection('player_change_requests').find({ team_id: team.id }).sort({ ts: -1 }).toArray()).map(stripId)
      const myMatchIds = matches.map(m => m.id)
      const allDateReqs = (await db.collection('date_change_requests').find({ match_id: { $in: myMatchIds } }).sort({ ts: -1 }).toArray()).map(stripId)
      const ourDateReqs = allDateReqs.filter(r => r.team_id === team.id)
      const incomingDateReqs = allDateReqs.filter(r => r.team_id !== team.id && r.status === 'pending').map(r => { const m = enriched.find(x => x.id === r.match_id); return { ...r, match_info: m ? `${m.home_team_name} vs ${m.away_team_name}` : '' } })
      return handleCORS(NextResponse.json({ team: { id: team.id, name: team.name, code: team.code }, players, matches: enriched, change_requests: pending, date_change_requests: ourDateReqs, incoming_date_requests: incomingDateReqs }))
    }

    // Player change request (team)
    // Player change request (team)
    if (route === '/date-change-requests' && method === 'POST') {
      const body = await request.json()
      const team = await verifyTeam(db, body.team_code)
      if (!team) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 403 }))
      const m = stripId(await db.collection('matches').findOne({ id: body.match_id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'match not found' }, { status: 404 }))
      if (m.home_team_id !== team.id && m.away_team_id !== team.id) return handleCORS(NextResponse.json({ error: 'not your match' }, { status: 403 }))
      if (m.status !== 'scheduled') return handleCORS(NextResponse.json({ error: 'match is not scheduled' }, { status: 400 }))
      const req = { id: uuidv4(), ts: new Date().toISOString(), team_id: team.id, team_name: team.name, match_id: m.id, old_date: m.date, new_date: body.new_date, reason: body.reason || '', status: 'pending', decided_by: null, decided_at: null }
      await db.collection('date_change_requests').insertOne(req)
      await logAudit(db, { actor: team.name, action: 'date_change_requested', entity: 'match', entity_id: m.id, old_value: { date: m.date }, new_value: { date: body.new_date, reason: body.reason } })
      return handleCORS(NextResponse.json({ ok: true, request: req }))
    }

    // Team responds to opponent's date change request
    if (route.startsWith('/date-change-requests/') && path.length === 3 && path[2] === 'respond' && method === 'POST') {
      const body = await request.json()
      const id = path[1]
      const team = await verifyTeam(db, body.team_code)
      if (!team) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 403 }))
      const req = stripId(await db.collection('date_change_requests').findOne({ id }))
      if (!req) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      if (req.status !== 'pending') return handleCORS(NextResponse.json({ error: 'not pending' }, { status: 400 }))
      if (req.team_id === team.id) return handleCORS(NextResponse.json({ error: 'cannot approve own request' }, { status: 403 }))
      const m = stripId(await db.collection('matches').findOne({ id: req.match_id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'match not found' }, { status: 404 }))
      const isOpponent = (team.id === m.home_team_id || team.id === m.away_team_id) && team.id !== req.team_id
      if (!isOpponent) return handleCORS(NextResponse.json({ error: 'not the opposing team' }, { status: 403 }))
      const agree = !!body.agree
      if (agree) {
        await db.collection('matches').updateOne({ id: m.id }, { $set: { date: req.new_date } })
        await db.collection('date_change_requests').updateOne({ id }, { $set: { status: 'approved', decided_at: new Date().toISOString(), decided_by: team.name } })
        await logAudit(db, { actor: team.name, action: 'date_change_approved_by_opponent', entity: 'match', entity_id: m.id, old_value: { date: req.old_date }, new_value: { date: req.new_date } })
      } else {
        await db.collection('date_change_requests').updateOne({ id }, { $set: { status: 'rejected', decided_at: new Date().toISOString(), decided_by: team.name, reject_reason: body.reason || '' } })
        await logAudit(db, { actor: team.name, action: 'date_change_rejected_by_opponent', entity: 'match', entity_id: m.id, old_value: { date: req.old_date }, new_value: { date: req.new_date, reject_reason: body.reason } })
      }
      return handleCORS(NextResponse.json({ ok: true, status: agree ? 'approved' : 'rejected' }))
    }

    if (route === '/player-change-requests' && method === 'POST') {
      const body = await request.json()
      const team = await verifyTeam(db, body.team_code)
      if (!team) return handleCORS(NextResponse.json({ error: 'invalid code' }, { status: 403 }))
      const player = stripId(await db.collection('players').findOne({ id: body.player_id, team_id: team.id }))
      if (!player) return handleCORS(NextResponse.json({ error: 'player not found' }, { status: 404 }))
      const req = { id: uuidv4(), ts: new Date().toISOString(), team_id: team.id, team_name: team.name, player_id: player.id, old_name: player.name, new_name: body.new_name, reason: body.reason || '', status: 'pending', decided_by: null, decided_at: null }
      await db.collection('player_change_requests').insertOne(req)
      await logAudit(db, { actor: team.name, action: 'change_request_created', entity: 'player', entity_id: player.id, old_value: { name: player.name }, new_value: { name: body.new_name, reason: body.reason } })
      return handleCORS(NextResponse.json({ ok: true, request: req }))
    }

    // ---- Admin ----
    if (route === '/auth/admin' && method === 'POST') {
      const body = await request.json()
      const ok = await verifyAdmin(db, body.code)
      if (!ok) return handleCORS(NextResponse.json({ error: 'invalid admin code' }, { status: 401 }))
      return handleCORS(NextResponse.json({ ok: true, token: body.code.trim().toUpperCase() }))
    }

    // Admin middleware: check header
    const adminCode = request.headers.get('x-admin-code')
    const isAdmin = adminCode ? await verifyAdmin(db, adminCode) : false

    if (route === '/admin/dashboard' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const submitted = await db.collection('matches').countDocuments({ status: 'submitted' })
      const disputed = await db.collection('matches').countDocuments({ status: 'disputed' })
      const pendingReqs = await db.collection('player_change_requests').countDocuments({ status: 'pending' })
      const pendingDates = await db.collection('date_change_requests').countDocuments({ status: 'pending' })
      const recentLogs = (await db.collection('audit_logs').find({}).sort({ ts: -1 }).limit(10).toArray()).map(stripId)
      return handleCORS(NextResponse.json({ submitted, disputed, pending_change_requests: pendingReqs, pending_date_requests: pendingDates, recent_logs: recentLogs }))
    }

    if (route === '/admin/date-change-requests' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const all = (await db.collection('date_change_requests').find({}).sort({ ts: -1 }).toArray()).map(stripId)
      return handleCORS(NextResponse.json(all))
    }

    if (route.startsWith('/admin/date-change-requests/') && path.length === 4 && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]; const action = path[3]
      const req = stripId(await db.collection('date_change_requests').findOne({ id }))
      if (!req) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      if (action === 'approve') {
        await db.collection('matches').updateOne({ id: req.match_id }, { $set: { date: req.new_date } })
        await db.collection('date_change_requests').updateOne({ id }, { $set: { status: 'approved', decided_at: new Date().toISOString(), decided_by: 'admin' } })
        await logAudit(db, { actor: 'admin', action: 'date_change_approved', entity: 'match', entity_id: req.match_id, old_value: { date: req.old_date }, new_value: { date: req.new_date } })
      } else if (action === 'reject') {
        await db.collection('date_change_requests').updateOne({ id }, { $set: { status: 'rejected', decided_at: new Date().toISOString(), decided_by: 'admin' } })
        await logAudit(db, { actor: 'admin', action: 'date_change_rejected', entity: 'match', entity_id: req.match_id, old_value: { date: req.old_date }, new_value: { date: req.new_date } })
      } else return handleCORS(NextResponse.json({ error: 'invalid action' }, { status: 400 }))
      return handleCORS(NextResponse.json({ ok: true }))
    }

    if (route === '/admin/change-requests' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const all = (await db.collection('player_change_requests').find({}).sort({ ts: -1 }).toArray()).map(stripId)
      return handleCORS(NextResponse.json(all))
    }

    if (route.startsWith('/admin/change-requests/') && path.length === 4 && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]; const action = path[3]
      const req = stripId(await db.collection('player_change_requests').findOne({ id }))
      if (!req) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      if (action === 'approve') {
        await db.collection('players').updateOne({ id: req.player_id }, { $set: { name: req.new_name } })
        await db.collection('player_change_requests').updateOne({ id }, { $set: { status: 'approved', decided_at: new Date().toISOString(), decided_by: 'admin' } })
        await logAudit(db, { actor: 'admin', action: 'change_request_approved', entity: 'player', entity_id: req.player_id, old_value: { name: req.old_name }, new_value: { name: req.new_name } })
      } else if (action === 'reject') {
        await db.collection('player_change_requests').updateOne({ id }, { $set: { status: 'rejected', decided_at: new Date().toISOString(), decided_by: 'admin' } })
        await logAudit(db, { actor: 'admin', action: 'change_request_rejected', entity: 'player', entity_id: req.player_id, old_value: { name: req.old_name }, new_value: { name: req.new_name } })
      } else return handleCORS(NextResponse.json({ error: 'invalid action' }, { status: 400 }))
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // Admin match override (approve disputed, edit result)
    if (route.startsWith('/admin/matches/') && path.length === 4 && path[3] === 'approve' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]; const body = await request.json()
      const m = stripId(await db.collection('matches').findOne({ id }))
      if (!m) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const games = body.games || m.games
      const rules = await getScoring(db)
      const totals = computeMatchTotals(games, rules)
      await db.collection('matches').updateOne({ id }, { $set: { games, points_home: totals.home, points_away: totals.away, status: 'admin_approved', confirmed_at: new Date().toISOString() } })
      await logAudit(db, { actor: 'admin', action: 'match_admin_approved', entity: 'match', entity_id: id, old_value: { status: m.status, points_home: m.points_home, points_away: m.points_away }, new_value: { status: 'admin_approved', points_home: totals.home, points_away: totals.away } })
      return handleCORS(NextResponse.json({ ok: true, points_home: totals.home, points_away: totals.away }))
    }

    if (route === '/admin/teams' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      const season = stripId(await db.collection('seasons').findOne({ active: true }))
      const team = { id: uuidv4(), name: body.name, code: (body.code || `${body.name.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase(), season_id: season?.id, created_at: new Date().toISOString() }
      await db.collection('teams').insertOne(team)
      await logAudit(db, { actor: 'admin', action: 'team_created', entity: 'team', entity_id: team.id, old_value: null, new_value: { name: team.name, code: team.code } })
      return handleCORS(NextResponse.json(stripId(team)))
    }
    if (route.startsWith('/admin/teams/') && path.length === 3 && method === 'DELETE') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]
      const team = stripId(await db.collection('teams').findOne({ id }))
      await db.collection('teams').deleteOne({ id })
      await db.collection('players').deleteMany({ team_id: id })
      await logAudit(db, { actor: 'admin', action: 'team_deleted', entity: 'team', entity_id: id, old_value: { name: team?.name }, new_value: null })
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route.startsWith('/admin/teams/') && path.length === 4 && path[3] === 'reset-code' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]
      const team = stripId(await db.collection('teams').findOne({ id }))
      if (!team) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const newCode = `${team.name.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
      await db.collection('teams').updateOne({ id }, { $set: { code: newCode } })
      await logAudit(db, { actor: 'admin', action: 'team_code_reset', entity: 'team', entity_id: id, old_value: { code: team.code }, new_value: { code: newCode } })
      return handleCORS(NextResponse.json({ ok: true, code: newCode }))
    }
    if (route === '/admin/teams-full' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
      return handleCORS(NextResponse.json(teams))
    }
    if (route === '/admin/players-full' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const players = (await db.collection('players').find({}).toArray()).map(stripId)
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      return handleCORS(NextResponse.json(players.map(p => ({ player_id: p.id, name: p.name, team_id: p.team_id, team_name: tmap[p.team_id] || '', can_play_from: p.can_play_from || null, joined_at: p.joined_at || null, is_placeholder: !!p.is_placeholder, active: p.active !== false }))))
    }

    // Admin players CRUD
    if (route === '/admin/players' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      const joined = new Date()
      let canPlayFrom
      if (body.can_play_from) {
        canPlayFrom = new Date(body.can_play_from)
      } else {
        canPlayFrom = new Date(joined); canPlayFrom.setMonth(canPlayFrom.getMonth() + 2)
      }
      const p = { id: uuidv4(), team_id: body.team_id, name: body.name, active: true, locked: true, joined_at: joined.toISOString(), can_play_from: canPlayFrom.toISOString() }
      await db.collection('players').insertOne(p)
      await logAudit(db, { actor: 'admin', action: 'player_created', entity: 'player', entity_id: p.id, old_value: null, new_value: { name: p.name, team_id: p.team_id, can_play_from: canPlayFrom.toISOString() } })
      return handleCORS(NextResponse.json(stripId(p)))
    }
    if (route.startsWith('/admin/players/') && path.length === 3 && method === 'PATCH') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]; const body = await request.json()
      const old = stripId(await db.collection('players').findOne({ id }))
      await db.collection('players').updateOne({ id }, { $set: body })
      await logAudit(db, { actor: 'admin', action: 'player_updated', entity: 'player', entity_id: id, old_value: old, new_value: body })
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route.startsWith('/admin/players/') && path.length === 3 && method === 'DELETE') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]
      const old = stripId(await db.collection('players').findOne({ id }))
      await db.collection('players').deleteOne({ id })
      await logAudit(db, { actor: 'admin', action: 'player_deleted', entity: 'player', entity_id: id, old_value: old, new_value: null })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // Audit logs
    if (route === '/admin/audit-logs' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const logs = (await db.collection('audit_logs').find({}).sort({ ts: -1 }).limit(500).toArray()).map(stripId)
      return handleCORS(NextResponse.json(logs))
    }

    // Settings
    if (route === '/admin/settings' && method === 'GET') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const scoring = stripId(await db.collection('settings').findOne({ key: 'scoring' }))
      const admin = stripId(await db.collection('settings').findOne({ key: 'admin' }))
      return handleCORS(NextResponse.json({ scoring, admin }))
    }
    if (route === '/admin/settings' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      const old = await db.collection('settings').findOne({ key: 'scoring' })
      if (body.scoring) await db.collection('settings').updateOne({ key: 'scoring' }, { $set: { rules: body.scoring } })
      if (body.admin_code) await db.collection('settings').updateOne({ key: 'admin' }, { $set: { code: body.admin_code.toUpperCase() } })
      await logAudit(db, { actor: 'admin', action: 'settings_updated', entity: 'settings', entity_id: 'scoring', old_value: old?.rules, new_value: body.scoring })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // Seasons
    if (route === '/seasons' && method === 'GET') {
      const seasons = (await db.collection('seasons').find({}).sort({ created_at: -1 }).toArray()).map(stripId)
      return handleCORS(NextResponse.json(seasons))
    }
    if (route === '/admin/seasons/archive' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      const active = stripId(await db.collection('seasons').findOne({ active: true }))
      if (!active) return handleCORS(NextResponse.json({ error: 'no active season' }, { status: 400 }))
      // snapshot standings & player stats
      const standings = await computeStandings(db)
      const pstats = await computePlayerStats(db)
      await db.collection('seasons').updateOne({ id: active.id }, { $set: { active: false, archived_at: new Date().toISOString(), final_standings: standings, final_player_stats: pstats, champion: standings[0]?.team_name || null } })
      // new season
      const newSeason = { id: uuidv4(), name: body.name || 'Nieuw seizoen', active: true, created_at: new Date().toISOString() }
      await db.collection('seasons').insertOne(newSeason)
      await logAudit(db, { actor: 'admin', action: 'season_archived', entity: 'season', entity_id: active.id, old_value: { name: active.name }, new_value: { new_season: newSeason.name } })
      return handleCORS(NextResponse.json({ ok: true, archived: active.id, new_season: newSeason.id }))
    }

    // Calendar public
    if (route === '/calendar' && method === 'GET') {
      const matches = (await db.collection('matches').find({}).sort({ week: 1, date: 1 }).toArray()).map(stripId)
      const teams = (await db.collection('teams').find({}).toArray()).map(stripId)
      const tmap = Object.fromEntries(teams.map(t => [t.id, t.name]))
      return handleCORS(NextResponse.json(matches.map(m => ({ ...m, home_team_name: tmap[m.home_team_id], away_team_name: tmap[m.away_team_id] }))))
    }

    // Import historic season from Excel
    if (route === '/admin/setup-2026-2027' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const normalize = (s) => (s || '').toLowerCase().replace(/[_\s]+/g, ' ').trim()
      const TEAM_NAMES = ['Den Telstar', 'Canada', 'Arena', 'De Sportwereld', 'Silver Balls', 'De Kroon']
      const TEAM_CODES = { 'Den Telstar': 'TEL-4928', 'Canada': 'CAN-7281', 'Arena': 'ARE-1954', 'De Sportwereld': 'SPO-3672', 'Silver Balls': 'SIL-8340', 'De Kroon': 'KRO-6135' }

      // Archive current active season if not already 2026-2027
      const active = stripId(await db.collection('seasons').findOne({ active: true }))
      if (active && active.name !== '2026-2027') {
        const standings = await computeStandings(db)
        const pstats = await computePlayerStats(db)
        await db.collection('seasons').updateOne({ id: active.id }, { $set: { active: false, archived_at: new Date().toISOString(), final_standings: standings, final_player_stats: pstats, champion: standings[0]?.team_name || null } })
      }
      // Ensure 2026-2027 season exists and is active
      let season = stripId(await db.collection('seasons').findOne({ name: '2026-2027' }))
      if (!season) { season = { id: uuidv4(), name: '2026-2027', active: true, created_at: new Date().toISOString() }; await db.collection('seasons').insertOne(season) }
      else await db.collection('seasons').updateOne({ id: season.id }, { $set: { active: true } })

      // Case-insensitive team dedup + rename to canonical (behandel "De Canada" en "Canada" als zelfde)
      const allExisting = (await db.collection('teams').find({}).toArray()).map(stripId)
      const teamByNorm = {}
      for (const t of allExisting) { const n = normalize(t.name); const key = (n === 'de canada') ? 'canada' : n; if (!teamByNorm[key]) teamByNorm[key] = t }
      const teamIdByName = {}
      for (const name of TEAM_NAMES) {
        const key = normalize(name)
        const existing = teamByNorm[key]
        if (existing) {
          const updates = {}
          if (existing.name !== name) updates.name = name
          if (existing.code !== TEAM_CODES[name]) updates.code = TEAM_CODES[name]
          if (Object.keys(updates).length) await db.collection('teams').updateOne({ id: existing.id }, { $set: updates })
          teamIdByName[name] = existing.id
        }
        else { const nt = { id: uuidv4(), name, code: TEAM_CODES[name], season_id: season.id, created_at: new Date().toISOString() }; await db.collection('teams').insertOne(nt); teamIdByName[name] = nt.id }
      }

      // Ensure Den Telstar players (dedupe case-insensitive)
      const TELSTAR = ['Aron Pauwels','Bob Dumont','Danny Breeur','Dave Hemmerechts','Dirk Jacobs Pluto','Dirk Myncke','Dirk Willems','Feline Van Barel','Jesper Slegers','Johan Thijs','Johannes Oksuz','Johnny Geysen','Peter Vertongen','Rene Mattijns','Rik Peeters','Sam Lambregts','Werner Verdonck']
      const telstarId = teamIdByName['Den Telstar']
      const existingP = (await db.collection('players').find({ team_id: telstarId }).toArray()).map(stripId)
      const existingNorm = new Set(existingP.map(p => normalize(p.name)))
      const now = new Date().toISOString()
      for (const name of TELSTAR) if (!existingNorm.has(normalize(name))) await db.collection('players').insertOne({ id: uuidv4(), team_id: telstarId, name, active: true, locked: true, joined_at: now, can_play_from: now })

      // Placeholder "Speler te kort" for every team
      for (const teamName of TEAM_NAMES) {
        const tid = teamIdByName[teamName]
        const ph = await db.collection('players').findOne({ team_id: tid, is_placeholder: true })
        if (!ph) await db.collection('players').insertOne({ id: uuidv4(), team_id: tid, name: 'Speler te kort', active: false, locked: true, is_placeholder: true, joined_at: now, can_play_from: now })
      }

      // Remove old scheduled matches from previous seasons only
      await db.collection('matches').deleteMany({ status: 'scheduled', season_id: { $ne: season.id } })

      // Real calendar (from user brief)
      const CAL = [
        ['2026-09-13', 'Arena', 'Silver Balls'], ['2026-09-13', 'De Kroon', 'Canada'], ['2026-09-13', 'De Sportwereld', 'Den Telstar'],
        ['2026-09-27', 'Canada', 'Arena'], ['2026-09-27', 'Silver Balls', 'De Sportwereld'], ['2026-09-27', 'Den Telstar', 'De Kroon'],
        ['2026-10-11', 'Canada', 'Silver Balls'], ['2026-10-11', 'Arena', 'Den Telstar'], ['2026-10-11', 'De Kroon', 'De Sportwereld'],
        ['2026-10-25', 'Den Telstar', 'Canada'], ['2026-10-25', 'De Sportwereld', 'Arena'], ['2026-10-25', 'Silver Balls', 'De Kroon'],
        ['2026-11-15', 'Canada', 'De Sportwereld'], ['2026-11-15', 'Arena', 'De Kroon'], ['2026-11-15', 'Den Telstar', 'Silver Balls'],
        ['2026-11-29', 'Silver Balls', 'Canada'], ['2026-11-29', 'Den Telstar', 'De Sportwereld'], ['2026-11-29', 'De Kroon', 'Arena'],
        ['2026-12-13', 'Arena', 'Canada'], ['2026-12-13', 'De Sportwereld', 'Silver Balls'], ['2026-12-13', 'De Kroon', 'Den Telstar'],
        ['2026-12-27', 'Silver Balls', 'Arena'], ['2026-12-27', 'Canada', 'De Kroon'], ['2026-12-27', 'Den Telstar', 'Arena'],
        ['2027-01-10', 'Canada', 'Den Telstar'],
        ['2027-01-24', 'Silver Balls', 'Den Telstar'],
        ['2027-02-07', 'De Sportwereld', 'Den Telstar'],
        ['2027-02-21', 'Den Telstar', 'De Kroon'],
        ['2027-03-07', 'Arena', 'Den Telstar'],
        ['2027-03-21', 'Den Telstar', 'Canada'],
        ['2027-04-04', 'Den Telstar', 'Silver Balls'],
        ['2027-04-18', 'Den Telstar', 'De Sportwereld'],
        ['2027-05-02', 'De Kroon', 'Den Telstar'],
        ['2027-05-16', 'Den Telstar', 'Arena'],
        ['2027-05-30', 'Canada', 'Den Telstar'],
        ['2027-06-13', 'De Sportwereld', 'Den Telstar'],
      ]
      const existingMatches = (await db.collection('matches').find({ season_id: season.id }).toArray()).map(stripId)
      const existingKey = new Set(existingMatches.map(m => `${(m.date||'').substring(0,10)}|${m.home_team_id}|${m.away_team_id}`))
      const startDate = new Date('2026-09-13')
      let created = 0
      for (const [dateStr, homeName, awayName] of CAL) {
        const homeId = teamIdByName[homeName]; const awayId = teamIdByName[awayName]
        if (!homeId || !awayId) continue
        const key = `${dateStr}|${homeId}|${awayId}`
        if (existingKey.has(key)) continue
        const d = new Date(dateStr)
        const week = Math.floor((d - startDate) / (14 * 86400000)) + 1
        await db.collection('matches').insertOne({ id: uuidv4(), season_id: season.id, week, date: new Date(dateStr + 'T20:00:00').toISOString(), home_team_id: homeId, away_team_id: awayId, status: 'scheduled', games: null, points_home: 0, points_away: 0, submitted_by: null, submitted_at: null, confirmed_at: null })
        created += 1
      }
      await logAudit(db, { actor: 'admin', action: 'season_setup_2026_2027', entity: 'season', entity_id: season.id, old_value: null, new_value: { created_matches: created } })
      return handleCORS(NextResponse.json({ ok: true, season_id: season.id, created_matches: created, teams: TEAM_NAMES.map(n => ({ name: n, code: TEAM_CODES[n] })) }))
    }

    // Import historic season from Excel
    if (route === '/admin/import-historic' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const HIST = {
        name: '2024-2025',
        standings: [
          { team_name: 'De Canada', played: 8, won: 6, drawn: 0, lost: 2, points_for: 124, points_against: 68, saldo: 56, total_points: 124 },
          { team_name: 'Den Telstar', played: 8, won: 5, drawn: 0, lost: 3, points_for: 110, points_against: 97, saldo: 13, total_points: 110 },
          { team_name: 'Arena', played: 8, won: 4, drawn: 0, lost: 4, points_for: 103, points_against: 94, saldo: 9, total_points: 103 },
          { team_name: 'De Sportwereld', played: 8, won: 4, drawn: 0, lost: 4, points_for: 100, points_against: 99, saldo: 1, total_points: 100 },
          { team_name: 'Silver Balls', played: 8, won: 1, drawn: 0, lost: 7, points_for: 65, points_against: 144, saldo: -79, total_points: 65 },
        ],
        players: [
          { name: 'Bob Dumont', team_name: 'Den Telstar', enkel_played: 25, enkel_won: 11, dubbel_played: 0, dubbel_won: 0, points: 25 },
          { name: 'Dirk Willems', team_name: 'Den Telstar', enkel_played: 21, enkel_won: 9, dubbel_played: 0, dubbel_won: 0, points: 21 },
          { name: 'Dave Hemmerechts', team_name: 'Den Telstar', enkel_played: 19, enkel_won: 9, dubbel_played: 0, dubbel_won: 0, points: 19 },
          { name: 'Feline Van Barel', team_name: 'Den Telstar', enkel_played: 19, enkel_won: 10, dubbel_played: 0, dubbel_won: 0, points: 19 },
          { name: 'Johan Thijs', team_name: 'Den Telstar', enkel_played: 18, enkel_won: 8, dubbel_played: 0, dubbel_won: 0, points: 18 },
          { name: 'Dirk Jacobs Pluto', team_name: 'Den Telstar', enkel_played: 16, enkel_won: 9, dubbel_played: 0, dubbel_won: 0, points: 16 },
          { name: 'Rene Mattijns', team_name: 'Den Telstar', enkel_played: 13, enkel_won: 11, dubbel_played: 0, dubbel_won: 0, points: 13 },
          { name: 'Johnny Geysen', team_name: 'Den Telstar', enkel_played: 7, enkel_won: 9, dubbel_played: 0, dubbel_won: 0, points: 7 },
          { name: 'Ronne', team_name: 'De Canada', enkel_played: 8, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 8 },
          { name: 'Cisse', team_name: 'De Canada', enkel_played: 7, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 7 },
          { name: 'Jan', team_name: 'De Canada', enkel_played: 7, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 7 },
          { name: 'Krikke', team_name: 'De Canada', enkel_played: 6, enkel_won: 2, dubbel_played: 0, dubbel_won: 0, points: 6 },
          { name: 'Glenson', team_name: 'De Canada', enkel_played: 6, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 6 },
          { name: 'Andrew', team_name: 'De Canada', enkel_played: 4, enkel_won: 2, dubbel_played: 0, dubbel_won: 0, points: 4 },
          { name: 'Sven', team_name: 'De Canada', enkel_played: 3, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 3 },
          { name: 'Mark', team_name: 'De Canada', enkel_played: 3, enkel_won: 1, dubbel_played: 0, dubbel_won: 0, points: 3 },
          { name: 'Marc', team_name: 'Arena', enkel_played: 6, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 6 },
          { name: 'Alain', team_name: 'Arena', enkel_played: 6, enkel_won: 2, dubbel_played: 0, dubbel_won: 0, points: 6 },
          { name: 'Sandy', team_name: 'Arena', enkel_played: 6, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 6 },
          { name: 'Tony', team_name: 'Arena', enkel_played: 4, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 4 },
          { name: 'Sarah', team_name: 'Arena', enkel_played: 3, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 3 },
          { name: 'Eddy', team_name: 'Arena', enkel_played: 3, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 3 },
          { name: 'Monique', team_name: 'Arena', enkel_played: 3, enkel_won: 1, dubbel_played: 0, dubbel_won: 0, points: 3 },
          { name: 'Leo', team_name: 'De Sportwereld', enkel_played: 6, enkel_won: 2, dubbel_played: 0, dubbel_won: 0, points: 6 },
          { name: 'Christiane', team_name: 'De Sportwereld', enkel_played: 5, enkel_won: 3, dubbel_played: 0, dubbel_won: 0, points: 5 },
          { name: 'Ronny', team_name: 'De Sportwereld', enkel_played: 5, enkel_won: 2, dubbel_played: 0, dubbel_won: 0, points: 5 },
          { name: 'Danny', team_name: 'De Sportwereld', enkel_played: 3, enkel_won: 2, dubbel_played: 0, dubbel_won: 0, points: 3 },
        ].map(p => ({ ...p, lost: p.enkel_played - p.enkel_won, played: p.enkel_played + p.dubbel_played, won: p.enkel_won + p.dubbel_won, enkel_won: p.enkel_won, dubbel_won: p.dubbel_won, win_pct: p.enkel_played ? Math.round((p.enkel_won / p.enkel_played) * 100) : 0 })),
      }
      // Insert as archived season
      const existing = await db.collection('seasons').findOne({ name: HIST.name })
      if (existing) return handleCORS(NextResponse.json({ error: 'already imported', season_id: existing.id }))
      const seasonId = uuidv4()
      await db.collection('seasons').insertOne({
        id: seasonId, name: HIST.name, active: false, created_at: new Date('2024-09-01').toISOString(),
        archived_at: new Date('2025-06-30').toISOString(), champion: HIST.standings[0].team_name,
        final_standings: HIST.standings.map((s, i) => ({ ...s, team_id: `hist-${i}` })),
        final_player_stats: HIST.players.map((p, i) => ({ ...p, player_id: `hist-p-${i}`, team_id: 'hist' })),
      })
      await logAudit(db, { actor: 'admin', action: 'season_imported', entity: 'season', entity_id: seasonId, old_value: null, new_value: { name: HIST.name, champion: HIST.standings[0].team_name } })
      return handleCORS(NextResponse.json({ ok: true, season_id: seasonId, champion: HIST.standings[0].team_name }))
    }

    // Calendar edit
    if (route.startsWith('/admin/matches/') && path.length === 3 && method === 'PATCH') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]; const body = await request.json()
      const old = stripId(await db.collection('matches').findOne({ id }))
      const update = {}
      if (body.date) update.date = body.date
      if (body.week !== undefined) update.week = Number(body.week)
      if (body.home_team_id) update.home_team_id = body.home_team_id
      if (body.away_team_id) update.away_team_id = body.away_team_id
      await db.collection('matches').updateOne({ id }, { $set: update })
      await logAudit(db, { actor: 'admin', action: 'match_edited', entity: 'match', entity_id: id, old_value: old, new_value: update })
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route === '/admin/matches' && method === 'POST') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      const season = stripId(await db.collection('seasons').findOne({ active: true }))
      const m = { id: uuidv4(), season_id: season?.id, week: Number(body.week) || 1, date: body.date || new Date().toISOString(), home_team_id: body.home_team_id, away_team_id: body.away_team_id, status: 'scheduled', games: null, points_home: 0, points_away: 0 }
      await db.collection('matches').insertOne(m)
      await logAudit(db, { actor: 'admin', action: 'match_created', entity: 'match', entity_id: m.id, old_value: null, new_value: m })
      return handleCORS(NextResponse.json(stripId(m)))
    }
    if (route.startsWith('/admin/matches/') && path.length === 3 && method === 'DELETE') {
      if (!isAdmin) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = path[2]
      await db.collection('matches').deleteOne({ id })
      await logAudit(db, { actor: 'admin', action: 'match_deleted', entity: 'match', entity_id: id, old_value: null, new_value: null })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // Reset (dev)
    if (route === '/reset' && method === 'POST') {
      for (const c of ['teams','players','matches','seasons','settings','audit_logs','player_change_requests']) await db.collection(c).deleteMany({})
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
