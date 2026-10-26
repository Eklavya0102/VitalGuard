// Live contract check: calls the real backend and verifies every field the frontend reads.
// Usage: VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run check:contract
const BASE = (process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const ROOT = BASE.replace(/\/api\/v1$/, '');
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const get = async p => (await fetch(p)).json();
const post = async (p, body) => { const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };

try {
  const root = await get(`${ROOT}/`);
  ok(root.identifier === 'MED-PS-010', 'GET / returns identifier');
  const health = await get(`${BASE}/health`);
  ok(health.status && typeof health.matlab_available === 'boolean' && health.version, 'GET /health fields');
  const cfg = await get(`${BASE}/config`);
  ok(cfg.quality_thresholds && cfg.physiological_ranges && cfg.scenarios, 'GET /config fields');
  ok(!('clinical_ranges_configured' in cfg), 'GET /config has no top-level clinical_ranges_configured (UI must not read it)');
  const sc = await get(`${BASE}/scenarios`);
  ok(sc.count === 12 && Object.keys(sc.scenarios).length === 12, 'GET /scenarios returns 12 scenarios');
  ok(Object.values(sc.scenarios).every(s => s.name && s.description && s.expected_quality), 'every scenario has name, description, expected_quality');
  const ranges = (await get(`${BASE}/ranges`)).ranges;
  ok(ranges.pulse_bpm.software_limits && ranges.spo2_percent.typical_pediatric && ranges.pulse_bpm.clinical_configured === false, 'GET /ranges shape, clinical_configured=false');
  const ex = await get(`${BASE}/example.csv`);
  ok(typeof ex.content === 'string' && ex.filename === 'example.csv', 'GET /example.csv is JSON {content, filename}');

  // Simulate → analyze for every scenario
  for (const key of Object.keys(sc.scenarios)) {
    const sim = await post('/simulate', { scenario: key, duration: 10, sample_rate: 50, seed: 7 });
    ok(sim.status === 200 && sim.body.success && sim.body.metadata.synthetic_data === true && sim.body.data.length > 0, `simulate ${key}`);
    const an = await post('/analyze', { data: sim.body.data, source: 'python', metadata: sim.body.metadata });
    const a = an.body;
    const shapeOk = an.status === 200 && a.quality_score && a.quality_score.components && a.quality_score.weights && a.quality_score.contributions
      && Array.isArray(a.artifacts) && a.features?.values && a.physiological?.clinical_ranges_configured === false
      && typeof a.data_quality?.completeness === 'number' && Array.isArray(a.physiological.warnings);
    ok(shapeOk, `analyze ${key} → ${a.quality_score?.category} (${a.quality_score?.overall})`);
  }

  // Frontend-relevant error shapes
  const bad = await post('/analyze', { data: [{ pulse_bpm: 1, spo2_percent: 1 }], source: 'python_fallback' });
  ok(bad.status === 422 && Array.isArray(bad.body.detail), '/analyze rejects source=python_fallback with 422 (UI maps it to python)');
  const badSim = await post('/simulate', { scenario: 'nope' });
  ok(badSim.status === 422, '/simulate unknown scenario → 422');

  // Reports in all three formats
  const sim = await post('/simulate', { scenario: 'movement', duration: 10, sample_rate: 50, seed: 1 });
  const an = (await post('/analyze', { data: sim.body.data, source: 'python' })).body;
  for (const format of ['json', 'csv', 'summary']) {
    const r = await post('/report', { analysis_result: an, format, include_raw_data: false });
    ok(r.status === 200 && r.body.filename && r.body.content, `report ${format}`);
  }

  // CSV upload
  const fd = new FormData();
  fd.append('file', new Blob(['timestamp,pulse_bpm,spo2_percent,motion\n0,120,98,0.1\n0.01,121,97,0.2\n0.02,abc,97,0.2\n']), 't.csv');
  const up = await (await fetch(`${BASE}/upload/csv`, { method: 'POST', body: fd })).json();
  ok(up.success && up.row_count === 2 && up.errors.length === 1 && up.optional_columns_present.includes('motion'), 'upload/csv parse + row error reporting');
  const fd2 = new FormData();
  fd2.append('file', new Blob(['foo,bar\n1,2\n']), 'bad.csv');
  const bad2 = await fetch(`${BASE}/upload/csv`, { method: 'POST', body: fd2 });
  ok(bad2.status === 400 && typeof (await bad2.json()).detail === 'string', 'upload/csv missing columns → 400 with string detail');
} catch (e) {
  console.error('Could not complete contract check:', e.message);
  failed++;
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll contract checks passed');
process.exit(failed ? 1 : 0);
