import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastContainer({ toasts, dismiss }) {
  return createPortal(
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>,
    document.body
  );
}

function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info;
  return (
    <div className={`toast toast-${toast.type} animate-fade-in`} role="alert">
      <Icon className="toast-icon" size={18} />
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
