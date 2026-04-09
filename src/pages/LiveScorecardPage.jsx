/**
 * LiveScorecardPage
 *
 * The live scorecard view for a single fixture.
 * Accessible to:
 *  - Scorekeepers (from /scorekeeper/match/:tournamentId/:fixtureId)
 *  - Admins (from /admin/scorecard/:tournamentId/:fixtureId)
 *
 * Architecture:
 *  1. Load or create scorecard_instance for this fixture
 *  2. Load + replay score_events to derive current state
 *  3. Subscribe to real-time updates
 *  4. On scoring action: optimistic UI update + queue event for sync
 *  5. Process queue on each action / on reconnect
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Play, Pause, Flag, RotateCcw,
  PenLine, Check, AlertTriangle, RefreshCw, Lock
} from 'lucide-react';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { useScorekeeperAuth } from '../context/ScorekeeperContext.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { ScoreControls } from '../components/scorecard/ScoreControls.jsx';
import { QuarterTracker } from '../components/scorecard/QuarterTracker.jsx';
import { SyncStatus } from '../components/scorecard/SyncStatus.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import {
  loadScorecardInstance, upsertScorecardInstance,
  loadScoreEvents, insertScoreEvent, updateScorecardState,
  subscribeScorecardInstance,
  loadTemplates,
} from '../lib/db_scorecard.js';
import {
  EVENT_TYPES, applyEventToState, deriveStateFromEvents,
  createScoreEvent, initialScorecardState,
  isScorecardEditable, isScorecardFinal,
  getScorecardStatusLabel, resolveTemplate, snapshotTemplate,
} from '../lib/scorecard.js';
import { formatDate, formatTime } from '../lib/utils.js';
import './LiveScorecardPage.css';

// ─── Offline queue (module-level, survives re-renders) ───────────────────────
const offlineQueue = [];

export function LiveScorecardPage({ isAdmin = false }) {
  const { tournamentId, fixtureId } = useParams();
  const navigate = useNavigate();

  const { state } = useTournamentContext();
  const skAuth = useScorekeeperAuth();
  const adminAuth = useAdminAuth();

  // ── Access control ──────────────────────────────────────────────────────────
  const isAuthorised = useMemo(() => {
    if (isAdmin) return adminAuth.isAdmin;
    if (skAuth.isLoggedIn) {
      // Scorekeeper must be assigned to this fixture
      const tournament = state.tournaments.find(t => t.id === tournamentId);
      const assignedIds = skAuth.getAssignedFixtureIds(tournament);
      return assignedIds.includes(fixtureId);
    }
    return false;
  }, [isAdmin, adminAuth.isAdmin, skAuth, state.tournaments, tournamentId, fixtureId]);

  // ── Tournament + fixture data ───────────────────────────────────────────────
  const tournament = useMemo(
    () => state.tournaments.find(t => t.id === tournamentId),
    [state.tournaments, tournamentId]
  );

  const fixture = useMemo(
    () => tournament?.fixtures.find(f => f.id === fixtureId),
    [tournament, fixtureId]
  );

  const homeTeam = useMemo(
    () => tournament?.teams.find(t => t.id === fixture?.homeTeamId),
    [tournament, fixture]
  );

  const awayTeam = useMemo(
    () => tournament?.teams.find(t => t.id === fixture?.awayTeamId),
    [tournament, fixture]
  );

  // ── Scorecard state ─────────────────────────────────────────────────────────
  const [instance, setInstance]         = useState(null);
  const [scorecardState, setScorecardState] = useState(initialScorecardState());
  const [events, setEvents]             = useState([]);
  const [template, setTemplate]         = useState(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [syncStatus, setSyncStatus]     = useState('synced');
  const [loading, setLoading]           = useState(true);
  const [showFinaliseModal, setShowFinaliseModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText]         = useState('');
  const [showQuarterModal, setShowQuarterModal] = useState(false);

  // Sequence counter (use ref to avoid stale closures in callbacks)
  const seqRef = useRef(0);

  const scorekeeperName = isAdmin
    ? 'Admin'
    : skAuth.session?.scorekeeperName || 'Scorekeeper';

  // ── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!tournament || !fixture) return;

    async function init() {
      setLoading(true);

      // Load or create scorecard instance
      let inst = await loadScorecardInstance(fixtureId);
      if (!inst) {
        // Resolve template for this fixture
        const templates = await loadTemplates({ sport_code: tournament.sport });
        const resolved = resolveTemplate(
          templates, fixtureId, tournamentId, tournament.sport, tournament.ageGroup
        );
        const snapshot = snapshotTemplate(resolved);

        inst = await upsertScorecardInstance({
          tournament_id: tournamentId,
          fixture_id: fixtureId,
          template_id: resolved.id || null,
          ...snapshot,
          current_state: initialScorecardState(),
          status: 'pending',
          assigned_scorekeeper_name: scorekeeperName,
        });
        setTemplate(resolved);
      } else {
        // Load template from snapshot
        setTemplate({
          branding_config: inst.branding_snapshot || {},
          layout_config:   inst.layout_snapshot   || {},
          field_config:    inst.field_snapshot     || [],
        });
      }

      if (inst) {
        setInstance(inst);
        seqRef.current = 0;

        // Load and replay events
        const evts = await loadScoreEvents(inst.id);
        setEvents(evts);
        if (evts.length > 0) {
          seqRef.current = Math.max(...evts.map(e => e.sequence_number));
          setScorecardState(deriveStateFromEvents(evts));
        } else {
          setScorecardState(inst.current_state || initialScorecardState());
        }
      }

      setLoading(false);
    }

    init();
  }, [tournament, fixture, fixtureId, tournamentId, scorekeeperName]);

  // ── Real-time subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!fixtureId) return;

    const unsub = subscribeScorecardInstance(fixtureId, updatedInstance => {
      setInstance(updatedInstance);
      setScorecardState(updatedInstance.current_state || initialScorecardState());
    });

    return unsub;
  }, [fixtureId]);

  // ── Process offline queue on reconnect ─────────────────────────────────────
  useEffect(() => {
    function handleOnline() {
      if (offlineQueue.length > 0) {
        setSyncStatus('reconnecting');
        processQueue();
      }
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  async function processQueue() {
    while (offlineQueue.length > 0) {
      const event = offlineQueue[0];
      const result = await insertScoreEvent(event);
      if (result) {
        offlineQueue.shift();
      } else {
        setSyncStatus('failed');
        return;
      }
    }
    setSyncStatus('synced');
  }

  // ── Core scoring action ─────────────────────────────────────────────────────
  const dispatchScoringEvent = useCallback(async (eventType, teamSide = null, payload = {}) => {
    if (!instance) return;
    if (!isScorecardEditable(scorecardState.status) && eventType !== EVENT_TYPES.MATCH_STARTED) {
      return;
    }

    seqRef.current += 1;
    const seq = seqRef.current;

    const event = createScoreEvent({
      scorecardInstanceId: instance.id,
      tournamentId,
      fixtureId,
      eventType,
      teamSide,
      payload,
      sequenceNumber: seq,
      createdBy: scorekeeperName,
    });

    // Optimistic UI update
    const nextState = applyEventToState(scorecardState, event);
    setScorecardState(nextState);
    setEvents(prev => [...prev, event]);

    // Persist
    setSyncStatus('saving');
    const result = await insertScoreEvent(event);

    if (result) {
      // Update instance state in DB
      const isFinished = eventType === EVENT_TYPES.MATCH_FINALISED;
      await updateScorecardState(instance.id, nextState, nextState.status, {
        ...(eventType === EVENT_TYPES.MATCH_STARTED ? { started_at: new Date().toISOString() } : {}),
        ...(isFinished ? { finalised_at: new Date().toISOString() } : {}),
      });
      setSyncStatus('synced');
    } else {
      // Queue for retry
      offlineQueue.push(event);
      setSyncStatus(navigator.onLine ? 'failed' : 'offline');
    }
  }, [instance, scorecardState, tournamentId, fixtureId, scorekeeperName]);

  // ── Goal handlers ───────────────────────────────────────────────────────────
  function handleGoal(side, action) {
    const type = action === 'add'
      ? (side === 'home' ? EVENT_TYPES.GOAL_ADDED_HOME   : EVENT_TYPES.GOAL_ADDED_AWAY)
      : (side === 'home' ? EVENT_TYPES.GOAL_REMOVED_HOME : EVENT_TYPES.GOAL_REMOVED_AWAY);
    dispatchScoringEvent(type, side);
  }

  // ── Quarter / match controls ────────────────────────────────────────────────
  function handleStartMatch() {
    dispatchScoringEvent(EVENT_TYPES.MATCH_STARTED);
  }

  function handleEndQuarter() {
    const q = scorecardState.currentQuarter;
    dispatchScoringEvent(EVENT_TYPES.QUARTER_ENDED, null, { quarter: q });

    // Auto-advance quarter for next start
    if (q === 2) {
      // After Q2 ends: halftime
      setTimeout(() => dispatchScoringEvent(EVENT_TYPES.HALFTIME_STARTED), 300);
    }
  }

  function handleStartNextQuarter() {
    const nextQ = scorecardState.currentQuarter + 1;
    if (scorecardState.status === 'halftime') {
      dispatchScoringEvent(EVENT_TYPES.HALFTIME_ENDED);
    } else {
      dispatchScoringEvent(EVENT_TYPES.QUARTER_STARTED, null, { quarter: nextQ });
    }
  }

  function handlePauseResume() {
    if (scorecardState.status === 'live') {
      dispatchScoringEvent(EVENT_TYPES.MATCH_PAUSED);
    } else if (scorecardState.status === 'paused') {
      dispatchScoringEvent(EVENT_TYPES.MATCH_RESUMED);
    }
  }

  async function handleFinalise() {
    await dispatchScoringEvent(EVENT_TYPES.MATCH_FINALISED);
    setShowFinaliseModal(false);
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await dispatchScoringEvent(EVENT_TYPES.NOTE_ADDED, null, { text: noteText.trim() });
    setNoteText('');
    setShowNoteModal(false);
  }

  async function handleReopenMatch() {
    await dispatchScoringEvent(EVENT_TYPES.MATCH_REOPENED);
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const layout = template?.layout_config || {};
  const branding = template?.branding_config || {};

  const canScore = isAuthorised && isScorecardEditable(scorecardState.status);
  const isFinished = isScorecardFinal(scorecardState.status);

  const backHref = isAdmin
    ? `/admin/${tournament?.sport}/${tournamentId}`
    : '/scorekeeper/dashboard';

  if (!isAuthorised && !loading) {
    return (
      <div className="sc-page sc-page--denied">
        <div className="sc-denied">
          <Lock size={40} />
          <h2>Access Denied</h2>
          <p>You are not assigned to this match.</p>
          <Link to={backHref} className="sc-back-link">Go back</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sc-page sc-page--loading">
        <div className="sc-loading-spinner" />
        <p>Loading scorecard…</p>
      </div>
    );
  }

  if (!tournament || !fixture) {
    return (
      <div className="sc-page sc-page--error">
        <AlertTriangle size={32} />
        <p>Match not found.</p>
        <Link to={backHref} className="sc-back-link">Go back</Link>
      </div>
    );
  }

  return (
    <div
      className="sc-page"
      style={{
        '--sc-primary':   branding.primaryColor   || '#0D1C3E',
        '--sc-secondary': branding.secondaryColor || '#F47820',
        '--sc-accent':    branding.accentColor    || '#FFC500',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sc-header" style={{ background: branding.primaryColor || 'var(--brand-navy)' }}>
        <div className="sc-header-inner container">
          <Link to={backHref} className="sc-back" aria-label="Back">
            <ChevronLeft size={20} />
          </Link>

          <div className="sc-header-center">
            {branding.schoolName && (
              <span className="sc-school-name">{branding.schoolName}</span>
            )}
            {branding.headerText && !branding.schoolName && (
              <span className="sc-school-name">{branding.headerText}</span>
            )}
            <span className="sc-match-label">
              {tournament.name}
              {fixture.round ? ` · Round ${fixture.round}` : ''}
              {fixture.court ? ` · Court ${fixture.court}` : ''}
            </span>
          </div>

          <SyncStatus status={syncStatus} pendingCount={offlineQueue.length} />
        </div>

        {/* Status bar */}
        <div className="sc-status-bar">
          <span className={`sc-status-badge sc-status--${scorecardState.status}`}>
            {getScorecardStatusLabel(scorecardState.status)}
          </span>
          {fixture.date && <span className="sc-status-meta">{formatDate(fixture.date)}</span>}
          {fixture.time && <span className="sc-status-meta">{formatTime(fixture.time)}</span>}
          <span className="sc-status-meta">Scorekeeper: {scorekeeperName}</span>
        </div>
      </header>

      {/* ── School branding logo ────────────────────────────────── */}
      {branding.logoUrl && (
        <div className="sc-logo-bar">
          <img src={branding.logoUrl} alt={branding.schoolName || 'School logo'} className="sc-logo" />
        </div>
      )}

      <main className="sc-main container">
        {/* ── Score display ───────────────────────────────────────── */}
        <ScoreControls
          homeScore={scorecardState.homeScore}
          awayScore={scorecardState.awayScore}
          homeTeamName={homeTeam?.name || 'Home'}
          awayTeamName={awayTeam?.name || 'Away'}
          homeColors={homeTeam?.colors}
          awayColors={awayTeam?.colors}
          onGoal={handleGoal}
          disabled={!canScore}
          style={layout.scoreControlsStyle || 'large_buttons'}
        />

        {/* ── Quarter tracker ─────────────────────────────────────── */}
        {(layout.showQuarterBreakdown !== false) && (
          <section className="sc-section">
            <h3 className="sc-section-title">Quarters</h3>
            <QuarterTracker
              currentQuarter={scorecardState.currentQuarter}
              quarterScores={scorecardState.quarterScores}
              homeTeamName={homeTeam?.name || 'Home'}
              awayTeamName={awayTeam?.name || 'Away'}
            />
          </section>
        )}

        {/* ── Match controls ──────────────────────────────────────── */}
        {isAuthorised && (
          <section className="sc-section sc-controls">
            <h3 className="sc-section-title">Match Controls</h3>
            <div className="sc-control-grid">
              {/* Start match */}
              {scorecardState.status === 'pending' && (
                <Button variant="accent" size="lg" icon={<Play size={18} />} onClick={handleStartMatch} className="sc-ctrl-btn">
                  Start Match
                </Button>
              )}

              {/* Pause / Resume */}
              {(scorecardState.status === 'live' || scorecardState.status === 'paused') && (
                <Button variant="secondary" size="lg" icon={<Pause size={18} />} onClick={handlePauseResume} className="sc-ctrl-btn">
                  {scorecardState.status === 'live' ? 'Pause' : 'Resume'}
                </Button>
              )}

              {/* End quarter */}
              {scorecardState.status === 'live' && scorecardState.currentQuarter < 4 && (
                <Button variant="secondary" size="lg" icon={<Flag size={18} />} onClick={handleEndQuarter} className="sc-ctrl-btn">
                  End Q{scorecardState.currentQuarter}
                </Button>
              )}

              {/* Start next quarter */}
              {(scorecardState.status === 'paused' || scorecardState.status === 'halftime') && (
                <Button variant="secondary" size="lg" icon={<Play size={18} />} onClick={handleStartNextQuarter} className="sc-ctrl-btn">
                  {scorecardState.status === 'halftime' ? 'Start Q3' : `Start Q${scorecardState.currentQuarter + 1}`}
                </Button>
              )}

              {/* Add note */}
              {isScorecardEditable(scorecardState.status) && (layout.showNotes !== false) && (
                <Button variant="ghost" size="md" icon={<PenLine size={16} />} onClick={() => setShowNoteModal(true)} className="sc-ctrl-btn">
                  Add Note
                </Button>
              )}

              {/* Finalise */}
              {(scorecardState.status === 'live' || scorecardState.status === 'paused') && (
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Check size={18} />}
                  onClick={() => setShowFinaliseModal(true)}
                  className="sc-ctrl-btn sc-ctrl-btn--finalise"
                >
                  Finalise Match
                </Button>
              )}

              {/* Reopen (admin only) */}
              {isFinished && isAdmin && (
                <Button
                  variant="ghost"
                  size="md"
                  icon={<RefreshCw size={16} />}
                  onClick={handleReopenMatch}
                  className="sc-ctrl-btn"
                >
                  Re-open Match
                </Button>
              )}
            </div>
          </section>
        )}

        {/* ── Notes ──────────────────────────────────────────────── */}
        {(layout.showNotes !== false) && scorecardState.notes?.length > 0 && (
          <section className="sc-section">
            <h3 className="sc-section-title">Notes</h3>
            <ul className="sc-notes">
              {scorecardState.notes.map((note, i) => (
                <li key={i} className="sc-note">
                  <span className="sc-note-text">{note.text}</span>
                  <span className="sc-note-meta">{note.by}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Event audit log (admin only) ────────────────────────── */}
        {isAdmin && events.length > 0 && (
          <section className="sc-section sc-audit">
            <h3 className="sc-section-title">Event Log</h3>
            <div className="sc-event-list">
              {[...events].reverse().map((ev, i) => (
                <div key={i} className="sc-event">
                  <span className="sc-event-seq">#{ev.sequence_number}</span>
                  <span className="sc-event-type">{ev.event_type.replace(/_/g, ' ')}</span>
                  <span className="sc-event-by">{ev.created_by}</span>
                  <span className="sc-event-at">
                    {ev.created_at ? new Date(ev.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer branding */}
        {branding.footerText && (
          <div className="sc-footer-text">{branding.footerText}</div>
        )}
        {branding.sponsorLogoUrl && (
          <div className="sc-sponsor">
            <img src={branding.sponsorLogoUrl} alt="Sponsor" className="sc-sponsor-logo" />
          </div>
        )}
      </main>

      {/* ── Finalise confirmation modal ──────────────────────────── */}
      <ConfirmDialog
        open={showFinaliseModal}
        title="Finalise Match?"
        message={`Final score: ${homeTeam?.name || 'Home'} ${scorecardState.homeScore} – ${scorecardState.awayScore} ${awayTeam?.name || 'Away'}. Once finalised, scoring will be locked. Admins can re-open if needed.`}
        confirmLabel="Yes, Finalise"
        cancelLabel="Cancel"
        confirmVariant="accent"
        onConfirm={handleFinalise}
        onCancel={() => setShowFinaliseModal(false)}
      />

      {/* ── Add note modal ───────────────────────────────────────── */}
      <Modal
        open={showNoteModal}
        title="Add Note"
        onClose={() => { setShowNoteModal(false); setNoteText(''); }}
      >
        <div className="sc-note-modal">
          <textarea
            className="sc-note-textarea"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="e.g. Injury stoppage at 14:32, dispute about goal at Q3…"
            rows={4}
            autoFocus
          />
          <div className="sc-note-modal-actions">
            <Button variant="ghost" onClick={() => { setShowNoteModal(false); setNoteText(''); }}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleAddNote} disabled={!noteText.trim()}>
              Add Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
