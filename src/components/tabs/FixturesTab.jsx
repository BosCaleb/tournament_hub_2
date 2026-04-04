import { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, RotateCcw, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { generateRoundRobin } from '../../lib/tournament.js';
import { formatDate, formatTime } from '../../lib/utils.js';
import { Button } from '../ui/Button.jsx';
import { Modal, ConfirmDialog } from '../ui/Modal.jsx';
import { FormField, Input, Select } from '../ui/FormField.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Badge } from '../ui/Badge.jsx';
import './FixturesTab.css';

export function FixturesTab({ tournament, dispatch, toast }) {
  const [activePool, setActivePool] = useState(tournament.pools[0]?.id || null);
  const [showAdd, setShowAdd] = useState(false);
  const [editFixture, setEditFixture] = useState(null);
  const [scoreFixture, setScoreFixture] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const pools = tournament.pools;
  const currentPool = pools.find(p => p.id === activePool);
  const fixtures = tournament.fixtures.filter(f => f.poolId === activePool)
    .sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });

  function handleGenerate() {
    if (!currentPool) return;
    const newFixtures = generateRoundRobin(currentPool, tournament.fixtures);
    if (newFixtures.length === 0) {
      toast.warning('All round-robin fixtures already exist for this pool.');
      return;
    }
    dispatch({ type: 'ADD_FIXTURES', payload: { tournamentId: tournament.id, fixtures: newFixtures } });
    toast.success(`Generated ${newFixtures.length} fixture(s).`);
  }

  function handleClearUnplayed() {
    dispatch({ type: 'CLEAR_POOL_FIXTURES', payload: { tournamentId: tournament.id, poolId: activePool } });
    toast.success('Unplayed fixtures cleared.');
    setShowClearConfirm(false);
  }

  if (pools.length === 0) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
        <EmptyState
          icon={<Plus size={28} />}
          title="No pools set up"
          description="Go to the Admin tab to create pools and assign teams before generating fixtures."
        />
      </div>
    );
  }

  return (
    <div className="fixtures-tab">
      <div className="container">
        {/* Pool tabs */}
        <div className="pool-tabs">
          {pools.map(p => (
            <button
              key={p.id}
              className={`pool-tab ${p.id === activePool ? 'pool-tab-active' : ''}`}
              onClick={() => setActivePool(p.id)}
            >
              {p.name}
              <span className="pool-tab-count">
                {tournament.fixtures.filter(f => f.poolId === p.id && f.played).length}/
                {tournament.fixtures.filter(f => f.poolId === p.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Actions bar */}
        <div className="fixtures-actions">
          <div className="fixtures-actions-left">
            <Button variant="accent" size="sm" icon={<Zap size={14} />} onClick={handleGenerate}
              disabled={!currentPool || currentPool.teamIds.length < 2}>
              Generate Round-Robin
            </Button>
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
              Add Fixture
            </Button>
          </div>
          <div className="fixtures-actions-right">
            <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={() => setShowClearConfirm(true)}>
              Clear Unplayed
            </Button>
          </div>
        </div>

        {/* Fixture list */}
        {fixtures.length === 0 ? (
          <EmptyState
            icon={<CheckCircle size={28} />}
            title="No fixtures"
            description="Generate round-robin fixtures or add them manually."
            action={
              <Button variant="accent" size="sm" icon={<Zap size={14} />} onClick={handleGenerate}
                disabled={!currentPool || currentPool.teamIds.length < 2}>
                Generate Fixtures
              </Button>
            }
          />
        ) : (
          <div className="fixture-list">
            {groupByRound(fixtures).map(({ round, fixtures: roundFixtures }) => (
              <div key={round} className="fixture-round">
                <div className="fixture-round-header">
                  <span>Round {round}</span>
                  <span className="round-badge">
                    {roundFixtures.filter(f => f.played).length}/{roundFixtures.length} played
                  </span>
                </div>
                {roundFixtures.map(f => (
                  <FixtureRow
                    key={f.id}
                    fixture={f}
                    tournament={tournament}
                    onEdit={() => setEditFixture(f)}
                    onDelete={() => setDeleteId(f.id)}
                    onScore={() => setScoreFixture(f)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit fixture modal */}
      <FixtureFormModal
        open={showAdd || !!editFixture}
        fixture={editFixture}
        tournament={tournament}
        poolId={activePool}
        onClose={() => { setShowAdd(false); setEditFixture(null); }}
        onSave={data => {
          if (editFixture) {
            dispatch({ type: 'UPDATE_FIXTURE', payload: { tournamentId: tournament.id, fixture: { ...editFixture, ...data } } });
            toast.success('Fixture updated.');
          } else {
            dispatch({ type: 'ADD_FIXTURE', payload: { tournamentId: tournament.id, fixture: { poolId: activePool, ...data } } });
            toast.success('Fixture added.');
          }
          setShowAdd(false); setEditFixture(null);
        }}
      />

      {/* Score entry modal */}
      {scoreFixture && (
        <ScoreModal
          fixture={scoreFixture}
          tournament={tournament}
          onClose={() => setScoreFixture(null)}
          onSave={(homeScore, awayScore) => {
            dispatch({ type: 'UPDATE_FIXTURE', payload: {
              tournamentId: tournament.id,
              fixture: { ...scoreFixture, homeScore, awayScore, played: true },
            }});
            toast.success('Score recorded!');
            setScoreFixture(null);
          }}
          onClear={() => {
            dispatch({ type: 'UPDATE_FIXTURE', payload: {
              tournamentId: tournament.id,
              fixture: { ...scoreFixture, homeScore: null, awayScore: null, played: false },
            }});
            toast.info('Score cleared.');
            setScoreFixture(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_FIXTURE', payload: { tournamentId: tournament.id, fixtureId: deleteId } });
          toast.success('Fixture deleted.');
          setDeleteId(null);
        }}
        title="Delete Fixture"
        message="Are you sure you want to delete this fixture?"
        confirmLabel="Delete"
        danger
      />
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearUnplayed}
        title="Clear Unplayed Fixtures"
        message="This will remove all unplayed fixtures in this pool. Played results are kept."
        confirmLabel="Clear"
        danger
      />
    </div>
  );
}

function FixtureRow({ fixture, tournament, onEdit, onDelete, onScore }) {
  const home = tournament.teams.find(t => t.id === fixture.homeTeamId);
  const away = tournament.teams.find(t => t.id === fixture.awayTeamId);
  const homeWon = fixture.played && fixture.homeScore > fixture.awayScore;
  const awayWon = fixture.played && fixture.awayScore > fixture.homeScore;

  return (
    <div className={`fixture-row ${fixture.played ? 'fixture-played' : ''}`}>
      <div className="fixture-main">
        <div className="fixture-teams">
          <span className={`fx-team ${homeWon ? 'fx-winner' : ''}`}>{home?.name || 'TBD'}</span>
          <div className="fx-score-area">
            {fixture.played ? (
              <div className="fx-score">
                <span className={homeWon ? 'fx-score-bold' : ''}>{fixture.homeScore}</span>
                <span>–</span>
                <span className={awayWon ? 'fx-score-bold' : ''}>{fixture.awayScore}</span>
              </div>
            ) : (
              <span className="fx-vs">vs</span>
            )}
          </div>
          <span className={`fx-team fx-team-right ${awayWon ? 'fx-winner' : ''}`}>{away?.name || 'TBD'}</span>
        </div>
        <div className="fixture-meta">
          {fixture.date && <span>{formatDate(fixture.date)}</span>}
          {fixture.time && <span>{formatTime(fixture.time)}</span>}
          {fixture.court && <span>Court {fixture.court}</span>}
          {fixture.venue && <span>{fixture.venue}</span>}
          {fixture.played && <Badge variant="success" size="sm">Played</Badge>}
        </div>
      </div>
      <div className="fixture-actions">
        <button className="fx-action-btn fx-score-btn" onClick={onScore} title="Enter score">
          <CheckCircle size={15} />
        </button>
        <button className="fx-action-btn" onClick={onEdit} title="Edit details">
          <Edit2 size={14} />
        </button>
        <button className="fx-action-btn fx-delete-btn" onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function ScoreModal({ fixture, tournament, onClose, onSave, onClear }) {
  const home = tournament.teams.find(t => t.id === fixture.homeTeamId);
  const away = tournament.teams.find(t => t.id === fixture.awayTeamId);
  const [homeScore, setHomeScore] = useState(fixture.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(fixture.awayScore ?? '');
  const [err, setErr] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { setErr('Please enter valid scores (0 or higher).'); return; }
    setErr('');
    onSave(h, a);
  }

  return (
    <Modal open onClose={onClose} title="Enter Score" size="sm">
      <form onSubmit={handleSubmit}>
        <div className="score-modal-teams">
          <div className="score-team-col">
            <div className="score-team-name">{home?.name || 'Home'}</div>
            <input
              type="number" min="0" className="score-input"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              autoFocus
            />
          </div>
          <div className="score-sep">–</div>
          <div className="score-team-col">
            <div className="score-team-name">{away?.name || 'Away'}</div>
            <input
              type="number" min="0" className="score-input"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
            />
          </div>
        </div>
        {err && <p className="score-error">{err}</p>}
        <div className="score-modal-actions">
          {fixture.played && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>Clear Result</Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent">Save Score</Button>
        </div>
      </form>
    </Modal>
  );
}

function FixtureFormModal({ open, fixture, tournament, poolId, onClose, onSave }) {
  const [form, setForm] = useState({
    homeTeamId: fixture?.homeTeamId || '',
    awayTeamId: fixture?.awayTeamId || '',
    date: fixture?.date || '',
    time: fixture?.time || '',
    court: fixture?.court || '',
    venue: fixture?.venue || tournament.venue || '',
    round: fixture?.round || 1,
  });

  const pool = tournament.pools.find(p => p.id === poolId);
  const poolTeams = pool ? tournament.teams.filter(t => pool.teamIds.includes(t.id)) : tournament.teams;

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <Modal open={open} onClose={onClose} title={fixture ? 'Edit Fixture' : 'Add Fixture'} size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="form-row">
          <FormField label="Home Team" required>
            <Select value={form.homeTeamId} onChange={e => setForm(f => ({ ...f, homeTeamId: e.target.value }))} required>
              <option value="">Select team</option>
              {poolTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Away Team" required>
            <Select value={form.awayTeamId} onChange={e => setForm(f => ({ ...f, awayTeamId: e.target.value }))} required>
              <option value="">Select team</option>
              {poolTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="form-row">
          <FormField label="Date">
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>
          <FormField label="Time">
            <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </FormField>
        </div>
        <div className="form-row">
          <FormField label="Venue">
            <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Venue name" />
          </FormField>
          <FormField label="Court">
            <Input value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} placeholder="e.g. 1" />
          </FormField>
        </div>
        <FormField label="Round">
          <Input type="number" min="1" value={form.round} onChange={e => setForm(f => ({ ...f, round: parseInt(e.target.value) || 1 }))} />
        </FormField>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent">{fixture ? 'Update' : 'Add'} Fixture</Button>
        </div>
      </form>
    </Modal>
  );
}

function groupByRound(fixtures) {
  const map = {};
  fixtures.forEach(f => {
    if (!map[f.round]) map[f.round] = [];
    map[f.round].push(f);
  });
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([round, fixtures]) => ({ round: Number(round), fixtures }));
}
