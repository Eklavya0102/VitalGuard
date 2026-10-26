import { NavLink } from 'react-router-dom';
import { Activity, FileText, FlaskConical, Info, LayoutDashboard, Server, Upload } from 'lucide-react';

const workspace = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/analysis', label: 'Signal analysis', icon: Activity },
  { to: '/simulation', label: 'Simulation lab', icon: FlaskConical },
  { to: '/import', label: 'Import data', icon: Upload },
  { to: '/reports', label: 'Reports', icon: FileText },
];
const system = [
  { to: '/status', label: 'System status', icon: Server },
  { to: '/about', label: 'About the prototype', icon: Info },
];

function NavGroup({ label, items, onNavigate }) {
  return (
    <>
      <div className="side-label" id={`nav-${label}`}>{label}</div>
      <nav className="nav-list" aria-labelledby={`nav-${label}`}>
        {items.map(({ to, label: text, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-item" onClick={onNavigate}>
            <Icon size={18} aria-hidden="true" />
            {text}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className={`sidebar${open ? ' open' : ''}`} id="sidebar">
        <NavLink className="brand" to="/" onClick={onClose} aria-label="VitalGuard overview">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 17h6l3-8 5 15 4-11 2 4h6" /></svg>
          </span>
          <span>
            <strong>VitalGuard</strong>
            <small>Signal reliability console</small>
          </span>
        </NavLink>
        <NavGroup label="Workspace" items={workspace} onNavigate={onClose} />
        <NavGroup label="System" items={system} onNavigate={onClose} />
        <div className="sidebar-bottom">
          <div className="prototype-tag">
            <span className="dot amber" />
            <span>
              <b>Research prototype</b>
              <small>Simulation environment</small>
            </span>
          </div>
          <div className="sidebar-foot">MED-PS-010 · v1.0.0</div>
        </div>
      </aside>
      {open && <button className="scrim" aria-label="Close navigation" onClick={onClose} />}
    </>
  );
}
