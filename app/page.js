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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Trophy, CalendarDays, ListChecks, Users, User, LogIn, Target, TrendingUp, ChevronRight, LogOut, Shield, History, AlertCircle, CheckCircle2, XCircle, Edit3, Plus, Trash2, RefreshCw, Settings as SettingsIcon, FileText, Archive, Search, UserCheck, UserX, ArrowRightLeft, Eye, EyeOff, Copy } from 'lucide-react'

const PAGES = [
  { id: 'home', label: 'Home', icon: Trophy },
  { id: 'klassement', label: 'Klassement', icon: TrendingUp },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays },
  { id: 'wedstrijden', label: 'Wedstrijden', icon: ListChecks },
  { id: 'teams', label: 'Ploegen', icon: Users },
  { id: 'spelers', label: 'Spelers', icon: User },
  { id: 'historiek', label: 'Historiek', icon: History },
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
  const [seasonName, setSeasonName] = useState('')
  useEffect(() => { api.get('/seasons').then(list => { const a = Array.isArray(list) ? list.find(x => x.active) : null; setSeasonName(a ? a.name : '') }).catch(() => {}) }, [])
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-emerald-100">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('home')}>
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-md"><Target className="w-6 h-6 text-white" /></div>
          <div><div className="font-bold text-lg leading-tight text-emerald-900">Pool Competitie</div><div className="text-xs text-emerald-700/70">{seasonName ? `Seizoen ${seasonName}` : 'Geen actief seizoen'}</div></div>
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
  const [onlySingles, setOnlySingles] = useState(false)
  useEffect(() => { api.get('/seasons').then(list => { const a = Array.isArray(list) ? list.find(x => x.active) : null; setOnlySingles(!!a?.only_singles_count) }).catch(() => {}) }, [])
  const exportCSV = () => downloadCSV('klassement.csv', [['#','Ploeg','Gsp','W','G','V','Pt+','Pt-','Saldo','Fr+','Fr-','Balans','Comp.pt'], ...standings.map((s,i)=>[i+1, s.team_name, s.played, s.won, s.drawn, s.lost, s.points_for, s.points_against, s.saldo, s.frames_won, s.frames_lost, s.framebalans, s.comp_points])])
  return (<div className="container mx-auto px-4 py-6"><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>Ploegenklassement</CardTitle><CardDescription>Pt = ploegpunten (2-0→2, 2-1→2/1, max {onlySingles ? 16 : 20} per wedstrijd) · Fr = gewonnen sets · Comp = 3 winst / 1 gelijk / 0 verlies{onlySingles && <span className="block mt-1 text-purple-700 font-medium">Dit seizoen tellen alleen de enkelwedstrijden mee voor de ploegstand (dubbels tellen wel voor het individuele klassement).</span>}</CardDescription></div><div className="flex gap-2 print:hidden"><Button size="sm" variant="outline" onClick={exportCSV}><FileText className="w-4 h-4 mr-1" />CSV</Button><Button size="sm" variant="outline" onClick={()=>window.print()}>Print / PDF</Button></div></div></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Ploeg</TableHead><TableHead className="text-center">Gsp</TableHead><TableHead className="text-center">W</TableHead><TableHead className="text-center">G</TableHead><TableHead className="text-center">V</TableHead><TableHead className="text-center">Pt+</TableHead><TableHead className="text-center">Pt-</TableHead><TableHead className="text-center">Saldo</TableHead><TableHead className="text-center">Fr+</TableHead><TableHead className="text-center">Fr-</TableHead><TableHead className="text-center">Balans</TableHead><TableHead className="text-center font-bold">Comp.pt</TableHead></TableRow></TableHeader><TableBody>
    {standings.map((s, i) => (<TableRow key={s.team_id} className={i < 3 ? 'bg-emerald-50/40' : ''}><TableCell className="font-bold text-emerald-700">{i + 1}</TableCell><TableCell className="font-medium">{s.team_name}</TableCell><TableCell className="text-center">{s.played}</TableCell><TableCell className="text-center">{s.won}</TableCell><TableCell className="text-center">{s.drawn}</TableCell><TableCell className="text-center">{s.lost}</TableCell><TableCell className="text-center">{s.points_for}</TableCell><TableCell className="text-center">{s.points_against}</TableCell><TableCell className="text-center">{s.saldo > 0 ? `+${s.saldo}` : s.saldo}</TableCell><TableCell className="text-center">{s.frames_won}</TableCell><TableCell className="text-center">{s.frames_lost}</TableCell><TableCell className="text-center">{s.framebalans > 0 ? `+${s.framebalans}` : s.framebalans}</TableCell><TableCell className="text-center font-bold text-emerald-700">{s.comp_points}</TableCell></TableRow>))}
    {standings.length === 0 && <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Nog geen wedstrijden gespeeld.</TableCell></TableRow>}
  </TableBody></Table></CardContent></Card></div>)
}

function KalenderPage({ matches }) {
  const byDate = useMemo(() => {
    const g = {}
    matches.forEach(m => {
      const key = (m.date || '').substring(0, 10)
      g[key] = g[key] || []
      g[key].push(m)
    })
    return g
  }, [matches])
  const dateHeader = (iso) => { try { const d = new Date(iso); return d.toLocaleDateString('nl-BE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) } catch { return iso } }
  return (<div className="container mx-auto px-4 py-6 space-y-4">{Object.keys(byDate).sort().map(dateKey => (<Card key={dateKey}><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-600" />{dateHeader(dateKey)}</CardTitle><CardDescription>{byDate[dateKey].length} wedstrijd{byDate[dateKey].length > 1 ? 'en' : ''}</CardDescription></CardHeader><CardContent className="space-y-2">{byDate[dateKey].map(m => (<div key={m.id} className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0"><div><div className="font-medium">{m.home_team_name} <span className="text-muted-foreground text-sm">–</span> {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week}</div></div><div className="flex items-center gap-2">{['confirmed','admin_approved'].includes(m.status) && <span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span>}{statusBadge(m.status)}</div></div>))}</CardContent></Card>))}</div>)
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
  </TableRow></TableHeader><TableBody>{sorted.map((p, i) => { const cpf = p.can_play_from ? new Date(p.can_play_from) : null; const notYet = cpf && cpf > new Date(); return (<TableRow key={p.player_id} className={notYet ? 'bg-amber-50/40' : ''}><TableCell className="font-bold text-emerald-700">{i+1}</TableCell><TableCell className="font-medium">{p.name}{notYet && <Badge className="ml-2 bg-amber-200 text-amber-800 text-[10px]">Speelgerechtigd vanaf {cpf.toLocaleDateString('nl-BE', {day:'2-digit', month:'short'})}</Badge>}</TableCell><TableCell className="text-muted-foreground">{p.team_name}</TableCell>
    {view !== 'dubbel' && <><TableCell className="text-center font-medium">{p.enkel_points}</TableCell><TableCell className="text-center">{p.enkel_played}</TableCell><TableCell className="text-center text-xs">{p.enkel_frames_won}/{p.enkel_frames_lost}</TableCell></>}
    {view !== 'enkel' && <><TableCell className="text-center font-medium">{p.dubbel_points}</TableCell><TableCell className="text-center">{p.dubbel_played}</TableCell><TableCell className="text-center text-xs">{p.dubbel_frames_won}/{p.dubbel_frames_lost}</TableCell></>}
    <TableCell className="text-center font-bold text-emerald-700">{p.points}</TableCell><TableCell className="text-center">{p.played}</TableCell>
  </TableRow>) })}</TableBody></Table></CardContent></Card></div>)
}

const seasonStatusBadge = (st) => st === 'active' ? <Badge className="bg-emerald-200 text-emerald-800 hover:bg-emerald-200">Actief</Badge> : st === 'archived' ? <Badge variant="outline">Gearchiveerd</Badge> : <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Gepland</Badge>

