import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer no-print">
      <div className="container app-footer-inner">
        <span className="footer-brand">StatEdge</span>
        <span className="footer-sep">·</span>
        <span className="footer-copy">Netball Tournament Manager</span>
        <span className="footer-sep">·</span>
        <span className="footer-copy">South Africa {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
