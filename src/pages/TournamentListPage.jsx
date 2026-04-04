import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trophy, Calendar, ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { SPORTS } from '../lib/types.js';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { getTournamentStats } from '../lib/tournament.js';
import { formatDate } from '../lib/utils.js';
import './TournamentListPage.css';

export function TournamentListPage() {
  const { sport } = useParams();
  const navigate = useNavigate();
  const { state } = useTournamentContext();
  const [search, setSearch] = useState('');

  const sportDef = SPORTS.find(s => s.id === sport);
  const tournaments = (state.tournaments || [])
    .filter(t => (t.sport || 'netball') === sport)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  if (!sportDef) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Unknown sport.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="tlist-page">
      <AppHeader />

      <main className="container tlist-main">
        <button className="back-link" onClick={() => navigate('/sports')}>
          <ArrowLeft size={16} /> All Sports
        </button>

        <div className="tlist-header">
          <div className="tlist-sport-badge">
            <span className="tlist-sport-icon">{sportDef.icon}</span>
            <span>{sportDef.label}</span>
          </div>
          <h1 className="tlist-title">Tournaments</h1>
          <p className="tlist-sub">Browse live and upcoming {sportDef.label.toLowerCase()} tournaments.</p>
        </div>

        {tournaments.length > 3 && (
          <div className="tlist-search-wrap">
            <Search size={15} className="tlist-search-icon" />
            <input
              className="tlist-search"
              placeholder="Search tournaments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="tlist-empty">
            <Trophy size={40} />
            <h2>{search ? 'No matches found' : 'No tournaments yet'}</h2>
            <p>{search ? 'Try a different search term.' : 'Check back soon or contact your tournament organiser.'}</p>
          </div>
        ) : (
          <div className="tlist-grid">
            {tournaments.map((t, i) => (
              <ViewerCard key={t.id} tournament={t} sport={sport} index={i} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ViewerCard({ tournament, sport, index }) {
  const stats = getTournamentStats(tournament);
  const COLORS = ['#2563EB', '#DC2626', '#16A34A', '#D97706', '#7C3AED', '#0891B2'];
  const accent = tournament.teams[0]?.colors?.primary || COLORS[index % COLORS.length];

  return (
    <Link to={`/sports/${sport}/${tournament.id}`} className="viewer-card" style={{ '--card-accent': accent }}>
      <div className="viewer-card-accent" />
      <div className="viewer-card-body">
        <div className="viewer-card-top">
          <div className="viewer-card-logo" style={{ background: accent }}>
            <Trophy size={18} color="white" />
          </div>
          <div className="viewer-card-badges">
            {tournament.ageGroup && <Badge variant="accent" size="sm">{tournament.ageGroup}</Badge>}
          </div>
        </div>

        <h3 className="viewer-card-name">{tournament.name}</h3>
        {tournament.organizingBody && <p className="viewer-card-org">{tournament.organizingBody}</p>}
        {tournament.venue && <p className="viewer-card-venue">📍 {tournament.venue}</p>}
        {(tournament.startDate || tournament.endDate) && (
          <p className="viewer-card-dates">
            <Calendar size={12} />
            {tournament.startDate ? formatDate(tournament.startDate) : '—'}
            {tournament.endDate && ` – ${formatDate(tournament.endDate)}`}
          </p>
        )}

        <div className="viewer-card-stats">
          <div className="v-stat"><span className="v-stat-val">{stats.totalTeams}</span><span className="v-stat-label">Teams</span></div>
          <div className="v-stat"><span className="v-stat-val">{stats.playedFixtures}</span><span className="v-stat-label">Played</span></div>
          <div className="v-stat"><span className="v-stat-val">{stats.completionPct}%</span><span className="v-stat-label">Complete</span></div>
        </div>

        <div className="viewer-card-progress">
          <div className="vcp-bar">
            <div className="vcp-fill" style={{ width: `${stats.completionPct}%`, background: accent }} />
          </div>
        </div>
      </div>

      <div className="viewer-card-footer">
        <span className="viewer-card-open">View Tournament <ChevronRight size={14} /></span>
      </div>
    </Link>
  );
}
