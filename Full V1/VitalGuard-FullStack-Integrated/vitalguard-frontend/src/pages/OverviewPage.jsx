import Icon from '../components/Icon';
import SignalChart from '../components/SignalChart';
import { Chip, Callout, PageHead, Panel, Empty, Provenance, Stat, Disclaimer } from '../components/ui';
import { fmt, titleCase, sourceInfo } from '../lib/format';
import { summarizeDataset } from '../lib/signal';
import { QUALITY_TONE, SIGNALS, statusInfo } from '../lib/meta';
import { useMemo } from 'react';

export default function OverviewPage({ health, healthError, scenarios, data, source, metadata, analysis, analyzing, runAnalysis, setPage, chartMetric, setChartMetric, activity, lastChecked }) {
  const summary = useMemo(() => summarizeDataset(data), [data]);
  const metrics = SIGNALS.filter(s => summary.columns.some(c => c.key === s.key && c.valid > 0));
  const metric = metrics.some(m => m.key === chartMetric) ? chartMetric : metrics[0]?.key;
  const q = analysis?.quality_score;
  const phys = analysis?.physiological;
  const arts = analysis?.artifacts || [];
  const hasData = data.length > 0;
  const info = sourceInfo(source);
  const scenarioCount = Object.keys(scenarios || {}).length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Pediatric signal reliability"
        title="Overview"
        lead="Review the state of the backend, the loaded dataset, and the most recent analysis."
        actions={<button className="btn btn-primary" onClick={() => setPage('simulation')}><Icon name="simulate" size={15} /> New simulation</button>}
      />

      <Disclaimer />

      <section aria-labelledby="ov-state" className="block">
        <div className="block-head"><h2 id="ov-state">Current state</h2><span className="muted small">{lastChecked ? `Backend checked ${lastChecked.toLocaleTimeString()}` : 'Checking backend…'}</span></div>
        <div className="stat-grid four">
          <Stat
            label="Backend"
            value={health ? 'Connected' : healthError ? 'Unreachable' : 'Checking'}
            foot={health ? `API v${health.version} · MATLAB ${health.matlab_available ? 'available' : 'not available'} · ${scenarioCount} scenarios` : healthError || '—'}
            tone={health ? undefined : 'bad'}
          />
          <Stat
            label="Loaded dataset"
            value={hasData ? data.length.toLocaleString() : '—'}
            unit={hasData ? 'samples' : undefined}
            foot={hasData ? `${info.label}${summary.span !== null ? ` · ${fmt(summary.span, 1)} s span` : ''}` : 'None loaded'}
          />
          <Stat
            label="Signal quality score"
            value={q ? fmt(q.overall, 1) : '—'}
            unit={q ? '/ 100' : undefined}
            foot={q ? <Chip tone={QUALITY_TONE[q.category] || 'neutral'}>{q.label}</Chip> : hasData ? 'Not yet analyzed' : 'Awaiting analysis'}
          />
          <Stat
            label="Artifact events"
            value={analysis ? arts.length : '—'}
            foot={analysis ? (arts.length ? 'Review in Signal analysis' : 'None reported (not proof of reliability)') : 'Awaiting analysis'}
          />
        </div>
      </section>

      <section aria-labelledby="ov-signal" className="block">
        <div className="block-head">
          <h2 id="ov-signal">Signal inspection</h2>
          {hasData && (
            <div className="btn-row tight">
              <select value={metric} onChange={e => setChartMetric(e.target.value)} aria-label="Signal to display">
                {metrics.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              {analysis
                ? <button className="btn btn-secondary btn-sm" onClick={() => setPage('analysis')}>Full analysis <Icon name="arrow" size={13} /></button>
                : <button className="btn btn-primary btn-sm" onClick={runAnalysis} disabled={analyzing}>{analyzing ? <><span className="spinner" /> Analyzing…</> : 'Analyze dataset'}</button>}
            </div>
          )}
        </div>
        <div className="panel">
          {hasData ? (
            <>
              <div className="prov-row"><Provenance source={source} metadata={metadata} /></div>
              <SignalChart data={data} metric={metric || 'pulse_bpm'} artifacts={analysis?.artifacts || []} source={source} height={260} />
            </>
          ) : (
            <Empty title="No signal data loaded" actions={<><button className="btn btn-primary" onClick={() => setPage('simulation')}>Open simulation lab</button><button className="btn btn-secondary" onClick={() => setPage('import')}>Import CSV</button></>}>
              Generate a synthetic dataset or import a CSV to inspect it here.
            </Empty>
          )}
        </div>
      </section>

      <div className="grid-2">
        <Panel title="Quality vs. plausibility" sub="Evaluated separately by the backend.">
          {!analysis ? <Empty title="Analysis required">Run the analysis to see both assessments.</Empty> : (
            <>
              <div className="split-assess">
                <div>
                  <span className="stat-label">Signal quality</span>
                  <Chip tone={QUALITY_TONE[q.category] || 'neutral'}>{q.label}</Chip>
                  <small className="muted">How reliable the signal appears.</small>
                </div>
                <div>
                  <span className="stat-label">Physiological plausibility</span>
                  <div className="chips-col">
                    <span><b>Pulse</b> <Chip tone={statusInfo(phys.pulse_status).tone}>{statusInfo(phys.pulse_status).label}</Chip></span>
                    <span><b>SpO₂</b> <Chip tone={statusInfo(phys.spo2_status).tone}>{statusInfo(phys.spo2_status).label}</Chip></span>
                  </div>
                  <small className="muted">Against configured, non-clinical ranges.</small>
                </div>
              </div>
              {!phys.clinical_ranges_configured && (
                <Callout tone="warn"><code>clinical_ranges_configured: false</code> — physiological checks are informational only.</Callout>
              )}
              <button className="text-btn" onClick={() => setPage('analysis')}>Open full analysis <Icon name="arrow" size={13} /></button>
            </>
          )}
        </Panel>

        <Panel title="Session history" sub="Analyses run in this browser tab; cleared on reload.">
          {!activity.length ? <Empty title="No analyses yet">Completed analyses will be listed here.</Empty> : (
            <ul className="history">
              {activity.slice(0, 6).map(a => (
                <li key={a.id}>
                  <span><strong>{a.title}</strong><span className="muted small block">{sourceInfo(a.source).label} · {(a.samples ?? 0).toLocaleString()} samples · {a.time}</span></span>
                  <span className="hist-score">{a.score === null ? '—' : fmt(a.score, 0)}<Chip tone={QUALITY_TONE[a.category] || 'neutral'}>{titleCase(a.category)}</Chip></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
