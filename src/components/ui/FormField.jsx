import './FormField.css';

export function FormField({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={`form-field ${error ? 'form-field-error' : ''} ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error-msg">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`input ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`input ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`input textarea ${className}`} {...props} />;
}
