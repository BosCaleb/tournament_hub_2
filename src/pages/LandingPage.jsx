import { Link } from 'react-router-dom';
import { Trophy, BarChart3, Users, Calendar, Shield, ArrowRight, ChevronRight } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Button } from '../components/ui/Button.jsx';
import './LandingPage.css';

const FEATURES = [
  {
    icon: <Trophy size={22} />,
    title: 'Live Standings',
    desc: 'Real-time pool standings with form guides, goal difference, and tiebreaker logic built for South African rules.',
  },
  {
    icon: <Calendar size={22} />,
    title: 'Fixture Management',
    desc: 'Auto-generate round-robin schedules. Enter scores on the fly and watch the table update instantly.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Statistics & Analytics',
    desc: 'Visual dashboards showing top scorers, team performance charts, and tournament progress at a glance.',
  },
  {
    icon: <Users size={22} />,
    title: 'Player Profiles',
    desc: 'Full squad management with position tracking, goal stats, and CSV import for bulk registration.',
  },
  {
    icon: <Trophy size={22} />,
    title: 'Playoff Brackets',
    desc: 'Auto-generated knockout brackets seeded from pool standings. Track results all the way to the final.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Admin Controls',
    desc: 'PIN-protected admin access. Viewers see live data; only admins can edit teams, scores, and settings.',
  },
];

const SPORTS_PREVIEW = ['🏐 Netball', '⚽ Football', '🏀 Basketball', '🏉 Rugby', '🏑 Hockey', '🏏 Cricket'];

export function LandingPage() {
  return (
    <div className="landing-page">
      <AppHeader />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="lh-ring lh-ring-1" />
          <div className="lh-ring lh-ring-2" />
          <div className="lh-ring lh-ring-3" />
          <div className="lh-glow" />
        </div>

        <div className="container landing-hero-inner">
          <div className="landing-hero-eyebrow">
            <span className="eyebrow-dot" />
            South Africa's Premier School Sports Platform
          </div>

          <h1 className="landing-hero-title">
            Tournament<br />
            <span className="landing-hero-accent">Management</span><br />
            Redefined
          </h1>

          <p className="landing-hero-sub">
            Run seamless school sports tournaments — fixtures, standings, playoffs and player stats,
            all in one place. Built for South African high schools.
          </p>

          <div className="landing-hero-actions">
            <Link to="/sports">
              <Button variant="accent" size="lg" iconRight={<ArrowRight size={18} />}>
                View Tournaments
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline-primary" size="lg" icon={<Shield size={16} />}>
                Admin Login
              </Button>
            </Link>
          </div>

          <div className="landing-sports-ribbon">
            {SPORTS_PREVIEW.map(s => (
              <span key={s} className="sport-pill">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="landing-features">
        <div className="container">
          <div className="section-label">What's included</div>
          <h2 className="section-title">Everything you need to run a great tournament</h2>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────── */}
      <section className="landing-cta">
        <div className="container landing-cta-inner">
          <div className="landing-cta-text">
            <h2>Ready to manage your tournament?</h2>
            <p>Select your sport and browse live tournaments, or log in as admin to get started.</p>
          </div>
          <div className="landing-cta-actions">
            <Link to="/sports">
              <Button variant="accent" size="lg" iconRight={<ChevronRight size={16} />}>
                Browse Sports
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="secondary" size="lg">
                Admin Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
