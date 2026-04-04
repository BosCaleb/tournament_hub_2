import './Button.css';

export function Button({
  children, variant = 'primary', size = 'md',
  disabled, loading, className = '', icon, iconRight,
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {icon && !loading && <span className="btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span className="btn-icon-right">{iconRight}</span>}
    </button>
  );
}
