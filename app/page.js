'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Trophy, CalendarDays, ListChecks, Users, User, LogIn, Target, TrendingUp, ChevronRight, LogOut } from 'lucide-react'

const PAGES = [
  { id: 'home', label: 'Home', icon: Trophy },
  { id: 'klassement', label: 'Klassement', icon: TrendingUp },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays },
  { id: 'wedstrijden', label: 'Wedstrijden', icon: ListChecks },
  { id: 'teams', label: 'Ploegen', icon: Users },
  { id: 'spelers', label: 'Spelers', icon: User },
  { id: 'portaal', label: 'Teamportaal', icon: LogIn },
]

function useApi() {
  return {
    get: async (p) => (await fetch(`/api${p}`, { cache: 'no-store' })).json(),
    post: async (p, body) => (await fetch(`/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(),
  }
}

const statusBadge = (s) => {
  const map = {
    scheduled: { label: 'Gepland', cls: 'bg-slate-200 text-slate-700' },
    submitted: { label: 'Ingediend', cls: 'bg-amber-200 text-amber-800' },
    confirmed: { label: 'Bevestigd', cls: 'bg-emerald-200 text-emerald-800' },
    disputed: { label: 'Betwist', cls: 'bg-red-200 text-red-800' },
  }
  const v = map[s] || map.scheduled
  return <Badge className={`${v.cls} hover:${v.cls}`}>{v.label}</Badge>
}

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: '2-digit', month: 'short' }) } catch { return iso }
}

function Header({ page, setPage }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-emerald-100">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('home')}>
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-md">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight text-emerald-900">Pool Competitie</div>
            <div className="text-xs text-emerald-700/70">Seizoen 2025-2026</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {PAGES.map(p => (
            <Button key={p.id} variant={page === p.id ? 'default' : 'ghost'} size="sm"
              className={page === p.id ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-emerald-900'}
              onClick={() => setPage(p.id)}>
              {p.label}
            </Button>
          ))}
        </nav>
      </div>
      <div className="md:hidden overflow-x-auto border-t border-emerald-100">
        <div className="flex gap-1 px-2 py-2 min-w-max">
          {PAGES.map(p => (
            <Button key={p.id} variant={page === p.id ? 'default' : 'outline'} size="sm"
              className={page === p.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setPage(p.id)}>
              <p.icon className="w-4 h-4 mr-1" /> {p.label}
            </Button>
          ))}
        </div>
      </div>
    </header>
  )
}

function HomePage({ setPage, standings, matches }) {
  const upcoming = matches.filter(m => m.status === 'scheduled').slice(0, 5)
  const recent = matches.filter(m => m.status === 'confirmed').slice(-5).reverse()
  const top3 = standings.slice(0, 3)
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-8 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="relative">
          <div className="text-sm uppercase tracking-widest text-emerald-200">Vriendschappelijke Poolcompetitie</div>
          <h1 className="text-3xl md:text-5xl font-bold mt-2">Alle standen. Alle wedstrijden. Alles op één plek.</h1>
          <p className="mt-3 text-emerald-100 max-w-2xl">Bekijk live klassement, dien wedstrijdformulieren digitaal in en volg alle statistieken van jouw ploeg.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setPage('klassement')} className="bg-amber-400 hover:bg-amber-500 text-emerald-950 font-semibold">
              <TrendingUp className="w-4 h-4 mr-2" /> Bekijk Klassement
            </Button>
            <Button onClick={() => setPage('portaal')} variant="outline" className="bg-white/10 border-white/40 text-white hover:bg-white/20">
              <LogIn className="w-4 h-4 mr-2" /> Teamportaal
            </Button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Top 3</CardTitle>
          </CardHeader>
          <CardContent>
            {top3.length === 0 && <p className="text-sm text-muted-foreground">Nog geen wedstrijden gespeeld.</p>}
            <ol className="space-y-2">
              {top3.map((s, i) => (
                <li key={s.team_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i===0?'bg-amber-500':i===1?'bg-slate-400':'bg-amber-700'}`}>{i+1}</div>
                    <span className="font-medium">{s.team_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{s.total_points} pt</div>
                    <div className="text-xs text-muted-foreground">{s.won}W - {s.lost}V</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-emerald-600" /> Volgende wedstrijden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Geen komende wedstrijden.</p>}
            {upcoming.map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b last:border-b-0 pb-2 last:pb-0">
                <div>
                  <div className="font-medium">{m.home_team_name} <span className="text-muted-foreground">vs</span> {m.away_team_name}</div>
                  <div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div>
                </div>
                {statusBadge(m.status)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-emerald-600" /> Laatste uitslagen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Nog geen uitslagen. Log in via het teamportaal om de eerste wedstrijd in te dienen! 🎱</p>}
            {recent.map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b last:border-b-0 pb-2 last:pb-0">
                <div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div>
                <div className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function KlassementPage({ standings }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Klassement</CardTitle>
          <CardDescription>Puntentelling: 2-0 in sets → 3-0 punten · 2-1 in sets → 2-1 punten. 10 partijen per wedstrijd.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Ploeg</TableHead>
                <TableHead className="text-center">Gsp</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">G</TableHead>
                <TableHead className="text-center">V</TableHead>
                <TableHead className="text-center">Pv</TableHead>
                <TableHead className="text-center">Pt</TableHead>
                <TableHead className="text-center">Saldo</TableHead>
                <TableHead className="text-center font-bold">Punten</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((s, i) => (
                <TableRow key={s.team_id} className={i < 3 ? 'bg-emerald-50/40' : ''}>
                  <TableCell className="font-bold text-emerald-700">{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.team_name}</TableCell>
                  <TableCell className="text-center">{s.played}</TableCell>
                  <TableCell className="text-center">{s.won}</TableCell>
                  <TableCell className="text-center">{s.drawn}</TableCell>
                  <TableCell className="text-center">{s.lost}</TableCell>
                  <TableCell className="text-center">{s.points_for}</TableCell>
                  <TableCell className="text-center">{s.points_against}</TableCell>
                  <TableCell className="text-center">{s.saldo > 0 ? `+${s.saldo}` : s.saldo}</TableCell>
                  <TableCell className="text-center font-bold text-emerald-700">{s.total_points}</TableCell>
                </TableRow>
              ))}
              {standings.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nog geen wedstrijden gespeeld.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function KalenderPage({ matches }) {
  const byWeek = useMemo(() => {
    const g = {}
    matches.forEach(m => { g[m.week] = g[m.week] || []; g[m.week].push(m) })
    return g
  }, [matches])
  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      {Object.keys(byWeek).sort((a,b)=>Number(a)-Number(b)).map(week => (
        <Card key={week}>
          <CardHeader className="pb-3"><CardTitle className="text-base">Speeldag {week}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byWeek[week].map(m => (
              <div key={m.id} className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0">
                <div>
                  <div className="font-medium">{m.home_team_name} <span className="text-muted-foreground text-sm">vs</span> {m.away_team_name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'confirmed' && <span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span>}
                  {statusBadge(m.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function WedstrijdenPage({ matches, onOpen }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader><CardTitle>Alle wedstrijden</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {matches.map(m => (
              <button key={m.id} onClick={() => onOpen(m.id)} className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-emerald-50 transition">
                <div className="text-left">
                  <div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div>
                  <div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'confirmed' && <span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span>}
                  {statusBadge(m.status)}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TeamsPage({ teams, onOpen }) {
  return (
    <div className="container mx-auto px-4 py-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map(t => (
        <Card key={t.id} className="cursor-pointer hover:shadow-lg transition" onClick={() => onOpen(t.id)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">{t.name.substring(0,2).toUpperCase()}</div>
              {t.name}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function SpelersPage({ players }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader><CardTitle>Alle spelers</CardTitle><CardDescription>Statistieken worden automatisch bijgewerkt na elke bevestigde wedstrijd.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Speler</TableHead>
                <TableHead>Ploeg</TableHead>
                <TableHead className="text-center">Gsp</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">V</TableHead>
                <TableHead className="text-center">Enkel W/G</TableHead>
                <TableHead className="text-center">Dubbel W/G</TableHead>
                <TableHead className="text-center">Win %</TableHead>
                <TableHead className="text-center">Punten</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map(p => (
                <TableRow key={p.player_id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.team_name}</TableCell>
                  <TableCell className="text-center">{p.played}</TableCell>
                  <TableCell className="text-center">{p.won}</TableCell>
                  <TableCell className="text-center">{p.lost}</TableCell>
                  <TableCell className="text-center">{p.enkel_won}/{p.enkel_played}</TableCell>
                  <TableCell className="text-center">{p.dubbel_won}/{p.dubbel_played}</TableCell>
                  <TableCell className="text-center">{p.win_pct}%</TableCell>
                  <TableCell className="text-center font-bold text-emerald-700">{p.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function TeamDetailDialog({ teamId, onClose }) {
  const api = useApi()
  const [team, setTeam] = useState(null)
  useEffect(() => {
    if (!teamId) return
    api.get(`/teams/${teamId}`).then(setTeam)
  }, [teamId])
  return (
    <Dialog open={!!teamId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{team?.name || 'Ploeg'}</DialogTitle></DialogHeader>
        {team && (
          <div>
            <h4 className="font-medium mb-2">Spelers ({team.players?.length || 0})</h4>
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {(team.players || []).map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded border">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold text-xs">{p.name.substring(0,2).toUpperCase()}</div>
                  <span className="text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MatchDetailDialog({ matchId, onClose }) {
  const api = useApi()
  const [match, setMatch] = useState(null)
  useEffect(() => {
    if (!matchId) return
    api.get(`/matches/${matchId}`).then(setMatch)
  }, [matchId])
  if (!matchId) return null
  return (
    <Dialog open={!!matchId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Wedstrijd'}</DialogTitle></DialogHeader>
        {match && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Speeldag {match.week} · {formatDate(match.date)}</div>
              {statusBadge(match.status)}
            </div>
            {match.status === 'confirmed' && match.games ? (
              <>
                <div className="text-center py-3 bg-emerald-50 rounded-lg">
                  <div className="text-3xl font-bold text-emerald-700">{match.points_home} - {match.points_away}</div>
                  <div className="text-xs text-muted-foreground mt-1">Eindstand</div>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Thuis</TableHead><TableHead className="text-center">Sets</TableHead><TableHead>Uit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {match.games.map((g, idx) => {
                      const homeNames = (g.home_players||[]).map(id => match.home_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & ')
                      const awayNames = (g.away_players||[]).map(id => match.away_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & ')
                      return (
                        <TableRow key={idx}>
                          <TableCell>{idx+1}</TableCell>
                          <TableCell><Badge variant="outline">{g.type}</Badge></TableCell>
                          <TableCell className={g.home_frames>g.away_frames?'font-bold':''}>{homeNames}</TableCell>
                          <TableCell className="text-center font-mono">{g.home_frames}-{g.away_frames}</TableCell>
                          <TableCell className={g.away_frames>g.home_frames?'font-bold':''}>{awayNames}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {match.remarks && <div className="text-sm bg-amber-50 p-3 rounded border border-amber-200"><strong>Opmerkingen:</strong> {match.remarks}</div>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Wedstrijd nog niet gespeeld.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --------- Team portal ---------
function TeamPortal({ session, setSession }) {
  const api = useApi()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!code.trim()) return toast.error('Vul ploegcode in')
    setLoading(true)
    const res = await api.post('/auth/team', { code })
    setLoading(false)
    if (res.error) return toast.error('Ongeldige ploegcode')
    setSession(res)
    localStorage.setItem('team_session', JSON.stringify({ code }))
    toast.success(`Welkom ${res.team.name}!`)
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Teamportaal</CardTitle>
            <CardDescription>Log in met de unieke code van je ploeg om wedstrijden in te dienen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Ploegcode</Label>
            <Input placeholder="BV. TEL-4928" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter' && login()} />
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={login} disabled={loading}>{loading?'Bezig...':'Inloggen'}</Button>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <div className="font-medium mb-1">Demo codes:</div>
              <div>Den Telstar → <code>TEL-4928</code></div>
              <div>De Canada → <code>CAN-7281</code></div>
              <div>Arena → <code>ARE-1954</code></div>
              <div>De Sportwereld → <code>SPO-3672</code></div>
              <div>Silver Balls → <code>SIL-8340</code></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <TeamDashboard session={session} setSession={setSession} />
}

function TeamDashboard({ session, setSession }) {
  const api = useApi()
  const [openMatch, setOpenMatch] = useState(null)

  const refresh = async () => {
    const res = await api.post('/auth/team', { code: session.team.code })
    if (!res.error) setSession(res)
  }

  const logout = () => {
    localStorage.removeItem('team_session')
    setSession(null)
  }

  const pending = session.matches.filter(m => m.status === 'scheduled')
  const done = session.matches.filter(m => m.status === 'confirmed')

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>👋 {session.team.name}</CardTitle>
            <CardDescription>Ingelogd als teamverantwoordelijke</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> Uitloggen</Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nog te spelen ({pending.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length===0 && <p className="text-sm text-muted-foreground">Alle wedstrijden gespeeld! 🎉</p>}
          {pending.map(m => (
            <div key={m.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div>
                <div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenMatch(m)}>Formulier invullen</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Gespeelde wedstrijden ({done.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {done.map(m => (
            <div key={m.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div>
                <div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div>
              </div>
              <span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span>
            </div>
          ))}
          {done.length===0 && <p className="text-sm text-muted-foreground">Nog geen gespeelde wedstrijden.</p>}
        </CardContent>
      </Card>

      {openMatch && (
        <MatchFormDialog match={openMatch} teamCode={session.team.code} onClose={() => setOpenMatch(null)} onSaved={() => { setOpenMatch(null); refresh() }} />
      )}
    </div>
  )
}

// --------- Match Form ---------
const GAME_TEMPLATE = [
  { type: 'enkel', label: 'Enkel 1' },
  { type: 'enkel', label: 'Enkel 2' },
  { type: 'enkel', label: 'Enkel 3' },
  { type: 'enkel', label: 'Enkel 4' },
  { type: 'dubbel', label: 'Dubbel 1' },
  { type: 'dubbel', label: 'Dubbel 2' },
  { type: 'enkel', label: 'Enkel 5' },
  { type: 'enkel', label: 'Enkel 6' },
  { type: 'enkel', label: 'Enkel 7' },
  { type: 'enkel', label: 'Enkel 8' },
]

function MatchFormDialog({ match, teamCode, onClose, onSaved }) {
  const api = useApi()
  const [detail, setDetail] = useState(null)
  const [games, setGames] = useState(GAME_TEMPLATE.map(g => ({ type: g.type, home_players: [], away_players: [], home_frames: 0, away_frames: 0 })))
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/matches/${match.id}`).then(setDetail)
  }, [match.id])

  const updateGame = (idx, field, val) => {
    setGames(gs => gs.map((g, i) => i === idx ? { ...g, [field]: val } : g))
  }

  const totals = useMemo(() => {
    let h = 0, a = 0
    for (const g of games) {
      const hf = Number(g.home_frames), af = Number(g.away_frames)
      if (hf === 2 && af === 0) { h += 3 }
      else if (hf === 0 && af === 2) { a += 3 }
      else if (hf === 2 && af === 1) { h += 2; a += 1 }
      else if (hf === 1 && af === 2) { h += 1; a += 2 }
    }
    return { h, a }
  }, [games])

  const submit = async () => {
    // basic validation
    for (let i = 0; i < games.length; i++) {
      const g = games[i]
      const need = g.type === 'enkel' ? 1 : 2
      if (g.home_players.length !== need || g.away_players.length !== need) {
        return toast.error(`Selecteer spelers voor partij ${i+1}`)
      }
      const hf = Number(g.home_frames), af = Number(g.away_frames)
      const valid = (hf===2&&af===0)||(hf===0&&af===2)||(hf===2&&af===1)||(hf===1&&af===2)
      if (!valid) return toast.error(`Ongeldige set-uitslag bij partij ${i+1} (gebruik 2-0, 2-1, 1-2 of 0-2)`)
    }
    setSaving(true)
    const res = await api.post(`/matches/${match.id}/submit`, { team_code: teamCode, games, remarks })
    setSaving(false)
    if (res.error) return toast.error(res.error)
    toast.success(`Wedstrijd bevestigd! Eindstand: ${res.points_home} - ${res.points_away}`)
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wedstrijdformulier</DialogTitle>
          <CardDescription>{match.home_team_name} vs {match.away_team_name} · {formatDate(match.date)}</CardDescription>
        </DialogHeader>
        {!detail ? <p>Laden...</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm bg-emerald-50 p-3 rounded-lg">
              <div><div className="text-xs text-muted-foreground">Thuisploeg</div><div className="font-medium">{detail.home_team_name}</div></div>
              <div><div className="text-xs text-muted-foreground">Uitploeg</div><div className="font-medium">{detail.away_team_name}</div></div>
            </div>

            <div className="text-center bg-emerald-600 text-white p-3 rounded-lg">
              <div className="text-xs opacity-80">Live tussenstand</div>
              <div className="text-3xl font-bold">{totals.h} - {totals.a}</div>
            </div>

            {GAME_TEMPLATE.map((tpl, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium flex items-center gap-2">{tpl.label} <Badge variant="outline">{tpl.type}</Badge></div>
                </div>
                <div className="grid md:grid-cols-5 gap-2 items-end">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Thuis {tpl.type === 'dubbel' ? '(2 spelers)' : ''}</Label>
                    <PlayerPicker players={detail.home_players} multi={tpl.type==='dubbel'} value={games[idx].home_players} onChange={(v)=>updateGame(idx,'home_players',v)} />
                  </div>
                  <div>
                    <Label className="text-xs">Sets</Label>
                    <div className="flex items-center gap-1">
                      <SetSelect value={games[idx].home_frames} onChange={v=>updateGame(idx,'home_frames',v)} />
                      <span>-</span>
                      <SetSelect value={games[idx].away_frames} onChange={v=>updateGame(idx,'away_frames',v)} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Uit {tpl.type === 'dubbel' ? '(2 spelers)' : ''}</Label>
                    <PlayerPicker players={detail.away_players} multi={tpl.type==='dubbel'} value={games[idx].away_players} onChange={(v)=>updateGame(idx,'away_players',v)} />
                  </div>
                </div>
              </div>
            ))}

            <div>
              <Label>Opmerkingen</Label>
              <Textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Optioneel: opmerkingen bij de wedstrijd" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>{saving?'Opslaan...':'Bevestigen & Indienen'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SetSelect({ value, onChange }) {
  return (
    <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={e=>onChange(Number(e.target.value))}>
      <option value={0}>0</option>
      <option value={1}>1</option>
      <option value={2}>2</option>
    </select>
  )
}

function PlayerPicker({ players, multi, value, onChange }) {
  if (!multi) {
    return (
      <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={value[0] || ''} onChange={e => onChange(e.target.value ? [e.target.value] : [])}>
        <option value="">-- Kies speler --</option>
        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    )
  }
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id))
    else if (value.length < 2) onChange([...value, id])
  }
  return (
    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 border rounded-md bg-background">
      {players.map(p => (
        <button type="button" key={p.id} onClick={()=>toggle(p.id)}
          className={`px-2 py-1 text-xs rounded border ${value.includes(p.id)?'bg-emerald-600 text-white border-emerald-600':'bg-white'}`}>
          {p.name}
        </button>
      ))}
    </div>
  )
}

// --------- App ---------
function App() {
  const api = useApi()
  const [page, setPage] = useState('home')
  const [standings, setStandings] = useState([])
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [teamDialog, setTeamDialog] = useState(null)
  const [matchDialog, setMatchDialog] = useState(null)
  const [session, setSession] = useState(null)

  const load = async () => {
    const [s, m, t, p] = await Promise.all([
      api.get('/standings'),
      api.get('/matches'),
      api.get('/teams'),
      api.get('/players'),
    ])
    setStandings(s); setMatches(m); setTeams(t); setPlayers(p)
  }

  useEffect(() => {
    load()
    // restore session
    const raw = localStorage.getItem('team_session')
    if (raw) {
      try {
        const { code } = JSON.parse(raw)
        api.post('/auth/team', { code }).then(res => { if (!res.error) setSession(res) })
      } catch {}
    }
  }, [])

  useEffect(() => { if (page !== 'portaal') load() }, [page])
  useEffect(() => { if (session) load() }, [session?.matches?.length])

  return (
    <div>
      <Header page={page} setPage={setPage} />
      {page === 'home' && <HomePage setPage={setPage} standings={standings} matches={matches} />}
      {page === 'klassement' && <KlassementPage standings={standings} />}
      {page === 'kalender' && <KalenderPage matches={matches} />}
      {page === 'wedstrijden' && <WedstrijdenPage matches={matches} onOpen={setMatchDialog} />}
      {page === 'teams' && <TeamsPage teams={teams} onOpen={setTeamDialog} />}
      {page === 'spelers' && <SpelersPage players={players} />}
      {page === 'portaal' && <TeamPortal session={session} setSession={(s)=>{ setSession(s); if (s) load() }} />}

      {teamDialog && <TeamDetailDialog teamId={teamDialog} onClose={() => setTeamDialog(null)} />}
      {matchDialog && <MatchDetailDialog matchId={matchDialog} onClose={() => setMatchDialog(null)} />}

      <footer className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
        Pool Competitie · MVP · Klassement wordt automatisch berekend na elke bevestigde wedstrijd
      </footer>
    </div>
  )
}

export default App
