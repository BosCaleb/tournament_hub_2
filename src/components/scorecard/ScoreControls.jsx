import { Plus, Minus } from 'lucide-react';
import './ScoreControls.css';

/**
 * ScoreControls — tablet-friendly large scoring buttons.
 * Shows home and away side-by-side with large +1 / -1 controls.
 * Undo (-1) requires a second tap to confirm, preventing accidental deductions.
 */
export function ScoreControls({
  homeScore = 0,
  awayScore = 0,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  homeColors,
  awayColors,
  onGoal,
  disabled = false,
  style = 'large_buttons',
}) {
  const isCompact = style === 'compact';

  return (
    <div className={`score-controls ${isCompact ? 'score-controls--compact' : ''}`}
      role="group" aria-label="Score controls">
      <TeamScorePanel
        teamName={homeTeamName}
        score={homeScore}
        side="home"
        color={homeColors?.primary}
        onGoalAdd={() => onGoal('home', 'add')}
        onGoalRemove={() => onGoal('home', 'remove')}
        disabled={disabled}
        isCompact={isCompact}
      />

      <div className="score-controls-divider" aria-hidden="true" />

      <TeamScorePanel
        teamName={awayTeamName}
        score={awayScore}
        side="away"
        color={awayColors?.primary}
        onGoalAdd={() => onGoal('away', 'add')}
        onGoalRemove={() => onGoal('away', 'remove')}
        disabled={disabled}
        isCompact={isCompact}
      />
    </div>
  );
}

function TeamScorePanel({ teamName, score, side, color, onGoalAdd, onGoalRemove, disabled, isCompact }) {
  return (
    <div className={`score-panel score-panel--${side}`}>
      {/* Team name */}
      <div
        className="score-panel-team"
        style={color ? { '--team-color': color } : {}}
      >
        <span className="score-panel-dot" aria-hidden="true" />
        <span className="score-panel-name">{teamName}</span>
      </div>

      {/* Large score display */}
      <div className="score-panel-score" aria-label={`${teamName}: ${score} goals`}>
        {score}
      </div>

      {/* Buttons */}
      <div className="score-panel-btns">
        <button
          type="button"
          className={`score-btn score-btn--add ${isCompact ? 'score-btn--compact' : ''}`}
          onClick={onGoalAdd}
          disabled={disabled}
          aria-label={`Add goal for ${teamName}`}
        >
          <Plus size={isCompact ? 20 : 28} aria-hidden="true" />
          {!isCompact && <span>Goal</span>}
        </button>

        <button
          type="button"
          className={`score-btn score-btn--remove ${isCompact ? 'score-btn--compact' : ''}`}
          onClick={onGoalRemove}
          disabled={disabled || score === 0}
          aria-label={`Remove goal for ${teamName}`}
          title="Tap to undo last goal"
        >
          <Minus size={isCompact ? 16 : 20} aria-hidden="true" />
          {!isCompact && <span>Undo</span>}
        </button>
      </div>
    </div>
  );
}
