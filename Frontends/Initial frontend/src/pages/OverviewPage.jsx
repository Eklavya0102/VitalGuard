import { useEffect, useRef } from 'react';

const metricNames = {
  ppg_value: 'PPG waveform',
  pulse_bpm: 'Pulse rate',
  spo2_percent: 'SpO₂',
  motion: 'Motion intensity',
  contact: 'Sensor contact'
};

const metricUnits = {
  ppg_value: 'amplitude',
  pulse_bpm: 'bpm',
  spo2_percent: '%',
  motion: 'relative scale',
  contact: 'relative scale'
};

export default function OverviewPage({
  health,
  data,
  source,
  analysis,
  notice,
  setNotice,
  setPage,
  chartMetric,
  setChartMetric,
  activity,
  lastUpdated
}) {
  const canvasRef = useRef(null);

  const fmt = (v, digits = 1) => (Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '—');
  const titleCase = s => String(s || 'unknown').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const sourceName = src => ({ python: 'Python simulation', matlab: 'MATLAB / Simulink', upload: 'CSV upload' })[src] || titleCase(src || 'No data source');

  const meanField = key => {
    const vals = (data || []).map(d => d[key]).filter(v => v !== null && v !== undefined && Number.isFinite(Number(v))).map(Number);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const pulse = meanField('pulse_bpm');
  const spo2 = meanField('spo2_percent');
  const quality = analysis?.quality_score;
  const artifacts = analysis?.artifacts || [];

  const qualityClass = (category = '') => {
    const c = String(category).toLowerCase();
    if (c.includes('high') || c.includes('good')) return 'good';
    if (c.includes('moderate') || c.includes('medium') || c.includes('fair')) return 'warn';
    if (c.includes('low') || c.includes('poor')) return 'bad';
    return 'neutral';
  };

  // Draw Signal Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 2) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const points = (data || []).map((d, i) => ({
      x: Number.isFinite(Number(d.timestamp)) ? Number(d.timestamp) : i,
      y: d[chartMetric] === null || d[chartMetric] === undefined ? null : Number(d[chartMetric])
    })).filter(p => Number.isFinite(p.x) && p.y !== null);

    if (!points.length) return;

    const pad = { l: 44, r: 12, t: 14, b: 27 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;
    let min = Math.min(...points.map(p => p.y));
    let max = Math.max(...points.map(p => p.y));
    if (min === max) { min -= 1; max += 1; }
    const margin = (max - min) * 0.12;
    min -= margin;
    max += margin;

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const rangeX = maxX - minX || 1;

    ctx.font = '10px DM Sans, sans-serif';
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 5; i++) {
      const y = pad.t + (ch * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      const val = max - ((max - min) * i) / 4;
      ctx.fillText(fmt(val, metricUnits[chartMetric] === '%' ? 1 : 0), pad.l - 9, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < 5; i++) {
      const x = pad.l + (cw * i) / 4;
      ctx.fillText(fmt(minX + (rangeX * i) / 4, 1), x, H - pad.b + 8);
    }

    ctx.strokeStyle = '#0f52ba';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let started = false;
    const stride = Math.max(1, Math.ceil(points.length / 5000));
    for (let i = 0; i < points.length; i += stride) {
      const p = points[i];
      const x = pad.l + ((p.x - minX) / rangeX) * cw;
      const y = pad.t + ((max - p.y) / (max - min)) * ch;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [data, chartMetric]);

  return (
    <div className="workspace-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">PEDIATRIC SIGNAL RELIABILITY</div>
          <h1>Monitoring overview</h1>
          <p>Review signal quality, artifact detection and measurement integrity.</p>
        </div>
        <button className="button button-primary" onClick={() => setPage('simulation')}>
          <span>＋</span> New simulation
        </button>
      </section>

      {notice && (
        <div className="notice-bar">
          <span className="notice-icon">ⓘ</span>
          <div>
            <strong>Simulation environment</strong>
            <span>Results are generated from synthetic or imported datasets. This prototype is not a clinical diagnostic device.</span>
          </div>
          <button className="notice-close" onClick={() => setNotice(false)} aria-label="Dismiss notice">×</button>
        </div>
      )}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>System overview</h2>
            <p>Current backend and analysis state</p>
          </div>
          <span className="updated-label">{lastUpdated}</span>
        </div>

        <div className="metric-grid four">
          <article className="metric-card">
            <div className="metric-top"><span>Pulse rate</span><span className="metric-symbol blue">⌁</span></div>
            <div className="metric-value"><span>{pulse === null ? '—' : fmt(pulse, 0)}</span><small>bpm</small></div>
            <div className="metric-foot">{pulse === null ? 'No analysis loaded' : 'Mean of available sample values'}</div>
          </article>

          <article className="metric-card">
            <div className="metric-top"><span>SpO₂</span><span className="metric-symbol green">◉</span></div>
            <div className="metric-value"><span>{spo2 === null ? '—' : fmt(spo2, 1)}</span><small>%</small></div>
            <div className="metric-foot">{spo2 === null ? 'No analysis loaded' : 'Mean of available sample values'}</div>
          </article>

          <article className="metric-card">
            <div className="metric-top"><span>Signal quality</span><span className="metric-symbol violet">◌</span></div>
            <div className="metric-value"><span>{quality ? fmt(quality.overall, 1) : '—'}</span><small>/ 100</small></div>
            <div className="metric-foot">
              <span className={`status-chip ${quality ? qualityClass(quality.category) : 'neutral'}`}>
                {quality ? (quality.label || titleCase(quality.category)) : 'Awaiting analysis'}
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top"><span>Artifact events</span><span className="metric-symbol amber">⌁</span></div>
            <div className="metric-value"><span>{analysis ? artifacts.length : '—'}</span></div>
            <div className="metric-foot">{analysis ? (artifacts.length ? 'Requires review of detected events' : 'No artifacts detected') : 'Detected by analysis engine'}</div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Signal inspection</h2>
            <p>{data.length ? `${data.length.toLocaleString()} samples · ${sourceName(source)}` : 'Run a simulation or import a dataset to inspect signals.'}</p>
          </div>
          <div className="chart-controls">
            <select value={chartMetric} onChange={e => setChartMetric(e.target.value)} aria-label="Signal to display">
              <option value="ppg_value">PPG waveform</option>
              <option value="pulse_bpm">Pulse rate</option>
              <option value="spo2_percent">SpO₂</option>
              <option value="motion">Motion</option>
              <option value="contact">Sensor contact</option>
            </select>
            <button className="button button-secondary button-small" onClick={() => setPage('analysis')}>View analysis ↗</button>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-legend">
            <span><i className="legend-line"></i><b>{metricNames[chartMetric] || chartMetric}</b></span>
            <span className="chart-source">{data.length ? sourceName(source) : 'No dataset loaded'}</span>
          </div>
          <div className="chart-wrap">
            <canvas ref={canvasRef} aria-label="Signal time-series chart" />
            <div className={`chart-empty ${data.length ? 'hidden' : ''}`}>
              <div className="empty-wave">⌁</div>
              <strong>No signal data yet</strong>
              <span>Run a simulation or import a CSV to populate this chart.</span>
              <button className="button button-secondary button-small" onClick={() => setPage('simulation')}>Open simulation lab</button>
            </div>
          </div>
          <div className="chart-axis-footer">
            <span>TIME (SECONDS) · {metricUnits[chartMetric] || 'value'}</span>
            <span>{data.length.toLocaleString()} samples</span>
          </div>
        </div>
      </section>

      <section className="lower-grid section-block">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Reliability assessment</h2>
              <p>Most recent analysis result</p>
            </div>
            <span className={`status-chip ${analysis ? (analysis.physiological?.clinical_ranges_configured ? 'good' : 'warn') : 'neutral'}`}>
              {analysis ? (analysis.physiological?.clinical_ranges_configured ? 'Validation returned' : 'Clinical ranges not configured') : 'Not assessed'}
            </span>
          </div>

          {!analysis ? (
            <div className="empty-state compact">
              <span className="empty-icon">⌁</span>
              <strong>Analysis required</strong>
              <p>Run the analysis engine to review signal quality and physiological validation separately.</p>
            </div>
          ) : (
            <div>
              {(() => {
                const p = analysis.physiological || {};
                const warnings = [...(p.warnings || []), ...(p.data_integrity_issues || [])];
                return (
                  <div>
                    <div className="assessment-grid">
                      <div className="assessment-item"><span>Pulse validation</span><strong>{titleCase(p.pulse_status)}</strong></div>
                      <div className="assessment-item"><span>SpO₂ validation</span><strong>{titleCase(p.spo2_status)}</strong></div>
                      <div className="assessment-item"><span>Data completeness</span><strong>{fmt((p.completeness ?? 0) * 100, 1)}%</strong></div>
                      <div className="assessment-item"><span>Sampling regularity</span><strong>{fmt((p.sampling_regularity ?? 0) * 100, 1)}%</strong></div>
                    </div>
                    <div className="assessment-notes">
                      <b>Review notes</b>
                      {warnings.length ? <ul>{warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul> : <p>No additional warnings were returned.</p>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Latest activity</h2>
              <p>This browser session only</p>
            </div>
            <button className="text-button" onClick={() => setPage('reports')}>Reports ↗</button>
          </div>
          {!activity.length ? (
            <div className="empty-state compact">
              <span className="empty-icon">◷</span>
              <strong>No analyses yet</strong>
              <p>Completed runs will appear here while this page remains open.</p>
            </div>
          ) : (
            <div className="activity-list">
              {activity.slice(0, 4).map((x, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-mark">⌁</div>
                  <div className="activity-main">
                    <strong>{x.title}</strong>
                    <small>{x.source} · {x.time}</small>
                  </div>
                  <span className="activity-score">{x.score === null ? '—' : `${fmt(x.score, 0)}/100`}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <footer className="app-footer">
        <span>VitalGuard · MED-PS-010</span>
        <span>For research and demonstration only</span>
      </footer>
    </div>
  );
}