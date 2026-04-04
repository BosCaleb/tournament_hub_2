import { getTournamentStats, getTopScorers, calculateStandings } from '../../lib/tournament.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { EmptyState } from '../ui/EmptyState.jsx';
import { TrendingUp } from 'lucide-react';
import './StatsTab.css';

const COLORS = ['#FFC500','#2563EB','#DC2626','#16A34A','#7C3AED','#0891B2','#DB2777','#059669','#EA580C','#4338CA'];

export function StatsTab({ tournament }) {
  const stats = getTournamentStats(tournament);
  const topScorers = getTopScorers(tournament, 8);

  if (stats.playedFixtures === 0) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="No statistics yet"
          description="Enter match scores in the Fixtures tab to start generating statistics."
        />
      </div>
    );
  }

  // Goals per team (all pools)
  const allStandings = tournament.pools.flatMap(pool => calculateStandings(tournament, pool.id));
  const goalsData = allStandings
    .filter(s => s.played > 0)
    .sort((a, b) => b.goalsFor - a.goalsFor)
    .slice(0, 10)
    .map((s, i) => ({ name: s.teamName, goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, color: COLORS[i % COLORS.length] }));

  // Win/Loss/Draw distribution
  const totals = allStandings.reduce((acc, s) => ({
    wins: acc.wins + s.won,
    draws: acc.draws + s.drawn,
    losses: acc.losses + s.lost,
  }), { wins: 0, draws: 0, losses: 0 });

  const pieData = [
    { name: 'Wins', value: totals.wins, color: '#16A34A' },
    { name: 'Draws', value: totals.draws, color: '#D97706' },
    { name: 'Losses', value: totals.losses, color: '#DC2626' },
  ].filter(d => d.value > 0);

  // Points per team
  const pointsData = allStandings
    .filter(s => s.played > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map((s, i) => ({ name: s.teamName, points: s.points, color: COLORS[i % COLORS.length] }));

  return (
    <div className="stats-tab">
      <div className="container">

        {/* KPI row */}
        <div className="stats-kpi-grid">
          <KpiCard label="Total Goals" value={stats.totalGoals} sub="scored across all matches" color="var(--color-danger)" />
          <KpiCard label="Avg Goals/Match" value={stats.avgGoalsPerMatch} sub="goals per fixture" color="var(--brand-gold)" />
          <KpiCard label="Matches Played" value={stats.playedFixtures} sub={`of ${stats.totalFixtures} total`} color="var(--color-info)" />
          <KpiCard label="Completion" value={`${stats.completionPct}%`} sub="of tournament complete" color="var(--color-success)" />
        </div>

        <div className="stats-charts-grid">
          {/* Goals comparison */}
          <div className="stat-card stat-card-wide">
            <h3 className="stat-card-title">Goals For vs Against</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={goalsData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Bar dataKey="goalsFor" fill="#FFC500" radius={[3,3,0,0]} name="Goals For" />
                <Bar dataKey="goalsAgainst" fill="#94A3B8" radius={[3,3,0,0]} name="Goals Against" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Draw/Loss pie */}
          <div className="stat-card">
            <h3 className="stat-card-title">Result Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" paddingAngle={3}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Points table */}
          <div className="stat-card stat-card-wide">
            <h3 className="stat-card-title">Points Leaderboard</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pointsData} layout="vertical" margin={{ top: 5, right: 40, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={80} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Bar dataKey="points" radius={[0,3,3,0]} name="Points">
                  {pointsData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top scorers */}
        {topScorers.length > 0 && (
          <div className="stat-card">
            <h3 className="stat-card-title">Top Goal Scorers</h3>
            <div className="top-scorers-list">
              {topScorers.map((p, i) => (
                <div key={p.id} className="scorer-row">
                  <span className="scorer-rank">{i + 1}</span>
                  <div className="scorer-info">
                    <span className="scorer-name">{p.name}</span>
                    <span className="scorer-team">{p.teamName}</span>
                  </div>
                  <div className="scorer-goals">
                    <span className="scorer-goals-num">{p.totalGoals}</span>
                    <span className="scorer-goals-label">goals</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card">
      <span className="kpi-value" style={{ color }}>{value}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}
