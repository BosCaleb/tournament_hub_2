import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ChevronRight } from 'lucide-react';
import { SPORTS } from '../lib/types.js';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import './SportSelectorPage.css';

export function SportSelectorPage() {
  const navigate = useNavigate();

  return (
    <div className="sport-selector-page">
      <AppHeader />

      <main className="container sport-selector-main">
        <button className="back-link" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="sport-selector-header">
          <div className="section-label-small">Select a sport</div>
          <h1 className="sport-selector-title">What are you managing today?</h1>
          <p className="sport-selector-sub">
            Choose your sport to browse tournaments and live standings.
            More sports are coming soon.
          </p>
        </div>

        <div className="sports-grid">
          {SPORTS.map(sport => (
            sport.available ? (
              <Link key={sport.id} to={`/sports/${sport.id}`} className="sport-card sport-card--active">
                <div className="sport-card-icon">{sport.icon}</div>
                <div className="sport-card-body">
                  <h2 className="sport-card-name">{sport.label}</h2>
                  <p className="sport-card-desc">{sport.description}</p>
                </div>
                <div className="sport-card-arrow">
                  <ChevronRight size={20} />
                </div>
              </Link>
            ) : (
              <div key={sport.id} className="sport-card sport-card--soon">
                <div className="sport-card-icon">{sport.icon}</div>
                <div className="sport-card-body">
                  <h2 className="sport-card-name">{sport.label}</h2>
                  <p className="sport-card-desc">{sport.description}</p>
                </div>
                <div className="sport-card-badge">
                  <Lock size={11} /> Coming Soon
                </div>
              </div>
            )
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
