import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trophy, Calendar, Users, Trash2, ArrowRight, ChevronRight } from 'lucide-react';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FormField, Input, Select } from '../components/ui/FormField.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { useToast } from '../hooks/useToast.js';
import { ToastContainer } from '../components/ui/Toast.jsx';
import { getTournamentStats } from '../lib/tournament.js';
import { formatDate } from '../lib/utils.js';
import { AGE_GROUPS, SA_PROVINCES } from '../lib/types.js';
import './HomePage.css';

export function HomePage() {
  const { state, dispatch } = useTournamentContext();
  const navigate = useNavigate();
  const { toasts, success, error, dismiss } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', managerName: '', organizingBody: '', venue: '', ageGroup: '', startDate: '', endDate: '' });
  const [formError, setFormError] = useState('');

  const tournaments = state.tournaments || [];

  function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Tournament name is required.'); return; }
    dispatch({ type: 'CREATE_TOURNAMENT', payload: { ...form } });
    success('Tournament created!');
    setShowCreate(false);
    setForm({ name: '', managerName: '', organizingBody: '', venue: '', ageGroup: '', startDate: '', endDate: '' });
    setFormError('');
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_TOURNAMENT', payload: deleteId });
    success('Tournament deleted.');
    setDeleteId(null);
  }

  return (
    <div className="home-page">
      <AppHeader />

      {/* Hero */}
      <section className="home-hero">
        <div className="container home-hero-inner">
          <div className="home-hero-badge">
            <span>🏐</span> South African High School Netball
          </div>
          <h1 className="home-hero-title">
            Tournament<br />
            <span className="hero-accent">Management</span>
          </h1>
          <p className="home-hero-sub">
            Manage fixtures, standings, players and playoffs — all in one place.
            Built for South African high school netball tournaments.
          </p>
          <Button variant="accent" size="lg" icon={<Plus />} onClick={() => setShowCreate(true)}>
            New Tournament
          </Button>
        </div>
        <div className="home-hero-decor" aria-hidden="true">
          <div className="hero-ring hero-ring-1" />
          <div className="hero-ring hero-ring-2" />
          <div className="hero-ring hero-ring-3" />
        </div>
      </section>

      {/* Tournament list */}
      <main className="container home-main">
        {tournaments.length === 0 ? (
          <div className="home-empty">
            <Trophy size={48} />
            <h2>No tournaments yet</h2>
            <p>Create your first tournament to get started managing fixtures and standings.</p>
            <Button variant="accent" icon={<Plus />} onClick={() => setShowCreate(true)}>
              Create Tournament
            </Button>
          </div>
        ) : (
          <>
            <div className="home-section-header">
              <h2 className="home-section-title">Your Tournaments</h2>
              <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setShowCreate(true)}>
                New
              </Button>
            </div>
            <div className="tournament-grid">
              {tournaments.map((t, i) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onOpen={() => navigate(`/tournament/${t.id}`)}
                  onDelete={() => setDeleteId(t.id)}
                  index={i}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Create Tournament" size="md">
        <form onSubmit={handleCreate} className="create-form">
          <FormField label="Tournament Name" required error={formError}>
            <Input
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(''); }}
              placeholder="e.g. Agon Netball Tournament 2025"
              autoFocus
            />
          </FormField>

          <div className="form-row">
            <FormField label="Age Group">
              <Select value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}>
                <option value="">Select age group</option>
                {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </FormField>
            <FormField label="Manager / Organiser">
              <Input
                value={form.managerName}
                onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))}
                placeholder="Jane Smith"
              />
            </FormField>
          </div>

          <FormField label="Organising Body">
            <Input
              value={form.organizingBody}
              onChange={e => setForm(f => ({ ...f, organizingBody: e.target.value }))}
              placeholder="e.g. Northerns Netball Union"
            />
          </FormField>

          <FormField label="Primary Venue">
            <Input
              value={form.venue}
              onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="e.g. Pretoria High School for Girls"
            />
          </FormField>

          <div className="form-row">
            <FormField label="Start Date">
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </FormField>
            <FormField label="End Date">
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </FormField>
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" variant="accent" icon={<Plus />}>Create Tournament</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Tournament"
        message="Are you sure you want to delete this tournament? All teams, fixtures and results will be permanently lost."
        confirmLabel="Delete"
        danger
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function TournamentCard({ tournament, onOpen, onDelete, index }) {
  const stats = getTournamentStats(tournament);
  const COLORS = ['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#0891B2'];
  const accent = tournament.teams[0]?.colors?.primary || COLORS[index % COLORS.length];

  return (
    <div className="t-card animate-fade-in" style={{ '--card-accent': accent }}>
      <div className="t-card-accent-bar" />
      <div className="t-card-body">
        <div className="t-card-header">
          <div className="t-card-logo" style={{ background: accent }}>
            <Trophy size={20} color="white" />
          </div>
          <div className="t-card-meta">
            {tournament.ageGroup && (
              <Badge variant="accent" size="sm">{tournament.ageGroup}</Badge>
            )}
          </div>
        </div>

        <h3 className="t-card-name">{tournament.name}</h3>
        {tournament.organizingBody && (
          <p className="t-card-org">{tournament.organizingBody}</p>
        )}
        {tournament.venue && (
          <p className="t-card-venue">📍 {tournament.venue}</p>
        )}
        {(tournament.startDate || tournament.endDate) && (
          <p className="t-card-dates">
            <Calendar size={12} />
            {tournament.startDate ? formatDate(tournament.startDate) : '—'}
            {tournament.endDate && ` – ${formatDate(tournament.endDate)}`}
          </p>
        )}

        <div className="t-card-stats">
          <div className="t-stat">
            <span className="t-stat-val">{stats.totalTeams}</span>
            <span className="t-stat-label">Teams</span>
          </div>
          <div className="t-stat">
            <span className="t-stat-val">{stats.playedFixtures}</span>
            <span className="t-stat-label">Played</span>
          </div>
          <div className="t-stat">
            <span className="t-stat-val">{stats.completionPct}%</span>
            <span className="t-stat-label">Complete</span>
          </div>
        </div>

        <div className="t-card-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.completionPct}%` }} />
          </div>
        </div>
      </div>

      <div className="t-card-footer">
        <button className="t-card-delete" onClick={e => { e.stopPropagation(); onDelete(); }} aria-label="Delete tournament">
          <Trash2 size={14} />
        </button>
        <Button variant="accent" size="sm" onClick={onOpen} iconRight={<ChevronRight size={14} />}>
          Open
        </Button>
      </div>
    </div>
  );
}
