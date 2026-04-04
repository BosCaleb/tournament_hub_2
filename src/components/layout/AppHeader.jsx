import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Trophy, ArrowLeft, Shield } from 'lucide-react';
import { useTournamentContext } from '../../context/TournamentContext.jsx';
import './AppHeader.css';

export function AppHeader({ title, subtitle, backPath, isAdmin }) {
  const { state, setTheme } = useTournamentContext();
  const navigate = useNavigate();
  const isDark = state.theme === 'dark';

  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <div className="app-header-left">
          {backPath && (
            <button
              className="app-header-back"
              onClick={() => navigate(backPath)}
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <Link to="/" className="app-header-brand">
            <div className="brand-logo">
              <Trophy size={20} />
            </div>
            <div className="brand-text">
              <span className="brand-name">StatEdge</span>
              <span className="brand-sub">Sports</span>
            </div>
          </Link>
        </div>

        {(title || subtitle) && (
          <div className="app-header-title">
            {title && <span className="header-tournament-name">{title}</span>}
            {subtitle && <span className="header-tournament-sub">{subtitle}</span>}
          </div>
        )}

        <div className="app-header-actions">
          {isAdmin && (
            <div className="admin-indicator" title="Admin mode">
              <Shield size={13} />
              <span>Admin</span>
            </div>
          )}
          <button
            className="theme-toggle"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
