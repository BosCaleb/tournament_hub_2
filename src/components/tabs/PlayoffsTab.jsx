import { useState } from 'react';
import { Zap, Trophy, Plus, Trash2, Edit2 } from 'lucide-react';
import { generatePlayoffs, advancePlayoffWinner } from '../../lib/tournament.js';
import { Button } from '../ui/Button.jsx';
import { Modal, ConfirmDialog } from '../ui/Modal.jsx';
import { FormField, Input } from '../ui/FormField.jsx';
import './PlayoffsTab.css';

// Built-in playoff round name labels
const ROUND_LABELS = {
  1: 'FINAL',
  2: 'SEMI-FINALS',
  4: 'QUARTER-FINALS',
  8: 'ROUND OF 16',
};

export function PlayoffsTab({ tournament, dispatch, toast, isAdmin = false }) {
  // "default" = legacy tournament.playoffs; any other value = a flow id
  const [activeFlowId, setActiveFlowId] = useState('default');
  const [scoreMatch, setScoreMatch] = useState(null);
  const [teamsPerPool, setTeamsPerPool] = useState(2);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [deleteFlowId, setDeleteFlowId] = useState(null);
  const [renameFlow, setRenameFlow] = useState(null);

  const playoffFlows = tournament.playoffFlows || [];

  // Resolve the currently-active matches
  const activeMatches = activeFlowId === 'default'
    ? (tournament.playoffs || [])
    : (playoffFlows.find(f => f.id === activeFlowId)?.matches || []);

  // ── Default flow handlers ──────────────────────────────────────────────────

  function handleGenerateDefault() {
    if (tournament.pools.length === 0) { toast.error('Set up pools first.'); return; }
    const generated = generatePlayoffs(tournament, teamsPerPool);
    if (generated.length === 0) { toast.error('Not enough qualified teams to generate playoffs.'); return; }
    dispatch({ type: 'SET_PLAYOFFS', payload: { tournamentId: tournament.id, playoffs: generated } });
    toast.success(`Bracket generated with ${generated.filter(m => !m.isThirdPlace).length} matches.`);
  }

  function handleSaveScoreDefault(match, homeScore, awayScore) {
    if (homeScore === awayScore) { toast.error('Playoff matches cannot end in a draw.'); return; }
    const updated = { ...match, homeScore, awayScore, played: true };
    dispatch({ type: 'UPDATE_PLAYOFF_MATCH', payload: { tournamentId: tournament.id, match: updated } });
    const newPlayoffs = advancePlayoffWinner(
      tournament.playoffs.map(m => m.id === match.id ? updated : m),
      match.id
    );
    dispatch({ type: 'SET_PLAYOFFS', payload: { tournamentId: tournament.id, playoffs: newPlayoffs } });
    toast.success('Result saved and bracket updated!');
    setScoreMatch(null);
  }

  function handleResetDefault() {
    dispatch({ type: 'SET_PLAYOFFS', payload: { tournamentId: tournament.id, playoffs: [] } });
    toast.success('Default playoff bracket reset.');
  }

  // ── Playoff flow handlers ──────────────────────────────────────────────────

  function handleCreateFlow(e) {
    e.preventDefault();
    if (!newFlowName.trim()) return;
    dispatch({ type: 'ADD_PLAYOFF_FLOW', payload: { tournamentId: tournament.id, flow: { name: newFlowName.trim(), matches: [] } } });
    toast.success(`Flow "${newFlowName}" created.`);
    setNewFlowName(''); setShowNewFlow(false);
  }

  function handleGenerateFlow() {
    if (tournament.pools.length === 0) { toast.error('Set up pools first.'); return; }
    const generated = generatePlayoffs(tournament, teamsPerPool);
    if (generated.length === 0) { toast.error('Not enough qualified teams.'); return; }
    const flow = playoffFlows.find(f => f.id === activeFlowId);
    if (!flow) return;
    dispatch({ type: 'UPDATE_PLAYOFF_FLOW', payload: { tournamentId: tournament.id, flow: { ...flow, matches: generated } } });
    toast.success(`Bracket generated for "${flow.name}".`);
  }

  function handleSaveScoreFlow(match, homeScore, awayScore) {
    if (homeScore === awayScore) { toast.error('Playoff matches cannot end in a draw.'); return; }
    const flow = playoffFlows.find(f => f.id === activeFlowId);
    if (!flow) return;
    const updated = { ...match, homeScore, awayScore, played: true };
    dispatch({ type: 'UPDATE_PLAYOFF_FLOW_MATCH', payload: { tournamentId: tournament.id, flowId: activeFlowId, match: updated } });
    // Advance winner
    const newMatches = advancePlayoffWinner(
      flow.matches.map(m => m.id === match.id ? updated : m),
      match.id
    );
    dispatch({ type: 'UPDATE_PLAYOFF_FLOW', payload: { tournamentId: tournament.id, flow: { ...flow, matches: newMatches } } });
    toast.success('Result saved!');
    setScoreMatch(null);
  }

  function handleDeleteFlow() {
    dispatch({ type: 'DELETE_PLAYOFF_FLOW', payload: { tournamentId: tournament.id, flowId: deleteFlowId } });
    toast.success('Playoff flow deleted.');
    setDeleteFlowId(null);
    setActiveFlowId('default');
  }

  function handleRenameFlow(e) {
    e.preventDefault();
    if (!renameFlow?.name?.trim()) return;
    const flow = playoffFlows.find(f => f.id === renameFlow.id);
    if (!flow) return;
    dispatch({ type: 'UPDATE_PLAYOFF_FLOW', payload: { tournamentId: tournament.id, flow: { ...flow, name: renameFlow.name.trim() } } });
    toast.success('Flow renamed.');
    setRenameFlow(null);
  }

  function handleSaveScore(match, h, a) {
    if (activeFlowId === 'default') handleSaveScoreDefault(match, h, a);
    else handleSaveScoreFlow(match, h, a);
  }

  // ── Determine which generate/reset to use ─────────────────────────────────

  const isEmpty = activeMatches.length === 0;

  if (isEmpty) {
    return (
      <div className="playoffs-tab">
        <div className="container">
          {/* Flow selector */}
          {(playoffFlows.length > 0 || isAdmin) && (
            <FlowSelector
              flows={playoffFlows}
              activeFlowId={activeFlowId}
              setActiveFlowId={setActiveFlowId}
              isAdmin={isAdmin}
              onNew={() => setShowNewFlow(true)}
              onRename={flow => setRenameFlow({ id: flow.id, name: flow.name })}
              onDelete={flowId => setDeleteFlowId(flowId)}
            />
          )}

          {isAdmin ? (
            <div className="playoffs-generate-panel">
              <Trophy size={48} className="generate-icon" />
              <h2>{activeFlowId === 'default' ? 'Generate Playoff Bracket' : `Generate: ${playoffFlows.find(f => f.id === activeFlowId)?.name}`}</h2>
              <p>Select how many teams per pool qualify, then generate the bracket.</p>
              <div className="generate-controls">
                <label>Teams per pool qualifying:</label>
                <div className="teams-per-pool-btns">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} className={`tpp-btn ${teamsPerPool === n ? 'tpp-btn-active' : ''}`} onClick={() => setTeamsPerPool(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <Button variant="accent" size="lg" icon={<Zap size={18} />}
                onClick={activeFlowId === 'default' ? handleGenerateDefault : handleGenerateFlow}
                disabled={tournament.pools.length === 0}>
                Generate Bracket
              </Button>
            </div>
          ) : (
            <div className="playoffs-generate-panel">
              <Trophy size={48} className="generate-icon" />
              <h2>Playoffs Not Started</h2>
              <p>The playoff bracket has not been generated yet. Check back once pool play is complete.</p>
            </div>
          )}
        </div>

        {/* Modals */}
        <Modal open={showNewFlow} onClose={() => setShowNewFlow(false)} title="Create Playoff Flow" size="sm">
          <form onSubmit={handleCreateFlow} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField label="Flow Name" required>
              <Input value={newFlowName} onChange={e => setNewFlowName(e.target.value)} placeholder="e.g. Cup Draw, Plate Draw" autoFocus required />
            </FormField>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowNewFlow(false)}>Cancel</Button>
              <Button type="submit" variant="accent">Create</Button>
            </div>
          </form>
        </Modal>
        <ConfirmDialog open={!!deleteFlowId} onClose={() => setDeleteFlowId(null)} onConfirm={handleDeleteFlow}
          title="Delete Playoff Flow" message="This will permanently delete this playoff flow and all its results." confirmLabel="Delete" danger />
      </div>
    );
  }

  // Organise matches by round
  const rounds = [...new Set(activeMatches.filter(m => !m.isThirdPlace).map(m => m.round))].sort((a, b) => b - a);
  const thirdPlaceMatch = activeMatches.find(m => m.isThirdPlace);

  return (
    <div className="playoffs-tab">
      <div className="container">
        {/* Flow selector */}
        {(playoffFlows.length > 0 || isAdmin) && (
          <FlowSelector
            flows={playoffFlows}
            activeFlowId={activeFlowId}
            setActiveFlowId={setActiveFlowId}
            isAdmin={isAdmin}
            onNew={() => setShowNewFlow(true)}
            onRename={flow => setRenameFlow({ id: flow.id, name: flow.name })}
            onDelete={flowId => setDeleteFlowId(flowId)}
          />
        )}

        <div className="playoffs-header">
          <h2 className="playoffs-title">
            {activeFlowId === 'default' ? 'Playoff Bracket' : (playoffFlows.find(f => f.id === activeFlowId)?.name || 'Playoff Bracket')}
          </h2>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => {
              if (window.confirm('Reset this bracket?')) {
                if (activeFlowId === 'default') handleResetDefault();
                else {
                  const flow = playoffFlows.find(f => f.id === activeFlowId);
                  if (flow) dispatch({ type: 'UPDATE_PLAYOFF_FLOW', payload: { tournamentId: tournament.id, flow: { ...flow, matches: [] } } });
                  toast.success('Bracket reset.');
                }
              }
            }}>
              Reset Bracket
            </Button>
          )}
        </div>

        <div className="bracket-wrapper">
          {rounds.map(round => {
            const roundMatches = activeMatches.filter(m => m.round === round && !m.isThirdPlace).sort((a, b) => a.position - b.position);
            return (
              <div key={round} className="bracket-round">
                <div className="bracket-round-label">{ROUND_LABELS[round] || `Round of ${round * 2}`}</div>
                <div className="bracket-matches">
                  {roundMatches.map(match => (
                    <BracketMatch key={match.id} match={match} tournament={tournament} isAdmin={isAdmin} onClick={isAdmin ? () => setScoreMatch(match) : undefined} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {thirdPlaceMatch && (
          <div className="third-place-section">
            <div className="third-place-label">3rd Place Play-Off</div>
            <BracketMatch match={thirdPlaceMatch} tournament={tournament} isAdmin={isAdmin} onClick={isAdmin ? () => setScoreMatch(thirdPlaceMatch) : undefined} />
          </div>
        )}

        {scoreMatch && isAdmin && (
          <PlayoffScoreModal match={scoreMatch} tournament={tournament} onClose={() => setScoreMatch(null)} onSave={(h, a) => handleSaveScore(scoreMatch, h, a)} />
        )}
      </div>

      {/* Modals */}
      <Modal open={showNewFlow} onClose={() => setShowNewFlow(false)} title="Create Playoff Flow" size="sm">
        <form onSubmit={handleCreateFlow} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Flow Name" required>
            <Input value={newFlowName} onChange={e => setNewFlowName(e.target.value)} placeholder="e.g. Cup Draw, Plate Draw" autoFocus required />
          </FormField>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setShowNewFlow(false)}>Cancel</Button>
            <Button type="submit" variant="accent">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!renameFlow} onClose={() => setRenameFlow(null)} title="Rename Flow" size="sm">
        <form onSubmit={handleRenameFlow} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Flow Name" required>
            <Input value={renameFlow?.name || ''} onChange={e => setRenameFlow(r => ({ ...r, name: e.target.value }))} autoFocus required />
          </FormField>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setRenameFlow(null)}>Cancel</Button>
            <Button type="submit" variant="accent">Rename</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteFlowId} onClose={() => setDeleteFlowId(null)} onConfirm={handleDeleteFlow}
        title="Delete Playoff Flow" message="This will permanently delete this playoff flow and all its results." confirmLabel="Delete" danger />
    </div>
  );
}

function FlowSelector({ flows, activeFlowId, setActiveFlowId, isAdmin, onNew, onRename, onDelete }) {
  return (
    <div className="flow-selector">
      <div className="flow-tabs">
        <button className={`flow-tab ${activeFlowId === 'default' ? 'flow-tab-active' : ''}`} onClick={() => setActiveFlowId('default')}>
          Main Bracket
        </button>
        {flows.map(f => (
          <div key={f.id} className={`flow-tab-wrap ${activeFlowId === f.id ? 'flow-tab-wrap-active' : ''}`}>
            <button className={`flow-tab ${activeFlowId === f.id ? 'flow-tab-active' : ''}`} onClick={() => setActiveFlowId(f.id)}>
              {f.name}
            </button>
            {isAdmin && activeFlowId === f.id && (
              <div className="flow-tab-actions">
                <button className="flow-tab-action-btn" onClick={() => onRename(f)} title="Rename"><Edit2 size={11} /></button>
                <button className="flow-tab-action-btn flow-tab-delete-btn" onClick={() => onDelete(f.id)} title="Delete"><Trash2 size={11} /></button>
              </div>
            )}
          </div>
        ))}
        {isAdmin && (
          <button className="flow-tab flow-tab-add" onClick={onNew} title="New playoff flow">
            <Plus size={13} /> Add Flow
          </button>
        )}
      </div>
    </div>
  );
}

function BracketMatch({ match, tournament, isAdmin, onClick }) {
  const home = match.homeTeamId ? tournament.teams.find(t => t.id === match.homeTeamId) : null;
  const away = match.awayTeamId ? tournament.teams.find(t => t.id === match.awayTeamId) : null;
  const homeWon = match.played && match.homeScore > match.awayScore;
  const awayWon = match.played && match.awayScore > match.homeScore;

  return (
    <div className={`bracket-match ${match.played ? 'bracket-match-played' : ''}`} onClick={onClick}>
      <div className={`bracket-team ${homeWon ? 'bracket-winner' : ''} ${!home ? 'bracket-tbd' : ''}`}>
        <span className="bm-name">{home?.name || 'TBD'}</span>
        {match.played && <span className={`bm-score ${homeWon ? 'bm-score-win' : ''}`}>{match.homeScore}</span>}
      </div>
      <div className="bracket-divider" />
      <div className={`bracket-team ${awayWon ? 'bracket-winner' : ''} ${!away ? 'bracket-tbd' : ''}`}>
        <span className="bm-name">{away?.name || 'TBD'}</span>
        {match.played && <span className={`bm-score ${awayWon ? 'bm-score-win' : ''}`}>{match.awayScore}</span>}
      </div>
      {isAdmin && !match.played && home && away && (
        <div className="bm-click-hint">Click to enter score</div>
      )}
    </div>
  );
}

function PlayoffScoreModal({ match, tournament, onClose, onSave }) {
  const home = match.homeTeamId ? tournament.teams.find(t => t.id === match.homeTeamId) : null;
  const away = match.awayTeamId ? tournament.teams.find(t => t.id === match.awayTeamId) : null;
  const [homeScore, setHomeScore] = useState(match.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore ?? '');
  const [err, setErr] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { setErr('Please enter valid scores.'); return; }
    if (h === a) { setErr('Playoff matches must have a winner. Scores cannot be equal.'); return; }
    setErr('');
    onSave(h, a);
  }

  return (
    <Modal open onClose={onClose} title="Enter Result" size="sm">
      <form onSubmit={handleSubmit}>
        <div className="score-modal-teams">
          <div className="score-team-col">
            <div className="score-team-name">{home?.name || 'TBD'}</div>
            <input type="number" min="0" className="score-input" value={homeScore} onChange={e => setHomeScore(e.target.value)} autoFocus />
          </div>
          <div className="score-sep">–</div>
          <div className="score-team-col">
            <div className="score-team-name">{away?.name || 'TBD'}</div>
            <input type="number" min="0" className="score-input" value={awayScore} onChange={e => setAwayScore(e.target.value)} />
          </div>
        </div>
        {err && <p className="score-error">{err}</p>}
        <div className="score-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent">Save Result</Button>
        </div>
      </form>
    </Modal>
  );
}
