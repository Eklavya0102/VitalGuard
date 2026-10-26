import { Menu, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const connectionText = {
  checking: ['amber', 'Connecting to API'],
  online: ['green', 'API connected'],
  offline: ['red', 'API unavailable'],
};

export default function Topbar({ crumb, menuOpen, onMenu }) {
  const { connection, loadSystem, refreshing } = useApp();
  const toast = useToast();
  const [tone, text] = connectionText[connection];

  async function refresh() {
    const ok = await loadSystem();
    toast(ok ? 'System status refreshed' : 'Backend unavailable', ok ? 'success' : 'error');
  }

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="sidebar" onClick={onMenu}>
        <Menu size={18} />
      </button>
      <div className="breadcrumb">
        <span>VitalGuard</span>
        <span className="crumb-slash" aria-hidden="true">/</span>
        <strong>{crumb}</strong>
      </div>
      <div className="top-actions">
        <span className="connection" role="status">
          <i className={`dot ${tone}`} />
          <span>{text}</span>
        </span>
        <button className="icon-btn" title="Refresh system status" aria-label="Refresh system status" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
}
