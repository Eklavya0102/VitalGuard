import Icon from './Icon';

const NAMES = {
  overview: 'Overview',
  simulation: 'Simulation lab',
  import: 'Import data',
  analysis: 'Signal analysis',
  reports: 'Reports',
  status: 'System status',
  about: 'About & limitations',
};

export default function Navbar({ page, sidebarOpen, setSidebarOpen, onRefresh, health, healthError, refreshing }) {
  const state = health ? 'ok' : healthError ? 'bad' : 'warn';
  const text = health ? 'API connected' : healthError ? 'API unreachable' : 'Connecting…';
  return (
    <header className="topbar">
      <button
        className="icon-btn mobile-only"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation"
        aria-expanded={sidebarOpen}
        aria-controls="primary-nav"
      >
        <Icon name="menu" />
      </button>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>VitalGuard</span><span className="sep" aria-hidden="true">/</span>
        <strong>{NAMES[page] || 'Overview'}</strong>
      </nav>
      <div className="top-actions">
        <span className={`conn conn-${state}`} role="status">
          <i className={`dot ${state}`} aria-hidden="true" />{text}
          {health?.matlab_available === false ? <span className="conn-note">· MATLAB off</span> : null}
        </span>
        <button className="icon-btn" onClick={onRefresh} disabled={refreshing} title="Refresh system status" aria-label="Refresh system status">
          <Icon name="refresh" className={refreshing ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
}
