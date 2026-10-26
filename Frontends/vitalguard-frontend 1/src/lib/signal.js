import { isNum } from './format.js';

/** Build typed arrays for one signal. Missing / non-numeric values become NaN. */
export function buildSeries(data, key) {
  const n = data?.length || 0;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let hasTimestamps = false;
  let missing = 0;
  let valid = 0;
  for (let i = 0; i < n; i++) {
    const row = data[i];
    const t = row?.timestamp;
    if (isNum(t)) { xs[i] = Number(t); hasTimestamps = true; } else xs[i] = i;
    const v = row?.[key];
    if (isNum(v)) { ys[i] = Number(v); valid++; } else { ys[i] = NaN; missing++; }
  }
  return { xs, ys, hasTimestamps, missing, valid, n };
}

export function extent(arr) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v !== v) continue; // NaN
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === Infinity ? null : { min, max };
}

export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const raw = span / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = first; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/**
 * Convert a series to polyline segments. Missing values break the line (no interpolation).
 * When there are many more points than pixels, each pixel column keeps first/min/max/last.
 * Returns an array of segments; each segment is an array of [x, y] data-space pairs.
 */
export function toSegments(xs, ys, x0, x1, widthPx) {
  const n = xs.length;
  const segments = [];
  const span = x1 - x0 || 1;
  const decimate = n > widthPx * 3;
  let seg = [];
  let col = -1;
  let first, last, minP, maxP;

  const flushCol = () => {
    if (col < 0) return;
    const pts = [first, minP, maxP, last].sort((a, b) => a[0] - b[0]);
    let prev = null;
    for (const p of pts) {
      if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
      seg.push(p);
      prev = p;
    }
    col = -1;
  };
  const endSeg = () => {
    flushCol();
    if (seg.length) segments.push(seg);
    seg = [];
  };

  for (let i = 0; i < n; i++) {
    const y = ys[i];
    if (y !== y) { endSeg(); continue; }
    const p = [xs[i], y];
    if (!decimate) { seg.push(p); continue; }
    const c = Math.floor(((xs[i] - x0) / span) * widthPx);
    if (c !== col) {
      flushCol();
      col = c;
      first = p; last = p; minP = p; maxP = p;
    } else {
      last = p;
      if (y < minP[1]) minP = p;
      if (y > maxP[1]) maxP = p;
    }
  }
  endSeg();
  return segments;
}

/** Artifact events that carry a sample range, mapped into x-axis units. */
export function artifactBands(artifacts, xs) {
  const bands = [];
  const n = xs.length;
  for (const a of artifacts || []) {
    const s = a?.start_index;
    const e = a?.end_index;
    if (!Number.isInteger(s) || !Number.isInteger(e) || n === 0) continue;
    const si = Math.max(0, Math.min(n - 1, s));
    const ei = Math.max(0, Math.min(n - 1, e));
    const x0 = Math.min(xs[si], xs[ei]);
    const x1 = Math.max(xs[si], xs[ei]);
    bands.push({ x0, x1, severity: a.severity, type: a.type, start: s, end: e });
  }
  return bands;
}

export function nearestIndex(xs, x) {
  const n = xs.length;
  if (!n) return -1;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(xs[i] - x);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function expectedSamples(duration, rate) {
  const d = Number(duration);
  const r = Number(rate);
  return Number.isFinite(d) && Number.isFinite(r) ? Math.ceil(d * r) : null;
}

const NUMERIC_COLUMNS = ['timestamp', 'pulse_bpm', 'spo2_percent', 'ppg_value', 'ppg_amplitude', 'motion', 'contact'];

/** Per-column valid/missing counts and min/mean/max, computed in the browser from loaded rows. */
export function summarizeDataset(data) {
  const rows = data || [];
  const columns = [];
  for (const key of NUMERIC_COLUMNS) {
    if (!rows.some(r => r && key in r)) continue;
    let valid = 0, missing = 0, sum = 0, min = Infinity, max = -Infinity;
    for (const r of rows) {
      const v = r?.[key];
      if (isNum(v)) {
        const x = Number(v);
        valid++; sum += x;
        if (x < min) min = x;
        if (x > max) max = x;
      } else missing++;
    }
    columns.push({ key, valid, missing, min: valid ? min : null, max: valid ? max : null, mean: valid ? sum / valid : null });
  }
  const ts = buildSeries(rows, 'timestamp');
  const tsExt = ts.hasTimestamps ? extent(ts.ys) : null;
  return { count: rows.length, columns, span: tsExt ? tsExt.max - tsExt.min : null, hasTimestamp: ts.hasTimestamps };
}

/** Count rows outside the backend's software limits (a frontend-side check, labelled as such). */
export function countOutsideLimits(data, ranges) {
  const out = {};
  for (const key of ['pulse_bpm', 'spo2_percent']) {
    const lim = ranges?.[key]?.software_limits;
    if (!lim) continue;
    let n = 0;
    for (const r of data || []) {
      const v = r?.[key];
      if (isNum(v) && (Number(v) < lim.min || Number(v) > lim.max)) n++;
    }
    out[key] = { count: n, min: lim.min, max: lim.max };
  }
  return out;
}
