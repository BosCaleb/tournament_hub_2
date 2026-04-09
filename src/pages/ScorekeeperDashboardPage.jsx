import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, Play, Clock, CheckCircle, LogOut, AlertCircle } from 'lucide-react';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { useScorekeeperAuth } from '../context/ScorekeeperContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { formatDate, formatTime } from '../lib/utils.js';
import { StatEdgeIcon } from '../components/ui/StatEdgeLogo.jsx';
import './ScorekeeperDashboardPage.css';

export function ScorekeeperDashboardPage() {
  const { state } = useTournamentContext();
  const auth = useScorekeeperAuth();
  const navigate = useNavigate();

  const { session } = auth;

  // Find the tournament for this session (null if not logged in yet)
  const tournament = useMemo(
    () => session ? state.tournaments.find(t => t.id === session.tournamentId) : null,
    [state.tournaments, session]
  );

  // Get assigned fixture IDs — all hooks must come before any early return
  const assignedFixtureIds = useMemo(() =>
    auth.getAssignedFixtureIds(tournament),
    [auth, tournament]
  );

  // Build enriched fixture list
  const fixtures = useMemo(() => {
    if (!tournament) return [];

    return assignedFixtureIds
      .map(fid => {
        const f = tournament.fixtures.find(fx => fx.id === fid);
        if (!f) return null;

        const homeTeam = tournament.teams.find(t => t.id === f.homeTeamId);
        const awayTeam = tournament.teams.find(t => t.id === f.awayTeamId);
        const pool     = tournament.pools.find(p => p.id === f.poolId);

        // Determine display status
        let status = 'upcoming';
        if (f.played) status = 'completed';

        return {
          ...f,
          homeTeamName: homeTeam?.name || 'TBD',
          awayTeamName: awayTeam?.name || 'TBD',
          homeColors: homeTeam?.colors,
          awayColors: awayTeam?.colors,
          poolName: pool?.name || '',
          displayStatus: status,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Priority: live > upcoming > completed
        const priority = { live: 0, upcoming: 1, completed: 2 };
        const pa = priority[a.displayStatus] ?? 3;
        const pb = priority[b.displayStatus] ?? 3;
        if (pa !== pb) return pa - pb;
        // Within same status: sort by date + time
        const da = `${a.date || '9999'}${a.time || '99:99'}`;
        const db = `${b.date || '9999'}${b.time || '99:99'}`;
        return da.localeCompare(db);
      });
  }, [tournament, assignedFixtureIds]);

  // Guard after all hooks
  if (!auth.isLoggedIn) {
    navigate('/scorekeeper', { replace: true });
    return null;
  }

  function handleLogout() {
    auth.logout();
    navigate('/scorekeeper');
  }

  return (
    <div className="sk-dashboard">
      {/* Header */}
      <header className="sk-dashboard-header">
        <div className="sk-dashboard-header-inner container">
          <div className="sk-dashboard-brand">
            <StatEdgeIcon size={32} />
            <span className="sk-dashboard-brand-name">StatEdge</span>
          </div>
          <div className="sk-dashboard-user">
            <span className="sk-dashboard-username">{session.scorekeeperName}</span>
            <Button variant="ghost" size="sm" icon={<LogOut size={16} />} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="sk-dashboard-main container">
        {/* Welcome */}
        <div className="sk-dashboard-welcome">
          <div className="sk-dashboard-welcome-icon">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="sk-dashboard-greeting">
              Hello, {session.scorekeeperName.split(' ')[0]}
            </h1>
            <p className="sk-dashboard-tournament">
              {tournament ? tournament.name : 'Tournament not found'}
            </p>
          </div>
        </div>

        {/* No tournament found */}
        {!tournament && (
          <div className="sk-empty">
            <AlertCircle size={32} />
            <p>Tournament data could not be loaded. Please contact your administrator.</p>
          </div>
        )}

        {/* Fixtures */}
        {tournament && (
          <>
            <div className="sk-fixtures-heading">
              <h2>Your Assigned Matches</h2>
              <Badge variant="default">{fixtures.length} match{fixtures.length !== 1 ? 'es' : ''}</Badge>
            </div>

            {fixtures.length === 0 ? (
              <div className="sk-empty">
                <ClipboardList size={32} />
                <p>No matches assigned to you yet.</p>
                <p className="sk-empty-sub">Contact your tournament administrator.</p>
              </div>
            ) : (
              <div className="sk-fixture-list">
                {fixtures.map(fixture => (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    tournamentId={tournament.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FixtureCard({ fixture, tournamentId }) {
  const statusConfig = {
    live:      { icon: <Play size={14} />,         label: 'Live',      variant: 'success' },
    upcoming:  { icon: <Clock size={14} />,        label: 'Upcoming',  variant: 'info' },
    completed: { icon: <CheckCircle size={14} />,  label: 'Completed', variant: 'default' },
  };
  const cfg = statusConfig[fixture.displayStatus] || statusConfig.upcoming;

  return (
    <div className={`sk-fixture-card sk-fixture-card--${fixture.displayStatus}`}>
      {/* Status badge + meta */}
      <div className="sk-fixture-card-meta">
        <Badge variant={cfg.variant} icon={cfg.icon}>{cfg.label}</Badge>
        <div className="sk-fixture-card-detail">
          {fixture.poolName && <span>{fixture.poolName}</span>}
          {fixture.round && <span>Round {fixture.round}</span>}
          {fixture.court && <span>Court {fixture.court}</span>}
        </div>
        <div className="sk-fixture-card-time">
          {fixture.date && <span>{formatDate(fixture.date)}</span>}
          {fixture.time && <span>{formatTime(fixture.time)}</span>}
        </div>
      </div>

      {/* Teams */}
      <div className="sk-fixture-teams">
        <div className="sk-fixture-team">
          <TeamDot color={fixture.homeColors?.primary} />
          <span className="sk-fixture-team-name">{fixture.homeTeamName}</span>
        </div>
        <div className="sk-fixture-vs">
          {fixture.played
            ? <span className="sk-fixture-score">{fixture.homeScore} – {fixture.awayScore}</span>
            : <span className="sk-fixture-vs-label">vs</span>
          }
        </div>
        <div className="sk-fixture-team sk-fixture-team--away">
          <span className="sk-fixture-team-name">{fixture.awayTeamName}</span>
          <TeamDot color={fixture.awayColors?.primary} />
        </div>
      </div>

      {/* Action */}
      <div className="sk-fixture-card-action">
        {fixture.displayStatus === 'completed' ? (
          <Link
            to={`/scorekeeper/match/${tournamentId}/${fixture.id}`}
            className="sk-fixture-btn sk-fixture-btn--view"
          >
            <CheckCircle size={16} />
            View Scorecard
          </Link>
        ) : (
          <Link
            to={`/scorekeeper/match/${tournamentId}/${fixture.id}`}
            className="sk-fixture-btn sk-fixture-btn--open"
          >
            <Play size={16} />
            Open Scorecard
          </Link>
        )}
      </div>
    </div>
  );
}

function TeamDot({ color }) {
  return (
    <span
      className="sk-team-dot"
      style={{ background: color || 'var(--color-border)' }}
      aria-hidden="true"
    />
  );
}
