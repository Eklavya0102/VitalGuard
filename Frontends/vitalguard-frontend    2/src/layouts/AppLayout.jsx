import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const crumbs = {
  '/': 'Overview',
  '/analysis': 'Signal analysis',
  '/simulation': 'Simulation lab',
  '/import': 'Import data',
  '/reports': 'Reports',
  '/status': 'System status',
  '/about': 'About the prototype',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    document.title = `${crumbs[pathname] || 'VitalGuard'} — VitalGuard`;
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main">
        <Topbar crumb={crumbs[pathname] || 'Overview'} menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
        <main className="content" id="main">
          <Outlet />
          <footer className="app-footer">
            <span>VitalGuard · MED-PS-010</span>
            <span>For research and demonstration only</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
