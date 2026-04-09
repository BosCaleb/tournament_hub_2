import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, User, Hash, ArrowRight, ChevronLeft } from 'lucide-react';
import { useTournamentContext } from '../context/TournamentContext.jsx';
import { useScorekeeperAuth } from '../context/ScorekeeperContext.jsx';
import { StatEdgeIcon } from '../components/ui/StatEdgeLogo.jsx';
import { Button } from '../components/ui/Button.jsx';
import './ScorekeeperLoginPage.css';

export function ScorekeeperLoginPage() {
  const { state } = useTournamentContext();
  const auth = useScorekeeperAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // Redirect if already logged in
  if (auth.isLoggedIn) {
    navigate('/scorekeeper/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await auth.login(state.tournaments, code, name);
    if (ok) navigate('/scorekeeper/dashboard');
  }

  return (
    <div className="sk-login-page">
      <div className="sk-login-card animate-scale-in">
        <div className="sk-login-logo">
          <StatEdgeIcon size={40} />
        </div>

        <div className="sk-login-header">
          <div className="sk-login-icon">
            <ClipboardList size={28} />
          </div>
          <h1 className="sk-login-title">Scorekeeper Login</h1>
          <p className="sk-login-subtitle">
            Enter the tournament code and your name to access your assigned matches.
          </p>
        </div>

        <form className="sk-login-form" onSubmit={handleSubmit}>
          <div className="sk-field">
            <label className="sk-label" htmlFor="sk-code">
              <Hash size={14} />
              Tournament Code
            </label>
            <input
              id="sk-code"
              type="text"
              className="sk-input"
              placeholder="e.g. NET2026"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              autoFocus
              required
              maxLength={20}
            />
          </div>

          <div className="sk-field">
            <label className="sk-label" htmlFor="sk-name">
              <User size={14} />
              Your Name
            </label>
            <input
              id="sk-name"
              type="text"
              className="sk-input"
              placeholder="e.g. Thandi Nkosi"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          {auth.error && (
            <div className="sk-error" role="alert">
              {auth.error}
            </div>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            loading={auth.loading}
            iconRight={<ArrowRight size={18} />}
            className="sk-submit"
          >
            Access My Matches
          </Button>
        </form>

        <div className="sk-login-footer">
          <a href="/" className="sk-back-link">
            <ChevronLeft size={14} />
            Back to StatEdge
          </a>
        </div>
      </div>
    </div>
  );
}
