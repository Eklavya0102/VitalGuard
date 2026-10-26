import { useMemo } from 'react';
import Icon from '../components/Icon';
import SignalChart from '../components/SignalChart';
import { Chip, Callout, PageHead, Panel, Empty, KV, Provenance, Stat, Scroll, DatasetSummary } from '../components/ui';
import { fmt, pct, titleCase, toCsv, downloadText } from '../lib/format';
import { summarizeDataset } from '../lib/signal';
import { statusInfo, QUALITY_TONE, SEVERITY_TONE, ARTIFACT_LABELS, COMPONENT_LABELS, FEATURES, UNAVAILABLE_REASON, SIGNALS } from '../lib/meta';

const featureValue = (kind, v) => (kind === 'pct' ? pct(v) : kind === 'db' ? `${fmt(v, 1)} dB` : fmt(v, 3));

export default function AnalysisPage({ analysis, data, source, metadata, config, ranges, runAnalysis, analyzing, setPage, chartMetric, setChartMetric }) {
  const summary = useMemo(() => summarizeDataset(data), [data]);
  const metrics = SIGNALS.filter(s => summary.columns.some(c => c.key === s.key && c.valid > 0));

  if (!analysis) {
    return (
      <div className="page">
        <PageHead eyebrow="Workspace" title="Signal analysis" lead="Signal-quality scoring, artifact events, extracted features and physiological checks, as returned by the backend." />
        <Panel>
          {data.length ? (
            <Empty
              title="Dataset loaded, not yet analyzed"
              actions={<button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>{analyzing ? <><span className="spinner" /> Analyzing…</> : <>Analyze {data.length.toLocaleString()} samples <Icon name="arrow" size={14} /></>}</button>}
            >
              <Provenance source={source} metadata={metadata} />
            </Empty>
          ) : (
            <Empty
              title="No analysis available"
              actions={<><button className="btn btn-primary" onClick={() => setPage('simulation')}>Open simulation lab</button><button className="btn btn-secondary" onClick={() => setPage('import')}>Import CSV</button></>}
            >
              Generate a simulated dataset or import a CSV, then run the analysis.
            </Empty>
          )}
        </Panel>
      </div>
    );
  }

  const q = analysis.quality_score || {};
  const phys = analysis.physiological || {};
  const arts = analysis.artifacts || [];
  const feats = analysis.features || {};
  const fv = feats.values || {};
  const dq = analysis.data_quality || {};
  const thresholds = config?.quality_thresholds;
  const components = Object.keys(q.components || {});
  const weights = q.weights || {};
  const unavailable = [...new Set([...(feats.unavailable || []), ...(q.unavailable_features || [])])];
  const ppgCol = summary.columns.find(c => c.key === 'ppg_value');
  const missingTs = !summary.hasTimestamp;
  const weightSum = components.reduce((a, k) => a + (weights[k] || 0), 0);
  const highQualityButAtypical =
    q.category === 'high' && [phys.pulse_status, phys.spo2_status].some(s => s === 'outside_typical_range' || s === 'software_limits_exceeded');
  const warnings = phys.warnings || [];
  const issues = phys.data_integrity_issues || [];
  const stamp = analysis.timestamp ? new Date(analysis.timestamp).toLocaleString() : '';
  const typical = k => ranges?.[k]?.typical_pediatric;
  const limits = k => ranges?.[k]?.software_limits;

  return (
    <div className="page">
      <PageHead
        eyebrow="Workspace"
        title="Signal analysis"
        lead={`${(analysis.sample_count ?? 0).toLocaleString()} samples analyzed${stamp ? ` · ${stamp}` : ''}`}
        actions={<button className="btn btn-primary" onClick={() => setPage('reports')}>Generate report <Icon name="arrow" size={14} /></button>}
      />
      <div className="prov-row">
        <Provenance source={source} metadata={metadata} />
        <span className="muted small">Backend reported data source: <code>{analysis.data_source}</code></span>
      </div>

      <Panel
        title="Analyzed signal"
        sub="Shaded intervals mark artifact events that the backend reported with sample ranges."
        aside={
          <select value={metrics.some(m => m.key === chartMetric) ? chartMetric : metrics[0]?.key} onChange={e => setChartMetric(e.target.value)} aria-label="Signal to display">
            {metrics.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        }
      >
        <SignalChart data={data} metric={metrics.some(m => m.key === chartMetric) ? chartMetric : metrics[0]?.key || 'pulse_bpm'} artifacts={arts} source={source} height={300} />
      </Panel>

      <div className="grid-2">
        <Panel
          title="Signal quality"
          sub="How reliable the measurement signal appears. This does not say whether the values are physiologically typical."
          aside={<Chip tone={QUALITY_TONE[q.category] || 'neutral'}>{q.label || titleCase(q.category)}</Chip>}
        >
          <div className="score">
            <div className="score-num">{fmt(q.overall, 1)}<small> / 100</small></div>
            <div className="score-bar" role="img" aria-label={`Overall quality score ${fmt(q.overall, 1)} of 100`}>
              <i style={{ width: `${Math.max(0, Math.min(100, Number(q.overall) || 0))}%` }} />
              {thresholds && Object.entries(thresholds).filter(([, v]) => v > 0).map(([k, v]) => <b key={k} style={{ left: `${v}%` }} title={`${k} ≥ ${v}`} />)}
            </div>
            {thresholds && <p className="hint">Backend category thresholds: {Object.entries(thresholds).map(([k, v]) => `${k} ≥ ${v}`).join(' · ')}. “Insufficient” is returned when fewer than three components are computable.</p>}
          </div>

          {(q.explanations || []).length > 0 && (
            <>
              <h3>Contributing factors</h3>
              <ul className="plain bullets">{q.explanations.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </>
          )}

          <h3>Score components</h3>
          <Scroll label="Quality score components">
            <table className="data">
              <thead><tr><th>Component</th><th className="num">Score</th><th className="num">Weight</th><th className="num">Contribution</th></tr></thead>
              <tbody>
                {components.map(k => (
                  <tr key={k}>
                    <td>{COMPONENT_LABELS[k] || titleCase(k)}</td>
                    <td className="num">
                      <span className="mini-bar"><i style={{ width: `${Math.max(0, Math.min(100, q.components[k]))}%` }} /></span>
                      {fmt(q.components[k], 1)}
                    </td>
                    <td className="num">{fmt(weights[k], 2)}</td>
                    <td className="num">{fmt(q.contributions?.[k], 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
          <p className="hint">Overall = sum of contributions ÷ sum of weights of the computable components ({fmt(weightSum, 2)} here), so missing inputs are excluded rather than scored as zero.</p>
          {unavailable.length > 0 && (
            <Callout tone="info" title="Not computed for this dataset">
              <ul className="plain">{unavailable.map(k => <li key={k}><b>{FEATURES[k]?.label || COMPONENT_LABELS[k] || titleCase(k)}</b>: {UNAVAILABLE_REASON[k] || 'Required input not available.'}</li>)}</ul>
            </Callout>
          )}
        </Panel>

        <Panel
          title="Physiological plausibility"
          sub="Compares values with software limits and configured typical ranges. Separate from signal quality."
          aside={<Chip tone={phys.clinical_ranges_configured ? 'good' : 'warn'}>{phys.clinical_ranges_configured ? 'Clinical ranges configured' : 'Clinical ranges not configured'}</Chip>}
        >
          <div className="stat-grid two">
            {[['pulse_bpm', 'Pulse', phys.pulse_status, 'bpm'], ['spo2_percent', 'SpO₂', phys.spo2_status, '%']].map(([k, label, status, unit]) => {
              const si = statusInfo(status);
              return (
                <div className="stat" key={k}>
                  <span className="stat-label">{label}</span>
                  <span className="stat-value small"><Chip tone={si.tone}>{si.label}</Chip></span>
                  <span className="stat-foot">
                    {typical(k) ? `Configured typical: ${typical(k).min}–${typical(k).max} ${unit}` : 'Typical range not loaded'}
                    {limits(k) ? ` · Software limits: ${limits(k).min}–${limits(k).max} ${unit}` : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <Callout tone="warn" title="Research limitation">
            <code>clinical_ranges_configured: {String(!!phys.clinical_ranges_configured)}</code>. The typical pediatric ranges are informational and are not age-specific clinical reference standards. A value inside or outside them is not a clinical finding.
          </Callout>
          {highQualityButAtypical && (
            <Callout tone="info" title="Quality and plausibility are independent">
              The signal is rated high quality, yet at least one value falls outside the configured typical range. A clean signal can still carry unusual values; a good score does not mean the values are normal.
            </Callout>
          )}

          {issues.length > 0 && (<><h3>Data integrity issues</h3><ul className="plain bullets">{issues.map((w, i) => <li key={i}>{w}</li>)}</ul></>)}
          <h3>Validation warnings</h3>
          {warnings.length ? <ul className="plain bullets">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : <p className="muted">No warnings returned.</p>}
        </Panel>
      </div>

      <Panel title="Detected artifacts" sub={`${arts.length} event${arts.length === 1 ? '' : 's'} returned by the backend.`}>
        {arts.length ? (
          <Scroll label="Detected artifacts">
            <table className="data">
              <thead><tr><th>Artifact</th><th>Severity</th><th>Confidence</th><th>Location</th><th>Explanation</th><th>Supporting values</th></tr></thead>
              <tbody>
                {arts.map((a, i) => {
                  const ranged = Number.isInteger(a.start_index) && Number.isInteger(a.end_index);
                  const t0 = ranged ? data[a.start_index]?.timestamp : null;
                  const t1 = ranged ? data[Math.min(a.end_index, data.length - 1)]?.timestamp : null;
                  return (
                    <tr key={i}>
                      <td>{ARTIFACT_LABELS[a.type] || titleCase(a.type)}</td>
                      <td><Chip tone={SEVERITY_TONE[a.severity] || 'neutral'}>{a.severity}</Chip></td>
                      <td>{a.confidence || '—'}</td>
                      <td>{ranged ? <>Samples {a.start_index}–{a.end_index}{t0 !== undefined && t0 !== null && t1 !== undefined && t1 !== null ? <small className="block muted">{fmt(t0, 2)}–{fmt(t1, 2)} s</small> : null}</> : <span className="muted">Whole record</span>}</td>
                      <td className="wrap">{a.explanation || '—'}</td>
                      <td className="wrap small">{Object.entries(a.features || {}).map(([k, v]) => `${k}: ${fmt(v, 3)}`).join(' · ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Scroll>
        ) : (
          <Empty title="No artifact events returned">The detector reported nothing for this dataset. This does not show that the measurement is reliable or that values are normal.</Empty>
        )}
      </Panel>

      <div className="grid-2">
        <Panel title="Extracted features" sub="Raw feature values returned by the backend.">
          <Scroll label="Extracted features">
            <table className="data">
              <thead><tr><th>Feature</th><th className="num">Value</th></tr></thead>
              <tbody>
                {Object.keys(FEATURES).filter(k => (feats.available || []).includes(k) || unavailable.includes(k) || k in fv).map(k => {
                  const f = FEATURES[k];
                  const has = k in fv;
                  return (
                    <tr key={k}>
                      <td>{f.label}<small className="block muted">{f.note}</small></td>
                      <td className="num">{has ? featureValue(f.kind, fv[k]) : <span className="missing">not computed</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Scroll>
        </Panel>

        <Panel title="Data quality & completeness" sub="Backend summary plus browser-side checks on the loaded rows.">
          <div className="stat-grid two">
            <Stat label="Pulse completeness" value={pct(dq.completeness)} foot="Backend · from pulse_bpm" />
            <Stat label="Sampling regularity" value={pct(dq.sampling_regularity)} foot="Backend · 100% = uniform" />
            <Stat label="Artifact events" value={dq.artifact_count ?? arts.length} foot="Backend" />
            <Stat label="Samples" value={(analysis.sample_count ?? 0).toLocaleString()} foot={summary.span !== null ? `Span ${fmt(summary.span, 2)} s (browser)` : 'No timestamps'} />
          </div>
          {ppgCol && (
            <Callout tone={ppgCol.missing ? 'warn' : 'info'} title="PPG waveform completeness (browser check)">
              {ppgCol.missing
                ? `${ppgCol.missing.toLocaleString()} of ${summary.count.toLocaleString()} PPG samples (${pct(ppgCol.missing / summary.count)}) are missing. The backend’s completeness and dropout figures are computed from pulse_bpm only, so they may not reflect missing PPG samples.`
                : 'No missing PPG samples.'}
            </Callout>
          )}
          {missingTs && <Callout tone="warn" title="No timestamps">The backend assumed uniform 100 Hz sampling, so sampling regularity is not informative.</Callout>}
          <h3>Dataset provenance</h3>
          <KV rows={[
            ['Origin', source === 'upload' ? 'Uploaded CSV' : 'Synthetic (backend simulator)'],
            ['Scenario', metadata?.scenario_name ? `${metadata.scenario_name}` : null],
            ['File', metadata?.filename],
            ['Generation method', metadata?.generation_method],
            ['Seed', metadata && 'seed' in metadata ? (metadata.seed ?? 'none') : null],
            ['Nominal rate', metadata?.sample_rate ? `${metadata.sample_rate} Hz` : null],
          ]} />
        </Panel>
      </div>

      <Panel title="Dataset column summary">
        <DatasetSummary data={data} />
        <div className="btn-row stack-sm">
          <button className="btn btn-secondary" onClick={() => downloadText('vitalguard-analyzed-data.csv', toCsv(data), 'text/csv')}><Icon name="download" size={14} /> Download analyzed samples (CSV)</button>
          <button className="btn btn-secondary" onClick={runAnalysis} disabled={analyzing}>Re-run analysis</button>
        </div>
      </Panel>

      <details className="raw">
        <summary>Raw analysis response (JSON)</summary>
        <pre>{JSON.stringify(analysis, null, 2)}</pre>
      </details>
    </div>
  );
}
