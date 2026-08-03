'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Trophy, CalendarDays, ListChecks, Users, User, LogIn, Target, TrendingUp, ChevronRight, LogOut, Shield, History, AlertCircle, CheckCircle2, XCircle, Edit3, Plus, Trash2, RefreshCw, Settings as SettingsIcon, FileText, Archive } from 'lucide-react'

const PAGES = [
  { id: 'home', label: 'Home', icon: Trophy },
  { id: 'klassement', label: 'Klassement', icon: TrendingUp },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays },
  { id: 'wedstrijden', label: 'Wedstrijden', icon: ListChecks },
  { id: 'teams', label: 'Ploegen', icon: Users },
  { id: 'spelers', label: 'Spelers', icon: User },
  { id: 'historiek', label: 'Historiek', icon: History },
  { id: 'scorebord', label: 'Scorebord', icon: Target },
  { id: 'portaal', label: 'Teamportaal', icon: LogIn },
  { id: 'admin', label: 'Admin', icon: Shield },
]

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click()
}
const qrUrl = (data) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`

const api = {
  get: async (p, headers = {}) => (await fetch(`/api${p}`, { cache: 'no-store', headers })).json(),
  post: async (p, body, headers = {}) => (await fetch(`/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json(),
  patch: async (p, body, headers = {}) => (await fetch(`/api${p}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json(),
  del: async (p, headers = {}) => (await fetch(`/api${p}`, { method: 'DELETE', headers })).json(),
}

const statusMap = {
  scheduled: { label: 'Gepland', cls: 'bg-slate-200 text-slate-700' },
  submitted: { label: 'Wacht op bevestiging', cls: 'bg-amber-200 text-amber-800' },
  confirmed: { label: 'Bevestigd', cls: 'bg-emerald-200 text-emerald-800' },
  disputed: { label: 'Betwist', cls: 'bg-red-200 text-red-800' },
  admin_approved: { label: 'Goedgekeurd (admin)', cls: 'bg-blue-200 text-blue-800' },
}
const statusBadge = (s) => { const v = statusMap[s] || statusMap.scheduled; return <Badge className={`${v.cls} hover:${v.cls}`}>{v.label}</Badge> }
const formatDate = (iso) => { try { return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: '2-digit', month: 'short' }) } catch { return iso } }
const formatDateTime = (iso) => { try { return new Date(iso).toLocaleString('nl-BE') } catch { return iso } }

function Header({ page, setPage }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-emerald-100">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('home')}>
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-md"><Target className="w-6 h-6 text-white" /></div>
          <div><div className="font-bold text-lg leading-tight text-emerald-900">Pool Competitie</div><div className="text-xs text-emerald-700/70">Seizoen 2026-2027</div></div>
        </div>
        <nav className="hidden lg:flex items-center gap-1">
          {PAGES.map(p => (
            <Button key={p.id} variant={page === p.id ? 'default' : 'ghost'} size="sm" className={page === p.id ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-emerald-900'} onClick={() => setPage(p.id)}>{p.label}</Button>
          ))}
        </nav>
      </div>
      <div className="lg:hidden overflow-x-auto border-t border-emerald-100">
        <div className="flex gap-1 px-2 py-2 min-w-max">
          {PAGES.map(p => (
            <Button key={p.id} variant={page === p.id ? 'default' : 'outline'} size="sm" className={page === p.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setPage(p.id)}>
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
  const recent = matches.filter(m => ['confirmed', 'admin_approved'].includes(m.status)).slice(-5).reverse()
  const waiting = matches.filter(m => m.status === 'submitted').length
  const top3 = standings.slice(0, 3)
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-8 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="relative">
          <div className="text-sm uppercase tracking-widest text-emerald-200">Vriendschappelijke Poolcompetitie</div>
          <h1 className="text-3xl md:text-5xl font-bold mt-2">Alles op één plek.</h1>
          <p className="mt-3 text-emerald-100 max-w-2xl">Live klassement, digitaal wedstrijdformulier, bevestiging door beide ploegen en volledig admin beheer.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setPage('klassement')} className="bg-amber-400 hover:bg-amber-500 text-emerald-950 font-semibold"><TrendingUp className="w-4 h-4 mr-2" />Klassement</Button>
            <Button onClick={() => setPage('portaal')} variant="outline" className="bg-white/10 border-white/40 text-white hover:bg-white/20"><LogIn className="w-4 h-4 mr-2" />Teamportaal</Button>
          </div>
        </div>
      </section>
      {waiting > 0 && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{waiting} wedstrijd(en) wachten op bevestiging door de tegenploeg.</div>}
      <section className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Top 3</CardTitle></CardHeader><CardContent>
          {top3.length === 0 ? <p className="text-sm text-muted-foreground">Nog geen wedstrijden gespeeld.</p> : <ol className="space-y-2">{top3.map((s, i) => (<li key={s.team_id} className="flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i===0?'bg-amber-500':i===1?'bg-slate-400':'bg-amber-700'}`}>{i+1}</div><span className="font-medium">{s.team_name}</span></div><div className="text-right"><div className="font-bold text-emerald-700">{s.total_points} pt</div><div className="text-xs text-muted-foreground">{s.won}W - {s.lost}V</div></div></li>))}</ol>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-emerald-600" />Volgende wedstrijden</CardTitle></CardHeader><CardContent className="space-y-2">
          {upcoming.length===0 && <p className="text-sm text-muted-foreground">Geen komende wedstrijden.</p>}
          {upcoming.map(m => (<div key={m.id} className="flex items-center justify-between text-sm border-b last:border-b-0 pb-2 last:pb-0"><div><div className="font-medium">{m.home_team_name} <span className="text-muted-foreground">vs</span> {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div></div>{statusBadge(m.status)}</div>))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-emerald-600" />Laatste uitslagen</CardTitle></CardHeader><CardContent className="space-y-2">
          {recent.length===0 && <p className="text-sm text-muted-foreground">Nog geen bevestigde uitslagen.</p>}
          {recent.map(m => (<div key={m.id} className="flex items-center justify-between text-sm border-b last:border-b-0 pb-2 last:pb-0"><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</div></div>))}
        </CardContent></Card>
      </section>
    </div>
  )
}

function KlassementPage({ standings }) {
  const exportCSV = () => downloadCSV('klassement.csv', [['#','Ploeg','Gsp','W','G','V','Fr+','Fr-','Balans','Comp.pt'], ...standings.map((s,i)=>[i+1, s.team_name, s.played, s.won, s.drawn, s.lost, s.frames_won, s.frames_lost, s.framebalans, s.comp_points])])
  return (<div className="container mx-auto px-4 py-6"><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>Ploegenklassement</CardTitle><CardDescription>3 pt winst · 1 pt gelijk · 0 pt verlies · Tiebreaker: framebalans, dan gewonnen frames.</CardDescription></div><div className="flex gap-2 print:hidden"><Button size="sm" variant="outline" onClick={exportCSV}><FileText className="w-4 h-4 mr-1" />CSV</Button><Button size="sm" variant="outline" onClick={()=>window.print()}>Print / PDF</Button></div></div></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Ploeg</TableHead><TableHead className="text-center">Gsp</TableHead><TableHead className="text-center">W</TableHead><TableHead className="text-center">G</TableHead><TableHead className="text-center">V</TableHead><TableHead className="text-center">Fr+</TableHead><TableHead className="text-center">Fr-</TableHead><TableHead className="text-center">Balans</TableHead><TableHead className="text-center font-bold">Punten</TableHead></TableRow></TableHeader><TableBody>
    {standings.map((s, i) => (<TableRow key={s.team_id} className={i < 3 ? 'bg-emerald-50/40' : ''}><TableCell className="font-bold text-emerald-700">{i + 1}</TableCell><TableCell className="font-medium">{s.team_name}</TableCell><TableCell className="text-center">{s.played}</TableCell><TableCell className="text-center">{s.won}</TableCell><TableCell className="text-center">{s.drawn}</TableCell><TableCell className="text-center">{s.lost}</TableCell><TableCell className="text-center">{s.frames_won}</TableCell><TableCell className="text-center">{s.frames_lost}</TableCell><TableCell className="text-center">{s.framebalans > 0 ? `+${s.framebalans}` : s.framebalans}</TableCell><TableCell className="text-center font-bold text-emerald-700">{s.comp_points}</TableCell></TableRow>))}
    {standings.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nog geen wedstrijden gespeeld.</TableCell></TableRow>}
  </TableBody></Table></CardContent></Card></div>)
}

