import { useEffect, useRef } from 'react';

export default function AnalysisPage({ analysis, data, source, setPage, chartMetric, setChartMetric }) {
  const canvasRef = useRef(null);

  const fmt = (v, digits = 1) => Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '—';
  const titleCase = s => String(s || 'unknown').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const sourceName = src => ({ python: 'Python simulation', matlab: 'MATLAB / Simulink', upload: 'CSV upload' })[src] || titleCase(src || 'No data source');
  
  const metricNames = { ppg_value: 'PPG waveform', pulse_bpm: 'Pulse rate', spo2_percent: 'SpO₂', motion: 'Motion', contact: 'Sensor contact' };
  const metricUnits = { ppg_value: 'amplitude', pulse_bpm: 'bpm', spo2_percent: '%', motion: 'relative scale', contact: 'relative scale' };

  const qualityClass = (category = '') => {
    const c = String(category).toLowerCase();
    if (c.includes('high') || c.includes('good')) return 'good';
    if (c.includes('moderate') || c.includes('medium') || c.includes('fair')) return 'warn';
    if (c.includes('low') || c.includes('poor')) return 'bad';
    return 'neutral';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;
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
  }, [data, chartMetric, analysis]);

  const downloadRawCsv = () => {
    if (!data?.length) return;
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
    a.download = 'vitalguard-analysis-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!analysis) {
    return (
      <div className="workspace-page">
        <section className="page-heading">
          <div>
            <div className="eyebrow">VITALGUARD WORKSPACE</div>
            <h1>Signal analysis</h1>
            <p>Inspect quality scoring, artifact events and physiological plausibility.</p>
          </div>
        </section>
        <div className="result-panel">
          <div className="result-placeholder">
            <span className="empty-icon" style={{ fontSize: '25px' }}>⌁</span>
            <strong>No analysis available</strong>
            <p>Run a simulation or import CSV data, then analyze the samples to populate this workspace.</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
              <button className="button button-primary" onClick={() => setPage('simulation')}>Open simulation lab</button>
              <button className="button button-secondary" onClick={() => setPage('import')}>Import CSV</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = analysis.quality_score || {};
  const p = analysis.physiological || {};
  const components = q.components || {};
  const arts = analysis.artifacts || [];
  const warnings = [...(p.warnings || []), ...(p.data_integrity_issues || [])];

  return (
    <div className="workspace-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">VITALGUARD WORKSPACE</div>
          <h1>Signal analysis</h1>
          <p>{analysis.sample_count?.toLocaleString() || 0} samples · {sourceName(analysis.data_source || source)} · {new Date(analysis.timestamp || Date.now()).toLocaleString()}</p>
        </div>
        <button className="button button-secondary" onClick={() => setPage('reports')}>Export report ↗</button>
      </section>

      <div className="chart-card" style={{ marginBottom: '20px' }}>
        <div className="section-heading" style={{ marginBottom: '8px' }}>
          <div>
            <h2>Analyzed signal</h2>
            <p>Review the sample series used for this analysis.</p>
          </div>
          <select value={chartMetric} onChange={e => setChartMetric(e.target.value)} aria-label="Signal to display">
            <option value="ppg_value">PPG waveform</option>
            <option value="pulse_bpm">Pulse rate</option>
            <option value="spo2_percent">SpO₂</option>
            <option value="motion">Motion</option>
            <option value="contact">Sensor contact</option>
          </select>
        </div>
        <div className="chart-legend">
          <span><i className="legend-line"></i><b>{metricNames[chartMetric] || chartMetric}</b></span>
          <span className="chart-source">{sourceName(source)}</span>
        </div>
        <div className="chart-wrap">
          <canvas ref={canvasRef} aria-label="Analyzed signal time series" />
        </div>
        <div className="chart-axis-footer">
          <span>TIME (SECONDS) · {metricUnits[chartMetric] || 'value'}</span>
          <span>{data.length.toLocaleString()} samples</span>
        </div>
      </div>

      <div className="result-panel">
        <div className="result-head">
          <div>
            <h2>Signal reliability assessment</h2>
            <p>Quality scoring and physiological plausibility are evaluated separately.</p>
          </div>
          <span className={`status-chip ${qualityClass(q.category)}`}>{q.label || titleCase(q.category)}</span>
        </div>

        <div className="quality-hero">
          <div className="quality-number">{fmt(q.overall, 1)}<small> / 100</small></div>
          <div className="quality-copy">
            <strong>Overall signal quality</strong>
            <p>{(q.explanations || []).join(' ') || 'Score returned by the backend quality analysis engine.'}</p>
          </div>
        </div>

        <div className="lower-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <h2>Quality components</h2>
            <div className="bar-list">
              {Object.entries(components).length ? Object.entries(components).map(([k, v]) => {
                let n = Number(v);
                if (n >= 0 && n <= 1) n *= 100;
                n = Math.max(0, Math.min(100, n || 0));
                return (
                  <div key={k}>
                    <div className="bar-item-top">
                      <span>{titleCase(k)}</span>
                      <b>{fmt(n, 1)}%</b>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${n}%` }}></div>
                    </div>
                  </div>
                );
              }) : <p className="panel-description">No component breakdown returned.</p>}
            </div>
          </div>

          <div>
            <h2>Physiological plausibility</h2>
            <div className="assessment-grid" style={{ marginTop: '12px' }}>
              <div className="assessment-item"><span>Pulse status</span><strong>{titleCase(p.pulse_status)}</strong></div>
              <div className="assessment-item"><span>SpO₂ status</span><strong>{titleCase(p.spo2_status)}</strong></div>
            </div>
            <div className="callout">
              {p.clinical_ranges_configured ? 'The backend reports configured ranges. Confirm their applicability before clinical use.' : 'Age-specific clinical ranges are not configured. Physiological validation should be treated as provisional.'}
            </div>
          </div>
        </div>

        <div className="section-heading" style={{ marginTop: '28px' }}>
          <div>
            <h2>Detected artifacts</h2>
            <p>{arts.length} event(s) returned by the analysis engine</p>
          </div>
        </div>

        {arts.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Artifact</th><th>Severity</th><th>Confidence</th><th>Sample range</th><th>Explanation</th></tr>
              </thead>
              <tbody>
                {arts.map((e, i) => (
                  <tr key={i}>
                    <td>{titleCase(e.type)}</td>
                    <td><span className={`severity ${String(e.severity).toLowerCase()}`}>{e.severity}</span></td>
                    <td>{e.confidence || '—'}</td>
                    <td>{e.start_index ?? '—'} – {e.end_index ?? '—'}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: '200px' }}>{e.explanation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state compact">
            <strong>No artifacts returned</strong>
            <p>No artifact events were reported for this dataset. This alone does not prove the measurement is clinically reliable.</p>
          </div>
        )}

        <div className="section-heading" style={{ marginTop: '28px' }}>
          <div>
            <h2>Data integrity</h2>
            <p>Completeness and sampling characteristics</p>
          </div>
        </div>

        <div className="assessment-grid">
          <div className="assessment-item"><span>Completeness</span><strong>{fmt(Number(analysis.data_quality?.completeness) > 1 ? analysis.data_quality.completeness : (analysis.data_quality?.completeness ?? 0) * 100, 1)}%</strong></div>
          <div className="assessment-item"><span>Sampling regularity</span><strong>{fmt(Number(analysis.data_quality?.sampling_regularity) > 1 ? analysis.data_quality.sampling_regularity : (analysis.data_quality?.sampling_regularity ?? 0) * 100, 1)}%</strong></div>
          <div className="assessment-item"><span>Sample count</span><strong>{(analysis.sample_count || 0).toLocaleString()}</strong></div>
          <div className="assessment-item"><span>Artifact count</span><strong>{arts.length}</strong></div>
        </div>

        {warnings.length ? (
          <div className="callout">
            <b>Review notes</b>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        ) : null}

        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="button button-primary" onClick={() => setPage('reports')}>Generate report</button>
          <button className="button button-secondary" onClick={downloadRawCsv}>Download current data as CSV</button>
        </div>
      </div>
    </div>
  );
}