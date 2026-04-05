/**
 * StatEdge logo mark — SVG approximation of the circular brand icon.
 * If you place the actual PNG at /images/statedge-icon.png, the <img> variant
 * will be used automatically and will look exactly like the real logo.
 */

export function StatEdgeIcon({ size = 36, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="se-outer" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#3A70D8"/>
          <stop offset="100%" stopColor="#1A3272"/>
        </radialGradient>
        <radialGradient id="se-orange" cx="45%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F89030"/>
          <stop offset="100%" stopColor="#D96010"/>
        </radialGradient>
        <radialGradient id="se-inner" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#3A70D8"/>
          <stop offset="100%" stopColor="#162560"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="url(#se-outer)"/>
      <circle cx="32" cy="32" r="27" fill="white"/>
      <circle cx="32" cy="32" r="26" fill="url(#se-orange)"/>
      <circle cx="32" cy="32" r="21" fill="#2A1408"/>
      <circle cx="32" cy="32" r="19.5" fill="white"/>
      <circle cx="32" cy="32" r="18" fill="url(#se-inner)"/>
      {/* Triangle top */}
      <polygon points="32,15 23,36 41,36" fill="#F47820"/>
      {/* Chevron/arrow */}
      <polygon points="20,36 32,49 44,36 40,36 32,44 24,36" fill="white"/>
    </svg>
  );
}

/** Full horizontal lockup: icon + wordmark */
export function StatEdgeLockup({ iconSize = 36, className, light = true }) {
  return (
    <div className={`se-lockup ${className || ''}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StatEdgeIcon size={iconSize} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Oswald', 'Impact', 'Arial Black', sans-serif",
          fontSize: iconSize * 0.58,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: light ? 'white' : '#0D1C3E',
        }}>
          STATEDGE
        </span>
        <span style={{
          fontSize: iconSize * 0.28,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#F47820',
        }}>
          Sports Analytics
        </span>
      </div>
    </div>
  );
}