function SeasonOverview({ overview, onMatchClick }) {
  const [sub, setSub] = useState('ploegen')
  if (!overview) return <p className="text-sm text-muted-foreground">Laden...</p>
  const { season, standings = [], player_stats = [], matches = [], source } = overview
  const played = matches.filter(m => ['confirmed', 'admin_approved'].includes(m.status))
  const subs = [{ id: 'ploegen', label: `Ploegstand (${standings.length})` }, { id: 'spelers', label: `Individueel klassement (${player_stats.length})` }, { id: 'wedstrijden', label: `Wedstrijden & uitslagen (${matches.length})` }]
  return (<div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-bold text-lg">{season.name}</span>{seasonStatusBadge(season.status)}{season.champion && <Badge className="bg-amber-500 hover:bg-amber-500"><Trophy className="w-3 h-3 mr-1" />Kampioen: {season.champion}</Badge>}{season.only_singles_count && <Badge variant="outline" className="border-purple-300 text-purple-700">Alleen enkels tellen voor ploegstand</Badge>}<span className="text-xs text-muted-foreground ml-auto">{season.start_date ? `${formatDate(season.start_date)} – ${season.end_date ? formatDate(season.end_date) : '…'}` : ''}{season.archived_at ? ` · gearchiveerd ${formatDateTime(season.archived_at)}` : ''}{source === 'snapshot' ? ' · eindstand vastgelegd bij archivering' : ''}</span></div>
    {season.description && <p className="text-sm text-muted-foreground">{season.description}</p>}
    <div className="flex flex-wrap gap-2">{subs.map(t => <Button key={t.id} size="sm" variant={sub === t.id ? 'default' : 'outline'} className={sub === t.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setSub(t.id)}>{t.label}</Button>)}</div>
    {sub === 'ploegen' && (standings.length === 0 ? <p className="text-sm text-muted-foreground">Geen ploegstand beschikbaar.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Ploeg</TableHead><TableHead className="text-center">Gesp.</TableHead><TableHead className="text-center">W-G-V</TableHead><TableHead className="text-center">Pt+ / Pt-</TableHead><TableHead className="text-center">Saldo</TableHead><TableHead className="text-center">Frames</TableHead><TableHead className="text-center">Punten</TableHead></TableRow></TableHeader><TableBody>{standings.map((st, i) => (<TableRow key={st.team_id || i} className={i === 0 ? 'bg-amber-50' : ''}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{st.team_name}</TableCell><TableCell className="text-center">{st.played ?? '—'}</TableCell><TableCell className="text-center">{st.won ?? 0}-{st.drawn ?? 0}-{st.lost ?? 0}</TableCell><TableCell className="text-center">{st.points_for ?? '—'} / {st.points_against ?? '—'}</TableCell><TableCell className="text-center">{st.saldo ?? '—'}</TableCell><TableCell className="text-center text-xs">{st.frames_won !== undefined ? `${st.frames_won}-${st.frames_lost}` : '—'}</TableCell><TableCell className="text-center font-bold">{st.total_points ?? st.comp_points ?? '—'}</TableCell></TableRow>))}</TableBody></Table></div>)}
    {sub === 'spelers' && (player_stats.length === 0 ? <p className="text-sm text-muted-foreground">Geen individueel klassement beschikbaar.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Speler</TableHead><TableHead>Ploeg</TableHead><TableHead className="text-center">Gesp.</TableHead><TableHead className="text-center">Gew.</TableHead><TableHead className="text-center">Enkel</TableHead><TableHead className="text-center">Dubbel</TableHead><TableHead className="text-center">Punten</TableHead></TableRow></TableHeader><TableBody>{player_stats.map((p, i) => (<TableRow key={p.player_id || i}><TableCell>{i + 1}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-muted-foreground">{p.team_name}</TableCell><TableCell className="text-center">{p.played ?? ((p.enkel_played || 0) + (p.dubbel_played || 0))}</TableCell><TableCell className="text-center">{p.won ?? ((p.enkel_won || 0) + (p.dubbel_won || 0))}</TableCell><TableCell className="text-center text-xs">{p.enkel_won ?? 0}/{p.enkel_played ?? 0}</TableCell><TableCell className="text-center text-xs">{p.dubbel_won ?? 0}/{p.dubbel_played ?? 0}</TableCell><TableCell className="text-center font-bold">{p.points ?? '—'}</TableCell></TableRow>))}</TableBody></Table></div>)}
    {sub === 'wedstrijden' && (matches.length === 0 ? <p className="text-sm text-muted-foreground">Geen wedstrijden opgeslagen voor dit seizoen{source === 'snapshot' ? ' (alleen de eindstand is bewaard)' : ''}.</p> : <div className="space-y-1"><div className="text-xs text-muted-foreground">{played.length} van {matches.length} wedstrijden gespeeld</div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Speeldag</TableHead><TableHead>Datum</TableHead><TableHead>Thuis</TableHead><TableHead className="text-center">Uitslag</TableHead><TableHead>Uit</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{matches.map(m => (<TableRow key={m.id} className={onMatchClick ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => onMatchClick && onMatchClick(m.id)}><TableCell>{m.week}</TableCell><TableCell className="text-xs whitespace-nowrap">{formatDate(m.date)}</TableCell><TableCell className={m.points_home > m.points_away ? 'font-bold' : ''}>{m.home_team_name}</TableCell><TableCell className="text-center font-mono">{['confirmed', 'admin_approved', 'submitted', 'disputed'].includes(m.status) ? `${m.points_home} - ${m.points_away}` : '—'}</TableCell><TableCell className={m.points_away > m.points_home ? 'font-bold' : ''}>{m.away_team_name}</TableCell><TableCell>{statusBadge(m.status)}</TableCell></TableRow>))}</TableBody></Table></div></div>)}
  </div>)
}

function HistoriekPage({ onMatchClick }) {
  const [seasons, setSeasons] = useState([])
  const [selected, setSelected] = useState('')
  const [overview, setOverview] = useState(null)
  useEffect(() => { api.get('/seasons').then(list => { const arr = Array.isArray(list) ? list : []; setSeasons(arr); const firstArchived = arr.find(x => x.status === 'archived'); setSelected(prev => prev || firstArchived?.id || arr[0]?.id || '') }) }, [])
  useEffect(() => { if (!selected) return; setOverview(null); api.get(`/seasons/${selected}/overview`).then(setOverview) }, [selected])
  return (<div className="container mx-auto px-4 py-6 space-y-4">
    <Card><CardHeader className="md:flex-row md:items-center md:justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Historiek</CardTitle><CardDescription>Bekijk de ploegstand, het individuele klassement en de uitslagen van elk seizoen.</CardDescription></div><select data-testid="history-season-select" className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]" value={selected} onChange={e => setSelected(e.target.value)}>{seasons.map(sn => <option key={sn.id} value={sn.id}>{sn.name}{sn.status === 'active' ? ' (actief)' : sn.status === 'planned' ? ' (gepland)' : ''}</option>)}</select></CardHeader>
      <CardContent>{seasons.length === 0 ? <p className="text-sm text-muted-foreground">Nog geen seizoenen.</p> : <SeasonOverview overview={overview} onMatchClick={onMatchClick} />}</CardContent></Card>
    <div className="grid md:grid-cols-3 gap-3">{seasons.filter(sn => sn.status === 'archived').map(sn => (<button key={sn.id} type="button" onClick={() => setSelected(sn.id)} className={`text-left border rounded-lg p-4 hover:border-emerald-400 transition ${selected === sn.id ? 'border-emerald-500 bg-emerald-50' : ''}`}><div className="font-bold">{sn.name}</div><div className="text-xs text-muted-foreground">{sn.archived_at ? `Afgesloten ${formatDate(sn.archived_at)}` : ''}</div>{sn.champion && <div className="text-sm mt-2 flex items-center gap-1 text-amber-700"><Trophy className="w-4 h-4" />{sn.champion}</div>}</button>))}</div>
  </div>)
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
  return (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" />QR-code teamportaal</CardTitle><CardDescription>Scan met gsm voor snelle login</CardDescription></CardHeader><CardContent className="flex items-center gap-4"><img src={qrUrl(url)} alt="QR code" className="w-32 h-32 border rounded" /><div className="text-sm"><div className="font-medium">{session.team.name}</div><div className="text-xs text-muted-foreground mb-2">De QR-code bevat je ploegcode. Deel hem enkel binnen je eigen ploeg.</div><Button size="sm" variant="outline" onClick={() => window.open(qrUrl(url), '_blank')}>Open QR groot</Button></div></CardContent></Card>)
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
  return (<Dialog open={!!teamId} onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{team?.name || 'Ploeg'}</DialogTitle></DialogHeader>{team && (<div><h4 className="font-medium mb-2">Spelers ({team.players?.length || 0})</h4><div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">{(team.players || []).map(p => { const cpf = p.can_play_from ? new Date(p.can_play_from) : null; const notYet = cpf && cpf > new Date(); return (<div key={p.id} className={`flex items-center gap-2 p-2 rounded border ${notYet ? 'border-amber-300 bg-amber-50' : ''}`}><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold text-xs">{p.name.substring(0,2).toUpperCase()}</div><div className="flex-1"><div className="text-sm">{p.name}</div>{notYet && <div className="text-[10px] text-amber-700">Speelgerechtigd vanaf {cpf.toLocaleDateString('nl-BE')}</div>}</div></div>) })}</div></div>)}</DialogContent></Dialog>)
}

function MatchDetailDialog({ matchId, onClose }) {
  const [match, setMatch] = useState(null)
  useEffect(() => { if (matchId) api.get(`/matches/${matchId}`).then(setMatch) }, [matchId])
  if (!matchId) return null
  return (<Dialog open={!!matchId} onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Wedstrijd'}</DialogTitle></DialogHeader>{match && (<div className="space-y-3"><div className="flex items-center justify-between"><div className="text-sm text-muted-foreground">Speeldag {match.week} · {formatDate(match.date)}</div>{statusBadge(match.status)}</div>{['confirmed','admin_approved','submitted','disputed'].includes(match.status) && match.games ? (<><div className="grid grid-cols-2 gap-3"><div className="text-center py-3 bg-emerald-50 rounded-lg"><div className="text-3xl font-bold text-emerald-700">{match.points_home} - {match.points_away}</div><div className="text-xs text-muted-foreground mt-1">Ploegpunten (2-0→2, 2-1→2/1){match.only_singles_count ? ' · alleen enkels' : ''}</div></div><div className="text-center py-3 bg-blue-50 rounded-lg"><div className="text-3xl font-bold text-blue-700">{(match.games||[]).reduce((a,g)=>a+(Number(g.home_frames)||0),0)} - {(match.games||[]).reduce((a,g)=>a+(Number(g.away_frames)||0),0)}</div><div className="text-xs text-muted-foreground mt-1">Frames (sets gewonnen)</div></div></div><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Type</TableHead><TableHead>Thuis</TableHead><TableHead className="text-center">Sets</TableHead><TableHead>Uit</TableHead></TableRow></TableHeader><TableBody>{match.games.map((g, idx) => { const hn = (g.home_players||[]).map(id => match.home_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & '); const an = (g.away_players||[]).map(id => match.away_players.find(p=>p.id===id)?.name).filter(Boolean).join(' & '); return (<TableRow key={idx}><TableCell>{idx+1}</TableCell><TableCell><Badge variant="outline">{g.type}</Badge></TableCell><TableCell className={g.home_frames>g.away_frames?'font-bold':''}>{hn}</TableCell><TableCell className="text-center font-mono">{g.home_frames}-{g.away_frames}</TableCell><TableCell className={g.away_frames>g.home_frames?'font-bold':''}>{an}</TableCell></TableRow>) })}</TableBody></Table>{match.dispute_reason && <div className="text-sm bg-red-50 p-3 rounded border border-red-200"><strong>Betwist:</strong> {match.dispute_reason}</div>}{match.remarks && <div className="text-sm bg-amber-50 p-3 rounded border border-amber-200"><strong>Opmerkingen:</strong> {match.remarks}</div>}</>) : (<p className="text-sm text-muted-foreground text-center py-6">Wedstrijd nog niet gespeeld.</p>)}</div>)}</DialogContent></Dialog>)
}

