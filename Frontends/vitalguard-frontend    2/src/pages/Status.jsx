import { RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../services/api';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';

function Row({ title, sub, value, ok }) {
  return (
    <div className="status-row">
      <div><strong>{title}</strong><small>{sub}</small></div>
      <div className="status-right"><i className={`dot ${ok ? 'green' : 'amber'}`} /><span>{String(value)}</span></div>
    </div>
  );
}

export default function Status() {
  const { health: h, config: c, scenarios, loadSystem, refreshing } = useApp();
  const toast = useToast();
  const count = Object.keys(scenarios || {}).length;

  async function refresh() {
    const ok = await loadSystem();
    toast(ok ? 'Backend status refreshed' : 'Backend could not be reached', ok ? 'success' : 'error');
  }

  return (
    <>
      <PageHeader title="System status" description="Backend connectivity, configuration and simulation capabilities." />
      <div className="workspace">
        <section className="panel" aria-labelledby="st-h">
          <div className="panel-head ruled">
            <div><h2 id="st-h">Backend health</h2><p>Values queried from the FastAPI service</p></div>
            <Badge tone={h ? 'good' : 'bad'}>{h ? 'Responding' : 'Unavailable'}</Badge>
          </div>
          <div className="status-list">
            <Row title="API endpoint" sub={API_BASE} value={h ? 'Connected' : 'Could not connect'} ok={!!h} />
            <Row title="Service status" sub="Health endpoint" value={h?.status || 'No response'} ok={!!h} />
            <Row title="Backend version" sub="Reported by API" value={h?.version || '—'} ok={!!h} />
            <Row title="MATLAB / Simulink" sub="Simulation engine" value={h ? (h.matlab_available ? 'Available' : 'Unavailable') : 'Unknown'} ok={!!h?.matlab_available} />
            <Row title="Scenario definitions" sub="Loaded from configuration" value={count ? `${count} scenarios` : 'Unavailable'} ok={!!count} />
            <Row title="Clinical ranges" sub="Configuration flag" value={c ? (c.clinical_ranges_configured ? 'Configured' : 'Not configured') : 'Not checked'} ok={!!c?.clinical_ranges_configured} />
          </div>
          <button className="btn btn-secondary gap-top" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} aria-hidden="true" />Refresh status
          </button>
        </section>

        <section className="panel" aria-labelledby="cfg-h">
          <h2 id="cfg-h">Configuration snapshot</h2>
          <p className="panel-desc">Configuration values are loaded from the backend and shown for transparency.</p>
          <div className="status-list">
            <Row title="Quality thresholds" sub="From /config" value={c ? JSON.stringify(c.quality_thresholds) : '—'} ok={!!c} />
            <Row title="Available scenarios" sub="From /scenarios" value={count} ok={!!c} />
            <Row title="Data handling" sub="Session state" value="Not persisted by this frontend" ok />
            <Row title="API docs" sub="FastAPI interactive docs" value={`${API_BASE.replace(/\/api\/v1$/, '')}/docs`} ok={!!h} />
          </div>
          <p className="hint spaced">If the API is unreachable, start the backend using its README or launch command, then refresh this page. If the frontend runs on a different origin, configure CORS in the backend.</p>
        </section>
      </div>
    </>
  );
}
