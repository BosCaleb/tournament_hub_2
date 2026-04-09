import { Wifi, WifiOff, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import './SyncStatus.css';

/**
 * SyncStatus — shows the current sync state to the scorekeeper.
 * Honest but not alarmist.
 *
 * status: 'synced' | 'saving' | 'offline' | 'reconnecting' | 'failed'
 */
export function SyncStatus({ status = 'synced', pendingCount = 0 }) {
  const config = {
    synced:       { icon: <CheckCircle size={14} />,  label: 'Synced',             cls: 'sync--ok' },
    saving:       { icon: <Loader size={14} />,        label: 'Saving…',            cls: 'sync--saving' },
    offline:      { icon: <WifiOff size={14} />,       label: `Offline${pendingCount ? ` · ${pendingCount} pending` : ''}`, cls: 'sync--offline' },
    reconnecting: { icon: <Wifi size={14} />,          label: 'Reconnecting…',      cls: 'sync--reconnecting' },
    failed:       { icon: <AlertTriangle size={14} />, label: 'Sync failed – retry', cls: 'sync--failed' },
  };

  const { icon, label, cls } = config[status] || config.synced;

  return (
    <div className={`sync-status ${cls}`} role="status" aria-live="polite">
      <span className={`sync-icon ${status === 'saving' || status === 'reconnecting' ? 'sync-icon--spin' : ''}`}>
        {icon}
      </span>
      <span className="sync-label">{label}</span>
    </div>
  );
}
