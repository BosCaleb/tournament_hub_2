import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trophy, Calendar, Trash2, ChevronRight, LogOut, Shield } from 'lucide-react';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { SPORTS, AGE_GROUPS } from '../lib/types.js';
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
import './AdminDashboardPage.css';

const EMPTY_FORM = {
  name: '', sport: 'netball', ageGroup: '', managerName: '',
  organizingBody: '', venue: '', startDate: '', endDate: '',
};

export function AdminDashboardPage() {
  const { state, dispatch } = useTournamentContext();
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const { toasts, success, error, dismiss } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [activeSport, setActiveSport] = useState('all');

  const tournaments = state.tournaments || [];
  const availableSports = SPORTS.filter(s => s.available);

  const filtered = activeSport === 'all'
    ? tournaments
    : tournaments.filter(t => (t.sport || 'netball') === activeSport);

  function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Tournament name is required.'); return; }
    dispatch({ type: 'CREATE_TOURNAMENT', payload: { ...form } });
    success('Tournament created!');
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_TOURNAMENT', payload: deleteId });
    success('Tournament deleted.');
    setDeleteId(null);
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const grouped = availableSports.reduce((acc, sport) => {
    const list = tournaments.filter(t => (t.sport || 'netball') === sport.id);
    if (list.length > 0) acc[sport.id] = { sport, list };
    return acc;
  }, {});

  return (
    <div className="admin-dash-page">
      <AppHeader />

      <main className="container admin-dash-main">
        {/* Header */}
        <div className="admin-dash-header">
          <div className="admin-dash-title-row">
            <div>
              <div className="admin-dash-eyebrow">
                <Shield size={13} /> Admin Dashboard
              </div>
              <h1 className="admin-dash-title">Manage Tournaments</h1>
            </div>
            <div className="admin-dash-header-actions">
              <Button variant="accent" icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
                New Tournament
              </Button>
              <Button variant="ghost" icon={<LogOut size={15} />} onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>

          {/* Sport filter tabs */}
          {availableSports.length > 1 && (
            <div className="admin-sport-tabs">
              <button
                className={`admin-sport-tab ${activeSport === 'all' ? 'active' : ''}`}
                onClick={() => setActiveSport('all')}
              >
                All ({tournaments.length})
              </button>
              {availableSports.map(s => (
                <button
                  key={s.id}
                  className={`admin-sport-tab ${activeSport === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSport(s.id)}
                >
                  {s.icon} {s.label} ({tournaments.filter(t => (t.sport || 'netball') === s.id).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tournament list */}
        {filtered.length === 0 ? (
          <div className="admin-dash-empty">
            <Trophy size={40} />
            <h2>No tournaments yet</h2>
            <p>Create your first tournament to get started.</p>
            <Button variant="accent" icon={<Plus />} onClick={() => setShowCreate(true)}>
              Create Tournament
            </Button>
          </div>
        ) : (
          activeSport === 'all' ? (
            // Grouped by sport
            Object.values(grouped).map(({ sport, list }) => (
              <div key={sport.id} className="admin-sport-group">
                <div className="admin-sport-group-label">
                  <span>{sport.icon}</span> {sport.label}
                </div>
                <div className="admin-t-grid">
                  {list.map((t, i) => (
                    <AdminTournamentCard
                      key={t.id}
                      tournament={t}
                      index={i}
                      onOpen={() => navigate(`/admin/${t.sport || 'netball'}/${t.id}`)}
                      onDelete={() => setDeleteId(t.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="admin-t-grid">
              {filtered.map((t, i) => (
                <AdminTournamentCard
                  key={t.id}
                  tournament={t}
                  index={i}
                  onOpen={() => navigate(`/admin/${t.sport || 'netball'}/${t.id}`)}
                  onDelete={() => setDeleteId(t.id)}
                />
              ))}
            </div>
          )
        )}
      </main>

      <Footer />

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setFormError(''); setForm(EMPTY_FORM); }}
        title="Create Tournament"
        size="md"
      >
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
            <FormField label="Sport">
              <Select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}>
                {SPORTS.filter(s => s.available).map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Age Group">
              <Select value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}>
                <option value="">Select age group</option>
                {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Manager / Organiser">
              <Input
                value={form.managerName}
                onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))}
                placeholder="Jane Smith"
              />
            </FormField>
            <FormField label="Organising Body">
              <Input
                value={form.organizingBody}
                onChange={e => setForm(f => ({ ...f, organizingBody: e.target.value }))}
                placeholder="e.g. Northerns Netball Union"
              />
            </FormField>
          </div>

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

function AdminTournamentCard({ tournament, onOpen, onDelete, index }) {
  const stats = getTournamentStats(tournament);
  const COLORS = ['#2563EB', '#DC2626', '#16A34A', '#D97706', '#7C3AED', '#0891B2'];
  const accent = tournament.teams[0]?.colors?.primary || COLORS[index % COLORS.length];

  return (
    <div className="admin-t-card" style={{ '--card-accent': accent }}>
      <div className="admin-t-card-accent" />
      <div className="admin-t-card-body">
        <div className="admin-t-card-top">
          <div className="admin-t-logo" style={{ background: accent }}>
            <Trophy size={18} color="white" />
          </div>
          <div className="admin-t-badges">
            {tournament.ageGroup && <Badge variant="accent" size="sm">{tournament.ageGroup}</Badge>}
          </div>
        </div>
        <h3 className="admin-t-name">{tournament.name}</h3>
        {tournament.organizingBody && <p className="admin-t-org">{tournament.organizingBody}</p>}
        {tournament.venue && <p className="admin-t-venue">📍 {tournament.venue}</p>}
        {(tournament.startDate || tournament.endDate) && (
          <p className="admin-t-dates">
            <Calendar size={12} />
            {tournament.startDate ? formatDate(tournament.startDate) : '—'}
            {tournament.endDate && ` – ${formatDate(tournament.endDate)}`}
          </p>
        )}
        <div className="admin-t-stats">
          <div className="at-stat"><span className="at-stat-val">{stats.totalTeams}</span><span className="at-stat-label">Teams</span></div>
          <div className="at-stat"><span className="at-stat-val">{stats.playedFixtures}</span><span className="at-stat-label">Played</span></div>
          <div className="at-stat"><span className="at-stat-val">{stats.completionPct}%</span><span className="at-stat-label">Complete</span></div>
        </div>
        <div className="admin-t-progress">
          <div className="atp-bar"><div className="atp-fill" style={{ width: `${stats.completionPct}%`, background: accent }} /></div>
        </div>
      </div>
      <div className="admin-t-card-footer">
        <button className="admin-t-delete" onClick={e => { e.stopPropagation(); onDelete(); }} aria-label="Delete">
          <Trash2 size={14} />
        </button>
        <Button variant="accent" size="sm" onClick={onOpen} iconRight={<ChevronRight size={14} />}>
          Manage
        </Button>
      </div>
    </div>
  );
}
