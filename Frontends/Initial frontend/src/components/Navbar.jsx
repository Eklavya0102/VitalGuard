export default function Navbar({ page, setSidebarOpen, onRefresh, health }) {
  const pageNames = {
    overview: 'Overview',
    analysis: 'Signal analysis',
    simulation: 'Simulation lab',
    import: 'Import data',
    reports: 'Reports',
    status: 'System status',
    about: 'About the prototype'
  };

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setSidebarOpen(prev => !prev)} aria-label="Open navigation">☰</button>
      <div className="breadcrumb">
        <span>VitalGuard</span>
        <span className="crumb-slash">/</span>
        <strong>{pageNames[page] || 'Overview'}</strong>
      </div>
      <div className="top-actions">
        <div className="connection-pill">
          <i className={`dot ${health ? 'green' : 'amber'}`}></i>
          <span>{health ? 'API connected' : 'Connecting to API'}</span>
        </div>
        <button className="icon-button" onClick={onRefresh} title="Refresh system status" aria-label="Refresh system status">↻</button>
      </div>
    </header>
  );
}