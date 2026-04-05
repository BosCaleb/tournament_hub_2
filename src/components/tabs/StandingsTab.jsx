import { Download } from 'lucide-react';
import { calculateStandings } from '../../lib/tournament.js';
import { FormBadge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { exportStandingsPDF, exportStandingsCSV } from '../../lib/export.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import './StandingsTab.css';

export function StandingsTab({ tournament }) {
  const pools = tournament.pools;

  if (pools.length === 0) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
        <EmptyState title="No pools yet" description="Set up pools in the Admin tab to see standings." />
      </div>
    );
  }

  return (
    <div className="standings-tab">
      <div className="container">
        <div className="standings-export-bar">
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportStandingsPDF(tournament)}>PDF</Button>
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportStandingsCSV(tournament)}>CSV</Button>
        </div>
        {pools.map(pool => {
          const standings = calculateStandings(tournament, pool.id);
          return (
            <div key={pool.id} className="standings-pool-section">
              <div className="standings-pool-header">
                <h2 className="standings-pool-title">{pool.name}</h2>
              </div>
              <StandingsTable standings={standings} />
              {standings.length > 0 && <GoalsChart standings={standings} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StandingsTable({ standings }) {
  if (standings.length === 0) {
    return <p className="standings-empty">No results yet. Enter scores in the Fixtures tab.</p>;
  }

  return (
    <div className="standings-table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="col-pos">#</th>
            <th className="col-team">Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points" className="col-pts">Pts</th>
            <th className="col-form">Form</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isLeader = i === 0 && s.played > 0;
            const qualifies = i < 2; // top 2 qualify
            return (
              <tr key={s.teamId} className={`${isLeader ? 'row-leader' : ''} ${qualifies && s.played > 0 ? 'row-qualifier' : ''}`}>
                <td className="col-pos">
                  <span className={`pos-badge ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="col-team">
                  <div className="team-cell">
                    <div className="team-color-dot" style={{ background: s.colors?.primary || '#112240' }} />
                    <span className="team-cell-name">{s.teamName}</span>
                    {s.schoolName && <span className="team-cell-school">{s.schoolName}</span>}
                  </div>
                </td>
                <td>{s.played}</td>
                <td className="col-w">{s.won}</td>
                <td>{s.drawn}</td>
                <td className="col-l">{s.lost}</td>
                <td>{s.goalsFor}</td>
                <td>{s.goalsAgainst}</td>
                <td className={s.goalDifference > 0 ? 'gd-pos' : s.goalDifference < 0 ? 'gd-neg' : ''}>
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="col-pts">
                  <span className="pts-number">{s.points}</span>
                </td>
                <td className="col-form">
                  <div className="form-strip">
                    {s.form.map((r, j) => <FormBadge key={j} result={r} />)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="standings-legend">
        <span className="legend-item"><span className="legend-dot legend-qualifier" />Qualifies for Playoffs</span>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#FFC500','#2563EB','#DC2626','#16A34A','#7C3AED','#0891B2','#DB2777','#059669'];

function GoalsChart({ standings }) {
  const data = standings
    .filter(s => s.played > 0)
    .map((s, i) => ({ name: s.teamName, goals: s.goalsFor, color: CHART_COLORS[i % CHART_COLORS.length] }));

  if (data.length === 0) return null;

  return (
    <div className="goals-chart">
      <h3 className="chart-title">Goals Scored</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            angle={-30} textAnchor="end" interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
            labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
          />
          <Bar dataKey="goals" radius={[4, 4, 0, 0]} name="Goals">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
