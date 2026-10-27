import Icon from '../components/Icon';
import { Chip, Callout, PageHead, Panel, KV, Scroll } from '../components/ui';
import { API_BASE, API_ROOT } from '../api';
import { titleCase } from '../lib/format';
import { ENDPOINTS } from '../lib/meta';

export default function StatusPage({ health, healthError, root, config, scenarios, ranges, lastChecked, onRefresh, refreshing }) {
  const count = Object.keys(scenarios || {}).length;
  const thresholds = config?.quality_thresholds;
  return (
    <div className="page">
      <PageHead
        eyebrow="System"
        title="System status"
        lead="Live backend health and configuration, as reported by the API."
        actions={<button className="btn btn-secondary" onClick={onRefresh} disabled={refreshing}><Icon name="refresh" size={14} className={refreshing ? 'spin' : ''} /> Refresh</button>}
      />

      {healthError && !health && (
        <Callout tone="bad" title="Backend unreachable">
          {healthError}
          <div className="cmd">From the backend folder: <code>python -m uvicorn app.main:app --reload --port 8000</code></div>
          <small>The backend only allows the origins http://localhost:5173 and http://localhost:3000 (CORS).</small>
        </Callout>
      )}

      <div className="grid-2">
        <Panel title="Backend health" aside={<Chip tone={health ? 'good' : 'bad'}>{health ? 'Responding' : 'Unavailable'}</Chip>}>
          <KV rows={[
            ['API base URL', <code key="b">{API_BASE}</code>, 'Set with VITE_API_BASE_URL'],
            ['Service', root?.name || '—', root?.identifier ? `Project ${root.identifier}` : null],
            ['Health status', health?.status || '—'],
            ['API version', health?.version || '—'],
            ['MATLAB / Simulink', health ? (health.matlab_available ? 'Available' : 'Not available') : '—', health && !health.matlab_available ? 'Simulations use the Python simulator.' : null],
            ['Server time (UTC)', health?.timestamp || '—'],
            ['Last checked', lastChecked ? lastChecked.toLocaleTimeString() : '—', 'Refreshed every 30 s while visible'],
          ]} />
          <div className="btn-row stack-sm">
            <a className="btn btn-secondary btn-sm" href={`${API_ROOT}/docs`} target="_blank" rel="noreferrer">API docs (Swagger)</a>
            <a className="btn btn-secondary btn-sm" href={`${API_ROOT}/redoc`} target="_blank" rel="noreferrer">ReDoc</a>
          </div>
        </Panel>

        <Panel title="Configuration" sub="Loaded from /config, /scenarios and /ranges.">
          <KV rows={[
            ['Scenarios', count ? `${count} defined` : 'Not loaded'],
            ['Quality thresholds', thresholds ? Object.entries(thresholds).map(([k, v]) => `${k} ≥ ${v}`).join(' · ') : '—'],
            ['Clinical ranges configured', ranges ? (Object.values(ranges).some(r => r.clinical_configured) ? 'Yes' : 'No') : '—', 'Per-signal clinical_configured flag from /ranges'],
          ]} />
          <Callout tone="warn" title="Research limitation">
            No age-specific clinical reference ranges are configured. The ranges below are software limits and informational “typical pediatric” bounds only.
          </Callout>
        </Panel>
      </div>

      <Panel title="Physiological ranges" sub="Exactly as returned by /ranges.">
        {!ranges ? <p className="muted">Not loaded.</p> : (
          <Scroll label="Physiological ranges">
            <table className="data">
              <thead><tr><th>Signal</th><th className="num">Software limits</th><th className="num">Typical pediatric (informational)</th><th>Clinical ranges configured</th></tr></thead>
              <tbody>
                {Object.entries(ranges).map(([k, r]) => (
                  <tr key={k}>
                    <td><code>{k}</code></td>
                    <td className="num">{r.software_limits?.min} – {r.software_limits?.max}</td>
                    <td className="num">{r.typical_pediatric?.min} – {r.typical_pediatric?.max}</td>
                    <td><Chip tone={r.clinical_configured ? 'good' : 'warn'}>{r.clinical_configured ? 'Yes' : 'No'}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Panel>

      <div className="grid-2">
        <Panel title="Scenario definitions" sub={`${count} loaded`}>
          <ul className="plain chips">{Object.entries(scenarios || {}).map(([k, v]) => <li key={k}><Chip title={v.description}>{v.name || titleCase(k)}</Chip></li>)}</ul>
        </Panel>
        <Panel title="Backend limits" sub="Documented in the backend source; not exposed by the API.">
          <KV rows={[
            ['Simulation duration', '10 – 600 s'],
            ['Sampling rate', '10 – 1,000 Hz'],
            ['CSV upload', '≤ 10 MB, ≤ 100,000 rows'],
            ['Analysis request', '≤ 100,000 rows'],
            ['CORS origins', 'localhost:5173, localhost:3000'],
          ]} />
        </Panel>
      </div>

      <Panel title="API coverage" sub="Every backend endpoint and where this frontend uses it.">
        <Scroll label="API endpoints">
          <table className="data">
            <thead><tr><th>Method</th><th>Path</th><th>Purpose</th><th>Used by</th></tr></thead>
            <tbody>{ENDPOINTS.map(([m, p, d, u]) => <tr key={p}><td><code>{m}</code></td><td><code>{p}</code></td><td className="wrap">{d}</td><td className="wrap">{u}</td></tr>)}</tbody>
          </table>
        </Scroll>
      </Panel>
    </div>
  );
}
