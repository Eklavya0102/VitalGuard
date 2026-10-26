import { useState } from 'react';

export default function SimulationPage({ scenarios, health, simulation, setSimulation, setData, setMetadata, setSource, setAnalysis, setPage, toast }) {
  const [scenario, setScenario] = useState(Object.keys(scenarios)[0] || 'clean');
  const [duration, setDuration] = useState(60);
  const [sampleRate, setSampleRate] = useState(100);
  const [seed, setSeed] = useState('');
  const [useMatlab, setUseMatlab] = useState(false);
  const [busy, setBusy] = useState(false);

  const titleCase = s => String(s || 'unknown').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const sourceName = src => ({ python: 'Python simulation', matlab: 'MATLAB / Simulink', upload: 'CSV upload' })[src] || titleCase(src || 'No data source');
  const fmt = (v, d = 1) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—';

  const currentScenarioMeta = scenarios[scenario] || {};

  const handleRun = async (e) => {
    e.preventDefault();
    if (duration < 10 || duration > 600) { toast('Duration must be between 10 and 600 seconds.', 'error'); return; }
    if (sampleRate < 10 || sampleRate > 1000) { toast('Sampling rate must be between 10 and 1,000 Hz.', 'error'); return; }

    setBusy(true);
    try {
      const body = { scenario, duration: Number(duration), sample_rate: Number(sampleRate), use_matlab: !!useMatlab };
      if (seed.trim() !== '') body.seed = Number(seed);

      const res = await fetch('http://localhost:8000/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Simulation failed');

      setSimulation(result);
      setData(result.data || []);
      setMetadata(result.metadata || {});
      setSource(result.source || 'python');
      setAnalysis(null);
      toast(`Generated ${(result.data || []).length.toLocaleString()} samples using ${sourceName(result.source)}.`, 'success');
    } catch (err) {
      toast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!simulation?.data?.length) return;
    const data = simulation.data;
    const cols = [...new Set(data.flatMap(r => Object.keys(r)))];
    const csv = [cols.join(','), ...data.map(row => cols.map(k => {
      const v = row[k] ?? '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vitalguard-simulation.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">VITALGUARD WORKSPACE</div>
          <h1>Simulation lab</h1>
          <p>Configure a controlled experiment and inspect the generated signal.</p>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="form-panel">
          <h2>Experiment configuration</h2>
          <p className="panel-description">Choose a scenario and signal parameters. The backend determines the actual output and generation source.</p>
          
          <form onSubmit={handleRun}>
            <div className="field">
              <label htmlFor="scenario">Signal scenario</label>
              <select id="scenario" value={scenario} onChange={e => setScenario(e.target.value)}>
                {Object.entries(scenarios).map(([k, v]) => (
                  <option key={k} value={k}>{v.name || titleCase(k)}</option>
                ))}
              </select>
            </div>

            <div className="scenario-detail">
              <strong>{currentScenarioMeta.name || titleCase(scenario)}</strong>
              <p>{currentScenarioMeta.description || 'Scenario description provided by the backend.'}</p>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="duration">Duration (seconds)</label>
                <input id="duration" type="number" min="10" max="600" value={duration} onChange={e => setDuration(e.target.value)} required />
                <span className="field-hint">10–600 seconds</span>
              </div>
              <div className="field">
                <label htmlFor="sampleRate">Sampling rate (Hz)</label>
                <input id="sampleRate" type="number" min="10" max="1000" value={sampleRate} onChange={e => setSampleRate(e.target.value)} required />
                <span className="field-hint">10–1,000 Hz</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="seed">Random seed <span style={{ fontWeight: 400, color: 'var(--subtle)' }}>(optional)</span></label>
              <input id="seed" type="number" placeholder="Leave blank for random output" value={seed} onChange={e => setSeed(e.target.value)} />
            </div>

            <div className="toggle-row">
              <div>
                <strong>Prefer MATLAB / Simulink</strong>
                <small>{health?.matlab_available ? 'Available in backend configuration' : 'Not available; Python simulation remains available'}</small>
              </div>
              <input className="switch" type="checkbox" checked={useMatlab} onChange={e => setUseMatlab(e.target.checked)} disabled={!health?.matlab_available} />
            </div>

            <button className="button button-primary full-button" type="submit" disabled={busy}>
              {busy ? <><span className="spinner"></span> Generating…</> : '▷   Run simulation'}
            </button>
          </form>
        </section>

        <section className="result-panel">
          <div className="result-head">
            <div>
              <h2>Generated dataset</h2>
              <p>Simulation output and sample preview</p>
            </div>
            <span className={`status-chip ${simulation ? 'good' : 'neutral'}`}>{simulation ? 'Dataset ready' : 'Waiting for run'}</span>
          </div>

          {!simulation ? (
            <div className="result-placeholder">
              <span className="empty-icon" style={{ width: '44px', height: '44px', fontSize: '26px' }}>⌁</span>
              <strong>No simulation generated</strong>
              <p>Configure an experiment and run it to generate a synthetic dataset. The returned samples will be available for analysis.</p>
            </div>
          ) : (
            <div>
              <div className="quality-hero">
                <div className="quality-number">{(simulation.data || []).length.toLocaleString()}<small> samples</small></div>
                <div className="quality-copy">
                  <strong>{sourceName(simulation.source)}</strong>
                  <p>{simulation.metadata?.scenario_name || simulation.metadata?.scenario || 'Simulation completed'} · {simulation.metadata?.duration || duration} sec configured</p>
                </div>
              </div>

              <div className="assessment-grid">
                <div className="assessment-item"><span>Sample rate</span><strong>{simulation.metadata?.sample_rate || sampleRate} Hz</strong></div>
                <div className="assessment-item"><span>Scenario</span><strong>{scenarios[simulation.metadata?.scenario]?.name || titleCase(simulation.metadata?.scenario || scenario)}</strong></div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Timestamp</th><th>Pulse</th><th>SpO₂</th><th>Motion</th><th>Contact</th></tr>
                  </thead>
                  <tbody>
                    {(simulation.data || []).slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{fmt(r.timestamp, 3)}</td>
                        <td>{fmt(r.pulse_bpm, 1)}</td>
                        <td>{fmt(r.spo2_percent, 1)}%</td>
                        <td>{fmt(r.motion, 2)}</td>
                        <td>{fmt(r.contact, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                <button className="button button-primary" onClick={() => setPage('analysis')}>Analyze dataset →</button>
                <button className="button button-secondary" onClick={handleDownloadCsv}>Download CSV</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}