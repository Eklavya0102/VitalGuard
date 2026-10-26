import { Link } from 'react-router-dom';
import { Activity, Download, FileText, FlaskConical, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import SignalMonitor from '../components/SignalMonitor';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Table from '../components/Table';
import { fmt, qualityClass, sourceName, titleCase, toPercent } from '../utils/format';
import { downloadDataCsv } from '../utils/download';

export default function Analysis() {
  const { analysis: a, data } = useApp();
  const toast = useToast();

  if (!a) {
    return (
      <>
        <PageHeader title="Signal analysis" description="Inspect quality scoring, artifact events and physiological plausibility." />
        <div className="panel">
          <EmptyState
            icon={Activity}
            title="No analysis available"
            actions={
              <>
                <Link className="btn btn-primary" to="/simulation"><FlaskConical size={16} aria-hidden="true" />Open simulation lab</Link>
                <Link className="btn btn-secondary" to="/import"><Upload size={16} aria-hidden="true" />Import CSV</Link>
              </>
            }
          >
            Run a simulation or import CSV data, then analyze the samples to populate this workspace.
          </EmptyState>
        </div>
      </>
    );
  }

  const q = a.quality_score || {};
  const p = a.physiological || {};
  const components = q.components || {};
  const arts = a.artifacts || [];
  const warnings = [...(p.warnings || []), ...(p.data_integrity_issues || [])];

  return (
    <>
      <PageHeader
        title="Signal analysis"
        description={`${a.sample_count?.toLocaleString() || 0} samples · ${sourceName(a.data_source)} · ${new Date(a.timestamp).toLocaleString()}`}
        actions={<Link className="btn btn-secondary" to="/reports"><FileText size={16} aria-hidden="true" />Export report</Link>}
      />

      <section className="block" aria-labelledby="an-sig">
        <div className="block-head"><div><h2 id="an-sig">Analyzed signal</h2><p>Review the sample series used for this analysis.</p></div></div>
        <SignalMonitor />
      </section>

      <section className="split block">
        <article className="panel" aria-labelledby="an-q">
          <div className="panel-head">
            <div><h2 id="an-q">Overall signal quality</h2><p>Scored by the backend quality engine</p></div>
            <Badge tone={qualityClass(q.category)}>{q.label || titleCase(q.category)}</Badge>
          </div>
          <div className="score-line">
            <span className="score-big">{fmt(q.overall, 1)}</span><span className="score-of">/ 100</span>
          </div>
          <p className="lede">{(q.explanations || []).join(' ') || 'Score returned by the backend quality analysis engine.'}</p>
          <h3>Quality components</h3>
          <div className="bars">
            {Object.entries(components).map(([k, v]) => {
              let n = Number(v);
              if (n >= 0 && n <= 1) n *= 100;
              n = Math.max(0, Math.min(100, n || 0));
              return (
                <div key={k}>
                  <div className="bar-top"><span>{titleCase(k)}</span><b>{fmt(n, 1)}%</b></div>
                  <div className="bar-track" role="progressbar" aria-label={titleCase(k)} aria-valuenow={Math.round(n)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="bar-fill" style={{ width: `${n}%` }} />
                  </div>
                </div>
              );
            })}
            {!Object.keys(components).length && <p className="muted">No component breakdown returned.</p>}
          </div>
        </article>

        <article className="panel" aria-labelledby="an-p">
          <div className="panel-head"><div><h2 id="an-p">Physiological plausibility</h2><p>Evaluated separately from signal quality</p></div></div>
          <dl className="facts">
            <div><dt>Pulse status</dt><dd>{titleCase(p.pulse_status)}</dd></div>
            <div><dt>SpO₂ status</dt><dd>{titleCase(p.spo2_status)}</dd></div>
          </dl>
          <div className="callout">
            {p.clinical_ranges_configured
              ? 'The backend reports configured ranges. Confirm their applicability before clinical use.'
              : 'Age-specific clinical ranges are not configured. Physiological validation should be treated as provisional.'}
          </div>
          <h3>Data integrity</h3>
          <dl className="facts">
            <div><dt>Completeness</dt><dd>{fmt(toPercent(a.data_quality?.completeness), 1)}%</dd></div>
            <div><dt>Sampling regularity</dt><dd>{fmt(toPercent(a.data_quality?.sampling_regularity), 1)}%</dd></div>
            <div><dt>Sample count</dt><dd>{(a.sample_count || 0).toLocaleString()}</dd></div>
            <div><dt>Artifact count</dt><dd>{arts.length}</dd></div>
          </dl>
        </article>
      </section>

      <section className="block" aria-labelledby="an-art">
        <div className="block-head"><div><h2 id="an-art">Detected artifacts</h2><p>{arts.length} event(s) returned by the analysis engine</p></div></div>
        {arts.length ? (
          <Table label="Detected artifacts">
            <thead><tr><th>Artifact</th><th>Severity</th><th>Confidence</th><th>Sample range</th><th>Explanation</th></tr></thead>
            <tbody>
              {arts.map((e, i) => (
                <tr key={i}>
                  <td>{titleCase(e.type)}</td>
                  <td><span className={`severity ${String(e.severity).toLowerCase()}`}>{e.severity}</span></td>
                  <td>{e.confidence || '—'}</td>
                  <td className="num">{e.start_index ?? '—'} – {e.end_index ?? '—'}</td>
                  <td className="wrap">{e.explanation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="panel">
            <EmptyState title="No artifacts returned" compact>
              No artifact events were reported for this dataset. This alone does not prove the measurement is clinically reliable.
            </EmptyState>
          </div>
        )}
      </section>

      {warnings.length > 0 && (
        <div className="callout block"><b>Review notes</b><ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
      )}

      <div className="actions-row">
        <Link className="btn btn-primary" to="/reports">Generate report</Link>
        <button className="btn btn-secondary" onClick={() => !downloadDataCsv(data, 'vitalguard-analysis-data.csv') && toast('No data available to export.', 'error')}>
          <Download size={16} aria-hidden="true" />Download current data as CSV
        </button>
      </div>
    </>
  );
}
