import Icon from './Icon';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'simulation', label: 'Simulation lab', icon: 'simulate' },
  { id: 'import', label: 'Import data', icon: 'import' },
  { id: 'analysis', label: 'Signal analysis', icon: 'analysis' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
];
const SYSTEM = [
  { id: 'status', label: 'System status', icon: 'status' },
  { id: 'about', label: 'About & limitations', icon: 'about' },
];

export default function Sidebar({ page, setPage, isOpen, setIsOpen, health, root }) {
  const go = id => { setPage(id); setIsOpen(false); };
  const item = it => (
    <button
      key={it.id}
      className={`nav-item ${page === it.id ? 'active' : ''}`}
      onClick={() => go(it.id)}
      aria-current={page === it.id ? 'page' : undefined}
    >
      <Icon name={it.icon} size={17} />
      <span>{it.label}</span>
    </button>
  );
  return (
    <>
      <div className={`scrim ${isOpen ? 'show' : ''}`} onClick={() => setIsOpen(false)} aria-hidden="true" />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="primary-nav" aria-label="Primary">
        <button className="brand" onClick={() => go('overview')} aria-label="VitalGuard overview">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M3 17h6l3-8 5 15 4-11 2 4h6" /></svg>
          </span>
          <span className="brand-text"><strong>VitalGuard</strong><small>Signal reliability console</small></span>
        </button>

        <div className="side-label">Workspace</div>
        <nav className="nav-list" aria-label="Workspace">{NAV.map(item)}</nav>
        <div className="side-label">System</div>
        <nav className="nav-list" aria-label="System">{SYSTEM.map(item)}</nav>

        <div className="sidebar-bottom">
          <div className="proto-tag">
            <span className={`dot ${health ? 'ok' : 'warn'}`} aria-hidden="true" />
            <span><b>Research prototype</b><small>Simulation environment</small></span>
          </div>
          <div className="sidebar-foot">{root?.identifier || 'MED-PS-010'} · API v{health?.version || '—'}</div>
        </div>
      </aside>
    </>
  );
}
