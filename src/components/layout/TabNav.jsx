import './TabNav.css';

export function TabNav({ tabs, active, onChange }) {
  return (
    <div className="tab-nav-wrapper">
      <nav className="tab-nav container" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            className={`tab-nav-item ${active === tab.id ? 'tab-nav-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="tab-nav-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge != null && (
              <span className={`tab-nav-badge ${active === tab.id ? 'tab-nav-badge-active' : ''}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
