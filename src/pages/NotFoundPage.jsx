import { Link } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Button } from '../components/ui/Button.jsx';

export function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-5)', textAlign: 'center', padding: 'var(--space-8)'
      }}>
        <div style={{ fontSize: '5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-gold)', lineHeight: 1 }}>404</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', letterSpacing: '0.05em' }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: 320 }}>
          The tournament or page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link to="/"><Button variant="accent">Back to Home</Button></Link>
      </div>
    </div>
  );
}
