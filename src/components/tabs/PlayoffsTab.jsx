import { useState } from 'react';
import { Zap, Trophy } from 'lucide-react';
import { generatePlayoffs, calculateStandings, advancePlayoffWinner } from '../../lib/tournament.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import './PlayoffsTab.css';

export function PlayoffsTab({ tournament, dispatch, toast, isAdmin = false }) {
  const [scoreMatch, setScoreMatch] = useState(null);
  const [teamsPerPool, setTeamsPerPool] = useState(2);

  const playoffs = tournament.playoffs || [];

  function handleGenerate() {
    if (tournament.pools.length === 0) { toast.error('Set up pools first.'); return; }
    const generated = generatePlayoffs(tournament, teamsPerPool);
    if (generated.length === 0) { toast.error('Not enough qualified teams to generate playoffs.'); return; }
    dispatch({ type: 'SET_PLAYOFFS', payload: { tournamentId: tournament.id, playoffs: generated } });
    toast.success(`Playoff bracket generated with ${generated.filter(m => !m.isThirdPlace).length} matches.`);
  }

  function handleSaveScore(match, homeScore, awayScore) {
    if (homeScore === awayScore) { toast.error('Playoff matches cannot end in a draw. Please enter a decisive score.'); return; }
    const updated = { ...match, homeScore, awayScore, played: true };
    dispatch({ type: 'UPDATE_PLAYOFF_MATCH', payload: { tournamentId: tournament.id, match: updated } });

    // Advance winner
    const newPlayoffs = advancePlayoffWinner(
      tournament.playoffs.map(m => m.id === match.id ? updated : m),
      match.id
    );
    dispatch({ type: 'SET_PLAYOFFS', payload: { tournamentId: tournament.id, playoffs: newPlayoffs } });
    toast.success('Result saved and bracket updated!');
    setScoreMatch(null);
  }

  if (playoffs.length === 0) {
    return (
      <div className="playoffs-tab">
        <div className="container">
          {isAdmin ? (
            <div className="playoffs-generate-panel">
              <Trophy size={48} className="generate-icon" />
              <h2>Generate Playoff Bracket</h2>
              <p>Select how many teams per pool qualify for the playoffs, then generate the bracket.</p>
              <div className="generate-controls">
                <label>Teams per pool qualifying:</label>
                <div className="teams-per-pool-btns">
                  {[1,2,3,4].map(n => (
                    <button
                      key={n}
                      className={`tpp-btn ${teamsPerPool === n ? 'tpp-btn-active' : ''}`}
                      onClick={() => setTeamsPerPool(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="accent" size="lg" icon={<Zap size={18} />} onClick={handleGenerate}
                disabled={tournament.pools.length === 0}>
                Generate Bracket
              </Button>
            </div>
          ) : (
            <div className="playoffs-generate-panel">
              <Trophy size={48} className="generate-icon" />
              <h2>Playoffs Not Started</h2>
              <p>The playoff bracket hasn't been generated yet. Check back once pool play is complete.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Organise matches by round
  const rounds = [...new Set(playoffs.filter(m => !m.isThirdPlace).map(m => m.round))].sort((a, b) => b - a);
  const thirdPlaceMatch = playoffs.find(m => m.isThirdPlace);

  const roundNames = {
    1: 'FINAL',
    2: 'SEMI-FINALS',
    4: 'QUARTER-FINALS',
    8: 'ROUND OF 16',
  };

  return (
    <div className="playoffs-tab">
      <div className="container">
        <div className="playoffs-header">
          <h2 className="playoffs-title">Playoff Bracket</h2>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => {
              if (window.confirm('Reset the playoff bracket? This cannot be undone.')) {
                dispatch({ type: 'SET_PLAYOFFS', payload: { tournamentId: tournament.id, playoffs: [] } });
              }
            }}>
              Reset Bracket
            </Button>
          )}
        </div>

        <div className="bracket-wrapper">
          {rounds.map(round => {
            const roundMatches = playoffs.filter(m => m.round === round && !m.isThirdPlace)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={round} className="bracket-round">
                <div className="bracket-round-label">{roundNames[round] || `Round of ${round * 2}`}</div>
                <div className="bracket-matches">
                  {roundMatches.map(match => (
                    <BracketMatch
                      key={match.id}
                      match={match}
                      tournament={tournament}
                      isAdmin={isAdmin}
                      onClick={isAdmin ? () => setScoreMatch(match) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {thirdPlaceMatch && (
          <div className="third-place-section">
            <div className="third-place-label">3rd Place Play-Off</div>
            <BracketMatch
              match={thirdPlaceMatch}
              tournament={tournament}
              isAdmin={isAdmin}
              onClick={isAdmin ? () => setScoreMatch(thirdPlaceMatch) : undefined}
            />
          </div>
        )}

        {scoreMatch && isAdmin && (
          <PlayoffScoreModal
            match={scoreMatch}
            tournament={tournament}
            onClose={() => setScoreMatch(null)}
            onSave={(h, a) => handleSaveScore(scoreMatch, h, a)}
          />
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
            <input type="number" min="0" className="score-input" value={homeScore}
              onChange={e => setHomeScore(e.target.value)} autoFocus />
          </div>
          <div className="score-sep">–</div>
          <div className="score-team-col">
            <div className="score-team-name">{away?.name || 'TBD'}</div>
            <input type="number" min="0" className="score-input" value={awayScore}
              onChange={e => setAwayScore(e.target.value)} />
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
