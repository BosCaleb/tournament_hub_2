import { Calendar, Trophy, Users, Target, TrendingUp, Clock } from 'lucide-react';
import { getTournamentStats, getUpcomingFixtures, getRecentResults, calculateStandings } from '../../lib/tournament.js';
import { formatDate, formatTime, formatScore } from '../../lib/utils.js';
import { Badge } from '../ui/Badge.jsx';
import './OverviewTab.css';

export function OverviewTab({ tournament }) {
  const stats = getTournamentStats(tournament);
  const upcoming = getUpcomingFixtures(tournament, 5);
  const recent = getRecentResults(tournament, 5);

  const statCards = [
    { label: 'Teams', value: stats.totalTeams, icon: <Users size={20} />, color: 'var(--color-info)' },
    { label: 'Fixtures', value: stats.totalFixtures, icon: <Calendar size={20} />, color: 'var(--brand-gold)' },
    { label: 'Played', value: stats.playedFixtures, icon: <Target size={20} />, color: 'var(--color-success)' },
    { label: 'Goals Scored', value: stats.totalGoals, icon: <Trophy size={20} />, color: 'var(--color-danger)' },
    { label: 'Avg Goals/Match', value: stats.avgGoalsPerMatch, icon: <TrendingUp size={20} />, color: 'var(--color-win)' },
    { label: 'Players', value: stats.totalPlayers, icon: <Users size={20} />, color: 'var(--brand-navy-light)' },
  ];

  return (
    <div className="overview-tab">
      <div className="container">

        {/* Progress banner */}
        <div className="overview-progress-card">
          <div className="prog-left">
            <span className="prog-pct">{stats.completionPct}%</span>
            <span className="prog-label">Tournament Complete</span>
          </div>
          <div className="prog-right">
            <div className="prog-bar-wrap">
              <div className="prog-bar-track">
                <div className="prog-bar-fill" style={{ width: `${stats.completionPct}%` }} />
              </div>
              <span className="prog-stats">
                {stats.playedFixtures} of {stats.totalFixtures} fixtures played
              </span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="overview-stat-grid">
          {statCards.map(s => (
            <div key={s.label} className="ov-stat-card">
              <div className="ov-stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
                {s.icon}
              </div>
              <div className="ov-stat-content">
                <span className="ov-stat-value">{s.value}</span>
                <span className="ov-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="overview-two-col">
          {/* Upcoming fixtures */}
          <div className="ov-card">
            <div className="ov-card-header">
              <Clock size={16} />
              <h2>Upcoming Fixtures</h2>
              <Badge variant="info" size="sm">{upcoming.length}</Badge>
            </div>
            {upcoming.length === 0 ? (
              <p className="ov-empty">No upcoming fixtures scheduled.</p>
            ) : (
              <div className="ov-fixture-list">
                {upcoming.map(f => {
                  const home = tournament.teams.find(t => t.id === f.homeTeamId);
                  const away = tournament.teams.find(t => t.id === f.awayTeamId);
                  const pool = tournament.pools.find(p => p.id === f.poolId);
                  return (
                    <div key={f.id} className="ov-fixture">
                      <div className="ov-fixture-teams">
                        <span className="ov-team">{home?.name || '—'}</span>
                        <span className="ov-vs">vs</span>
                        <span className="ov-team">{away?.name || '—'}</span>
                      </div>
                      <div className="ov-fixture-meta">
                        {f.date && <span>{formatDate(f.date)}</span>}
                        {f.time && <span>{formatTime(f.time)}</span>}
                        {f.court && <span>Court {f.court}</span>}
                        {pool && <Badge variant="default" size="sm">{pool.name}</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent results */}
          <div className="ov-card">
            <div className="ov-card-header">
              <Trophy size={16} />
              <h2>Recent Results</h2>
              <Badge variant="success" size="sm">{recent.length}</Badge>
            </div>
            {recent.length === 0 ? (
              <p className="ov-empty">No results yet. Start entering scores in the Fixtures tab.</p>
            ) : (
              <div className="ov-fixture-list">
                {recent.map(f => {
                  const home = tournament.teams.find(t => t.id === f.homeTeamId);
                  const away = tournament.teams.find(t => t.id === f.awayTeamId);
                  const homeWon = f.homeScore > f.awayScore;
                  const awayWon = f.awayScore > f.homeScore;
                  return (
                    <div key={f.id} className="ov-fixture ov-result">
                      <div className="ov-result-row">
                        <span className={`ov-team ${homeWon ? 'ov-winner' : ''}`}>{home?.name || '—'}</span>
                        <span className="ov-score-box">
                          <span className={homeWon ? 'score-bold' : ''}>{f.homeScore}</span>
                          <span>–</span>
                          <span className={awayWon ? 'score-bold' : ''}>{f.awayScore}</span>
                        </span>
                        <span className={`ov-team ov-team-right ${awayWon ? 'ov-winner' : ''}`}>{away?.name || '—'}</span>
                      </div>
                      {f.date && <div className="ov-fixture-meta"><span>{formatDate(f.date)}</span></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pool standings mini */}
        {tournament.pools.length > 0 && (
          <div className="ov-card">
            <div className="ov-card-header">
              <Trophy size={16} />
              <h2>Pool Standings</h2>
            </div>
            <div className="ov-pools-grid">
              {tournament.pools.map(pool => {
                const standings = calculateStandings(tournament, pool.id).slice(0, 4);
                return (
                  <div key={pool.id} className="ov-pool-mini">
                    <h3 className="ov-pool-name">{pool.name}</h3>
                    <table className="ov-standings-mini">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Team</th>
                          <th>P</th>
                          <th>W</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => (
                          <tr key={s.teamId} className={i === 0 ? 'standing-leader' : ''}>
                            <td className="pos-num">{i + 1}</td>
                            <td className="team-name-cell">{s.teamName}</td>
                            <td>{s.played}</td>
                            <td>{s.won}</td>
                            <td className="pts-cell">{s.points}</td>
                          </tr>
                        ))}
                        {standings.length === 0 && (
                          <tr><td colSpan={5} className="ov-empty-row">No results yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
