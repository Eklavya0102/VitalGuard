import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiSummary, AI_PAYLOAD_BUDGET } from './aiSummary.js';

const analysis = {
  data_source: 'python', sample_count: 500,
  quality_score: { overall: 71.2, category: 'fair', label: 'Fair', components: { snr: 0.5 }, weights: { snr: 0.25 }, contributions: { snr: 12 }, unavailable_features: [], explanations: ['x'] },
  artifacts: Array.from({ length: 40 }, (_, i) => ({ type: 'motion', severity: 'low', confidence: 'high', start_index: i, end_index: i + 1, explanation: 'e'.repeat(50), features: { big: 1 } })),
  features: { values: { completeness: 1, snr: 3 }, available: [], unavailable: [] },
  physiological: { clinical_ranges_configured: false, warnings: [] },
  data_quality: { completeness: 1 },
};

test('returns null without an analysis', () => assert.equal(buildAiSummary(null, {}, 'python'), null));

test('labels simulated data as synthetic and keeps provenance', () => {
  const s = buildAiSummary(analysis, { scenario: 'movement', filename: 'secret.csv', nested: { a: 1 } }, 'python');
  assert.equal(s.synthetic_data, true);
  assert.equal(s.provenance, 'Simulated · Python');
  assert.equal(s.physiological.clinical_ranges_configured, false);
});

test('uploaded data is not marked synthetic; filename and nested metadata are excluded', () => {
  const s = buildAiSummary(analysis, { filename: 'secret.csv', nested: { a: 1 }, rows: 5 }, 'upload');
  assert.equal(s.synthetic_data, false);
  assert.deepEqual(s.metadata, { rows: 5 });
});

test('never includes raw samples and caps artifact list', () => {
  const s = buildAiSummary({ ...analysis, data: [{ pulse_bpm: 1 }] }, {}, 'python');
  assert.equal('data' in s, false);
  assert.equal(s.artifact_count, 40);
  assert.ok(s.artifacts.length <= 25);
});

test('stays within the payload budget and records what was dropped', () => {
  const huge = { ...analysis, features: { values: Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [`f${i}`, i])) } };
  const s = buildAiSummary(huge, {}, 'python');
  assert.ok(JSON.stringify(s).length <= AI_PAYLOAD_BUDGET + 200);
  assert.ok(s.truncated.includes('feature values omitted'));
});
