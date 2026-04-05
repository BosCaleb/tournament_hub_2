import { Link } from 'react-router-dom';
import { BarChart3, Users, Calendar, Shield, ArrowRight, ChevronRight, Trophy, Zap } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Button } from '../components/ui/Button.jsx';
import { StatEdgeIcon } from '../components/ui/StatEdgeLogo.jsx';
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
    icon: <Zap size={22} />,
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

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          {/* Data line decorations matching StatEdge analytics theme */}
          <svg className="hero-lines" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <polyline points="0,450 200,380 400,420 600,300 800,340 1000,220 1200,260"
              fill="none" stroke="#F47820" strokeWidth="2" opacity="0.5"/>
            <circle cx="200" cy="380" r="4" fill="#F47820" opacity="0.7"/>
            <circle cx="400" cy="420" r="4" fill="#F47820" opacity="0.7"/>
            <circle cx="600" cy="300" r="6" fill="#F47820" opacity="0.9"/>
            <circle cx="800" cy="340" r="4" fill="#F47820" opacity="0.7"/>
            <circle cx="1000" cy="220" r="4" fill="#F47820" opacity="0.7"/>
            <circle cx="1200" cy="260" r="4" fill="#F47820" opacity="0.5"/>
            <polyline points="0,500 200,460 400,490 600,370 800,400 1000,290 1200,330"
              fill="none" stroke="#2154A8" strokeWidth="1.5" opacity="0.4"/>
            <circle cx="200" cy="460" r="3" fill="#2154A8" opacity="0.5"/>
            <circle cx="600" cy="370" r="3" fill="#2154A8" opacity="0.5"/>
            <circle cx="1000" cy="290" r="3" fill="#2154A8" opacity="0.5"/>
          </svg>
          <div className="lh-ring lh-ring-1" />
          <div className="lh-ring lh-ring-2" />
          <div className="lh-glow" />
        </div>

        <div className="container landing-hero-inner">
          <div className="landing-hero-brand">
            <StatEdgeIcon size={64} />
            <div className="landing-hero-wordmark">
              <div className="lhw-name">STATEDGE</div>
              <div className="lhw-sub">Sports Analytics</div>
            </div>
          </div>

          <h1 className="landing-hero-title">
            Sharper data.<br />
            <span className="landing-hero-accent">Smarter decisions.</span>
          </h1>

          <p className="landing-hero-sub">
            South Africa&apos;s tournament management platform for high school sport.
            Fixtures, standings, playoffs and player stats — live, in one place.
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

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="landing-stats-bar">
        <div className="container landing-stats-inner">
          <div className="landing-stat">
            <span className="landing-stat-val">8</span>
            <span className="landing-stat-label">Sports coming</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-val">∞</span>
            <span className="landing-stat-label">Tournaments</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-val">Live</span>
            <span className="landing-stat-label">Score updates</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-val">Free</span>
            <span className="landing-stat-label">No cost to use</span>
          </div>
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="landing-features">
        <div className="container">
          <div className="section-label">What&apos;s included</div>
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

      {/* ── CTA strip ────────────────────────────────────────── */}
      <section className="landing-cta">
        {/* Banner image if available — place file at /images/statedge-banner.png */}
        <div className="landing-cta-bg" aria-hidden="true">
          <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice">
            <polyline points="0,200 300,140 500,180 700,80 900,120 1200,40"
              fill="none" stroke="#F47820" strokeWidth="2" opacity="0.4"/>
            <circle cx="300" cy="140" r="5" fill="#F47820" opacity="0.6"/>
            <circle cx="700" cy="80" r="7" fill="#F47820" opacity="0.8"/>
            <circle cx="1200" cy="40" r="5" fill="#F47820" opacity="0.6"/>
          </svg>
        </div>
        <div className="container landing-cta-inner">
          <div className="landing-cta-logo">
            <StatEdgeIcon size={52} />
          </div>
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