function KalenderPage({ matches }) {
  const byWeek = useMemo(() => { const g = {}; matches.forEach(m => { g[m.week] = g[m.week] || []; g[m.week].push(m) }); return g }, [matches])
  return (<div className="container mx-auto px-4 py-6 space-y-4">{Object.keys(byWeek).sort((a,b)=>Number(a)-Number(b)).map(week => (<Card key={week}><CardHeader className="pb-3"><CardTitle className="text-base">Speeldag {week}</CardTitle></CardHeader><CardContent className="space-y-2">{byWeek[week].map(m => (<div key={m.id} className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0"><div><div className="font-medium">{m.home_team_name} <span className="text-muted-foreground text-sm">vs</span> {m.away_team_name}</div><div className="text-xs text-muted-foreground">{formatDate(m.date)}</div></div><div className="flex items-center gap-2">{['confirmed','admin_approved'].includes(m.status) && <span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span>}{statusBadge(m.status)}</div></div>))}</CardContent></Card>))}</div>)
}

function WedstrijdenPage({ matches, onOpen }) {
  return (<div className="container mx-auto px-4 py-6"><Card><CardHeader><CardTitle>Alle wedstrijden</CardTitle></CardHeader><CardContent><div className="space-y-2">{matches.map(m => (<button key={m.id} onClick={() => onOpen(m.id)} className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-emerald-50 transition"><div className="text-left"><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div></div><div className="flex items-center gap-2">{['confirmed','admin_approved'].includes(m.status) && <span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span>}{statusBadge(m.status)}<ChevronRight className="w-4 h-4 text-muted-foreground" /></div></button>))}</div></CardContent></Card></div>)
}

function TeamsPage({ teams, onOpen }) {
  return (<div className="container mx-auto px-4 py-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">{teams.map(t => (<Card key={t.id} className="cursor-pointer hover:shadow-lg transition" onClick={() => onOpen(t.id)}><CardHeader><CardTitle className="flex items-center gap-2"><div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">{t.name.substring(0,2).toUpperCase()}</div>{t.name}</CardTitle></CardHeader></Card>))}</div>)
}

function SpelersPage({ players, teams }) {
  const [view, setView] = useState('combined')
  const [teamFilter, setTeamFilter] = useState('all')
  const filtered = useMemo(() => {
    let list = players
    if (teamFilter !== 'all') list = list.filter(p => p.team_name === teamFilter)
    return list
  }, [players, teamFilter])
  const sorted = useMemo(() => {
    const key = view === 'enkel' ? 'enkel_points' : view === 'dubbel' ? 'dubbel_points' : 'points'
    const fw = view === 'enkel' ? 'enkel_frames_won' : view === 'dubbel' ? 'dubbel_frames_won' : 'total_frames_won'
    const fl = view === 'enkel' ? 'enkel_frames_lost' : view === 'dubbel' ? 'dubbel_frames_lost' : 'total_frames_lost'
    return [...filtered].sort((a, b) => b[key] - a[key] || b[fw] - a[fw] || (b[fw] - b[fl]) - (a[fw] - a[fl]) || a.name.localeCompare(b.name))
  }, [filtered, view])
  const exportCSV = () => downloadCSV('spelers.csv', [['#','Speler','Ploeg','Enkel pt','Enkel gsp','Enkel Fr+','Enkel Fr-','Dubbel pt','Dubbel gsp','Dubbel Fr+','Dubbel Fr-','Totaal pt','Totaal gsp'], ...sorted.map((p, i) => [i+1, p.name, p.team_name, p.enkel_points, p.enkel_played, p.enkel_frames_won, p.enkel_frames_lost, p.dubbel_points, p.dubbel_played, p.dubbel_frames_won, p.dubbel_frames_lost, p.points, p.played])])
  return (<div className="container mx-auto px-4 py-6"><Card><CardHeader><div className="flex items-center justify-between flex-wrap gap-2"><div><CardTitle>Spelersklassement</CardTitle><CardDescription>Automatisch berekend uit bevestigde wedstrijden.</CardDescription></div><div className="flex gap-2 flex-wrap print:hidden">
    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}><option value="all">Alle ploegen</option>{teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>
    <div className="flex rounded-md border overflow-hidden">{['combined','enkel','dubbel'].map(v => (<button key={v} onClick={()=>setView(v)} className={`px-3 py-1 text-sm ${view===v?'bg-emerald-600 text-white':'bg-white'}`}>{v==='combined'?'Gecombineerd':v==='enkel'?'Enkel':'Dubbel'}</button>))}</div>
    <Button size="sm" variant="outline" onClick={exportCSV}><FileText className="w-4 h-4 mr-1" />CSV</Button><Button size="sm" variant="outline" onClick={()=>window.print()}>Print / PDF</Button>
  </div></div></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow>
    <TableHead className="w-12">#</TableHead><TableHead>Speler</TableHead><TableHead>Ploeg</TableHead>
    {view !== 'dubbel' && <><TableHead className="text-center">Enkel pt</TableHead><TableHead className="text-center">Enkel gsp</TableHead><TableHead className="text-center">Enkel Fr+/-</TableHead></>}
    {view !== 'enkel' && <><TableHead className="text-center">Dubbel pt</TableHead><TableHead className="text-center">Dubbel gsp</TableHead><TableHead className="text-center">Dubbel Fr+/-</TableHead></>}
    <TableHead className="text-center font-bold">Totaal pt</TableHead><TableHead className="text-center">Totaal gsp</TableHead>
  </TableRow></TableHeader><TableBody>{sorted.map((p, i) => (<TableRow key={p.player_id}><TableCell className="font-bold text-emerald-700">{i+1}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-muted-foreground">{p.team_name}</TableCell>
    {view !== 'dubbel' && <><TableCell className="text-center font-medium">{p.enkel_points}</TableCell><TableCell className="text-center">{p.enkel_played}</TableCell><TableCell className="text-center text-xs">{p.enkel_frames_won}/{p.enkel_frames_lost}</TableCell></>}
    {view !== 'enkel' && <><TableCell className="text-center font-medium">{p.dubbel_points}</TableCell><TableCell className="text-center">{p.dubbel_played}</TableCell><TableCell className="text-center text-xs">{p.dubbel_frames_won}/{p.dubbel_frames_lost}</TableCell></>}
    <TableCell className="text-center font-bold text-emerald-700">{p.points}</TableCell><TableCell className="text-center">{p.played}</TableCell>
  </TableRow>))}</TableBody></Table></CardContent></Card></div>)
}

function HistoriekPage() {
  const [seasons, setSeasons] = useState([])
  useEffect(() => { api.get('/seasons').then(setSeasons) }, [])
  const archived = seasons.filter(s => !s.active)
  return (<div className="container mx-auto px-4 py-6 space-y-4"><Card><CardHeader><CardTitle>Historiek</CardTitle><CardDescription>Vorige seizoenen en kampioenen.</CardDescription></CardHeader><CardContent>{archived.length===0 && <p className="text-sm text-muted-foreground">Nog geen gearchiveerde seizoenen.</p>}<div className="space-y-4">{archived.map(s => (<div key={s.id} className="border rounded-lg p-4"><div className="flex items-center justify-between"><div><div className="font-bold text-lg">{s.name}</div><div className="text-xs text-muted-foreground">Gearchiveerd op {formatDateTime(s.archived_at)}</div></div>{s.champion && <Badge className="bg-amber-500 hover:bg-amber-500"><Trophy className="w-3 h-3 mr-1" />Kampioen: {s.champion}</Badge>}</div>{s.final_standings && <Table className="mt-3"><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Ploeg</TableHead><TableHead className="text-center">W-G-V</TableHead><TableHead className="text-center">Punten</TableHead></TableRow></TableHeader><TableBody>{s.final_standings.map((st, i) => (<TableRow key={i}><TableCell>{i+1}</TableCell><TableCell className="font-medium">{st.team_name}</TableCell><TableCell className="text-center">{st.won}-{st.drawn}-{st.lost}</TableCell><TableCell className="text-center font-bold">{st.total_points}</TableCell></TableRow>))}</TableBody></Table>}</div>))}</div></CardContent></Card></div>)
}

function ScorebordPage() {
  const [standings, setStandings] = useState([]); const [matches, setMatches] = useState([])
  useEffect(() => { const load = () => { api.get('/standings').then(setStandings); api.get('/matches').then(setMatches) }; load(); const iv = setInterval(load, 15000); return () => clearInterval(iv) }, [])
  const recent = matches.filter(m => ['confirmed','admin_approved'].includes(m.status)).slice(-3).reverse()
  const next = matches.filter(m => m.status === 'scheduled').slice(0, 3)
  return (<div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white p-6">
    <div className="text-center mb-6"><div className="text-4xl md:text-6xl font-bold flex items-center justify-center gap-3"><Target className="w-12 h-12 text-amber-400" />POOL COMPETITIE</div><div className="text-emerald-200 mt-2 text-lg">Live scorebord · Seizoen 2026-2027</div></div>
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white/10 backdrop-blur rounded-2xl p-6"><div className="text-2xl font-bold text-amber-400 mb-4">KLASSEMENT</div><table className="w-full text-lg"><thead><tr className="border-b border-white/20 text-emerald-200"><th className="text-left py-2">#</th><th className="text-left">Ploeg</th><th className="text-center">W</th><th className="text-center">V</th><th className="text-right">Punten</th></tr></thead><tbody>{standings.map((s, i) => (<tr key={s.team_id} className={`border-b border-white/10 ${i===0?'text-amber-400 font-bold':''}`}><td className="py-3">{i===0 ? '🏆' : i+1}</td><td className="font-semibold">{s.team_name}</td><td className="text-center">{s.won}</td><td className="text-center">{s.lost}</td><td className="text-right text-2xl font-bold">{s.total_points}</td></tr>))}</tbody></table></div>
      <div className="space-y-4"><div className="bg-white/10 backdrop-blur rounded-2xl p-5"><div className="text-lg font-bold text-amber-400 mb-3">LAATSTE UITSLAGEN</div>{recent.length===0 && <p className="text-emerald-200 text-sm">Nog geen uitslagen</p>}{recent.map(m => (<div key={m.id} className="border-b border-white/10 py-2"><div className="text-sm">{m.home_team_name} vs {m.away_team_name}</div><div className="text-2xl font-bold text-amber-300">{m.points_home} - {m.points_away}</div></div>))}</div><div className="bg-white/10 backdrop-blur rounded-2xl p-5"><div className="text-lg font-bold text-amber-400 mb-3">VOLGENDE</div>{next.map(m => (<div key={m.id} className="border-b border-white/10 py-2 text-sm"><div className="font-semibold">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-emerald-200">Speeldag {m.week} · {formatDate(m.date)}</div></div>))}</div></div>
    </div>
    <div className="text-center text-emerald-300 text-xs mt-4">Auto-refresh elke 15 seconden</div>
  </div>)
}

function TeamQRCard({ session }) {
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/?portal=${session.team.code}`
  return (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" />QR-code teamportaal</CardTitle><CardDescription>Scan met gsm voor snelle login</CardDescription></CardHeader><CardContent className="flex items-center gap-4"><img src={qrUrl(url)} alt="QR code" className="w-32 h-32 border rounded" /><div className="text-sm"><div className="font-medium">{session.team.name}</div><div className="text-xs text-muted-foreground mb-2">Code: <code>{session.team.code}</code></div><Button size="sm" variant="outline" onClick={() => window.open(qrUrl(url), '_blank')}>Open QR groot</Button></div></CardContent></Card>)
}

function AdminKalender({ matches, teams, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [edit, setEdit] = useState(null); const [newM, setNewM] = useState({ week: 1, date: '', home_team_id: '', away_team_id: '' })
  const save = async () => { const r = await api.patch(`/admin/matches/${edit.id}`, edit, H); if (r.ok) { toast.success('Opgeslagen'); setEdit(null); reload() } }
  const del = async (id) => { if (!confirm('Wedstrijd verwijderen?')) return; await api.del(`/admin/matches/${id}`, H); toast.success('Verwijderd'); reload() }
  const add = async () => { if (!newM.home_team_id || !newM.away_team_id) return toast.error('Kies beide ploegen'); const r = await api.post('/admin/matches', newM, H); if (r.id) { toast.success('Toegevoegd'); setNewM({ week: 1, date: '', home_team_id: '', away_team_id: '' }); reload() } }
  return (<Card><CardHeader><CardTitle>Kalender editor</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-5 gap-2 mb-3 p-3 bg-emerald-50 rounded"><Input type="number" placeholder="Week" value={newM.week} onChange={e=>setNewM({...newM, week: e.target.value})} /><Input type="date" value={newM.date} onChange={e=>setNewM({...newM, date: e.target.value})} /><select className="h-10 rounded border px-2 text-sm" value={newM.home_team_id} onChange={e=>setNewM({...newM, home_team_id: e.target.value})}><option value="">Thuis</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select className="h-10 rounded border px-2 text-sm" value={newM.away_team_id} onChange={e=>setNewM({...newM, away_team_id: e.target.value})}><option value="">Uit</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><Button onClick={add} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />Voeg toe</Button></div><Table><TableHeader><TableRow><TableHead>Week</TableHead><TableHead>Datum</TableHead><TableHead>Wedstrijd</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Acties</TableHead></TableRow></TableHeader><TableBody>{matches.map(m => edit?.id === m.id ? (<TableRow key={m.id}><TableCell><Input type="number" value={edit.week} onChange={e=>setEdit({...edit, week: e.target.value})} className="w-16" /></TableCell><TableCell><Input type="date" value={edit.date?.substring(0,10)} onChange={e=>setEdit({...edit, date: new Date(e.target.value).toISOString()})} /></TableCell><TableCell>{m.home_team_name} vs {m.away_team_name}</TableCell><TableCell>{statusBadge(m.status)}</TableCell><TableCell className="text-right"><Button size="sm" onClick={save} className="mr-1 bg-emerald-600 hover:bg-emerald-700">Bewaar</Button><Button size="sm" variant="outline" onClick={()=>setEdit(null)}>×</Button></TableCell></TableRow>) : (<TableRow key={m.id}><TableCell>{m.week}</TableCell><TableCell className="text-xs">{formatDate(m.date)}</TableCell><TableCell className="text-sm">{m.home_team_name} vs {m.away_team_name}</TableCell><TableCell>{statusBadge(m.status)}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" className="mr-1" onClick={()=>setEdit(m)}><Edit3 className="w-3 h-3" /></Button><Button size="sm" variant="destructive" onClick={()=>del(m.id)}><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)
}

function TeamDetailDialog({ teamId, onClose }) {
  const [team, setTeam] = useState(null)
  useEffect(() => { if (teamId) api.get(`/teams/${teamId}`).then(setTeam) }, [teamId])
  return (<Dialog open={!!teamId} onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{team?.name || 'Ploeg'}</DialogTitle></DialogHeader>{team && (<div><h4 className="font-medium mb-2">Spelers ({team.players?.length || 0})</h4><div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">{(team.players || []).map(p => (<div key={p.id} className="flex items-center gap-2 p-2 rounded border"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold text-xs">{p.name.substring(0,2).toUpperCase()}</div><span className="text-sm">{p.name}</span></div>))}</div></div>)}</DialogContent></Dialog>)
}

function MatchDetailDialog({ matchId, onClose }) {
  const [match, setMatch] = useState(null)
  useEffect(() => { if (matchId) api.get(`/matches/${matchId}`).then(setMatch) }, [matchId])
  if (!matchId) return null
  return (<Dialog open={!!matchId} onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Wedstrijd'}</DialogTitle></DialogHeader>{match && (<div className="space-y-3"><div className="flex items-center justify-between"><div className="text-sm text-muted-foreground">Speeldag {match.week} · {formatDate(match.date)}</div>{statusBadge(match.status)}</div>{['confirmed','admin_approved','submitted','disputed'].includes(match.status) && match.games ? (<><div className="text-center py-3 bg-emerald-50 rounded-lg"><div className="text-3xl font-bold text-emerald-700">{match.points_home} - {match.points_away}</div><div className="text-xs text-muted-foreground mt-1">{match.status==='submitted'?'Voorlopig':'Eindstand'}</div></div><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Thuis</TableHead><TableHead className="text-center">Sets</TableHead><TableHead>Uit</TableHead></TableRow></TableHeader><TableBody>{match.games.map((g, idx) => { const hn = (g.home_players||[]).map(id => match.home_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & '); const an = (g.away_players||[]).map(id => match.away_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & '); return (<TableRow key={idx}><TableCell>{idx+1}</TableCell><TableCell><Badge variant="outline">{g.type}</Badge></TableCell><TableCell className={g.home_frames>g.away_frames?'font-bold':''}>{hn}</TableCell><TableCell className="text-center font-mono">{g.home_frames}-{g.away_frames}</TableCell><TableCell className={g.away_frames>g.home_frames?'font-bold':''}>{an}</TableCell></TableRow>) })}</TableBody></Table>{match.dispute_reason && <div className="text-sm bg-red-50 p-3 rounded border border-red-200"><strong>Betwist:</strong> {match.dispute_reason}</div>}{match.remarks && <div className="text-sm bg-amber-50 p-3 rounded border border-amber-200"><strong>Opmerkingen:</strong> {match.remarks}</div>}</>) : (<p className="text-sm text-muted-foreground text-center py-6">Wedstrijd nog niet gespeeld.</p>)}</div>)}</DialogContent></Dialog>)
}

// --------- Team Portal ---------
function TeamPortal({ session, setSession }) {
  const [code, setCode] = useState(''); const [loading, setLoading] = useState(false)
  const login = async () => { if (!code.trim()) return toast.error('Vul ploegcode in'); setLoading(true); const r = await api.post('/auth/team', { code }); setLoading(false); if (r.error) return toast.error('Ongeldige ploegcode'); setSession(r); localStorage.setItem('team_session', JSON.stringify({ code })); toast.success(`Welkom ${r.team.name}!`) }
  if (!session) return (<div className="container mx-auto px-4 py-10 max-w-md"><Card><CardHeader><CardTitle className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Teamportaal</CardTitle><CardDescription>Log in met de unieke code van je ploeg.</CardDescription></CardHeader><CardContent className="space-y-3"><Label>Ploegcode</Label><Input placeholder="BV. TEL-4928" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter' && login()} /><Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={login} disabled={loading}>{loading?'Bezig...':'Inloggen'}</Button><div className="text-xs text-muted-foreground pt-2 border-t"><div className="font-medium mb-1">Demo codes:</div><div>Den Telstar → <code>TEL-4928</code></div><div>De Canada → <code>CAN-7281</code></div><div>Arena → <code>ARE-1954</code></div><div>De Sportwereld → <code>SPO-3672</code></div><div>Silver Balls → <code>SIL-8340</code></div></div></CardContent></Card></div>)
  return <TeamDashboard session={session} setSession={setSession} />
}

function TeamDashboard({ session, setSession }) {
  const [openMatch, setOpenMatch] = useState(null)
  const [confirmMatch, setConfirmMatch] = useState(null)
  const [changeReqPlayer, setChangeReqPlayer] = useState(null)
  const refresh = async () => { const r = await api.post('/auth/team', { code: session.team.code }); if (!r.error) setSession(r) }
  const logout = () => { localStorage.removeItem('team_session'); setSession(null) }
  const pending = session.matches.filter(m => m.status === 'scheduled')
  const awaitingUs = session.matches.filter(m => m.status === 'submitted' && ((m.submitted_by === 'home' && m.away_team_id === session.team.id) || (m.submitted_by === 'away' && m.home_team_id === session.team.id)))
  const awaitingOther = session.matches.filter(m => m.status === 'submitted' && !awaitingUs.includes(m))
  const done = session.matches.filter(m => ['confirmed','admin_approved'].includes(m.status))
  const disputed = session.matches.filter(m => m.status === 'disputed')
  return (<div className="container mx-auto px-4 py-6 space-y-4">
    <Card><CardHeader className="flex-row justify-between items-center"><div><CardTitle>👋 {session.team.name}</CardTitle><CardDescription>Ingelogd als teamverantwoordelijke · Code: <code>{session.team.code}</code></CardDescription></div><Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> Uitloggen</Button></CardHeader></Card>
    <TeamQRCard session={session} />
    {awaitingUs.length > 0 && (<Card className="border-amber-300 bg-amber-50/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" />Wacht op jullie bevestiging ({awaitingUs.length})</CardTitle></CardHeader><CardContent className="space-y-2">{awaitingUs.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 bg-white"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Voorlopige uitslag: <span className="font-bold">{m.points_home} - {m.points_away}</span></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setOpenMatch(m.id)}>Bekijk</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfirmMatch(m)}>Reageer</Button></div></div>))}</CardContent></Card>)}
    {disputed.length > 0 && (<Card className="border-red-300 bg-red-50/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" />Betwiste wedstrijden ({disputed.length})</CardTitle><CardDescription>De beheerder zal deze bekijken.</CardDescription></CardHeader><CardContent className="space-y-2">{disputed.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 bg-white"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">{m.dispute_reason}</div></div><Button size="sm" variant="outline" onClick={() => setOpenMatch(m.id)}>Bekijk</Button></div>))}</CardContent></Card>)}
    {awaitingOther.length > 0 && (<Card><CardHeader><CardTitle className="text-base">Ingediend · wacht op tegenploeg ({awaitingOther.length})</CardTitle></CardHeader><CardContent className="space-y-2">{awaitingOther.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Voorlopig: {m.points_home}-{m.points_away}</div></div><Button size="sm" variant="outline" onClick={() => setOpenMatch(m.id)}>Bekijk</Button></div>))}</CardContent></Card>)}
    <Card><CardHeader><CardTitle className="text-base">Nog te spelen ({pending.length})</CardTitle></CardHeader><CardContent className="space-y-2">{pending.length===0 && <p className="text-sm text-muted-foreground">Alle wedstrijden gespeeld! 🎉</p>}{pending.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div></div><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenMatch(m)}>Formulier invullen</Button></div>))}</CardContent></Card>
    <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Onze spelers</CardTitle><Button size="sm" variant="outline"><Edit3 className="w-4 h-4 mr-1" />Wijzigingsaanvraag</Button></div><CardDescription>Namen zijn vergrendeld. Klik op een speler om een wijziging aan te vragen.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">{session.players.map(p => (<button key={p.id} onClick={() => setChangeReqPlayer(p)} className="flex items-center gap-2 p-2 rounded border hover:bg-emerald-50 text-left"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold text-xs">{p.name.substring(0,2).toUpperCase()}</div><span className="text-sm">{p.name}</span></button>))}</CardContent></Card>
    {session.change_requests?.length > 0 && (<Card><CardHeader><CardTitle className="text-base">Onze wijzigingsaanvragen</CardTitle></CardHeader><CardContent className="space-y-2">{session.change_requests.map(r => (<div key={r.id} className="flex items-center justify-between border rounded-lg p-3"><div className="text-sm"><div><span className="line-through text-muted-foreground">{r.old_name}</span> → <span className="font-medium">{r.new_name}</span></div><div className="text-xs text-muted-foreground">{r.reason} · {formatDateTime(r.ts)}</div></div><Badge className={r.status==='approved'?'bg-emerald-200 text-emerald-800':r.status==='rejected'?'bg-red-200 text-red-800':'bg-amber-200 text-amber-800'}>{r.status==='pending'?'In behandeling':r.status==='approved'?'Goedgekeurd':'Geweigerd'}</Badge></div>))}</CardContent></Card>)}
    <Card><CardHeader><CardTitle className="text-base">Gespeelde wedstrijden ({done.length})</CardTitle></CardHeader><CardContent className="space-y-2">{done.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-emerald-50" onClick={() => setOpenMatch(m.id)}><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div></div><span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span></div>))}{done.length===0 && <p className="text-sm text-muted-foreground">Nog geen gespeelde wedstrijden.</p>}</CardContent></Card>
    {openMatch && typeof openMatch === 'object' && (<MatchFormDialog match={openMatch} teamCode={session.team.code} onClose={() => setOpenMatch(null)} onSaved={() => { setOpenMatch(null); refresh() }} />)}
    {openMatch && typeof openMatch === 'string' && (<MatchDetailDialog matchId={openMatch} onClose={() => setOpenMatch(null)} />)}
    {confirmMatch && (<ConfirmMatchDialog match={confirmMatch} teamCode={session.team.code} onClose={() => setConfirmMatch(null)} onSaved={() => { setConfirmMatch(null); refresh() }} />)}
    {changeReqPlayer && (<ChangeRequestDialog player={changeReqPlayer} teamCode={session.team.code} onClose={() => setChangeReqPlayer(null)} onSaved={() => { setChangeReqPlayer(null); refresh() }} />)}
  </div>)
}

function ConfirmMatchDialog({ match, teamCode, onClose, onSaved }) {
  const [detail, setDetail] = useState(null); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { api.get(`/matches/${match.id}`).then(setDetail) }, [match.id])
  const decide = async (agree) => { if (!agree && !reason.trim()) return toast.error('Geef reden op waarom niet akkoord'); setSaving(true); const r = await api.post(`/matches/${match.id}/confirm`, { team_code: teamCode, agree, reason }); setSaving(false); if (r.error) return toast.error(r.error); toast.success(agree ? 'Wedstrijd bevestigd!' : 'Wedstrijd betwist. Beheerder is op de hoogte.'); onSaved() }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Bevestig wedstrijd</DialogTitle><DialogDescriptionCompat>{match.home_team_name} vs {match.away_team_name}</DialogDescriptionCompat></DialogHeader>
    {!detail ? <p>Laden...</p> : (<div className="space-y-3">
      <div className="text-center py-4 bg-emerald-50 rounded-lg"><div className="text-3xl font-bold text-emerald-700">{detail.points_home} - {detail.points_away}</div><div className="text-xs text-muted-foreground mt-1">Voorlopige uitslag ingediend door {detail.submitted_by === 'home' ? detail.home_team_name : detail.away_team_name}</div></div>
      <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Thuis</TableHead><TableHead className="text-center">Sets</TableHead><TableHead>Uit</TableHead></TableRow></TableHeader><TableBody>{(detail.games||[]).map((g, idx) => { const hn = (g.home_players||[]).map(id => detail.home_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & '); const an = (g.away_players||[]).map(id => detail.away_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & '); return (<TableRow key={idx}><TableCell>{idx+1}</TableCell><TableCell><Badge variant="outline">{g.type}</Badge></TableCell><TableCell>{hn}</TableCell><TableCell className="text-center font-mono">{g.home_frames}-{g.away_frames}</TableCell><TableCell>{an}</TableCell></TableRow>) })}</TableBody></Table>
      <div><Label>Reden bij "Niet akkoord" (verplicht)</Label><Textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Bv. Uitslag Enkel 3 klopt niet..." /></div>
    </div>)}
    <DialogFooter className="gap-2"><Button variant="destructive" onClick={() => decide(false)} disabled={saving}><XCircle className="w-4 h-4 mr-1" />Niet akkoord</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide(true)} disabled={saving}><CheckCircle2 className="w-4 h-4 mr-1" />Akkoord</Button></DialogFooter>
  </DialogContent></Dialog>)
}
const DialogDescriptionCompat = ({ children }) => <div className="text-sm text-muted-foreground">{children}</div>

function ChangeRequestDialog({ player, teamCode, onClose, onSaved }) {
  const [newName, setNewName] = useState(player.name); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => { if (!newName.trim() || newName.trim() === player.name) return toast.error('Nieuwe naam moet verschillen'); if (!reason.trim()) return toast.error('Reden verplicht'); setSaving(true); const r = await api.post('/player-change-requests', { team_code: teamCode, player_id: player.id, new_name: newName.trim(), reason }); setSaving(false); if (r.error) return toast.error(r.error); toast.success('Aanvraag ingediend! Wacht op goedkeuring beheerder.'); onSaved() }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent><DialogHeader><DialogTitle>Wijzigingsaanvraag speler</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Huidige naam</Label><Input value={player.name} disabled /></div><div><Label>Nieuwe naam</Label><Input value={newName} onChange={e=>setNewName(e.target.value)} /></div><div><Label>Reden</Label><Textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Bv. Typfout in achternaam" /></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>Indienen</Button></DialogFooter></DialogContent></Dialog>)
}

// --------- Match Form ---------
const GAME_TEMPLATE = [
  { type: 'enkel', label: 'Enkel 1' }, { type: 'enkel', label: 'Enkel 2' }, { type: 'enkel', label: 'Enkel 3' }, { type: 'enkel', label: 'Enkel 4' },
  { type: 'dubbel', label: 'Dubbel 1' }, { type: 'dubbel', label: 'Dubbel 2' },
  { type: 'enkel', label: 'Enkel 5' }, { type: 'enkel', label: 'Enkel 6' }, { type: 'enkel', label: 'Enkel 7' }, { type: 'enkel', label: 'Enkel 8' },
]
function MatchFormDialog({ match, teamCode, onClose, onSaved }) {
  const [detail, setDetail] = useState(null)
  const [games, setGames] = useState(GAME_TEMPLATE.map(g => ({ type: g.type, home_players: [], away_players: [], home_frames: 0, away_frames: 0, forfait_home: false, forfait_away: false })))
  const [remarks, setRemarks] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { api.get(`/matches/${match.id}`).then(setDetail) }, [match.id])
  const updateGame = (idx, field, val) => setGames(gs => gs.map((g, i) => i === idx ? { ...g, [field]: val } : g))
  const toggleForfait = (idx, side) => setGames(gs => gs.map((g, i) => {
    if (i !== idx) return g
    if (side === 'home') { const on = !g.forfait_home; return { ...g, forfait_home: on, forfait_away: false, home_players: on ? [] : g.home_players, home_frames: on ? 0 : 0, away_frames: on ? 2 : 0 } }
    else { const on = !g.forfait_away; return { ...g, forfait_away: on, forfait_home: false, away_players: on ? [] : g.away_players, away_frames: on ? 0 : 0, home_frames: on ? 2 : 0 } }
  }))
  const totals = useMemo(() => { let h=0,a=0; for (const g of games) { const hf=Number(g.home_frames),af=Number(g.away_frames); if (hf===2&&af===0)h+=3; else if (hf===0&&af===2)a+=3; else if (hf===2&&af===1){h+=2;a+=1} else if (hf===1&&af===2){h+=1;a+=2} } return {h,a} }, [games])
  const submit = async () => {
    for (let i = 0; i < games.length; i++) { const g = games[i]; const need = g.type==='enkel'?1:2
      if (!g.forfait_home && g.home_players.length !== need) return toast.error(`Selecteer thuis-spelers voor partij ${i+1} (of markeer als Forfait)`)
      if (!g.forfait_away && g.away_players.length !== need) return toast.error(`Selecteer uit-spelers voor partij ${i+1} (of markeer als Forfait)`)
      const hf=Number(g.home_frames), af=Number(g.away_frames)
      const valid = (hf===2&&af===0)||(hf===0&&af===2)||(hf===2&&af===1)||(hf===1&&af===2)
      if (!valid) return toast.error(`Ongeldige set-uitslag partij ${i+1}`)
    }
    setSaving(true); const r = await api.post(`/matches/${match.id}/submit`, { team_code: teamCode, games, remarks }); setSaving(false)
    if (r.error) return toast.error(r.error); toast.success('Ingediend! Wacht op bevestiging tegenploeg.'); onSaved()
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Wedstrijdformulier</DialogTitle><DialogDescriptionCompat>{match.home_team_name} vs {match.away_team_name} · {formatDate(match.date)}</DialogDescriptionCompat></DialogHeader>{!detail ? <p>Laden...</p> : (<div className="space-y-3"><div className="grid grid-cols-2 gap-3 text-sm bg-emerald-50 p-3 rounded-lg"><div><div className="text-xs text-muted-foreground">Thuisploeg</div><div className="font-medium">{detail.home_team_name}</div></div><div><div className="text-xs text-muted-foreground">Uitploeg</div><div className="font-medium">{detail.away_team_name}</div></div></div><div className="text-center bg-emerald-600 text-white p-3 rounded-lg"><div className="text-xs opacity-80">Live tussenstand</div><div className="text-3xl font-bold">{totals.h} - {totals.a}</div></div>{GAME_TEMPLATE.map((tpl, idx) => (<div key={idx} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-2"><div className="font-medium flex items-center gap-2">{tpl.label} <Badge variant="outline">{tpl.type}</Badge></div><div className="flex gap-1 text-xs"><button type="button" onClick={()=>toggleForfait(idx,'home')} className={`px-2 py-1 rounded border ${games[idx].forfait_home?'bg-red-500 text-white border-red-500':'hover:bg-red-50'}`}>Thuis forfait</button><button type="button" onClick={()=>toggleForfait(idx,'away')} className={`px-2 py-1 rounded border ${games[idx].forfait_away?'bg-red-500 text-white border-red-500':'hover:bg-red-50'}`}>Uit forfait</button></div></div><div className="grid md:grid-cols-5 gap-2 items-end"><div className="md:col-span-2"><Label className="text-xs">Thuis {tpl.type==='dubbel'?'(2 spelers)':''}{games[idx].forfait_home && ' · FORFAIT'}</Label>{!games[idx].forfait_home && <PlayerPicker players={detail.home_players} multi={tpl.type==='dubbel'} value={games[idx].home_players} onChange={(v)=>updateGame(idx,'home_players',v)} />}</div><div><Label className="text-xs">Sets</Label><div className="flex items-center gap-1"><SetSelect value={games[idx].home_frames} onChange={v=>updateGame(idx,'home_frames',v)} /><span>-</span><SetSelect value={games[idx].away_frames} onChange={v=>updateGame(idx,'away_frames',v)} /></div></div><div className="md:col-span-2"><Label className="text-xs">Uit {tpl.type==='dubbel'?'(2 spelers)':''}{games[idx].forfait_away && ' · FORFAIT'}</Label>{!games[idx].forfait_away && <PlayerPicker players={detail.away_players} multi={tpl.type==='dubbel'} value={games[idx].away_players} onChange={(v)=>updateGame(idx,'away_players',v)} />}</div></div></div>))}<div><Label>Opmerkingen</Label><Textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Optioneel" /></div></div>)}<DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>{saving?'Opslaan...':'Bevestigen & Indienen'}</Button></DialogFooter></DialogContent></Dialog>)
}
function SetSelect({ value, onChange }) { return (<select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={e=>onChange(Number(e.target.value))}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select>) }
function PlayerPicker({ players, multi, value, onChange }) {
  if (!multi) return (<select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={value[0] || ''} onChange={e => onChange(e.target.value ? [e.target.value] : [])}><option value="">-- Kies speler --</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>)
  const toggle = (id) => { if (value.includes(id)) onChange(value.filter(v => v !== id)); else if (value.length < 2) onChange([...value, id]) }
  return (<div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 border rounded-md bg-background">{players.map(p => (<button type="button" key={p.id} onClick={()=>toggle(p.id)} className={`px-2 py-1 text-xs rounded border ${value.includes(p.id)?'bg-emerald-600 text-white border-emerald-600':'bg-white'}`}>{p.name}</button>))}</div>)
}

// --------- ADMIN ---------
function AdminPortal({ adminCode, setAdminCode }) {
  const [code, setCode] = useState(''); const [loading, setLoading] = useState(false)
  const login = async () => { setLoading(true); const r = await api.post('/auth/admin', { code }); setLoading(false); if (r.error) return toast.error('Ongeldige admincode'); setAdminCode(r.token); localStorage.setItem('admin_code', r.token); toast.success('Welkom beheerder!') }
  if (!adminCode) return (<div className="container mx-auto px-4 py-10 max-w-md"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Admin</CardTitle><CardDescription>Log in als beheerder.</CardDescription></CardHeader><CardContent className="space-y-3"><Label>Admincode</Label><Input placeholder="ADMIN-9999" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&login()} /><Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={login} disabled={loading}>Inloggen</Button><div className="text-xs text-muted-foreground pt-2 border-t">Default demo code: <code>ADMIN-9999</code></div></CardContent></Card></div>)
  return <AdminDashboard adminCode={adminCode} logout={() => { localStorage.removeItem('admin_code'); setAdminCode(null) }} />
}

function AdminDashboard({ adminCode, logout }) {
  const [tab, setTab] = useState('dashboard')
  const H = { 'x-admin-code': adminCode }
  const [dash, setDash] = useState(null); const [reqs, setReqs] = useState([]); const [teams, setTeams] = useState([]); const [players, setPlayers] = useState([]); const [logs, setLogs] = useState([]); const [settings, setSettings] = useState(null); const [matches, setMatches] = useState([]); const [seasons, setSeasons] = useState([])
  const load = async () => {
    if (tab==='dashboard') setDash(await api.get('/admin/dashboard', H))
    if (tab==='requests') setReqs(await api.get('/admin/change-requests', H))
    if (tab==='teams') { setTeams(await api.get('/admin/teams-full', H)); setPlayers(await api.get('/players')) }
    if (tab==='matches') setMatches(await api.get('/matches'))
    if (tab==='kalender') { setMatches(await api.get('/matches')); setTeams(await api.get('/teams')) }
    if (tab==='logs') setLogs(await api.get('/admin/audit-logs', H))
    if (tab==='settings') setSettings(await api.get('/admin/settings', H))
    if (tab==='seasons') setSeasons(await api.get('/seasons'))
  }
  useEffect(() => { load() }, [tab])
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'matches', label: 'Wedstrijden', icon: ListChecks },
    { id: 'kalender', label: 'Kalender editor', icon: CalendarDays },
    { id: 'requests', label: 'Wijzigingsaanvragen', icon: Edit3 },
    { id: 'teams', label: 'Ploegen & Spelers', icon: Users },
    { id: 'logs', label: 'Audit Log', icon: FileText },
    { id: 'settings', label: 'Instellingen', icon: SettingsIcon },
    { id: 'seasons', label: 'Seizoenen', icon: Archive },
  ]
  return (<div className="container mx-auto px-4 py-6 space-y-4">
    <Card><CardHeader className="flex-row justify-between items-center"><div><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Admin Dashboard</CardTitle><CardDescription>Volledig beheer van de competitie.</CardDescription></div><Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" />Uitloggen</Button></CardHeader></Card>
    <div className="flex flex-wrap gap-2">{tabs.map(t => (<Button key={t.id} variant={tab===t.id?'default':'outline'} size="sm" className={tab===t.id?'bg-emerald-600 hover:bg-emerald-700':''} onClick={() => setTab(t.id)}><t.icon className="w-4 h-4 mr-1" />{t.label}</Button>))}</div>
    {tab==='dashboard' && dash && (<div className="grid md:grid-cols-3 gap-4"><StatCard icon={AlertCircle} label="Wacht op bevestiging" val={dash.submitted} color="amber" /><StatCard icon={XCircle} label="Betwiste wedstrijden" val={dash.disputed} color="red" /><StatCard icon={Edit3} label="Openstaande aanvragen" val={dash.pending_change_requests} color="blue" /><Card className="md:col-span-3"><CardHeader><CardTitle className="text-base">Recente audit log</CardTitle></CardHeader><CardContent><div className="space-y-1 text-xs">{dash.recent_logs.map(l => (<div key={l.id} className="flex justify-between border-b pb-1"><span><strong>{l.actor}</strong> · {l.action}</span><span className="text-muted-foreground">{formatDateTime(l.ts)}</span></div>))}</div></CardContent></Card></div>)}
    {tab==='matches' && (<AdminMatches matches={matches} adminCode={adminCode} reload={load} />)}
    {tab==='kalender' && (<AdminKalender matches={matches} teams={teams} adminCode={adminCode} reload={load} />)}
    {tab==='requests' && (<AdminRequests reqs={reqs} adminCode={adminCode} reload={load} />)}
    {tab==='teams' && (<AdminTeams teams={teams} players={players} adminCode={adminCode} reload={load} />)}
    {tab==='logs' && (<Card><CardHeader><CardTitle>Audit Log</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Datum/tijd</TableHead><TableHead>Actor</TableHead><TableHead>Actie</TableHead><TableHead>Entiteit</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>{logs.map(l => (<TableRow key={l.id}><TableCell className="text-xs whitespace-nowrap">{formatDateTime(l.ts)}</TableCell><TableCell className="font-medium">{l.actor}</TableCell><TableCell><Badge variant="outline">{l.action}</Badge></TableCell><TableCell className="text-xs">{l.entity}</TableCell><TableCell className="text-xs text-muted-foreground max-w-xs truncate">{JSON.stringify(l.new_value || l.old_value || {})}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}
    {tab==='settings' && settings && (<AdminSettings settings={settings} adminCode={adminCode} reload={load} />)}
    {tab==='seasons' && (<AdminSeasons seasons={seasons} adminCode={adminCode} reload={load} />)}
  </div>)
}

const StatCard = ({ icon: Icon, label, val, color }) => (<Card><CardContent className="p-6 flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-100 text-${color}-700`}><Icon className="w-6 h-6" /></div><div><div className="text-3xl font-bold">{val}</div><div className="text-sm text-muted-foreground">{label}</div></div></CardContent></Card>)

function AdminMatches({ matches, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const pending = matches.filter(m => ['submitted','disputed'].includes(m.status))
  const approve = async (id) => { const m = matches.find(x => x.id === id); const r = await api.post(`/admin/matches/${id}/approve`, { games: m.games }, H); if (r.ok) { toast.success('Wedstrijd goedgekeurd'); reload() } }
  return (<Card><CardHeader><CardTitle>Wedstrijden — actie vereist</CardTitle></CardHeader><CardContent className="space-y-2">
    {pending.length===0 && <p className="text-sm text-muted-foreground">Geen wedstrijden die actie vereisen.</p>}
    {pending.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Uitslag: {m.points_home}-{m.points_away} · {statusMap[m.status]?.label}{m.dispute_reason && ` · ${m.dispute_reason}`}</div></div><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(m.id)}>Goedkeuren als admin</Button></div>))}
  </CardContent></Card>)
}

function AdminRequests({ reqs, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const decide = async (id, action) => { const r = await api.post(`/admin/change-requests/${id}/${action}`, {}, H); if (r.ok) { toast.success(action==='approve'?'Goedgekeurd':'Geweigerd'); reload() } }
  return (<Card><CardHeader><CardTitle>Wijzigingsaanvragen spelersnamen</CardTitle></CardHeader><CardContent className="space-y-2">
    {reqs.length===0 && <p className="text-sm text-muted-foreground">Geen aanvragen.</p>}
    {reqs.map(r => (<div key={r.id} className="border rounded-lg p-3"><div className="flex items-center justify-between"><div><div className="text-sm"><span className="text-muted-foreground">{r.team_name}:</span> <span className="line-through">{r.old_name}</span> → <span className="font-medium">{r.new_name}</span></div><div className="text-xs text-muted-foreground">Reden: {r.reason} · {formatDateTime(r.ts)}</div></div>{r.status==='pending' ? (<div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => decide(r.id, 'reject')}>Weiger</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide(r.id, 'approve')}>Keur goed</Button></div>) : (<Badge className={r.status==='approved'?'bg-emerald-200 text-emerald-800':'bg-red-200 text-red-800'}>{r.status}</Badge>)}</div></div>))}
  </CardContent></Card>)
}

function AdminTeams({ teams, players, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [newTeam, setNewTeam] = useState(''); const [newPlayer, setNewPlayer] = useState({ team_id: '', name: '' })
  const addTeam = async () => { if (!newTeam.trim()) return; const r = await api.post('/admin/teams', { name: newTeam }, H); if (r.id) { toast.success(`Ploeg ${r.name} aangemaakt · Code: ${r.code}`); setNewTeam(''); reload() } }
  const delTeam = async (id) => { if (!confirm('Ploeg verwijderen? Alle spelers worden ook verwijderd.')) return; await api.del(`/admin/teams/${id}`, H); toast.success('Ploeg verwijderd'); reload() }
  const resetCode = async (id) => { const r = await api.post(`/admin/teams/${id}/reset-code`, {}, H); if (r.code) { toast.success(`Nieuwe code: ${r.code}`); reload() } }
  const addPlayer = async () => { if (!newPlayer.team_id || !newPlayer.name.trim()) return toast.error('Ploeg en naam verplicht'); const r = await api.post('/admin/players', newPlayer, H); if (r.id) { toast.success('Speler toegevoegd'); setNewPlayer({ team_id: newPlayer.team_id, name: '' }); reload() } }
  const delPlayer = async (id) => { if (!confirm('Speler verwijderen?')) return; await api.del(`/admin/players/${id}`, H); toast.success('Speler verwijderd'); reload() }
  return (<div className="space-y-4">
    <Card><CardHeader><CardTitle>Ploegen ({teams.length})</CardTitle></CardHeader><CardContent><div className="flex gap-2 mb-3"><Input placeholder="Nieuwe ploegnaam" value={newTeam} onChange={e=>setNewTeam(e.target.value)} /><Button onClick={addTeam} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />Toevoegen</Button></div><Table><TableHeader><TableRow><TableHead>Ploeg</TableHead><TableHead>Code</TableHead><TableHead className="text-right">Acties</TableHead></TableRow></TableHeader><TableBody>{teams.map(t => (<TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell><code className="bg-slate-100 px-2 py-1 rounded text-xs">{t.code}</code></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" className="mr-2" onClick={() => resetCode(t.id)}><RefreshCw className="w-3 h-3 mr-1" />Reset code</Button><Button size="sm" variant="destructive" onClick={() => delTeam(t.id)}><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle>Spelers ({players.length})</CardTitle></CardHeader><CardContent><div className="flex gap-2 mb-3"><select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={newPlayer.team_id} onChange={e=>setNewPlayer({...newPlayer, team_id: e.target.value})}><option value="">-- Kies ploeg --</option>{teams.map(t=>(<option key={t.id} value={t.id}>{t.name}</option>))}</select><Input placeholder="Nieuwe speler" value={newPlayer.name} onChange={e=>setNewPlayer({...newPlayer, name: e.target.value})} /><Button onClick={addPlayer} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />Toevoegen</Button></div><Table><TableHeader><TableRow><TableHead>Speler</TableHead><TableHead>Ploeg</TableHead><TableHead className="text-right">Acties</TableHead></TableRow></TableHeader><TableBody>{players.map(p => (<TableRow key={p.player_id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-muted-foreground">{p.team_name}</TableCell><TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => delPlayer(p.player_id)}><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
  </div>)
}

function AdminSettings({ settings, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [rules, setRules] = useState(settings.scoring?.rules || {})
  const [adminNewCode, setAdminNewCode] = useState('')
  const save = async () => { const r = await api.post('/admin/settings', { scoring: rules, admin_code: adminNewCode || undefined }, H); if (r.ok) { toast.success('Instellingen opgeslagen'); reload() } }
  return (<Card><CardHeader><CardTitle>Instellingen</CardTitle><CardDescription>Puntentelling en admincode aanpassen.</CardDescription></CardHeader><CardContent className="space-y-4">
    <div><Label>Punten bij 2-0 (winnaar-verliezer)</Label><div className="flex gap-2 mt-1"><Input type="number" value={rules.frames_2_0?.[0] ?? 3} onChange={e=>setRules({...rules, frames_2_0: [Number(e.target.value), rules.frames_2_0?.[1] ?? 0]})} /><Input type="number" value={rules.frames_2_0?.[1] ?? 0} onChange={e=>setRules({...rules, frames_2_0: [rules.frames_2_0?.[0] ?? 3, Number(e.target.value)]})} /></div></div>
    <div><Label>Punten bij 2-1 (winnaar-verliezer)</Label><div className="flex gap-2 mt-1"><Input type="number" value={rules.frames_2_1?.[0] ?? 2} onChange={e=>setRules({...rules, frames_2_1: [Number(e.target.value), rules.frames_2_1?.[1] ?? 1]})} /><Input type="number" value={rules.frames_2_1?.[1] ?? 1} onChange={e=>setRules({...rules, frames_2_1: [rules.frames_2_1?.[0] ?? 2, Number(e.target.value)]})} /></div></div>
    <div><Label>Nieuwe admincode (optioneel)</Label><Input placeholder="Huidige: verborgen" value={adminNewCode} onChange={e=>setAdminNewCode(e.target.value.toUpperCase())} /></div>
    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={save}>Opslaan</Button>
    <div className="text-xs text-muted-foreground border-t pt-2">Huidige admin: <code>{settings.admin?.code}</code></div>
  </CardContent></Card>)
}

function AdminSeasons({ seasons, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [name, setName] = useState('')
  const archive = async () => { if (!name.trim()) return toast.error('Geef naam van nieuw seizoen'); if (!confirm('Huidig seizoen archiveren en nieuw seizoen starten?')) return; const r = await api.post('/admin/seasons/archive', { name }, H); if (r.ok) { toast.success('Seizoen gearchiveerd'); setName(''); reload() } }
  const importHist = async () => { const r = await api.post('/admin/import-historic', {}, H); if (r.ok) { toast.success(`Seizoen 2024-2025 geïmporteerd! Kampioen: ${r.champion}`); reload() } else toast.error(r.error || 'Fout') }
  const setup2627 = async () => { const r = await api.post('/admin/setup-2026-2027', {}, H); if (r.ok) { toast.success(`Seizoen 2026-2027 setup klaar! ${r.created_matches} nieuwe wedstrijden. 6 ploegen: ${r.teams.map(t=>t.name).join(', ')}`); reload() } else toast.error(r.error || 'Fout') }
  return (<Card><CardHeader><CardTitle>Seizoenen</CardTitle><CardDescription>Archiveer of importeer seizoenen.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex gap-2"><Input placeholder="Naam nieuw seizoen (bv. 2026-2027)" value={name} onChange={e=>setName(e.target.value)} /><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={archive}><Archive className="w-4 h-4 mr-1" />Archiveer & Start Nieuw</Button></div><Button variant="outline" onClick={importHist}><Plus className="w-4 h-4 mr-1" />Importeer historisch seizoen 2024-2025 uit Excel</Button><Button variant="outline" onClick={setup2627}><RefreshCw className="w-4 h-4 mr-1" />Setup seizoen 2026-2027 (kalender + De Kroon + placeholders)</Button><Table><TableHeader><TableRow><TableHead>Seizoen</TableHead><TableHead>Status</TableHead><TableHead>Kampioen</TableHead></TableRow></TableHeader><TableBody>{seasons.map(s => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.active ? <Badge className="bg-emerald-200 text-emerald-800">Actief</Badge> : <Badge variant="outline">Gearchiveerd</Badge>}</TableCell><TableCell>{s.champion || '—'}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)
}

// --------- Root App ---------
function App() {
  const [page, setPage] = useState('home')
  const [standings, setStandings] = useState([])
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [teamDialog, setTeamDialog] = useState(null)
  const [matchDialog, setMatchDialog] = useState(null)
  const [session, setSession] = useState(null)
  const [adminCode, setAdminCode] = useState(null)

  const load = async () => { const [s, m, t, p] = await Promise.all([api.get('/standings'), api.get('/matches'), api.get('/teams'), api.get('/players')]); setStandings(s); setMatches(m); setTeams(t); setPlayers(p) }
  useEffect(() => { load(); const raw = localStorage.getItem('team_session'); if (raw) { try { const { code } = JSON.parse(raw); api.post('/auth/team', { code }).then(r => { if (!r.error) setSession(r) }) } catch {} } const ac = localStorage.getItem('admin_code'); if (ac) setAdminCode(ac) }, [])
  useEffect(() => { if (page !== 'portaal' && page !== 'admin') load() }, [page])

  return (<div>
    <Header page={page} setPage={setPage} />
    {page === 'home' && <HomePage setPage={setPage} standings={standings} matches={matches} />}
    {page === 'klassement' && <KlassementPage standings={standings} />}
    {page === 'kalender' && <KalenderPage matches={matches} />}
    {page === 'wedstrijden' && <WedstrijdenPage matches={matches} onOpen={setMatchDialog} />}
    {page === 'teams' && <TeamsPage teams={teams} onOpen={setTeamDialog} />}
    {page === 'spelers' && <SpelersPage players={players} teams={teams} />}
    {page === 'historiek' && <HistoriekPage />}
    {page === 'scorebord' && <ScorebordPage />}
    {page === 'portaal' && <TeamPortal session={session} setSession={(s)=>{ setSession(s); if (s) load() }} />}
    {page === 'admin' && <AdminPortal adminCode={adminCode} setAdminCode={setAdminCode} />}
    {teamDialog && <TeamDetailDialog teamId={teamDialog} onClose={() => setTeamDialog(null)} />}
    {matchDialog && <MatchDetailDialog matchId={matchDialog} onClose={() => setMatchDialog(null)} />}
    <footer className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground">Pool Competitie · Phase 2 · Bevestiging beide ploegen · Admin dashboard · Audit log · Historiek</footer>
  </div>)
}

export default App
