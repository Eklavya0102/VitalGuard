import { useEffect, useState } from 'react';
import { ArrowRight, Download, FlaskConical, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useAnalyze } from '../hooks/useAnalyze';
import { postSimulate } from '../services/api';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Table from '../components/Table';
import Busy from '../components/Spinner';
import { fmt, sourceName, titleCase } from '../utils/format';
import { downloadDataCsv } from '../utils/download';

export default function Simulation() {
  const { scenarios, health, simulation, data, source, metadata, storeSimulation } = useApp();
  const toast = useToast();
  const { analyze, analyzing } = useAnalyze();
  const [scenario, setScenario] = useState('clean');
  const [duration, setDuration] = useState('60');
  const [sampleRate, setSampleRate] = useState('100');
  const [seed, setSeed] = useState('');
  const [useMatlab, setUseMatlab] = useState(false);
  const [running, setRunning] = useState(false);
  const [errors, setErrors] = useState({});

  const entries = Object.entries(scenarios || {});
  const cfg = scenarios[scenario] || {};
  const matlabOk = !!health?.matlab_available;

  // Default to the first backend scenario once the list loads.
  useEffect(() => {
    if (entries.length && !scenarios[scenario]) setScenario(entries[0][0]);
  }, [scenarios]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e) {
    e.preventDefault();
    const d = Number(duration);
    const sr = Number(sampleRate);
    const next = {};
    if (!Number.isFinite(d) || d < 10 || d > 600) next.duration = 'Duration must be between 10 and 600 seconds.';
    if (!Number.isFinite(sr) || sr < 10 || sr > 1000) next.sampleRate = 'Sampling rate must be between 10 and 1,000 Hz.';
    setErrors(next);
    if (next.duration || next.sampleRate) {
      toast(next.duration || next.sampleRate, 'error');
      return;
    }
    const body = { scenario, duration: d, sample_rate: sr, use_matlab: useMatlab };
    if (seed.trim() !== '') body.seed = Number(seed);
    setRunning(true);
    try {
      const result = await postSimulate(body);
      if (!result.success) throw new Error(result.message || 'Simulation was not successful');
      storeSimulation({ ...result, request: body });
      toast(`Generated ${(result.data || []).length.toLocaleString()} samples using ${sourceName(result.source || 'python')}.`, 'success');
    } catch (err) {
      toast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  }

  const s = simulation;
  const req = s?.request || {};

  return (
    <>
      <PageHeader title="Simulation lab" description="Configure a controlled experiment and inspect the generated signal." />
      <div className="workspace">
        <section className="panel" aria-labelledby="sim-cfg">
          <h2 id="sim-cfg">Experiment configuration</h2>
          <p className="panel-desc">Choose a scenario and signal parameters. The backend determines the actual output and generation source.</p>
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="scenario">Signal scenario</label>
              <select id="scenario" value={scenario} onChange={(e) => setScenario(e.target.value)}>
                {entries.length
                  ? entries.map(([k, v]) => <option key={k} value={k}>{v.name || titleCase(k)}</option>)
                  : <option value="clean">Clean Signal</option>}
              </select>
            </div>
            <div className="scenario-detail" aria-live="polite">
              <strong>{cfg.name || titleCase(scenario)}</strong>
              <p>{cfg.description || (entries.length ? 'Scenario description provided by the backend.' : 'High-quality signal with minimal noise.')}</p>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="duration">Duration (seconds)</label>
                <input id="duration" type="number" min="10" max="600" value={duration} onChange={(e) => setDuration(e.target.value)} required aria-invalid={!!errors.duration} aria-describedby="duration-h" />
                <span id="duration-h" className={`hint${errors.duration ? ' hint-error' : ''}`}>{errors.duration || '10–600 seconds'}</span>
              </div>
              <div className="field">
                <label htmlFor="sampleRate">Sampling rate (Hz)</label>
                <input id="sampleRate" type="number" min="10" max="1000" value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} required aria-invalid={!!errors.sampleRate} aria-describedby="sr-h" />
                <span id="sr-h" className={`hint${errors.sampleRate ? ' hint-error' : ''}`}>{errors.sampleRate || '10–1,000 Hz'}</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="seed">Random seed <span className="optional">(optional)</span></label>
              <input id="seed" type="number" placeholder="Leave blank for random output" value={seed} onChange={(e) => setSeed(e.target.value)} />
            </div>
            <div className="toggle-row">
              <div>
                <label htmlFor="useMatlab">Prefer MATLAB / Simulink</label>
                <small>{!health ? 'Checking availability…' : matlabOk ? 'Available in backend configuration' : 'Not available; Python simulation remains available'}</small>
              </div>
              <input className="switch" id="useMatlab" type="checkbox" role="switch" checked={useMatlab && matlabOk} disabled={!matlabOk} onChange={(e) => setUseMatlab(e.target.checked)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={running}>
              <Busy busy={running} label="Generating…"><Play size={16} aria-hidden="true" />Run simulation</Busy>
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="sim-res">
          <div className="panel-head ruled">
            <div><h2 id="sim-res">Generated dataset</h2><p>Simulation output and sample preview</p></div>
            <Badge tone={s ? 'good' : 'neutral'}>{s ? 'Dataset ready' : 'Waiting for run'}</Badge>
          </div>
          {!s ? (
            <EmptyState icon={FlaskConical} title="No simulation generated">
              Configure an experiment and run it to generate a synthetic dataset. The returned samples will be available for analysis.
            </EmptyState>
          ) : (
            <>
              <div className="summary">
                <div className="score-line"><span className="score-big">{(s.data || []).length.toLocaleString()}</span><span className="score-of">samples</span></div>
                <div>
                  <strong>{sourceName(s.source)}</strong>
                  <p className="muted">{s.metadata?.scenario_name || s.metadata?.scenario || 'Simulation completed'} · {String(s.metadata?.duration ?? req.duration ?? '—')} sec configured</p>
                </div>
              </div>
              <dl className="facts">
                <div><dt>Sample rate</dt><dd>{String(s.metadata?.sample_rate ?? req.sample_rate ?? '—')} Hz</dd></div>
                <div><dt>Scenario</dt><dd>{scenarios[s.metadata?.scenario]?.name || titleCase(s.metadata?.scenario || req.scenario)}</dd></div>
              </dl>
              <Table label="Sample preview">
                <thead><tr><th>Timestamp</th><th>Pulse</th><th>SpO₂</th><th>Motion</th><th>Contact</th></tr></thead>
                <tbody>
                  {(s.data || []).slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="num">{fmt(r.timestamp, 3)}</td><td className="num">{fmt(r.pulse_bpm, 1)}</td>
                      <td className="num">{fmt(r.spo2_percent, 1)}%</td><td className="num">{fmt(r.motion, 2)}</td><td className="num">{fmt(r.contact, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="actions-row">
                <button className="btn btn-primary" disabled={analyzing} onClick={() => analyze(data, source, metadata)}>
                  <Busy busy={analyzing} label="Analyzing…">Analyze dataset<ArrowRight size={16} aria-hidden="true" /></Busy>
                </button>
                <button className="btn btn-secondary" onClick={() => !downloadDataCsv(data, 'vitalguard-simulation.csv') && toast('No data available to export.', 'error')}>
                  <Download size={16} aria-hidden="true" />Download CSV
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
