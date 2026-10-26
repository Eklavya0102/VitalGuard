export default function StatusPage({ health, config, scenarios, onRefresh }) {
  const API_BASE = 'http://localhost:8000/api/v1';

  return (
    <div className="workspace-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">VITALGUARD WORKSPACE</div>
          <h1>System status</h1>
          <p>Backend connectivity, configuration and simulation capabilities.</p>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="result-panel">
          <div className="result-head">
            <div>
              <h2>Backend health</h2>
              <p>Values queried from the FastAPI service</p>
            </div>
            <span className={`status-chip ${health ? 'good' : 'bad'}`}>{health ? 'Responding' : 'Unavailable'}</span>
          </div>

          <div className="status-list">
            <div className="status-row"><div><strong>API endpoint</strong><small>{API_BASE}</small></div><div className="status-right"><i className={`dot ${health ? 'green' : 'amber'}`}></i><span>{health ? 'Connected' : 'Could not connect'}</span></div></div>
            <div className="status-row"><div><strong>Service status</strong><small>Health endpoint</small></div><div className="status-right"><i className={`dot ${health ? 'green' : 'amber'}`}></i><span>{health?.status || 'No response'}</span></div></div>
            <div className="status-row"><div><strong>Backend version</strong><small>Reported by API</small></div><div className="status-right"><i className="dot green"></i><span>{health?.version || '—'}</span></div></div>
            <div className="status-row"><div><strong>MATLAB / Simulink</strong><small>Simulation engine</small></div><div className="status-right"><i className={`dot ${health?.matlab_available ? 'green' : 'amber'}`}></i><span>{health ? (health.matlab_available ? 'Available' : 'Unavailable') : 'Unknown'}</span></div></div>
            <div className="status-row"><div><strong>Scenario definitions</strong><small>Loaded from configuration</small></div><div className="status-right"><i className="dot green"></i><span>{Object.keys(scenarios || {}).length ? `${Object.keys(scenarios).length} scenarios` : 'Unavailable'}</span></div></div>
            <div className="status-row"><div><strong>Clinical ranges</strong><small>Configuration flag</small></div><div className="status-right"><i className={`dot ${config?.clinical_ranges_configured ? 'green' : 'amber'}`}></i><span>{config ? (config.clinical_ranges_configured ? 'Configured' : 'Not configured') : 'Not checked'}</span></div></div>
          </div>

          <button className="button button-secondary" onClick={onRefresh} style={{ marginTop: '18px' }}>↻ Refresh status</button>
        </section>

        <section className="result-panel">
          <h2>Configuration snapshot</h2>
          <p className="panel-description">Configuration values are loaded from the backend and shown for transparency.</p>
          <div className="status-list">
            <div className="status-row"><div><strong>Quality thresholds</strong><small>From /config</small></div><div className="status-right"><i className="dot green"></i><span>{config ? JSON.stringify(config.quality_thresholds) : '—'}</span></div></div>
            <div className="status-row"><div><strong>Available scenarios</strong><small>From /scenarios</small></div><div className="status-right"><i className="dot green"></i><span>{String(Object.keys(scenarios || {}).length)}</span></div></div>
            <div className="status-row"><div><strong>Data handling</strong><small>Session state</small></div><div className="status-right"><i className="dot green"></i><span>Not persisted by this frontend</span></div></div>
            <div className="status-row"><div><strong>API docs</strong><small>FastAPI interactive docs</small></div><div className="status-right"><i className="dot green"></i><span>{API_BASE.replace(/\/api\/v1$/, '')}/docs</span></div></div>
          </div>
          <p className="field-hint" style={{ marginTop: '16px' }}>
            If the API is unreachable, start the backend using its FastAPI command (`uvicorn main:app --reload`), then refresh this page.
          </p>
        </section>
      </div>
    </div>
  );
}