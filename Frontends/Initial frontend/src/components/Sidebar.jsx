export default function Sidebar({ page, setPage, isOpen, setIsOpen, health }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '◫' },
    { id: 'analysis', label: 'Signal analysis', icon: '⌁' },
    { id: 'simulation', label: 'Simulation lab', icon: '▷' },
    { id: 'import', label: 'Import data', icon: '⇧' },
    { id: 'reports', label: 'Reports', icon: '▤' }
  ];

  const systemItems = [
    { id: 'status', label: 'System status', icon: '◎' },
    { id: 'about', label: 'About the prototype', icon: 'ⓘ' }
  ];

  const handleNav = (id) => {
    setPage(id);
    setIsOpen(false);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <a className="brand" href="#overview" onClick={(e) => { e.preventDefault(); handleNav('overview'); }}>
        <span className="brand-mark">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 17h6l3-8 5 15 4-11 2 4h6"/></svg>
        </span>
        <span><strong>VitalGuard</strong><small>RESEARCH CONSOLE</small></span>
      </a>

      <div className="side-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="side-label system-label">SYSTEM</div>
      <nav className="nav-list">
        {systemItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="prototype-tag">
          <span className={`dot ${health ? 'green' : 'amber'}`}></span>
          <span><b>Research prototype</b><small>Simulation environment</small></span>
        </div>
        <div className="sidebar-foot">MED-PS-010 <span>•</span> v1.0.0</div>
      </div>
    </aside>
  );
}