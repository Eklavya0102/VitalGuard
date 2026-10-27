import { useState } from 'react';
import Icon from '../components/Icon';
import SignalChart from '../components/SignalChart';
import { Chip, Callout, PageHead, Panel, Empty, KV, Provenance, DatasetSummary, Scroll } from '../components/ui';
import { api } from '../api';
import { fmt, titleCase, sourceInfo, toCsv, downloadText, MAX_ANALYSIS_ROWS } from '../lib/format';
import { expectedSamples } from '../lib/signal';
import { SCENARIO_PARAMS, SCENARIO_FLAGS, QUALITY_TONE, SIGNALS } from '../lib/meta';

export default function SimulationPage({ scenarios, health, simulation, setSimulation, loadDataset, runAnalysis, analyzing, data, source, chartMetric, setChartMetric, toast }) {
  const keys = Object.keys(scenarios);
  const [scenario, setScenario] = useState('');
  const [duration, setDuration] = useState(60);
  const [sampleRate, setSampleRate] = useState(100);
  const [seed, setSeed] = useState('');
  const [useMatlab, setUseMatlab] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = scenario && scenarios[scenario] ? scenario : keys[0] || '';
  const sc = scenarios[active] || {};
  const est = expectedSamples(duration, sampleRate);
  const tooMany = est !== null && est > MAX_ANALYSIS_ROWS;
  const durationOk = Number(duration) >= 10 && Number(duration) <= 600;
  const rateOk = Number(sampleRate) >= 10 && Number(sampleRate) <= 1000;
  const seedOk = seed.trim() === '' || Number.isInteger(Number(seed));
  const matlabOk = !!health?.matlab_available;

  const flags = Object.entries(SCENARIO_FLAGS).filter(([k]) => sc[k]).map(([, label]) => label);
  const meta = simulation?.metadata || {};
  const simulated = simulation && source === simulation.source && data === simulation.data;

  const run = async e => {
    e.preventDefault();
    if (!active) { toast('No scenarios loaded from the backend.', 'error'); return; }
    if (!durationOk) { toast('Duration must be between 10 and 600 seconds.', 'error'); return; }
    if (!rateOk) { toast('Sampling rate must be between 10 and 1,000 Hz.', 'error'); return; }
    if (!seedOk) { toast('Seed must be a whole number.', 'error'); return; }
    setBusy(true);
    try {
      const body = { scenario: active, duration: Number(duration), sample_rate: Number(sampleRate), use_matlab: useMatlab && matlabOk };
      if (seed.trim() !== '') body.seed = Number(seed);
      const result = await api.simulate(body);
      if (!result.success) throw new Error(result.message || 'The backend reported an unsuccessful simulation.');
      setSimulation(result);
      loadDataset({ rows: result.data || [], meta: result.metadata || {}, src: result.source });
      toast(`Generated ${(result.data || []).length.toLocaleString()} synthetic samples (${sourceInfo(result.source).label}).`, 'success');
    } catch (err) {
      toast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const rows = simulation?.data || [];

  return (
    <div className="page">
      <PageHead
        eyebrow="Workspace"
        title="Simulation lab"
        lead="Generate a controlled synthetic dataset from one of the backend scenarios. All values are simulated; no patient or device data is involved."
      />

      <div className="grid-split">
        <div className="stack">
          <Panel title="Experiment configuration" sub={keys.length ? `${keys.length} scenarios loaded from the backend.` : undefined}>
            {!keys.length ? (
              <Callout tone="warn" title="Scenarios unavailable">The scenario list could not be loaded. Check the backend on the System status page.</Callout>
            ) : (
              <form onSubmit={run} noValidate>
                <div className="field">
                  <label htmlFor="scenario">Scenario</label>
                  <select id="scenario" value={active} onChange={e => setScenario(e.target.value)}>
                    {keys.map(k => <option key={k} value={k}>{scenarios[k].name || titleCase(k)}</option>)}
                  </select>
                </div>

                <div className="scenario-card">
                  <div className="scenario-top">
                    <strong>{sc.name || titleCase(active)}</strong>
                    <Chip tone={QUALITY_TONE[sc.expected_quality] || 'neutral'} title="Design intent of the scenario, not an analysis result">
                      Designed quality: {sc.expected_quality || 'n/a'}
                    </Chip>
                  </div>
                  <p>{sc.description}</p>
                  <dl className="params">
                    {SCENARIO_PARAMS.map(([k, label]) => (sc[k] !== undefined ? <div key={k}><dt>{label}</dt><dd>{sc[k]}</dd></div> : null))}
                    {sc.pulse_mean !== undefined && <div><dt>Pulse</dt><dd>{sc.pulse_mean} ± {sc.pulse_std} bpm</dd></div>}
                    {sc.spo2_mean !== undefined && <div><dt>SpO₂</dt><dd>{sc.spo2_mean} ± {sc.spo2_std} %</dd></div>}
                  </dl>
                  {flags.length ? <p className="muted small">Special behaviour: {flags.join(' · ')}</p> : null}
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="duration">Duration (s)</label>
                    <input id="duration" type="number" min="10" max="600" step="any" value={duration} onChange={e => setDuration(e.target.value)} aria-invalid={!durationOk} aria-describedby="duration-h" />
                    <span id="duration-h" className="hint">10 – 600 s</span>
                  </div>
                  <div className="field">
                    <label htmlFor="rate">Sampling rate (Hz)</label>
                    <input id="rate" type="number" min="10" max="1000" step="any" value={sampleRate} onChange={e => setSampleRate(e.target.value)} aria-invalid={!rateOk} aria-describedby="rate-h" />
                    <span id="rate-h" className="hint">10 – 1,000 Hz</span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="seed">Random seed <span className="optional">(optional)</span></label>
                  <input id="seed" type="number" step="1" placeholder="Blank = non-reproducible" value={seed} onChange={e => setSeed(e.target.value)} aria-invalid={!seedOk} />
                </div>

                <p className={`hint ${tooMany ? 'hint-warn' : ''}`}>
                  ≈ {est !== null ? est.toLocaleString() : '—'} samples.
                  {tooMany ? ` The analysis endpoint accepts at most ${MAX_ANALYSIS_ROWS.toLocaleString()} rows, so this run could be generated but not analyzed.` : ''}
                </p>

                <label className={`toggle ${matlabOk ? '' : 'disabled'}`}>
                  <span>
                    <strong>Prefer MATLAB / Simulink</strong>
                    <small>{matlabOk ? 'MATLAB is configured in the backend. If it fails, the backend falls back to Python and reports it.' : 'MATLAB is not available in this backend; the Python simulator is used.'}</small>
                  </span>
                  <input type="checkbox" role="switch" className="switch" checked={useMatlab && matlabOk} onChange={e => setUseMatlab(e.target.checked)} disabled={!matlabOk} />
                </label>

                <button className="btn btn-primary btn-block" type="submit" disabled={busy || !health}>
                  {busy ? <><span className="spinner" /> Generating…</> : <><Icon name="play" size={14} /> Run simulation</>}
                </button>
                {!health && <p className="hint hint-warn">Backend not connected.</p>}
              </form>
            )}
          </Panel>

          <Panel title="Scenario library" sub="All scenarios as defined by the backend. Select a row to configure it.">
            <Scroll label="Scenario library">
              <table className="data selectable">
                <thead><tr><th>Scenario</th><th>Description</th><th>Designed quality</th></tr></thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k} className={k === active ? 'is-active' : ''}>
                      <td><button className="link-btn" onClick={() => setScenario(k)} aria-pressed={k === active}>{scenarios[k].name || titleCase(k)}</button><code className="id">{k}</code></td>
                      <td className="wrap">{scenarios[k].description}</td>
                      <td><Chip tone={QUALITY_TONE[scenarios[k].expected_quality] || 'neutral'}>{scenarios[k].expected_quality || 'n/a'}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
            <p className="hint">“Designed quality” is the scenario author’s intent. It is not a measured result and is independent of whether values are physiologically typical.</p>
          </Panel>
        </div>

        <div className="stack">
          <Panel
            title="Generated dataset"
            sub={simulation ? undefined : 'Run an experiment to generate samples.'}
            aside={simulation ? <Provenance source={simulation.source} metadata={meta} /> : <Chip>Waiting for run</Chip>}
          >
            {!simulation ? (
              <Empty title="No dataset generated">Configure a scenario and run it. The returned samples, metadata and generation source will be shown here and can then be analyzed.</Empty>
            ) : (
              <>
                {simulation.source === 'python_fallback' && (
                  <Callout tone="warn" title="MATLAB fallback">MATLAB / Simulink was requested but the backend used its Python simulator instead.</Callout>
                )}
                {simulation.message ? <Callout tone="info">{simulation.message}</Callout> : null}
                {!simulated && <Callout tone="info">A different dataset is now loaded in the workspace. Re-run to restore this one.</Callout>}

                <div className="btn-row">
                  <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing || !simulated || rows.length > MAX_ANALYSIS_ROWS}>
                    {analyzing ? <><span className="spinner" /> Analyzing…</> : <>Analyze dataset <Icon name="arrow" size={14} /></>}
                  </button>
                  <button className="btn btn-secondary" onClick={() => downloadText('vitalguard-simulation.csv', toCsv(rows), 'text/csv')}>
                    <Icon name="download" size={14} /> Download samples as CSV
                  </button>
                </div>
                {rows.length > MAX_ANALYSIS_ROWS && <Callout tone="warn">This dataset has more rows than the analysis endpoint accepts ({MAX_ANALYSIS_ROWS.toLocaleString()}). Re-run with a shorter duration or lower rate.</Callout>}

                <h3>Signal preview</h3>
                <div className="chart-select">
                  <label htmlFor="sim-metric" className="sr-only">Signal</label>
                  <select id="sim-metric" value={chartMetric} onChange={e => setChartMetric(e.target.value)}>
                    {SIGNALS.filter(s => rows.some(r => r[s.key] !== undefined)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <SignalChart data={rows} metric={chartMetric} source={simulation.source} height={240} />

                <h3>Simulation metadata</h3>
                <KV rows={[
                  ['Scenario', `${meta.scenario_name || '—'} (${meta.scenario || '—'})`],
                  ['Description', meta.description],
                  ['Data source', sourceInfo(simulation.source).label, sourceInfo(simulation.source).detail],
                  ['Generation method', meta.generation_method],
                  ['Synthetic data flag', meta.synthetic_data === true ? 'true' : meta.synthetic_data === false ? 'false' : '—'],
                  ['Duration', meta.duration !== undefined ? `${meta.duration} s` : null],
                  ['Sample rate', meta.sample_rate !== undefined ? `${meta.sample_rate} Hz` : null],
                  ['Samples (expected / actual)', `${meta.expected_samples?.toLocaleString?.() ?? '—'} / ${meta.actual_samples?.toLocaleString?.() ?? rows.length.toLocaleString()}`],
                  ['Seed', meta.seed ?? 'none (random)'],
                  ['Generated at (UTC)', meta.timestamp],
                ]} />

                <h3>Sample preview</h3>
                <Scroll label="First ten samples">
                  <table className="data">
                    <thead><tr><th className="num">#</th><th className="num">Timestamp (s)</th><th className="num">Pulse (bpm)</th><th className="num">SpO₂ (%)</th><th className="num">PPG (a.u.)</th><th className="num">Motion</th><th className="num">Contact</th></tr></thead>
                    <tbody>
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="num">{i}</td>
                          <td className="num">{fmt(r.timestamp, 3)}</td>
                          <td className="num">{fmt(r.pulse_bpm, 1)}</td>
                          <td className="num">{fmt(r.spo2_percent, 1)}</td>
                          <td className="num">{r.ppg_value === null || r.ppg_value === undefined ? <span className="missing">missing</span> : fmt(r.ppg_value, 3)}</td>
                          <td className="num">{fmt(r.motion, 2)}</td>
                          <td className="num">{fmt(r.contact, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Scroll>
                <h3>Column summary</h3>
                <DatasetSummary data={rows} />
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