// --------- Team Portal ---------
function TeamPortal({ session, setSession }) {
  const [code, setCode] = useState(''); const [loading, setLoading] = useState(false)
  const login = async () => { if (!code.trim()) return toast.error('Vul ploegcode in'); setLoading(true); const r = await api.post('/auth/team', { code }); setLoading(false); if (r.error) return toast.error('Ongeldige ploegcode'); setSession(r); localStorage.setItem('team_session', JSON.stringify({ code })); toast.success(`Welkom ${r.team.name}!`) }
  if (!session) return (<div className="container mx-auto px-4 py-10 max-w-md"><Card><CardHeader><CardTitle className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Teamportaal</CardTitle><CardDescription>Log in met de unieke code van je ploeg.</CardDescription></CardHeader><CardContent className="space-y-3"><Label>Ploegcode</Label><Input placeholder="Ploegcode" type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter' && login()} /><Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={login} disabled={loading}>{loading?'Bezig...':'Inloggen'}</Button><div className="text-xs text-muted-foreground pt-2 border-t">Geen ploegcode? Vraag ze aan de competitieverantwoordelijke of scan de QR-code van je ploeg. Deel je code nooit met andere ploegen.</div></CardContent></Card></div>)
  return <TeamDashboard session={session} setSession={setSession} />
}

function TeamDashboard({ session, setSession }) {
  const [openMatch, setOpenMatch] = useState(null)
  const [confirmMatch, setConfirmMatch] = useState(null)
  const [changeReqPlayer, setChangeReqPlayer] = useState(null)
  const [dateReqMatch, setDateReqMatch] = useState(null)
  const refresh = async () => { const r = await api.post('/auth/team', { code: session.team.code }); if (!r.error) setSession(r) }
  const logout = () => { localStorage.removeItem('team_session'); setSession(null) }
  const pending = session.matches.filter(m => m.status === 'scheduled')
  const awaitingUs = session.matches.filter(m => m.status === 'submitted' && ((m.submitted_by === 'home' && m.away_team_id === session.team.id) || (m.submitted_by === 'away' && m.home_team_id === session.team.id)))
  const awaitingOther = session.matches.filter(m => m.status === 'submitted' && !awaitingUs.includes(m))
  const done = session.matches.filter(m => ['confirmed','admin_approved'].includes(m.status))
  const disputed = session.matches.filter(m => m.status === 'disputed')
  return (<div className="container mx-auto px-4 py-6 space-y-4">
    <Card><CardHeader className="flex-row justify-between items-center"><div><CardTitle>👋 {session.team.name}</CardTitle><CardDescription>Ingelogd als teamverantwoordelijke</CardDescription></div><Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> Uitloggen</Button></CardHeader></Card>
    <TeamQRCard session={session} />
    {awaitingUs.length > 0 && (<Card className="border-amber-300 bg-amber-50/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" />Wacht op jullie bevestiging ({awaitingUs.length})</CardTitle></CardHeader><CardContent className="space-y-2">{awaitingUs.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 bg-white"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Voorlopige uitslag: <span className="font-bold">{m.points_home} - {m.points_away}</span></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setOpenMatch(m.id)}>Bekijk</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfirmMatch(m)}>Reageer</Button></div></div>))}</CardContent></Card>)}
    {disputed.length > 0 && (<Card className="border-red-300 bg-red-50/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" />Betwiste wedstrijden ({disputed.length})</CardTitle><CardDescription>De beheerder zal deze bekijken.</CardDescription></CardHeader><CardContent className="space-y-2">{disputed.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 bg-white"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">{m.dispute_reason}</div></div><Button size="sm" variant="outline" onClick={() => setOpenMatch(m.id)}>Bekijk</Button></div>))}</CardContent></Card>)}
    {awaitingOther.length > 0 && (<Card><CardHeader><CardTitle className="text-base">Ingediend · wacht op tegenploeg ({awaitingOther.length})</CardTitle></CardHeader><CardContent className="space-y-2">{awaitingOther.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Voorlopig: {m.points_home}-{m.points_away}</div></div><Button size="sm" variant="outline" onClick={() => setOpenMatch(m.id)}>Bekijk</Button></div>))}</CardContent></Card>)}
    <Card><CardHeader><CardTitle className="text-base">Nog te spelen ({pending.length})</CardTitle></CardHeader><CardContent className="space-y-2">{pending.length===0 && <p className="text-sm text-muted-foreground">Alle wedstrijden gespeeld! 🎉</p>}{pending.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div></div><div className="flex gap-2 flex-wrap"><Button size="sm" variant="outline" onClick={() => setDateReqMatch(m)}><CalendarDays className="w-4 h-4 mr-1" />Datum wijzigen</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenMatch(m)}>Formulier invullen</Button></div></div>))}</CardContent></Card>
    <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Onze spelers</CardTitle><Button size="sm" variant="outline"><Edit3 className="w-4 h-4 mr-1" />Wijzigingsaanvraag</Button></div><CardDescription>Namen zijn vergrendeld. Klik op een speler om een wijziging aan te vragen.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">{session.players.map(p => (<button key={p.id} onClick={() => setChangeReqPlayer(p)} className="flex items-center gap-2 p-2 rounded border hover:bg-emerald-50 text-left"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold text-xs">{p.name.substring(0,2).toUpperCase()}</div><span className="text-sm">{p.name}</span></button>))}</CardContent></Card>
    {session.change_requests?.length > 0 && (<Card><CardHeader><CardTitle className="text-base">Onze wijzigingsaanvragen (spelers)</CardTitle></CardHeader><CardContent className="space-y-2">{session.change_requests.map(r => (<div key={r.id} className="flex items-center justify-between border rounded-lg p-3"><div className="text-sm"><div><span className="line-through text-muted-foreground">{r.old_name}</span> → <span className="font-medium">{r.new_name}</span></div><div className="text-xs text-muted-foreground">{r.reason} · {formatDateTime(r.ts)}</div></div><Badge className={r.status==='approved'?'bg-emerald-200 text-emerald-800':r.status==='rejected'?'bg-red-200 text-red-800':'bg-amber-200 text-amber-800'}>{r.status==='pending'?'In behandeling':r.status==='approved'?'Goedgekeurd':'Geweigerd'}</Badge></div>))}</CardContent></Card>)}
    {session.date_change_requests?.length > 0 && (<Card><CardHeader><CardTitle className="text-base">Onze datum-aanvragen</CardTitle></CardHeader><CardContent className="space-y-2">{session.date_change_requests.map(r => (<div key={r.id} className="flex items-center justify-between border rounded-lg p-3"><div className="text-sm"><div><span className="line-through text-muted-foreground">{formatDate(r.old_date)}</span> → <span className="font-medium">{formatDate(r.new_date)}</span></div><div className="text-xs text-muted-foreground">{r.reason} · {formatDateTime(r.ts)}{r.status !== 'pending' && r.decided_by ? ` · door ${r.decided_by}` : ''}</div></div><Badge className={r.status==='approved'?'bg-emerald-200 text-emerald-800':r.status==='rejected'?'bg-red-200 text-red-800':'bg-amber-200 text-amber-800'}>{r.status==='pending'?'Wacht op tegenploeg':r.status==='approved'?'Goedgekeurd':'Geweigerd'}</Badge></div>))}</CardContent></Card>)}
    {session.incoming_date_requests?.length > 0 && (<Card className="border-amber-300 bg-amber-50/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" />Datum-aanvragen van tegenploegen ({session.incoming_date_requests.length})</CardTitle><CardDescription>De tegenploeg vraagt om deze wedstrijden te verplaatsen. Ga akkoord of weiger.</CardDescription></CardHeader><CardContent className="space-y-2">{session.incoming_date_requests.map(r => (<div key={r.id} className="border rounded-lg p-3 bg-white space-y-2"><div><div className="font-medium text-sm">{r.match_info}</div><div className="text-sm"><span className="line-through text-muted-foreground">{formatDate(r.old_date)}</span> → <span className="font-medium">{formatDate(r.new_date)}</span></div><div className="text-xs text-muted-foreground">Aanvraag door {r.team_name} · {r.reason}</div></div><div className="flex gap-2 justify-end"><Button size="sm" variant="destructive" onClick={async () => { const reason = prompt('Reden om te weigeren?'); if (reason === null) return; const res = await api.post(`/date-change-requests/${r.id}/respond`, { team_code: session.team.code, agree: false, reason }); if (res.ok) { toast.success('Geweigerd'); refresh() } else toast.error(res.error || 'Fout') }}><XCircle className="w-3 h-3 mr-1" />Weiger</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => { const res = await api.post(`/date-change-requests/${r.id}/respond`, { team_code: session.team.code, agree: true }); if (res.ok) { toast.success('Akkoord, datum aangepast'); refresh() } else toast.error(res.error || 'Fout') }}><CheckCircle2 className="w-3 h-3 mr-1" />Akkoord</Button></div></div>))}</CardContent></Card>)}
    <Card><CardHeader><CardTitle className="text-base">Gespeelde wedstrijden ({done.length})</CardTitle></CardHeader><CardContent className="space-y-2">{done.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-emerald-50" onClick={() => setOpenMatch(m.id)}><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Speeldag {m.week} · {formatDate(m.date)}</div></div><span className="font-bold text-emerald-700">{m.points_home} - {m.points_away}</span></div>))}{done.length===0 && <p className="text-sm text-muted-foreground">Nog geen gespeelde wedstrijden.</p>}</CardContent></Card>
    {openMatch && typeof openMatch === 'object' && (<MatchFormDialog match={openMatch} teamCode={session.team.code} onClose={() => setOpenMatch(null)} onSaved={() => { setOpenMatch(null); refresh() }} />)}
    {openMatch && typeof openMatch === 'string' && (<MatchDetailDialog matchId={openMatch} onClose={() => setOpenMatch(null)} />)}
    {confirmMatch && (<ConfirmMatchDialog match={confirmMatch} teamCode={session.team.code} onClose={() => setConfirmMatch(null)} onSaved={() => { setConfirmMatch(null); refresh() }} />)}
    {changeReqPlayer && (<ChangeRequestDialog player={changeReqPlayer} teamCode={session.team.code} onClose={() => setChangeReqPlayer(null)} onSaved={() => { setChangeReqPlayer(null); refresh() }} />)}
    {dateReqMatch && (<DateChangeRequestDialog match={dateReqMatch} teamCode={session.team.code} onClose={() => setDateReqMatch(null)} onSaved={() => { setDateReqMatch(null); refresh() }} />)}
  </div>)
}

