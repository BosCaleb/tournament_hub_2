import { quarterLabel } from '../../lib/scorecard.js';
import './QuarterTracker.css';

/**
 * QuarterTracker — shows which quarter is active and previous quarter scores.
 * Designed for tablet use: large touch targets, clear visual state.
 */
export function QuarterTracker({
  currentQuarter,
  quarterScores = [],
  totalQuarters = 4,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
}) {
  return (
    <div className="quarter-tracker" role="region" aria-label="Quarter scores">
      <div className="qt-quarters">
        {Array.from({ length: totalQuarters }, (_, i) => {
          const q = i + 1;
          const qs = quarterScores.find(s => s.q === q);
          const isActive = q === currentQuarter;
          const isDone = qs !== undefined;

          return (
            <div
              key={q}
              className={`qt-quarter ${isActive ? 'qt-quarter--active' : ''} ${isDone ? 'qt-quarter--done' : ''}`}
              aria-label={`${quarterLabel(q)}${isActive ? ' (current)' : ''}`}
            >
              <div className="qt-quarter-label">{quarterLabel(q)}</div>
              {isDone ? (
                <div className="qt-quarter-score">
                  <span className="qt-score-home">{qs.home}</span>
                  <span className="qt-score-sep">–</span>
                  <span className="qt-score-away">{qs.away}</span>
                </div>
              ) : (
                <div className="qt-quarter-score qt-quarter-score--empty">
                  {isActive ? (
                    <span className="qt-active-dot" aria-hidden="true" />
                  ) : (
                    <span className="qt-score-placeholder">—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {quarterScores.length > 0 && (
        <div className="qt-labels" aria-hidden="true">
          <span>{homeTeamName}</span>
          <span>{awayTeamName}</span>
        </div>
      )}
    </div>
  );
}
