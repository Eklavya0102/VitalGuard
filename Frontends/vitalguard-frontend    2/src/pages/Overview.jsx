import { Link } from 'react-router-dom';
import { Activity, Clock, Droplets, Gauge, HeartPulse, Info, Plus, TriangleAlert, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import SignalMonitor from '../components/SignalMonitor';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { fmt, qualityClass, sourceName, titleCase, toPercent } from '../utils/format';
import { meanField } from '../utils/series';

function Readout({ icon: Icon, label, value, unit, children }) {
  return (
    <div className="readout">
      <div className="readout-label"><Icon size={16} aria-hidden="true" />{label}</div>
      <div className="readout-value">
        <span>{value}</span>
        {unit && <small>{unit}</small>}
      </div>
      <div className="readout-foot">{children}</div>
    </div>
  );
}

export default function Overview() {
  const { health, connection, lastUpdated, data, source, analysis: a, activity, noticeVisible, dismissNotice } = useApp();
  const pulse = meanField(data, 'pulse_bpm');
  const spo2 = meanField(data, 'spo2_percent');
  const artifacts = a?.artifacts || [];
  const p = a?.physiological || {};
  const warnings = [...(p.warnings || []), ...(p.data_integrity_issues || [])];

  const updated = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : connection === 'offline' ? 'Backend unavailable' : health ? 'Backend connected' : 'Checking backend…';

  return (
    <>
      <PageHeader
        title="Monitoring overview"
        description="Review signal quality, artifact detection and measurement integrity."
        actions={<Link className="btn btn-primary" to="/simulation"><Plus size={16} aria-hidden="true" />New simulation</Link>}
      />

      {noticeVisible && (
        <div className="notice" role="note">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Simulation environment</strong>
            <span>Results are generated from synthetic or imported datasets. This prototype is not a clinical diagnostic device.</span>
          </div>
          <button className="icon-btn icon-btn-plain" aria-label="Dismiss notice" onClick={dismissNotice}><X size={16} /></button>
        </div>
      )}

      <section className="block" aria-labelledby="sys-h">
        <div className="block-head">
          <div><h2 id="sys-h">System overview</h2><p>Current backend and analysis state</p></div>
          <span className="muted-label">{updated}</span>
        </div>
        <div className="readouts">
          <Readout icon={HeartPulse} label="Pulse rate" value={pulse === null ? '—' : fmt(pulse, 0)} unit="bpm">
            {pulse === null ? 'No pulse data available' : 'Mean of available sample values'}
          </Readout>
          <Readout icon={Droplets} label="SpO₂" value={spo2 === null ? '—' : fmt(spo2, 1)} unit="%">
            {spo2 === null ? 'No SpO₂ data available' : 'Mean of available sample values'}
          </Readout>
          <Readout icon={Gauge} label="Signal quality" value={a ? fmt(a.quality_score?.overall, 1) : '—'} unit="/ 100">
            <Badge tone={a ? qualityClass(a.quality_score?.category) : 'neutral'}>
              {a ? a.quality_score?.label || titleCase(a.quality_score?.category) : 'Awaiting analysis'}
            </Badge>
          </Readout>
          <Readout icon={TriangleAlert} label="Artifact events" value={a ? String(artifacts.length) : '—'}>
            {a ? (artifacts.length ? 'Requires review of detected events' : 'No artifacts detected by this analysis') : 'Detected by analysis engine'}
          </Readout>
        </div>
      </section>

      <section className="block" aria-labelledby="sig-h">
        <div className="block-head">
          <div>
            <h2 id="sig-h">Signal inspection</h2>
            <p>{data.length ? `${data.length.toLocaleString()} samples · ${sourceName(source)}` : 'Run a simulation or import a dataset to inspect signals.'}</p>
          </div>
          <Link className="btn btn-secondary btn-sm" to="/analysis">View analysis</Link>
        </div>
        <SignalMonitor />
      </section>

      <section className="split block">
        <article className="panel" aria-labelledby="rel-h">
          <div className="panel-head">
            <div><h2 id="rel-h">Reliability assessment</h2><p>Most recent analysis result</p></div>
            <Badge tone={a ? (p.clinical_ranges_configured ? 'good' : 'warn') : 'neutral'}>
              {a ? (p.clinical_ranges_configured ? 'Validation returned' : 'Clinical ranges not configured') : 'Not assessed'}
            </Badge>
          </div>
          {!a ? (
            <EmptyState icon={Activity} title="Analysis required" compact>
              Run the analysis engine to review signal quality and physiological validation separately.
            </EmptyState>
          ) : (
            <>
              <dl className="facts">
                <div><dt>Pulse validation</dt><dd>{titleCase(p.pulse_status)}</dd></div>
                <div><dt>SpO₂ validation</dt><dd>{titleCase(p.spo2_status)}</dd></div>
                <div><dt>Data completeness</dt><dd>{fmt(toPercent(a.data_quality?.completeness ?? 0), 1)}%</dd></div>
                <div><dt>Sampling regularity</dt><dd>{fmt(toPercent(a.data_quality?.sampling_regularity ?? 0), 1)}%</dd></div>
              </dl>
              <div className="notes">
                <b>Review notes</b>
                {warnings.length ? (
                  <ul>{warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul>
                ) : (
                  <p>No additional warnings were returned. This does not establish clinical normality.</p>
                )}
                {!p.clinical_ranges_configured && (
                  <p><b>Important:</b> Age-specific clinical ranges are not configured in this prototype.</p>
                )}
              </div>
            </>
          )}
        </article>

        <article className="panel" aria-labelledby="act-h">
          <div className="panel-head">
            <div><h2 id="act-h">Latest activity</h2><p>This browser session only</p></div>
            <Link className="link-btn" to="/reports">Reports</Link>
          </div>
          {!activity.length ? (
            <EmptyState icon={Clock} title="No analyses yet" compact>
              Completed runs will appear here while this page remains open.
            </EmptyState>
          ) : (
            <ul className="activity">
              {activity.slice(0, 4).map((x, i) => (
                <li key={i}>
                  <div><strong>{x.title}</strong><small>{x.source} · {x.time}</small></div>
                  <span className="score">{Number.isFinite(x.score) ? `${fmt(x.score, 0)}/100` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