function DateChangeRequestDialog({ match, teamCode, onClose, onSaved }) {
  const [newDate, setNewDate] = useState((match.date || '').substring(0, 10))
  const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!newDate || newDate === (match.date || '').substring(0, 10)) return toast.error('Kies een andere datum')
    if (!reason.trim()) return toast.error('Reden verplicht')
    setSaving(true)
    const r = await api.post('/date-change-requests', { team_code: teamCode, match_id: match.id, new_date: new Date(newDate + 'T20:00:00').toISOString(), reason })
    setSaving(false)
    if (r.error) return toast.error(r.error)
    toast.success('Datum-aanvraag ingediend. Wacht op goedkeuring beheerder.'); onSaved()
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent><DialogHeader><DialogTitle>Aanvraag datum wijzigen</DialogTitle></DialogHeader><div className="space-y-3"><div className="bg-emerald-50 p-3 rounded text-sm"><div className="font-medium">{match.home_team_name} vs {match.away_team_name}</div><div className="text-xs text-muted-foreground">Huidige datum: {formatDate(match.date)}</div></div><div><Label>Nieuwe datum</Label><Input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} /></div><div><Label>Reden</Label><Textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Bv. tegenstander niet beschikbaar, café gesloten..." /></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>Indienen</Button></DialogFooter></DialogContent></Dialog>)
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
  // Alleen partijen van hetzelfde type tellen: enkel blokkeert enkel, dubbel blokkeert dubbel; enkel blokkeert NIET voor dubbel
  const usedIdsFor = (side, currentIdx) => { const map = {}; const type = games[currentIdx]?.type; games.forEach((g, i) => { if (i === currentIdx || g.type !== type) return; (g[side + '_players'] || []).forEach(pid => { if (!map[pid]) map[pid] = `partij ${i + 1}` }) }); return map }
  const toggleForfait = (idx, side) => setGames(gs => gs.map((g, i) => {
    if (i !== idx) return g
    if (side === 'home') { const on = !g.forfait_home; return { ...g, forfait_home: on, forfait_away: false, home_players: on ? [] : g.home_players, home_frames: on ? 0 : 0, away_frames: on ? 2 : 0 } }
    else { const on = !g.forfait_away; return { ...g, forfait_away: on, forfait_home: false, away_players: on ? [] : g.away_players, away_frames: on ? 0 : 0, home_frames: on ? 2 : 0 } }
  }))
  const onlySingles = !!detail?.only_singles_count
  const totals = useMemo(() => { let h=0,a=0; for (const g of games) { if (onlySingles && g.type === 'dubbel') continue; const hf=Number(g.home_frames),af=Number(g.away_frames); if (hf===2&&af===0)h+=2; else if (hf===0&&af===2)a+=2; else if (hf===2&&af===1){h+=2;a+=1} else if (hf===1&&af===2){h+=1;a+=2} } return {h,a} }, [games, onlySingles])
  const submit = async () => {
    const errs = validateGamesClient(games, detail, false)
    if (errs.length) { errs.slice(0,4).forEach(e => toast.error(e)); return }
    setSaving(true); const r = await api.post(`/matches/${match.id}/submit`, { team_code: teamCode, games, remarks }); setSaving(false)
    if (r.error) return showApiErrors(r); toast.success('Ingediend! Wacht op bevestiging tegenploeg.'); onSaved()
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Wedstrijdformulier</DialogTitle><DialogDescriptionCompat>{match.home_team_name} vs {match.away_team_name} · {formatDate(match.date)}</DialogDescriptionCompat></DialogHeader>{!detail ? <p>Laden...</p> : (<div className="space-y-3"><div className="grid grid-cols-2 gap-3 text-sm bg-emerald-50 p-3 rounded-lg"><div><div className="text-xs text-muted-foreground">Thuisploeg</div><div className="font-medium">{detail.home_team_name}</div></div><div><div className="text-xs text-muted-foreground">Uitploeg</div><div className="font-medium">{detail.away_team_name}</div></div></div><div className="text-center bg-emerald-600 text-white p-3 rounded-lg"><div className="text-xs opacity-80">Live tussenstand{onlySingles ? ' (alleen enkelwedstrijden tellen)' : ''}</div><div className="text-3xl font-bold">{totals.h} - {totals.a}</div></div>{onlySingles && <div className="text-xs bg-purple-50 border border-purple-200 text-purple-800 rounded p-2">Voor dit seizoen tellen <strong>alleen de enkelwedstrijden</strong> mee voor de uitslag en de ploegstand. De dubbels worden wel ingevuld en tellen mee voor het individuele klassement.</div>}<div className="text-xs text-muted-foreground bg-slate-50 border rounded p-2">Selectieregels: elke speler mag maximaal <strong>één enkelwedstrijd</strong> en maximaal <strong>één dubbelwedstrijd</strong> spelen. Een enkelwedstrijd blokkeert een speler niet voor de dubbels. Spelers die al ingezet zijn worden grijs/doorstreept getoond.</div>{GAME_TEMPLATE.map((tpl, idx) => (<div key={idx} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-2"><div className="font-medium flex items-center gap-2">{tpl.label} <Badge variant="outline">{tpl.type}</Badge></div><div className="flex gap-1 text-xs"><button type="button" onClick={()=>toggleForfait(idx,'home')} className={`px-2 py-1 rounded border ${games[idx].forfait_home?'bg-red-500 text-white border-red-500':'hover:bg-red-50'}`}>Thuis forfait</button><button type="button" onClick={()=>toggleForfait(idx,'away')} className={`px-2 py-1 rounded border ${games[idx].forfait_away?'bg-red-500 text-white border-red-500':'hover:bg-red-50'}`}>Uit forfait</button></div></div><div className="grid md:grid-cols-5 gap-2 items-end"><div className="md:col-span-2"><Label className="text-xs">Thuis {tpl.type==='dubbel'?'(2 spelers)':''}{games[idx].forfait_home && ' · FORFAIT'}</Label>{!games[idx].forfait_home && <PlayerPicker players={detail.home_players} multi={tpl.type==='dubbel'} value={games[idx].home_players} onChange={(v)=>updateGame(idx,'home_players',v)} matchDate={detail.date} usedIds={usedIdsFor('home', idx)} type={tpl.type} />}</div><div><Label className="text-xs">Sets</Label><div className="flex items-center gap-1"><SetSelect value={games[idx].home_frames} onChange={v=>updateGame(idx,'home_frames',v)} /><span>-</span><SetSelect value={games[idx].away_frames} onChange={v=>updateGame(idx,'away_frames',v)} /></div></div><div className="md:col-span-2"><Label className="text-xs">Uit {tpl.type==='dubbel'?'(2 spelers)':''}{games[idx].forfait_away && ' · FORFAIT'}</Label>{!games[idx].forfait_away && <PlayerPicker players={detail.away_players} multi={tpl.type==='dubbel'} value={games[idx].away_players} onChange={(v)=>updateGame(idx,'away_players',v)} matchDate={detail.date} usedIds={usedIdsFor('away', idx)} type={tpl.type} />}</div></div></div>))}<div><Label>Opmerkingen</Label><Textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Optioneel" /></div></div>)}<DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>{saving?'Opslaan...':'Bevestigen & Indienen'}</Button></DialogFooter></DialogContent></Dialog>)
}
function SetSelect({ value, onChange }) { return (<select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={e=>onChange(Number(e.target.value))}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select>) }
function PlayerPicker({ players, multi, value, onChange, matchDate, usedIds, allowReuse, type }) {
  const typeLabel = type === 'dubbel' ? 'dubbelwedstrijd' : 'enkelwedstrijd'
  const options = useMemo(() => {
    const md = matchDate ? new Date(matchDate) : new Date()
    const selected = new Set(value || [])
    const used = Array.isArray(usedIds) ? Object.fromEntries(usedIds.map(id => [id, 'een andere partij'])) : (usedIds || {})
    return players.filter(p => {
      if (selected.has(p.id)) return true // altijd tonen wat al geselecteerd is
      if (p.is_placeholder || p.active === false) return false
      if (p.can_play_from && new Date(p.can_play_from) > md) return false // nog niet speelgerechtigd: niet selecteerbaar
      return true
    }).map(p => {
      let reason = null
      if (!selected.has(p.id) && used[p.id] && !allowReuse) reason = `${p.name} speelt al een ${typeLabel} in ${used[p.id]} – een speler mag maximaal één ${typeLabel} per wedstrijdblad spelen`
      return { ...p, reason }
    }).sort((a, b) => a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' }))
  }, [players, matchDate, value, usedIds, allowReuse, typeLabel])
  if (!multi) return (<select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={value[0] || ''} onChange={e => { const id = e.target.value; const opt = options.find(o => o.id === id); if (opt?.reason) { toast.error(opt.reason); return } onChange(id ? [id] : []) }}><option value="">-- Kies speler --</option>{options.map(p => <option key={p.id} value={p.id} disabled={!!p.reason}>{p.name}{p.reason ? ` (al ingezet in ${(usedIds||{})[p.id]})` : ''}</option>)}</select>)
  const toggle = (p) => {
    if (value.includes(p.id)) return onChange(value.filter(v => v !== p.id))
    if (p.reason) return toast.error(p.reason)
    if (value.length >= 2) return toast.error('Een dubbelwedstrijd heeft precies 2 spelers per ploeg. Deselecteer eerst een speler.')
    onChange([...value, p.id])
  }
  return (<div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 border rounded-md bg-background">{options.length === 0 && <span className="text-xs text-muted-foreground">Geen selecteerbare spelers</span>}{options.map(p => (<button type="button" key={p.id} onClick={()=>toggle(p)} title={p.reason || ''} aria-disabled={!!p.reason} className={`px-2 py-1 text-xs rounded border ${value.includes(p.id)?'bg-emerald-600 text-white border-emerald-600':(p.reason?'bg-slate-100 text-slate-400 border-dashed cursor-not-allowed line-through':'bg-white')}`}>{p.name}</button>))}</div>)
}

// Client-side validatie van spelersselectie (zelfde regels als backend validateMatchGames)
function validateGamesClient(games, detail, allowReuse) {
  const errors = []
  const nameOf = (id) => [...(detail?.home_players||[]), ...(detail?.away_players||[])].find(p => p.id === id)?.name || 'speler'
  const seen = { home: { enkel: {}, dubbel: {} }, away: { enkel: {}, dubbel: {} } }
  const typeLabel = { enkel: 'enkelwedstrijd', dubbel: 'dubbelwedstrijd' }
  games.forEach((g, idx) => {
    const type = g.type === 'dubbel' ? 'dubbel' : 'enkel'; const need = type === 'dubbel' ? 2 : 1; const label = `Partij ${idx+1}`
    for (const side of ['home','away']) {
      const ids = g[side+'_players'] || []; const forfait = side === 'home' ? g.forfait_home : g.forfait_away
      if (!forfait && ids.length !== need) { errors.push(`${label}: selecteer ${need} ${side==='home'?'thuis':'uit'}-speler${need>1?'s':''} (of markeer forfait)`); continue }
      const inGame = new Set()
      for (const pid of ids) {
        if (inGame.has(pid)) { errors.push(`${label}: ${nameOf(pid)} staat twee keer in dezelfde ${typeLabel[type]}`); continue }
        inGame.add(pid)
        if (!allowReuse) { const prev = seen[side][type][pid]; if (prev) errors.push(`${label}: ${nameOf(pid)} speelt al een ${typeLabel[type]} in partij ${prev} (max. één ${typeLabel[type]} per speler)`); else seen[side][type][pid] = idx+1 }
      }
    }
    const hf=Number(g.home_frames), af=Number(g.away_frames)
    const valid = (hf===2&&af===0)||(hf===0&&af===2)||(hf===2&&af===1)||(hf===1&&af===2)
    if (!valid) errors.push(`${label}: ongeldige set-uitslag (${hf}-${af}); geldig is 2-0, 2-1, 1-2 of 0-2`)
  })
  return errors
}
const showApiErrors = (r, fallback) => { if (Array.isArray(r?.errors) && r.errors.length) { r.errors.slice(0,4).forEach(e => toast.error(e)); return } toast.error(r?.error || fallback || 'Fout') }

// --------- ADMIN ---------
function AdminPortal({ adminCode, setAdminCode }) {
  const [code, setCode] = useState(''); const [loading, setLoading] = useState(false)
  const login = async () => { setLoading(true); const r = await api.post('/auth/admin', { code }); setLoading(false); if (r.error) return toast.error('Ongeldige admincode'); setAdminCode(r.token); localStorage.setItem('admin_code', r.token); toast.success('Welkom beheerder!') }
  if (!adminCode) return (<div className="container mx-auto px-4 py-10 max-w-md"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Admin</CardTitle><CardDescription>Log in als beheerder.</CardDescription></CardHeader><CardContent className="space-y-3"><Label>Admincode</Label><Input placeholder="Admincode" type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&login()} /><Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={login} disabled={loading}>Inloggen</Button><div className="text-xs text-muted-foreground pt-2 border-t">Enkel voor de competitieverantwoordelijke.</div></CardContent></Card></div>)
  return <AdminDashboard adminCode={adminCode} logout={() => { localStorage.removeItem('admin_code'); setAdminCode(null) }} />
}

function AdminDashboard({ adminCode, logout }) {
  const [tab, setTab] = useState('dashboard')
  const H = { 'x-admin-code': adminCode }
  const [dash, setDash] = useState(null); const [reqs, setReqs] = useState([]); const [dateReqs, setDateReqs] = useState([]); const [teams, setTeams] = useState([]); const [players, setPlayers] = useState([]); const [logs, setLogs] = useState([]); const [settings, setSettings] = useState(null); const [matches, setMatches] = useState([]); const [seasons, setSeasons] = useState([])
  const load = async () => {
    if (tab==='dashboard') setDash(await api.get('/admin/dashboard', H))
    if (tab==='requests') setReqs(await api.get('/admin/change-requests', H))
    if (tab==='daterequests') setDateReqs(await api.get('/admin/date-change-requests', H))
    if (tab==='teams') { setTeams(await api.get('/admin/teams-full', H)); setPlayers(await api.get('/admin/players-full', H)) }
    if (tab==='players') { setTeams(await api.get('/admin/teams-full', H)); setPlayers(await api.get('/admin/players-full', H)) }
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
    { id: 'daterequests', label: 'Datum-aanvragen', icon: CalendarDays },
    { id: 'teams', label: 'Ploegen', icon: Users },
    { id: 'players', label: 'Spelers', icon: User },
    { id: 'logs', label: 'Audit Log', icon: FileText },
    { id: 'settings', label: 'Instellingen', icon: SettingsIcon },
    { id: 'seasons', label: 'Seizoenen', icon: Archive },
  ]
  return (<div className="container mx-auto px-4 py-6 space-y-4">
    <Card><CardHeader className="flex-row justify-between items-center"><div><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Admin Dashboard</CardTitle><CardDescription>Volledig beheer van de competitie.</CardDescription></div><Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" />Uitloggen</Button></CardHeader></Card>
    <div className="flex flex-wrap gap-2">{tabs.map(t => (<Button key={t.id} variant={tab===t.id?'default':'outline'} size="sm" className={tab===t.id?'bg-emerald-600 hover:bg-emerald-700':''} onClick={() => setTab(t.id)}><t.icon className="w-4 h-4 mr-1" />{t.label}</Button>))}</div>
    {tab==='dashboard' && dash && (<div className="grid md:grid-cols-4 gap-4"><StatCard icon={AlertCircle} label="Wacht op bevestiging" val={dash.submitted} color="amber" /><StatCard icon={XCircle} label="Betwiste wedstrijden" val={dash.disputed} color="red" /><StatCard icon={Edit3} label="Speler-aanvragen" val={dash.pending_change_requests} color="blue" /><StatCard icon={CalendarDays} label="Datum-aanvragen" val={dash.pending_date_requests || 0} color="purple" /><Card className="md:col-span-4"><CardHeader><CardTitle className="text-base">Recente audit log</CardTitle></CardHeader><CardContent><div className="space-y-1 text-xs">{dash.recent_logs.map(l => (<div key={l.id} className="flex justify-between border-b pb-1"><span><strong>{l.actor}</strong> · {l.action}</span><span className="text-muted-foreground">{formatDateTime(l.ts)}</span></div>))}</div></CardContent></Card></div>)}
    {tab==='matches' && (<AdminMatches matches={matches} adminCode={adminCode} reload={load} />)}
    {tab==='kalender' && (<AdminKalender matches={matches} teams={teams} adminCode={adminCode} reload={load} />)}
    {tab==='requests' && (<AdminRequests reqs={reqs} adminCode={adminCode} reload={load} />)}
    {tab==='daterequests' && (<AdminDateRequests reqs={dateReqs} adminCode={adminCode} reload={load} />)}
    {tab==='teams' && (<AdminTeams teams={teams} players={players} adminCode={adminCode} reload={load} />)}
    {tab==='players' && (<AdminPlayers teams={teams} players={players} adminCode={adminCode} reload={load} />)}
    {tab==='logs' && (<Card><CardHeader><CardTitle>Audit Log</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Datum/tijd</TableHead><TableHead>Actor</TableHead><TableHead>Actie</TableHead><TableHead>Entiteit</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>{logs.map(l => (<TableRow key={l.id}><TableCell className="text-xs whitespace-nowrap">{formatDateTime(l.ts)}</TableCell><TableCell className="font-medium">{l.actor}</TableCell><TableCell><Badge variant="outline">{l.action}</Badge></TableCell><TableCell className="text-xs">{l.entity}</TableCell><TableCell className="text-xs text-muted-foreground max-w-xs truncate">{JSON.stringify(l.new_value || l.old_value || {})}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}
    {tab==='settings' && settings && (<AdminSettings settings={settings} adminCode={adminCode} reload={load} />)}
    {tab==='seasons' && (<AdminSeasons seasons={seasons} adminCode={adminCode} reload={load} />)}
  </div>)
}

const StatCard = ({ icon: Icon, label, val, color }) => (<Card><CardContent className="p-6 flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${color}-100 text-${color}-700`}><Icon className="w-6 h-6" /></div><div><div className="text-3xl font-bold">{val}</div><div className="text-sm text-muted-foreground">{label}</div></div></CardContent></Card>)

function AdminMatches({ matches, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [editMatch, setEditMatch] = useState(null)
  const pending = matches.filter(m => ['submitted','disputed'].includes(m.status))
  const finished = matches.filter(m => ['confirmed','admin_approved'].includes(m.status))
  const approve = async (id) => { const m = matches.find(x => x.id === id); const r = await api.post(`/admin/matches/${id}/approve`, { games: m.games }, H); if (r.ok) { toast.success('Wedstrijd goedgekeurd'); reload() } }
  return (<div className="space-y-4">
    <Card><CardHeader><CardTitle>Actie vereist ({pending.length})</CardTitle></CardHeader><CardContent className="space-y-2">
      {pending.length===0 && <p className="text-sm text-muted-foreground">Geen wedstrijden die actie vereisen.</p>}
      {pending.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">Uitslag: {m.points_home}-{m.points_away} · {statusMap[m.status]?.label}{m.dispute_reason && ` · ${m.dispute_reason}`}</div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditMatch(m)}><Edit3 className="w-3 h-3 mr-1" />Bewerk</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(m.id)}>Goedkeuren als admin</Button></div></div>))}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Gespeelde wedstrijden ({finished.length})</CardTitle><CardDescription>Admin kan uitslagen aanpassen. Wijzigingen worden gelogd in de audit log.</CardDescription></CardHeader><CardContent className="space-y-2">
      {finished.map(m => (<div key={m.id} className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-2"><div><div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div><div className="text-xs text-muted-foreground">{formatDate(m.date)} · Uitslag: {m.points_home}-{m.points_away} · {statusMap[m.status]?.label}</div></div><Button size="sm" variant="outline" onClick={() => setEditMatch(m)}><Edit3 className="w-3 h-3 mr-1" />Bewerk uitslag</Button></div>))}
      {finished.length===0 && <p className="text-sm text-muted-foreground">Nog geen bevestigde wedstrijden.</p>}
    </CardContent></Card>
    {editMatch && (<AdminMatchEditDialog match={editMatch} adminCode={adminCode} onClose={() => setEditMatch(null)} onSaved={() => { setEditMatch(null); reload() }} />)}
  </div>)
}

function AdminMatchEditDialog({ match, adminCode, onClose, onSaved }) {
  const [detail, setDetail] = useState(null)
  const [games, setGames] = useState(null)
  const [saving, setSaving] = useState(false)
  const [allowReuse, setAllowReuse] = useState(false)
  useEffect(() => { api.get(`/matches/${match.id}`).then(d => { setDetail(d); const existing = d.games || GAME_TEMPLATE.map(g => ({ type: g.type, home_players: [], away_players: [], home_frames: 0, away_frames: 0, forfait_home: false, forfait_away: false })); setGames(existing) }) }, [match.id])
  const updateGame = (idx, field, val) => setGames(gs => gs.map((g, i) => i === idx ? { ...g, [field]: val } : g))
  const usedIdsFor = (side, currentIdx) => { if (!games) return {}; const map = {}; const type = games[currentIdx]?.type; games.forEach((g, i) => { if (i === currentIdx || g.type !== type) return; (g[side + '_players'] || []).forEach(pid => { if (!map[pid]) map[pid] = `partij ${i + 1}` }) }); return map }
  const onlySingles = !!detail?.only_singles_count
  const totals = useMemo(() => { if (!games) return {h:0,a:0}; let h=0,a=0; for (const g of games) { if (onlySingles && g.type === 'dubbel') continue; const hf=Number(g.home_frames),af=Number(g.away_frames); if (hf===2&&af===0)h+=2; else if (hf===0&&af===2)a+=2; else if (hf===2&&af===1){h+=2;a+=1} else if (hf===1&&af===2){h+=1;a+=2} } return {h,a} }, [games, onlySingles])
  const save = async () => {
    const errs = validateGamesClient(games, detail, allowReuse)
    if (errs.length) { errs.slice(0,4).forEach(e => toast.error(e)); return }
    setSaving(true)
    const r = await api.post(`/admin/matches/${match.id}/approve`, { games, allow_reuse: allowReuse }, { 'x-admin-code': adminCode })
    setSaving(false)
    if (r.ok) { toast.success(`Uitslag opgeslagen: ${r.points_home}-${r.points_away}`); onSaved() }
    else showApiErrors(r)
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Admin: wedstrijd bewerken</DialogTitle><DialogDescriptionCompat>{match.home_team_name} vs {match.away_team_name} · {formatDate(match.date)}</DialogDescriptionCompat></DialogHeader>
    {!detail || !games ? <p>Laden...</p> : (<div className="space-y-3"><div className="flex items-center justify-between bg-blue-50 p-3 rounded"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={allowReuse} onChange={e=>setAllowReuse(e.target.checked)} /><span>Admin-override: een speler mag meer dan één enkel- of dubbelwedstrijd spelen</span></label><Badge variant="outline" className={allowReuse?'bg-amber-100':''}>{allowReuse?'Override AAN':'Standaard'}</Badge></div><div className="text-center bg-blue-600 text-white p-3 rounded-lg"><div className="text-xs opacity-80">Nieuwe stand na opslaan{onlySingles ? ' (alleen enkelwedstrijden tellen)' : ''}</div><div className="text-3xl font-bold">{totals.h} - {totals.a}</div></div>{GAME_TEMPLATE.map((tpl, idx) => (<div key={idx} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-2"><div className="font-medium">{tpl.label} <Badge variant="outline">{tpl.type}</Badge></div></div><div className="grid md:grid-cols-5 gap-2 items-end"><div className="md:col-span-2"><Label className="text-xs">Thuis</Label><PlayerPicker players={detail.home_players} multi={tpl.type==='dubbel'} value={games[idx].home_players} onChange={(v)=>updateGame(idx,'home_players',v)} matchDate={detail.date} usedIds={usedIdsFor('home', idx)} allowReuse={allowReuse} type={tpl.type} /></div><div><Label className="text-xs">Sets</Label><div className="flex items-center gap-1"><SetSelect value={games[idx].home_frames} onChange={v=>updateGame(idx,'home_frames',v)} /><span>-</span><SetSelect value={games[idx].away_frames} onChange={v=>updateGame(idx,'away_frames',v)} /></div></div><div className="md:col-span-2"><Label className="text-xs">Uit</Label><PlayerPicker players={detail.away_players} multi={tpl.type==='dubbel'} value={games[idx].away_players} onChange={(v)=>updateGame(idx,'away_players',v)} matchDate={detail.date} usedIds={usedIdsFor('away', idx)} allowReuse={allowReuse} type={tpl.type} /></div></div></div>))}</div>)}
    <DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>{saving?'Opslaan...':'Opslaan als admin'}</Button></DialogFooter>
  </DialogContent></Dialog>)
}

function AdminRequests({ reqs, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const decide = async (id, action) => { const r = await api.post(`/admin/change-requests/${id}/${action}`, {}, H); if (r.ok) { toast.success(action==='approve'?'Goedgekeurd':'Geweigerd'); reload() } }
  return (<Card><CardHeader><CardTitle>Wijzigingsaanvragen spelersnamen</CardTitle></CardHeader><CardContent className="space-y-2">
    {reqs.length===0 && <p className="text-sm text-muted-foreground">Geen aanvragen.</p>}
    {reqs.map(r => (<div key={r.id} className="border rounded-lg p-3"><div className="flex items-center justify-between"><div><div className="text-sm"><span className="text-muted-foreground">{r.team_name}:</span> <span className="line-through">{r.old_name}</span> → <span className="font-medium">{r.new_name}</span></div><div className="text-xs text-muted-foreground">Reden: {r.reason} · {formatDateTime(r.ts)}</div></div>{r.status==='pending' ? (<div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => decide(r.id, 'reject')}>Weiger</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide(r.id, 'approve')}>Keur goed</Button></div>) : (<Badge className={r.status==='approved'?'bg-emerald-200 text-emerald-800':'bg-red-200 text-red-800'}>{r.status}</Badge>)}</div></div>))}
  </CardContent></Card>)
}

function AdminDateRequests({ reqs, adminCode, reload }) {
  return (<Card><CardHeader><CardTitle>Datum-wijzigingsaanvragen (melding)</CardTitle><CardDescription>De aanvraag wordt beoordeeld door de tegenploeg. Deze pagina toont enkel een overzicht ter info.</CardDescription></CardHeader><CardContent className="space-y-2">
    {reqs.length===0 && <p className="text-sm text-muted-foreground">Geen aanvragen.</p>}
    {reqs.map(r => (<div key={r.id} className="border rounded-lg p-3"><div className="flex items-center justify-between flex-wrap gap-2"><div><div className="text-sm"><span className="text-muted-foreground">{r.team_name} vraagt:</span> <span className="line-through">{formatDate(r.old_date)}</span> → <span className="font-medium">{formatDate(r.new_date)}</span></div><div className="text-xs text-muted-foreground">Reden: {r.reason} · {formatDateTime(r.ts)}{r.decided_by ? ` · beslist door ${r.decided_by}` : ''}{r.reject_reason ? ` · reden weigering: ${r.reject_reason}` : ''}</div></div><Badge className={r.status==='approved'?'bg-emerald-200 text-emerald-800':r.status==='rejected'?'bg-red-200 text-red-800':'bg-amber-200 text-amber-800'}>{r.status==='pending'?'Wacht op tegenploeg':r.status==='approved'?'Goedgekeurd':'Geweigerd'}</Badge></div></div>))}
  </CardContent></Card>)
}

function AdminTeams({ teams, players, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [newTeam, setNewTeam] = useState('')
  const [revealed, setRevealed] = useState({})
  const [editTeam, setEditTeam] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const addTeam = async () => { if (!newTeam.trim()) return; const r = await api.post('/admin/teams', { name: newTeam }, H); if (r.id) { toast.success(`Ploeg ${r.name} aangemaakt. Bekijk de ploegcode via het oog-icoon.`); setNewTeam(''); reload() } else toast.error(r.error || 'Fout') }
  const delTeam = async (id) => { if (!confirm('Ploeg verwijderen? Alle spelers worden ook verwijderd.')) return; await api.del(`/admin/teams/${id}`, H); toast.success('Ploeg verwijderd'); reload() }
  const confirmReset = async () => { if (!resetTarget) return; const r = await api.post(`/admin/teams/${resetTarget.id}/reset-code`, {}, H); if (r.code) { toast.success(`Nieuwe code voor ${resetTarget.name} ingesteld. De oude code werkt niet meer.`); setRevealed(v => ({ ...v, [resetTarget.id]: true })); reload() } else toast.error(r.error || 'Fout'); setResetTarget(null) }
  const copyCode = async (t) => { try { await navigator.clipboard.writeText(t.code); toast.success(`Ploegcode van ${t.name} gekopieerd`) } catch { toast.error('Kopiëren mislukt') } }
  const countFor = (tid) => players.filter(p => p.team_id === tid && !p.is_placeholder).length
  const mask = (code) => (code || '').replace(/[A-Z0-9]/gi, '•')
  return (<div className="space-y-4">
    <Card><CardHeader><CardTitle>Ploegen ({teams.length})</CardTitle><CardDescription>Ploegcodes zijn wachtwoorden: ze worden standaard verborgen. Gebruik het oog-icoon om een code tijdelijk te tonen. Spelers beheer je in het tabblad "Spelers".</CardDescription></CardHeader><CardContent><div className="flex gap-2 mb-3"><Input data-testid="new-team-input" placeholder="Nieuwe ploegnaam" value={newTeam} onChange={e=>setNewTeam(e.target.value)} /><Button data-testid="add-team-btn" onClick={addTeam} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />Toevoegen</Button></div>
    <Table><TableHeader><TableRow><TableHead>Ploeg</TableHead><TableHead>Spelers</TableHead><TableHead>Ploegcode</TableHead><TableHead className="text-right">Acties</TableHead></TableRow></TableHeader><TableBody>{teams.map(t => (<TableRow key={t.id} data-testid={`team-row-${t.id}`}><TableCell className="font-medium">{t.name}</TableCell><TableCell className="text-muted-foreground">{countFor(t.id)}</TableCell><TableCell><div className="flex items-center gap-1"><code data-testid={`team-code-${t.id}`} className="bg-slate-100 px-2 py-1 rounded text-xs font-mono tracking-wider min-w-[90px] inline-block">{revealed[t.id] ? t.code : mask(t.code)}</code><Button data-testid={`toggle-code-${t.id}`} size="sm" variant="ghost" title={revealed[t.id] ? 'Verbergen' : 'Tonen'} onClick={() => setRevealed(v => ({ ...v, [t.id]: !v[t.id] }))}>{revealed[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</Button><Button data-testid={`copy-code-${t.id}`} size="sm" variant="ghost" title="Kopiëren" onClick={() => copyCode(t)}><Copy className="w-3.5 h-3.5" /></Button></div></TableCell><TableCell className="text-right whitespace-nowrap"><Button data-testid={`edit-team-${t.id}`} size="sm" variant="outline" className="mr-1" title="Naam / code aanpassen" onClick={() => setEditTeam(t)}><Edit3 className="w-3 h-3 mr-1" />Beheer</Button><Button data-testid={`reset-code-${t.id}`} size="sm" variant="outline" className="mr-1" onClick={() => setResetTarget(t)}><RefreshCw className="w-3 h-3 mr-1" />Reset code</Button><Button data-testid={`delete-team-${t.id}`} size="sm" variant="destructive" onClick={() => delTeam(t.id)}><Trash2 className="w-3 h-3" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
    {editTeam && <TeamEditDialog team={editTeam} adminCode={adminCode} onClose={() => setEditTeam(null)} onSaved={() => { setEditTeam(null); reload() }} />}
    <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Ploegcode opnieuw instellen?</AlertDialogTitle><AlertDialogDescription>Er wordt een nieuwe willekeurige ploegcode gegenereerd voor <strong>{resetTarget?.name}</strong>. De huidige code werkt daarna niet meer; de ploeg moet de nieuwe code (of QR-code) ontvangen om in te loggen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction data-testid="reset-code-confirm" className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmReset}>Nieuwe code genereren</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>)
}

function TeamEditDialog({ team, adminCode, onClose, onSaved }) {
  const H = { 'x-admin-code': adminCode }
  const [name, setName] = useState(team.name || ''); const [code, setCode] = useState(team.code || ''); const [showCode, setShowCode] = useState(false); const [saving, setSaving] = useState(false)
  const save = async () => {
    const payload = {}
    if (name.trim() !== team.name) payload.name = name.trim()
    if (code.trim().toUpperCase() !== team.code) payload.code = code.trim().toUpperCase()
    if (!Object.keys(payload).length) return toast.info('Geen wijzigingen')
    if (payload.code && !confirm(`Ploegcode wijzigen? De oude code werkt daarna niet meer voor ${team.name}.`)) return
    setSaving(true); const r = await api.patch(`/admin/teams/${team.id}`, payload, H); setSaving(false)
    if (r.error) return toast.error(r.error)
    toast.success('Ploeg bijgewerkt'); onSaved()
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Ploeg beheren</DialogTitle><DialogDescriptionCompat>Pas de naam of de ploegcode (login) van {team.name} aan.</DialogDescriptionCompat></DialogHeader>
    <div className="space-y-3">
      <div><Label>Ploegnaam</Label><Input data-testid="team-name-input" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div><Label>Ploegcode (login)</Label><div className="flex gap-1"><Input data-testid="team-code-input" type={showCode ? 'text' : 'password'} autoComplete="off" className="font-mono uppercase" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} /><Button type="button" variant="outline" size="icon" onClick={() => setShowCode(v => !v)} title={showCode ? 'Verbergen' : 'Tonen'}>{showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button></div><div className="text-[11px] text-muted-foreground mt-1">Minstens 6 tekens; enkel letters, cijfers en streepjes. Moet uniek zijn.</div></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button data-testid="team-save-btn" className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</Button></DialogFooter></DialogContent></Dialog>)
}

const toDateInput = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d.getTime())) return ''; const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
const fromDateInput = (v) => v ? new Date(v + 'T00:00:00').toISOString() : null

function PlayerEditDialog({ player, teams, adminCode, onClose, onSaved }) {
  const H = { 'x-admin-code': adminCode }
  const isNew = !player?.player_id
  const [form, setForm] = useState({ name: player?.name || '', team_id: player?.team_id || (teams[0]?.id || ''), joined_at: toDateInput(player?.joined_at) || (isNew ? toDateInput(new Date().toISOString()) : ''), can_play_from: toDateInput(player?.can_play_from), active: player ? player.active !== false : true, locked: player ? player.locked !== false : true, is_placeholder: !!player?.is_placeholder })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const teamChanged = !isNew && form.team_id !== player.team_id
  const save = async () => {
    if (!form.name.trim()) return toast.error('Naam is verplicht')
    if (!form.team_id) return toast.error('Kies een ploeg')
    setSaving(true)
    const payload = { name: form.name.trim(), team_id: form.team_id, active: form.active, locked: form.locked, is_placeholder: form.is_placeholder, joined_at: fromDateInput(form.joined_at), can_play_from: fromDateInput(form.can_play_from) }
    if (isNew && !payload.can_play_from) delete payload.can_play_from
    if (isNew && !payload.joined_at) delete payload.joined_at
    const r = isNew ? await api.post('/admin/players', payload, H) : await api.patch(`/admin/players/${player.player_id}`, payload, H)
    setSaving(false)
    if (r.error) return toast.error(r.error)
    toast.success(isNew ? `Speler ${payload.name} toegevoegd` : 'Speler bijgewerkt')
    onSaved()
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{isNew ? 'Nieuwe speler' : `Speler bewerken`}</DialogTitle><DialogDescriptionCompat>{isNew ? 'Vul de gegevens van de nieuwe speler in.' : `Alle gegevens van ${player.name} zijn aanpasbaar.`}</DialogDescriptionCompat></DialogHeader>
    <div className="space-y-3">
      <div><Label>Naam</Label><Input data-testid="player-name-input" value={form.name} onChange={e=>set('name', e.target.value)} placeholder="Voornaam Achternaam" /></div>
      <div><Label>Ploeg</Label><select data-testid="player-team-select" className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.team_id} onChange={e=>set('team_id', e.target.value)}><option value="">-- Kies ploeg --</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{teamChanged && <div className="text-xs text-amber-700 mt-1 flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" />Speler verhuist van {player.team_name} naar {teams.find(t=>t.id===form.team_id)?.name}. Gespeelde wedstrijden blijven bij de oude ploeg geregistreerd.</div>}</div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Lid sinds</Label><Input data-testid="player-joined-input" type="date" value={form.joined_at} onChange={e=>set('joined_at', e.target.value)} /></div><div><Label>Speelgerechtigd vanaf</Label><Input data-testid="player-canplay-input" type="date" value={form.can_play_from} onChange={e=>set('can_play_from', e.target.value)} /><div className="text-[11px] text-muted-foreground mt-1">{isNew && !form.can_play_from ? 'Leeg = automatisch 2 maanden na lid sinds' : 'Leeg = onmiddellijk speelgerechtigd'}</div></div></div>
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Actief</div><div className="text-xs text-muted-foreground">Inactieve spelers kunnen niet op het wedstrijdblad geselecteerd worden.</div></div><Switch data-testid="player-active-switch" checked={form.active} onCheckedChange={v=>set('active', v)} /></div>
        <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Naam vergrendeld</div><div className="text-xs text-muted-foreground">Ploegen moeten een naamswijziging aanvragen bij de admin.</div></div><Switch data-testid="player-locked-switch" checked={form.locked} onCheckedChange={v=>set('locked', v)} /></div>
        <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Placeholder</div><div className="text-xs text-muted-foreground">"Speler te kort"-plaats, niet inzetbaar en niet in klassement.</div></div><Switch data-testid="player-placeholder-switch" checked={form.is_placeholder} onCheckedChange={v=>set('is_placeholder', v)} /></div>
      </div>
      {!isNew && <div className="text-xs text-muted-foreground">Komt voor op <strong>{player.match_count || 0}</strong> wedstrijdblad{player.match_count === 1 ? '' : 'en'}.</div>}
    </div>
    <DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button data-testid="player-save-btn" className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : (isNew ? 'Toevoegen' : 'Opslaan')}</Button></DialogFooter></DialogContent></Dialog>)
}

function AdminPlayers({ teams, players, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [search, setSearch] = useState(''); const [teamFilter, setTeamFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name'); const [sortDir, setSortDir] = useState('asc')
  const [editing, setEditing] = useState(null) // null | {} (new) | player
  const [toDelete, setToDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const toggleSort = (key) => { if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('asc') } }
  const sortIcon = (key) => sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = players.filter(p => {
      if (teamFilter && p.team_id !== teamFilter) return false
      if (statusFilter === 'active' && (p.active === false || p.is_placeholder)) return false
      if (statusFilter === 'inactive' && (p.active !== false || p.is_placeholder)) return false
      if (statusFilter === 'placeholder' && !p.is_placeholder) return false
      if (q && !(p.name || '').toLowerCase().includes(q) && !(p.team_name || '').toLowerCase().includes(q)) return false
      return true
    })
    const cmp = (a, b) => {
      let av, bv
      if (sortBy === 'team') { av = a.team_name || ''; bv = b.team_name || '' }
      else if (sortBy === 'can_play') { av = a.can_play_from || ''; bv = b.can_play_from || '' }
      else if (sortBy === 'joined') { av = a.joined_at || ''; bv = b.joined_at || '' }
      else if (sortBy === 'matches') { const r = (a.match_count||0) - (b.match_count||0); return sortDir === 'asc' ? r : -r }
      else if (sortBy === 'status') { av = a.is_placeholder ? 'z' : (a.active === false ? 'y' : 'a'); bv = b.is_placeholder ? 'z' : (b.active === false ? 'y' : 'a') }
      else { av = a.name || ''; bv = b.name || '' }
      const r = String(av).localeCompare(String(bv), 'nl', { sensitivity: 'base' })
      return sortDir === 'asc' ? r : -r
    }
    return list.sort(cmp)
  }, [players, search, teamFilter, statusFilter, sortBy, sortDir])
  const counts = useMemo(() => ({ total: players.filter(p=>!p.is_placeholder).length, active: players.filter(p => p.active !== false && !p.is_placeholder).length, inactive: players.filter(p => p.active === false && !p.is_placeholder).length }), [players])
  const toggleActive = async (p) => {
    setBusyId(p.player_id)
    const r = await api.patch(`/admin/players/${p.player_id}`, { active: p.active === false }, H)
    setBusyId(null)
    if (r.error) return toast.error(r.error)
    toast.success(p.active === false ? `${p.name} geactiveerd` : `${p.name} gedeactiveerd`); reload()
  }
  const confirmDelete = async () => {
    if (!toDelete) return
    const r = await api.del(`/admin/players/${toDelete.player_id}`, H)
    if (r.error) { toast.error(r.error); setToDelete(null); return }
    toast.success(`${toDelete.name} definitief verwijderd`); setToDelete(null); reload()
  }
  const now = new Date()
  return (<div className="space-y-4">
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>Spelersbeheer</CardTitle><CardDescription>{counts.total} spelers · {counts.active} actief · {counts.inactive} inactief. Klik op een kolomkop om te sorteren.</CardDescription></div><Button data-testid="new-player-btn" className="bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" />Nieuwe speler</Button></CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-4 gap-2 mb-3">
          <div className="relative md:col-span-2"><Search className="w-4 h-4 absolute left-2.5 top-3 text-muted-foreground" /><Input data-testid="player-search" className="pl-8" placeholder="Zoek op naam of ploeg..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <select data-testid="player-team-filter" className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}><option value="">Alle ploegen</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select data-testid="player-status-filter" className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Alle statussen</option><option value="active">Actief</option><option value="inactive">Inactief</option><option value="placeholder">Placeholder</option></select>
        </div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('name')}>Speler{sortIcon('name')}</TableHead>
          <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('team')}>Ploeg{sortIcon('team')}</TableHead>
          <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('joined')}>Lid sinds{sortIcon('joined')}</TableHead>
          <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('can_play')}>Speelgerechtigd{sortIcon('can_play')}</TableHead>
          <TableHead className="cursor-pointer select-none text-center" onClick={()=>toggleSort('matches')}>Wedstrijden{sortIcon('matches')}</TableHead>
          <TableHead className="cursor-pointer select-none" onClick={()=>toggleSort('status')}>Status{sortIcon('status')}</TableHead>
          <TableHead className="text-right">Acties</TableHead>
        </TableRow></TableHeader><TableBody>
          {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Geen spelers gevonden.</TableCell></TableRow>}
          {filtered.map(p => { const cpf = p.can_play_from ? new Date(p.can_play_from) : null; const notYet = cpf && cpf > now; const inactive = p.active === false; const hasHistory = (p.match_count || 0) > 0
            return (<TableRow key={p.player_id} data-testid={`player-row-${p.player_id}`} className={p.is_placeholder ? 'bg-slate-50' : (inactive ? 'opacity-60' : '')}>
              <TableCell className="font-medium"><div className="flex items-center gap-2"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${inactive ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>{(p.name||'?').substring(0,2).toUpperCase()}</div><span className={inactive ? 'line-through' : ''}>{p.name}</span>{p.is_placeholder && <Badge className="bg-slate-300 text-slate-800 text-[10px]">Placeholder</Badge>}{p.locked === false && <Badge variant="outline" className="text-[10px]">Naam vrij</Badge>}</div></TableCell>
              <TableCell className="text-muted-foreground">{p.team_name || '—'}</TableCell>
              <TableCell className="text-xs">{p.joined_at ? new Date(p.joined_at).toLocaleDateString('nl-BE') : '—'}</TableCell>
              <TableCell className="text-xs">{cpf ? (<span className={notYet?'text-amber-700 font-semibold':'text-emerald-700'}>{notYet ? `Vanaf ${cpf.toLocaleDateString('nl-BE')}` : cpf.toLocaleDateString('nl-BE')}</span>) : <span className="text-emerald-700">Onmiddellijk</span>}</TableCell>
              <TableCell className="text-center text-xs">{p.match_count || 0}</TableCell>
              <TableCell>{p.is_placeholder ? <Badge className="bg-slate-200 text-slate-700">Placeholder</Badge> : inactive ? <Badge className="bg-red-100 text-red-700">Inactief</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Actief</Badge>}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button data-testid={`edit-player-${p.player_id}`} size="sm" variant="outline" className="mr-1" title="Bewerken" onClick={() => setEditing(p)}><Edit3 className="w-3 h-3" /></Button>
                <Button data-testid={`toggle-player-${p.player_id}`} size="sm" variant="outline" className={`mr-1 ${inactive ? 'text-emerald-700' : 'text-amber-700'}`} title={inactive ? 'Activeren' : 'Deactiveren'} disabled={busyId === p.player_id} onClick={() => toggleActive(p)}>{inactive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}</Button>
                <Button data-testid={`delete-player-${p.player_id}`} size="sm" variant="destructive" title={hasHistory ? 'Kan niet verwijderd worden: speler heeft wedstrijdhistoriek. Deactiveer in plaats daarvan.' : 'Definitief verwijderen'} disabled={hasHistory} onClick={() => setToDelete(p)}><Trash2 className="w-3 h-3" /></Button>
              </TableCell>
            </TableRow>) })}
        </TableBody></Table></div>
      </CardContent>
    </Card>
    {editing !== null && <PlayerEditDialog player={editing.player_id ? editing : null} teams={teams} adminCode={adminCode} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Speler definitief verwijderen?</AlertDialogTitle><AlertDialogDescription>Je staat op het punt <strong>{toDelete?.name}</strong> ({toDelete?.team_name}) definitief te verwijderen. Deze actie kan niet ongedaan gemaakt worden. Wil je de speler liever tijdelijk buiten gebruik stellen, kies dan voor deactiveren.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel data-testid="delete-cancel-btn">Annuleren</AlertDialogCancel><AlertDialogAction data-testid="delete-confirm-btn" className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Definitief verwijderen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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

function SeasonEditDialog({ season, adminCode, onClose, onSaved }) {
  const H = { 'x-admin-code': adminCode }
  const isNew = !season?.id
  const [form, setForm] = useState({ name: season?.name || '', start_date: toDateInput(season?.start_date), end_date: toDateInput(season?.end_date), description: season?.description || '', champion: season?.champion || '', activate: false, only_singles_count: !!season?.only_singles_count })
  const isArchived = !isNew && season.status === 'archived'
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) return toast.error('Naam is verplicht')
    if (isNew && form.activate && !confirm('Het huidige actieve seizoen wordt gearchiveerd (eindstand wordt vastgelegd) en dit nieuwe seizoen wordt actief. Doorgaan?')) return
    setSaving(true)
    const payload = { name: form.name.trim(), start_date: form.start_date || null, end_date: form.end_date || null, description: form.description }
    if (!isNew && season.status === 'archived') payload.champion = form.champion
    if (isNew) { payload.activate = form.activate; payload.only_singles_count = form.only_singles_count }
    const scoringChanged = !isNew && !isArchived && form.only_singles_count !== !!season.only_singles_count
    if (scoringChanged) {
      payload.only_singles_count = form.only_singles_count
      const msg = form.only_singles_count
        ? `Puntentelling wijzigen naar "alleen enkelwedstrijden tellen voor de ploegstand"?\n\nDe ploegstand en alle wedstrijduitslagen van ${season.name} worden opnieuw berekend: dubbelwedstrijden leveren dan geen ploegpunten meer op en bepalen de winnaar niet. Het individuele klassement blijft enkel én dubbel tellen.`
        : `Terug naar de normale puntentelling?\n\nDe ploegstand en alle wedstrijduitslagen van ${season.name} worden opnieuw berekend: enkel- én dubbelwedstrijden tellen dan opnieuw mee voor de uitslag en de ploegstand.`
      if (!confirm(msg)) { setSaving(false); return }
    }
    const r = isNew ? await api.post('/admin/seasons', payload, H) : await api.patch(`/admin/seasons/${season.id}`, payload, H)
    setSaving(false)
    if (r.error) return toast.error(r.error)
    if (r.recalculated) toast.success(`Puntentelling aangepast · ${r.recalculated.updated} van ${r.recalculated.checked} gespeelde wedstrijden herberekend`)
    toast.success(isNew ? `Seizoen ${payload.name} aangemaakt` : 'Seizoen bijgewerkt'); onSaved()
  }
  return (<Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{isNew ? 'Nieuw seizoen' : 'Seizoen bewerken'}</DialogTitle><DialogDescriptionCompat>{isNew ? 'Maak een nieuw seizoen of competitie aan.' : `Pas de gegevens van ${season.name} aan.`}</DialogDescriptionCompat></DialogHeader>
    <div className="space-y-3">
      <div><Label>Naam</Label><Input data-testid="season-name-input" placeholder="bv. 2027-2028" value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Startdatum</Label><Input data-testid="season-start-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div><div><Label>Einddatum</Label><Input data-testid="season-end-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div></div>
      <div><Label>Omschrijving</Label><Textarea data-testid="season-desc-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optioneel" /></div>
      {!isNew && season.status === 'archived' && <div><Label>Kampioen (gearchiveerd seizoen)</Label><Input data-testid="season-champion-input" value={form.champion} onChange={e => set('champion', e.target.value)} /></div>}
      <div className={`rounded-md border p-3 ${form.only_singles_count ? 'border-purple-300 bg-purple-50' : ''}`}><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-medium">Alleen enkelwedstrijden laten meetellen voor de ploegstand</div><div className="text-xs text-muted-foreground">Standaard UIT. Aan: dubbels leveren geen ploegpunten op en bepalen de winnaar niet; ze tellen wél mee voor het individuele klassement. Geldt alleen voor dit seizoen.</div>{isArchived && <div className="text-xs text-amber-700 mt-1">Niet wijzigbaar voor een gearchiveerd seizoen (heractiveer het seizoen eerst).</div>}</div><Switch data-testid="season-only-singles-switch" checked={form.only_singles_count} disabled={isArchived} onCheckedChange={v => set('only_singles_count', v)} /></div></div>
      {isNew && <div className="flex items-center justify-between rounded-md border p-3"><div><div className="text-sm font-medium">Meteen activeren</div><div className="text-xs text-muted-foreground">Het huidige actieve seizoen wordt dan gearchiveerd.</div></div><Switch data-testid="season-activate-switch" checked={form.activate} onCheckedChange={v => set('activate', v)} /></div>}
    </div>
    <DialogFooter><Button variant="outline" onClick={onClose}>Annuleren</Button><Button data-testid="season-save-btn" className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>{saving ? 'Opslaan...' : (isNew ? 'Aanmaken' : 'Opslaan')}</Button></DialogFooter></DialogContent></Dialog>)
}

function AdminSeasons({ seasons, adminCode, reload }) {
  const H = { 'x-admin-code': adminCode }
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null); const [overview, setOverview] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'archive'|'activate'|'delete', season }
  const [matchDialog, setMatchDialog] = useState(null)
  const [exporting, setExporting] = useState(null)
  const importHist = async () => { const r = await api.post('/admin/import-historic', {}, H); if (r.ok) { toast.success(`Seizoen 2024-2025 geïmporteerd! Kampioen: ${r.champion}`); reload() } else toast.error(r.error || 'Fout') }
  const openView = async (sn) => { setViewing(sn); setOverview(null); setOverview(await api.get(`/seasons/${sn.id}/overview`)) }
  const exportExcel = async (sn) => {
    setExporting(sn.id)
    try {
      const res = await fetch(`/api/admin/seasons/${sn.id}/export`, { headers: H })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Export mislukt') }
      const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pool-competitie-${sn.name.replace(/[^a-zA-Z0-9-_]+/g, '_')}.xlsx`; a.click(); URL.revokeObjectURL(a.href)
      toast.success(`Excel-export van ${sn.name} gedownload`)
    } catch (e) { toast.error(e.message) }
    setExporting(null)
  }
  const runConfirm = async () => {
    const { type, season } = confirmAction; setConfirmAction(null)
    let r
    if (type === 'archive') r = await api.post(`/admin/seasons/${season.id}/archive`, {}, H)
    else if (type === 'activate') r = await api.post(`/admin/seasons/${season.id}/activate`, {}, H)
    else if (type === 'delete') r = await api.del(`/admin/seasons/${season.id}`, H)
    if (r?.error) return toast.error(r.error)
    if (type === 'archive') { toast.success(`${season.name} gearchiveerd${r.champion ? ` · Kampioen: ${r.champion}` : ''}`); if (r.no_active_season) toast.warning('Er is nu geen actief seizoen. Activeer of maak een nieuw seizoen aan.') }
    if (type === 'activate') toast.success(`${season.name} is nu het actieve seizoen${r.archived_previous ? ` · ${r.archived_previous} gearchiveerd` : ''}`)
    if (type === 'delete') toast.success(`${season.name} definitief verwijderd (${r.matches_deleted} wedstrijden)`)
    reload()
  }
  const confirmTexts = {
    archive: { title: 'Seizoen archiveren?', desc: (sn) => `De ploegstand en het individuele klassement van ${sn.name} worden vastgelegd als eindstand. ${sn.status === 'active' ? 'Er is daarna geen actief seizoen meer tot je een ander seizoen activeert of aanmaakt. ' : ''}Archiveren is omkeerbaar: je kan het seizoen later opnieuw activeren.`, btn: 'Archiveren', cls: 'bg-amber-600 hover:bg-amber-700' },
    activate: { title: 'Seizoen (opnieuw) activeren?', desc: (sn) => `${sn.name} wordt het actieve seizoen. Een eventueel ander actief seizoen wordt automatisch gearchiveerd. ${sn.status === 'archived' ? 'De vastgelegde eindstand wordt gewist en opnieuw live berekend op basis van de wedstrijden.' : ''}`, btn: 'Activeren', cls: 'bg-emerald-600 hover:bg-emerald-700' },
    delete: { title: 'Seizoen definitief verwijderen?', desc: (sn) => `Alle gegevens van ${sn.name} worden onherroepelijk verwijderd: ${sn.match_count} wedstrijden inclusief uitslagen, en de vastgelegde eindstanden. Dit kan NIET ongedaan gemaakt worden. Wil je de gegevens bewaren, kies dan voor archiveren.`, btn: 'Definitief verwijderen', cls: 'bg-red-600 hover:bg-red-700' },
  }
  const ct = confirmAction ? confirmTexts[confirmAction.type] : null
  return (<div className="space-y-4">
    <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Seizoenen & historiek</CardTitle><CardDescription>Beheer seizoenen: aanmaken, bewerken, archiveren, heractiveren, verwijderen en exporteren naar Excel. Archiveren heeft de voorkeur wanneer gegevens bewaard moeten blijven.</CardDescription></div><Button data-testid="new-season-btn" className="bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" />Nieuw seizoen</Button></CardHeader>
      <CardContent>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Seizoen</TableHead><TableHead>Status</TableHead><TableHead>Periode</TableHead><TableHead className="text-center">Wedstrijden</TableHead><TableHead>Kampioen</TableHead><TableHead className="text-right">Acties</TableHead></TableRow></TableHeader><TableBody>
          {seasons.map(sn => (<TableRow key={sn.id} data-testid={`season-row-${sn.id}`}><TableCell className="font-medium">{sn.name}{sn.only_singles_count && <Badge variant="outline" className="ml-2 border-purple-300 text-purple-700 text-[10px]">Alleen enkels</Badge>}</TableCell><TableCell>{seasonStatusBadge(sn.status)}</TableCell><TableCell className="text-xs text-muted-foreground">{sn.start_date ? `${formatDate(sn.start_date)} – ${sn.end_date ? formatDate(sn.end_date) : '…'}` : (sn.archived_at ? `Gearchiveerd ${formatDate(sn.archived_at)}` : '—')}</TableCell><TableCell className="text-center text-xs">{sn.played_count}/{sn.match_count}</TableCell><TableCell>{sn.champion || '—'}</TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <Button data-testid={`view-season-${sn.id}`} size="sm" variant="outline" className="mr-1" title="Bekijken" onClick={() => openView(sn)}><Eye className="w-3 h-3" /></Button>
              <Button data-testid={`export-season-${sn.id}`} size="sm" variant="outline" className="mr-1" title="Excel-export" disabled={exporting === sn.id} onClick={() => exportExcel(sn)}><FileText className="w-3 h-3 mr-1" />{exporting === sn.id ? '...' : 'Excel'}</Button>
              <Button data-testid={`edit-season-${sn.id}`} size="sm" variant="outline" className="mr-1" title="Bewerken" onClick={() => setEditing(sn)}><Edit3 className="w-3 h-3" /></Button>
              {sn.status !== 'archived' && <Button data-testid={`archive-season-${sn.id}`} size="sm" variant="outline" className="mr-1 text-amber-700" title="Archiveren" onClick={() => setConfirmAction({ type: 'archive', season: sn })}><Archive className="w-3 h-3" /></Button>}
              {sn.status !== 'active' && <Button data-testid={`activate-season-${sn.id}`} size="sm" variant="outline" className="mr-1 text-emerald-700" title={sn.status === 'archived' ? 'Opnieuw activeren' : 'Activeren'} onClick={() => setConfirmAction({ type: 'activate', season: sn })}><CheckCircle2 className="w-3 h-3" /></Button>}
              <Button data-testid={`delete-season-${sn.id}`} size="sm" variant="destructive" title={sn.status === 'active' ? 'Actief seizoen kan niet verwijderd worden' : 'Definitief verwijderen'} disabled={sn.status === 'active'} onClick={() => setConfirmAction({ type: 'delete', season: sn })}><Trash2 className="w-3 h-3" /></Button>
            </TableCell></TableRow>))}
        </TableBody></Table></div>
        <div className="mt-4 pt-3 border-t"><Button variant="outline" size="sm" onClick={importHist}><Plus className="w-4 h-4 mr-1" />Importeer historisch seizoen 2024-2025 (Excel-gegevens)</Button></div>
      </CardContent></Card>
    {editing !== null && <SeasonEditDialog season={editing.id ? editing : null} adminCode={adminCode} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Seizoen {viewing?.name}</DialogTitle><DialogDescriptionCompat>Wedstrijden, uitslagen, ploegstand en individueel klassement van dit seizoen.</DialogDescriptionCompat></DialogHeader><SeasonOverview overview={overview} onMatchClick={setMatchDialog} />{viewing && <DialogFooter><Button variant="outline" onClick={() => exportExcel(viewing)}><FileText className="w-4 h-4 mr-1" />Exporteer naar Excel</Button></DialogFooter>}</DialogContent></Dialog>
    {matchDialog && <MatchDetailDialog matchId={matchDialog} onClose={() => setMatchDialog(null)} />}
    <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{ct?.title}</AlertDialogTitle><AlertDialogDescription>{confirmAction && ct?.desc(confirmAction.season)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel data-testid="season-confirm-cancel">Annuleren</AlertDialogCancel><AlertDialogAction data-testid="season-confirm-ok" className={ct?.cls} onClick={runConfirm}>{ct?.btn}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>)
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
    {page === 'historiek' && <HistoriekPage onMatchClick={setMatchDialog} />}
    {page === 'portaal' && <TeamPortal session={session} setSession={(s)=>{ setSession(s); if (s) load() }} />}
    {page === 'admin' && <AdminPortal adminCode={adminCode} setAdminCode={setAdminCode} />}
    {teamDialog && <TeamDetailDialog teamId={teamDialog} onClose={() => setTeamDialog(null)} />}
    {matchDialog && <MatchDetailDialog matchId={matchDialog} onClose={() => setMatchDialog(null)} />}
    <footer className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground">Pool Competitie · Phase 2 · Bevestiging beide ploegen · Admin dashboard · Audit log · Historiek</footer>
  </div>)
}

export default App
