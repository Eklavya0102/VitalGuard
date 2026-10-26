import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { chartMetricOptions, fmt, metricNames, metricUnits, sourceName } from '../utils/format';
import { getSeries } from '../utils/series';

const PAD = { l: 52, r: 16, t: 16, b: 28 };
const COLORS = { grid: '#1f313b', label: '#8aa0ac', trace: '#4fe0b6' };

// Digits for axis labels scale with the visible range so small-valued signals stay readable.
function axisDigits(range, unit) {
  if (unit === '%') return 1;
  if (range < 5) return 2;
  if (range < 50) return 1;
  return 0;
}

export default function SignalMonitor() {
  const { data, source, chartMetric, setChartMetric } = useApp();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const geometry = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState(null);

  const points = useMemo(
    () => getSeries(data, chartMetric).filter((p) => p.y !== null && Number.isFinite(p.y)),
    [data, chartMetric]
  );

  // Keep the canvas sized to its container (replaces the original window resize listener).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w < 2) return;
    const { w: W, h: H } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    geometry.current = null;
    if (!points.length) return;

    const cw = W - PAD.l - PAD.r;
    const ch = H - PAD.t - PAD.b;
    let min = Math.min(...points.map((p) => p.y));
    let max = Math.max(...points.map((p) => p.y));
    if (min === max) { min -= 1; max += 1; }
    const margin = (max - min) * 0.12;
    min -= margin; max += margin;
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const rangeX = maxX - minX || 1;
    const unit = metricUnits[chartMetric];
    const digits = axisDigits(max - min, unit);

    ctx.font = '11px "IBM Plex Sans", sans-serif';
    ctx.strokeStyle = COLORS.grid;
    ctx.fillStyle = COLORS.label;
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) {
      const y = PAD.t + (ch * i) / 4;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.fillText(fmt(max - ((max - min) * i) / 4, digits), PAD.l - 9, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < 5; i++) {
      const x = PAD.l + (cw * i) / 4;
      ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + ch); ctx.stroke();
      ctx.fillText(fmt(minX + (rangeX * i) / 4, 1), x, H - PAD.b + 8);
    }

    ctx.strokeStyle = COLORS.trace;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let started = false;
    const stride = Math.max(1, Math.ceil(points.length / 5000));
    for (let i = 0; i < points.length; i += stride) {
      const p = points[i];
      const x = PAD.l + ((p.x - minX) / rangeX) * cw;
      const y = PAD.t + ((max - p.y) / (max - min)) * ch;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    geometry.current = { W, H, cw, ch, min, max, minX, rangeX };
  }, [points, size, chartMetric]);

  const onPointerMove = useCallback(
    (e) => {
      const g = geometry.current;
      if (!g || !points.length) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      if (px < PAD.l || px > g.W - PAD.r) { setHover(null); return; }
      const target = g.minX + ((px - PAD.l) / g.cw) * g.rangeX;
      let lo = 0, hi = points.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (points[mid].x < target) lo = mid; else hi = mid;
      }
      const p = Math.abs(points[lo].x - target) <= Math.abs(points[hi].x - target) ? points[lo] : points[hi];
      setHover({
        x: PAD.l + ((p.x - g.minX) / g.rangeX) * g.cw,
        y: PAD.t + ((g.max - p.y) / (g.max - g.min)) * g.ch,
        t: p.x,
        v: p.y,
      });
    },
    [points]
  );

  const hasData = points.length > 0;
  const unit = metricUnits[chartMetric] || 'value';
  const summary = hasData
    ? `${metricNames[chartMetric]} over time, ${points.length} samples, from ${fmt(Math.min(...points.map((p) => p.y)), 2)} to ${fmt(Math.max(...points.map((p) => p.y)), 2)} ${unit}`
    : 'No signal data loaded';

  return (
    <div className="monitor">
      <div className="monitor-bar">
        <div className="monitor-trace">
          <span className="trace-key" aria-hidden="true" />
          <strong>{metricNames[chartMetric] || chartMetric}</strong>
          <span className="monitor-source">{data.length ? sourceName(source) : 'No dataset loaded'}</span>
        </div>
        <select
          className="monitor-select"
          aria-label="Signal to display"
          value={chartMetric}
          onChange={(e) => setChartMetric(e.target.value)}
        >
          {chartMetricOptions.map((k) => (
            <option key={k} value={k}>{k === 'motion' ? 'Motion' : metricNames[k]}</option>
          ))}
        </select>
      </div>
      <div
        className="monitor-plot"
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <canvas ref={canvasRef} role="img" aria-label={summary} />
        {hover && (
          <>
            <div className="hover-line" style={{ left: hover.x }} />
            <div className="hover-dot" style={{ left: hover.x, top: hover.y }} />
            <div className="hover-tip" style={{ left: Math.min(hover.x + 12, Math.max(size.w - 170, 0)), top: 10 }}>
              {fmt(hover.t, 2)} s · {fmt(hover.v, 2)} {unit}
            </div>
          </>
        )}
        {!hasData && (
          <div className="monitor-empty">
            <Activity size={22} aria-hidden="true" />
            <strong>No signal data yet</strong>
            <span>Run a simulation or import a CSV to populate this view.</span>
            <Link className="btn btn-dark btn-sm" to="/simulation">Open simulation lab</Link>
          </div>
        )}
      </div>
      <div className="monitor-foot">
        <span>Time (seconds) · {unit}</span>
        <span>{data.length.toLocaleString()} samples</span>
      </div>
    </div>
  );
}
