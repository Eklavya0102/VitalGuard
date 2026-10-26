import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeries, extent, niceTicks, toSegments, artifactBands, expectedSamples, summarizeDataset, countOutsideLimits, nearestIndex } from './signal.js';

test('buildSeries marks null / non-numeric as NaN and counts missing', () => {
  const s = buildSeries([{ timestamp: 0, v: 1 }, { timestamp: 1, v: null }, { timestamp: 2, v: 'x' }, { timestamp: 3, v: 4 }], 'v');
  assert.equal(s.valid, 2);
  assert.equal(s.missing, 2);
  assert.ok(Number.isNaN(s.ys[1]));
  assert.equal(s.hasTimestamps, true);
});

test('buildSeries falls back to sample index without timestamps', () => {
  const s = buildSeries([{ v: 1 }, { v: 2 }], 'v');
  assert.equal(s.hasTimestamps, false);
  assert.deepEqual(Array.from(s.xs), [0, 1]);
});

test('extent ignores NaN and returns null when empty', () => {
  assert.deepEqual(extent(Float64Array.from([NaN, 3, 1, NaN])), { min: 1, max: 3 });
  assert.equal(extent(Float64Array.from([NaN])), null);
});

test('toSegments breaks the line at missing values (no interpolation)', () => {
  const xs = Float64Array.from([0, 1, 2, 3, 4]);
  const ys = Float64Array.from([1, 2, NaN, 4, 5]);
  const segs = toSegments(xs, ys, 0, 4, 100);
  assert.equal(segs.length, 2);
  assert.deepEqual(segs[0], [[0, 1], [1, 2]]);
  assert.deepEqual(segs[1], [[3, 4], [4, 5]]);
});

test('toSegments decimates large series but keeps extremes', () => {
  const n = 20000;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) { xs[i] = i; ys[i] = i === 12345 ? 999 : Math.sin(i / 50); }
  const segs = toSegments(xs, ys, 0, n - 1, 400);
  const pts = segs.flat();
  assert.ok(pts.length < n / 3);
  assert.ok(pts.some(p => p[1] === 999), 'spike must survive decimation');
});

test('niceTicks returns ordered round values inside range', () => {
  const t = niceTicks(0, 97, 5);
  assert.deepEqual(t, [0, 25, 50, 75]);
  assert.deepEqual(niceTicks(5, 5), [5]);
});

test('artifactBands maps only ranged artifacts to x units', () => {
  const xs = Float64Array.from([0, 0.1, 0.2, 0.3, 0.4]);
  const bands = artifactBands([
    { type: 'movement', severity: 'high', start_index: 1, end_index: 3 },
    { type: 'excessive_noise', severity: 'high', start_index: null, end_index: null },
    { type: 'x', severity: 'low', start_index: 2, end_index: 99 },
  ], xs);
  assert.equal(bands.length, 2);
  assert.equal(bands[0].x0, 0.1);
  assert.equal(bands[0].x1, 0.3);
  assert.equal(bands[1].x1, 0.4); // end index clamped
});

test('expectedSamples and nearestIndex', () => {
  assert.equal(expectedSamples(60, 100), 6000);
  assert.equal(expectedSamples('a', 1), null);
  assert.equal(nearestIndex(Float64Array.from([0, 1, 2]), 1.6), 2);
});

test('summarizeDataset counts missing and computes span', () => {
  const s = summarizeDataset([
    { timestamp: 0, pulse_bpm: 100, ppg_value: null },
    { timestamp: 2, pulse_bpm: 120, ppg_value: 1 },
  ]);
  assert.equal(s.span, 2);
  const ppg = s.columns.find(c => c.key === 'ppg_value');
  assert.equal(ppg.missing, 1);
  assert.equal(s.columns.find(c => c.key === 'pulse_bpm').mean, 110);
});

test('countOutsideLimits uses backend software limits', () => {
  const out = countOutsideLimits(
    [{ pulse_bpm: 300, spo2_percent: 98 }, { pulse_bpm: 100, spo2_percent: 101 }],
    { pulse_bpm: { software_limits: { min: 30, max: 250 } }, spo2_percent: { software_limits: { min: 0, max: 100 } } },
  );
  assert.equal(out.pulse_bpm.count, 1);
  assert.equal(out.spo2_percent.count, 1);
});
