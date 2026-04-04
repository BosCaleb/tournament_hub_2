import './Badge.css';

export function Badge({ children, variant = 'default', size = 'md' }) {
  return (
    <span className={`badge badge-${variant} badge-${size}`}>
      {children}
    </span>
  );
}

export function FormBadge({ result }) {
  const map = { W: 'win', D: 'draw', L: 'loss' };
  return <span className={`form-badge form-badge-${map[result] || 'default'}`}>{result}</span>;
}

export function StatusBadge({ status }) {
  const labels = { scheduled: 'Scheduled', live: 'LIVE', completed: 'Completed' };
  return <span className={`badge badge-status-${status}`}>{labels[status] || status}</span>;
}
