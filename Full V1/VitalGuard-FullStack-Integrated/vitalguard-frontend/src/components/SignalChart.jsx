import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSeries, extent, niceTicks, toSegments, artifactBands, nearestIndex } from '../lib/signal';
import { SIGNALS, ARTIFACT_LABELS } from '../lib/meta';
import { fmt, isNum, sourceInfo } from '../lib/format';

const PAD = { l: 54, r: 14, t: 12, b: 30 };

export default function SignalChart({ data, metric, artifacts = [], source, height = 280 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  const sig = SIGNALS.find(s => s.key === metric) || { key: metric, label: metric, unit: '', digits: 2 };
  const series = useMemo(() => buildSeries(data, metric), [data, metric]);
  const bands = useMemo(() => artifactBands(artifacts, series.xs), [artifacts, series]);
  const wholeRecord = (artifacts || []).filter(a => !(Number.isInteger(a?.start_index) && Number.isInteger(a?.end_index))).length;
  const xe = useMemo(() => extent(series.xs), [series]);
  const ye = useMemo(() => extent(series.ys), [series]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (!xe || !ye || width < 10) return null;
    let { min, max } = ye;
    if (min === max) { const p = Math.abs(min) * 0.05 || 1; min -= p; max += p; } else { const m = (max - min) * 0.08; min -= m; max += m; }
    return { x0: xe.min, x1: xe.max === xe.min ? xe.min + 1 : xe.max, y0: min, y1: max, cw: width - PAD.l - PAD.r, ch: height - PAD.t - PAD.b };
  }, [xe, ye, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 10) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!geometry) return;

    const css = getComputedStyle(document.documentElement);
    const c = n => css.getPropertyValue(n).trim() || '#000';
    const { x0, x1, y0, y1, cw, ch } = geometry;
    const px = x => PAD.l + ((x - x0) / (x1 - x0)) * cw;
    const py = y => PAD.t + ((y1 - y) / (y1 - y0)) * ch;

    // artifact bands
    const sevColor = { high: c('--bad'), moderate: c('--warn'), low: c('--accent') };
    for (const b of bands) {
      const bx = px(b.x0);
      const bw = Math.max(2, px(b.x1) - bx);
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = sevColor[b.severity] || c('--muted');
      ctx.fillRect(bx, PAD.t, bw, ch);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(bx, PAD.t + ch - 3, bw, 3);
      ctx.globalAlpha = 1;
    }

    // grid + y ticks
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.lineWidth = 1;
    ctx.fillStyle = c('--muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const t of niceTicks(y0, y1, 5)) {
      const y = Math.round(py(t)) + 0.5;
      ctx.strokeStyle = c('--line');
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cw, y); ctx.stroke();
      ctx.fillText(Number(t.toFixed(4)).toString(), PAD.l - 8, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of niceTicks(x0, x1, Math.max(3, Math.floor(cw / 110)))) {
      const x = Math.round(px(t)) + 0.5;
      ctx.strokeStyle = c('--line');
      ctx.beginPath(); ctx.moveTo(x, PAD.t + ch); ctx.lineTo(x, PAD.t + ch + 4); ctx.stroke();
      ctx.fillText(Number(t.toFixed(3)).toString(), x, PAD.t + ch + 8);
    }
    ctx.strokeStyle = c('--line-strong');
    ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t + ch + 0.5); ctx.lineTo(PAD.l + cw, PAD.t + ch + 0.5); ctx.stroke();

    // series (missing values break the line)
    const segs = toSegments(series.xs, series.ys, x0, x1, Math.max(1, Math.floor(cw)));
    ctx.strokeStyle = c('--accent-strong');
    ctx.fillStyle = c('--accent-strong');
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    for (const s of segs) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(px(s[0][0]), py(s[0][1]), 1.5, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
      ctx.stroke();
    }
  }, [series, bands, geometry, width, height]);

  const onMove = e => {
    if (!geometry) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < PAD.l || x > PAD.l + geometry.cw) { setHover(null); return; }
    const dx = geometry.x0 + ((x - PAD.l) / geometry.cw) * (geometry.x1 - geometry.x0);
    const i = nearestIndex(series.xs, dx);
    setHover({ i, left: PAD.l + ((series.xs[i] - geometry.x0) / (geometry.x1 - geometry.x0)) * geometry.cw });
  };

  const hv = hover && series.xs[hover.i] !== undefined ? hover : null;
  const hvVal = hv ? series.ys[hv.i] : null;
  const hvBand = hv ? bands.filter(b => hv.i >= b.start && hv.i <= b.end).map(b => ARTIFACT_LABELS[b.type] || b.type) : [];
  const xLabel = series.hasTimestamps ? 'Time (s)' : 'Sample index';
  const hasPoints = series.valid > 0;
  const summary = hasPoints
    ? `${sig.label} over ${series.n.toLocaleString()} samples, range ${fmt(ye.min, 2)} to ${fmt(ye.max, 2)} ${sig.unit}. ${series.missing} missing samples shown as gaps. ${bands.length} artifact intervals shaded.`
    : `${sig.label}: no valid samples to plot.`;

  return (
    <figure className="chart">
      <figcaption className="chart-meta">
        <span className="chart-key"><i className="key-line" />{sig.label}<span className="muted"> · {sig.unit}{sig.unitNote ? ` (${sig.unitNote})` : ''}</span></span>
        {source ? <span className="muted">{sourceInfo(source).label}</span> : null}
      </figcaption>
      <div className="chart-wrap" ref={wrapRef} style={{ height }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={summary}
          style={{ width: '100%', height }}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
        {!hasPoints && (
          <div className="chart-empty">
            <strong>No valid samples for {sig.label}</strong>
            <span>{series.n ? `${series.missing.toLocaleString()} of ${series.n.toLocaleString()} samples are missing or non-numeric.` : 'Load a dataset to plot it here.'}</span>
          </div>
        )}
        {hv && geometry && (
          <>
            <div className="crosshair" style={{ left: hv.left, top: PAD.t, height: geometry.ch }} />
            <div className="readout" style={{ left: Math.min(hv.left + 10, Math.max(0, width - 190)), top: PAD.t + 4 }}>
              <div><b>{isNum(hvVal) ? `${fmt(hvVal, Math.max(sig.digits, 2))} ${sig.unit}` : 'Missing sample'}</b></div>
              <div>{xLabel}: {fmt(series.xs[hv.i], 3)}</div>
              <div>Sample #{hv.i}</div>
              {hvBand.length ? <div className="readout-art">{[...new Set(hvBand)].join(', ')}</div> : null}
            </div>
          </>
        )}
      </div>
      <div className="chart-foot">
        <span>{xLabel} · {sig.label} ({sig.unit})</span>
        <span>
          {series.n.toLocaleString()} samples
          {series.missing ? ` · ${series.missing.toLocaleString()} missing (shown as gaps)` : ''}
        </span>
      </div>
      {(bands.length > 0 || wholeRecord > 0) && (
        <div className="chart-legend" aria-label="Artifact legend">
          <span className="lg lg-high">High</span><span className="lg lg-moderate">Moderate</span><span className="lg lg-low">Low</span>
          <span className="muted">
            Shaded intervals are backend-reported artifact events with sample ranges ({bands.length})
            {wholeRecord ? `; ${wholeRecord} whole-record finding${wholeRecord > 1 ? 's' : ''} listed in the table, not drawn` : ''}.
          </span>
        </div>
      )}
    </figure>
  );
}
