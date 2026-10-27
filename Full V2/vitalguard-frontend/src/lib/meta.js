// Display metadata. Everything here describes fields the backend actually returns
// (see backend app/services/*.py); nothing is invented.

export const STATUS_INFO = {
  within_typical_range: { label: 'Within configured typical range', tone: 'neutral' },
  outside_typical_range: { label: 'Outside configured typical range', tone: 'warn' },
  software_limits_exceeded: { label: 'Software limits exceeded', tone: 'bad' },
  no_data: { label: 'No valid data', tone: 'bad' },
};
export const statusInfo = s => STATUS_INFO[s] || { label: String(s ?? 'Unknown'), tone: 'neutral' };

export const QUALITY_TONE = { high: 'good', moderate: 'warn', low: 'bad', insufficient: 'neutral' };
export const SEVERITY_TONE = { high: 'bad', moderate: 'warn', low: 'info' };

export const ARTIFACT_LABELS = {
  movement: 'Movement',
  poor_contact: 'Poor sensor contact',
  excessive_noise: 'Excessive noise',
  baseline_drift: 'Baseline drift',
  signal_dropout: 'Signal dropout',
  abrupt_pulse_change: 'Abrupt pulse change',
  irregular_sampling: 'Irregular sampling',
  insufficient_data: 'Insufficient data',
};

export const COMPONENT_LABELS = {
  snr: 'Signal-to-noise ratio',
  stability: 'Pulse stability',
  completeness: 'Data completeness',
  motion: 'Motion (inverse)',
  contact: 'Sensor contact',
  sampling: 'Sampling regularity',
};

// kind: pct = fraction shown as percent, score = 0–1 score, db = decibels
export const FEATURES = {
  completeness: { label: 'Completeness', kind: 'pct', note: 'Share of non-missing pulse_bpm values (computed from pulse only).' },
  sampling_regularity: { label: 'Sampling regularity', kind: 'score', note: '1 = uniform timestamp intervals. Without a timestamp column the backend assumes 100 Hz, so this is not informative.' },
  snr: { label: 'Signal-to-noise ratio', kind: 'db', note: 'Estimated from ppg_value (needs more than 50 valid PPG samples).' },
  pulse_stability: { label: 'Pulse stability', kind: 'score', note: 'Derived from the variability of pulse_bpm; 1 = very stable.' },
  motion_mean: { label: 'Motion, mean', kind: 'score', note: 'Mean of the motion column (0–1 index).' },
  motion_max: { label: 'Motion, maximum', kind: 'score', note: 'Maximum of the motion column (0–1 index).' },
  contact_mean: { label: 'Contact, mean', kind: 'score', note: 'Mean of the contact column (0–1 index).' },
  contact_min: { label: 'Contact, minimum', kind: 'score', note: 'Minimum of the contact column (0–1 index).' },
  baseline_drift: { label: 'Baseline drift', kind: 'score', note: 'Relative magnitude of the slow trend in ppg_value (needs more than 100 PPG samples).' },
  dropout_fraction: { label: 'Dropout fraction', kind: 'pct', note: 'Share of missing pulse_bpm values (computed from pulse only).' },
};

export const UNAVAILABLE_REASON = {
  snr: 'Requires a ppg_value column with more than 50 valid samples.',
  baseline_drift: 'Requires a ppg_value column with more than 100 valid samples.',
  pulse_stability: 'Requires more than 10 valid pulse_bpm values.',
  motion_mean: 'No motion column supplied.',
  motion_max: 'No motion column supplied.',
  contact_mean: 'No contact column supplied.',
  contact_min: 'No contact column supplied.',
  stability: 'Requires more than 10 valid pulse_bpm values.',
  motion: 'No motion column supplied.',
  contact: 'No contact column supplied.',
};

export const SIGNALS = [
  { key: 'ppg_value', label: 'PPG waveform', unit: 'a.u.', digits: 2, unitNote: 'arbitrary units (simulated amplitude)' },
  { key: 'pulse_bpm', label: 'Pulse rate', unit: 'bpm', digits: 0 },
  { key: 'spo2_percent', label: 'SpO₂', unit: '%', digits: 1 },
  { key: 'motion', label: 'Motion', unit: '0–1', digits: 2, unitNote: 'relative motion index' },
  { key: 'contact', label: 'Sensor contact', unit: '0–1', digits: 2, unitNote: 'relative contact index' },
  { key: 'ppg_amplitude', label: 'PPG amplitude', unit: 'a.u.', digits: 2, unitNote: 'arbitrary units' },
];

export const SCENARIO_PARAMS = [
  ['noise_level', 'Noise level'],
  ['motion_intensity', 'Motion intensity'],
  ['contact_quality', 'Contact quality'],
  ['dropout_prob', 'Dropout probability'],
  ['baseline_drift', 'Baseline drift'],
];

export const SCENARIO_FLAGS = {
  irregular_timing: 'Irregular timing',
  abrupt_change: 'Abrupt pulse step',
  unusual_value: 'Unusual (but clean) values',
  mixed_segments: 'Mixed segments',
};

export const CSV_COLUMNS = [
  { name: 'pulse_bpm', required: true, rule: 'Numeric. Backend software limit 30–250 bpm.' },
  { name: 'spo2_percent', required: true, rule: 'Numeric. Backend software limit 0–100 %.' },
  { name: 'timestamp', required: false, rule: 'Numeric seconds. If absent, the backend assumes 100 Hz.' },
  { name: 'motion', required: false, rule: 'Numeric; clamped to 0–1.' },
  { name: 'contact', required: false, rule: 'Numeric; clamped to 0–1.' },
  { name: 'ppg_value', required: false, rule: 'Numeric waveform. Enables SNR and baseline-drift features.' },
  { name: 'ppg_amplitude', required: false, rule: 'Numeric. Parsed and forwarded.' },
  { name: 'signal_quality', required: false, rule: 'Accepted in the header but not parsed or forwarded by the backend.' },
];

export const REPORT_FORMATS = {
  summary: { label: 'Summary', ext: 'txt', mime: 'text/plain', description: 'Readable text: score, components, artifacts, physiological validation.' },
  json: { label: 'JSON', ext: 'json', mime: 'application/json', description: 'Structured report embedding the full analysis result.' },
  csv: { label: 'CSV', ext: 'csv', mime: 'text/csv', description: 'Spreadsheet-friendly quality summary and artifact list (no raw samples).' },
};

export const ENDPOINTS = [
  ['GET', '/', 'Service identity and status', 'System status, About'],
  ['GET', '/api/v1/health', 'Health, version, MATLAB availability', 'Navigation bar, System status'],
  ['GET', '/api/v1/config', 'Scenarios, ranges, quality thresholds', 'System status, Simulation lab'],
  ['GET', '/api/v1/scenarios', 'Scenario definitions (12)', 'Simulation lab, System status'],
  ['GET', '/api/v1/ranges', 'Configured physiological ranges', 'Analysis, System status'],
  ['GET', '/api/v1/example.csv', 'Example CSV (returned as JSON)', 'Import data'],
  ['POST', '/api/v1/simulate', 'Generate a synthetic dataset', 'Simulation lab'],
  ['POST', '/api/v1/upload/csv', 'Parse and validate a CSV', 'Import data'],
  ['POST', '/api/v1/analyze', 'Quality, artifacts, features, validation', 'Simulation lab, Import data, Overview'],
  ['POST', '/api/v1/report', 'JSON, CSV or summary report', 'Reports'],
  ['POST', '/api/v1/ai/report', 'AI-written explanation of an analysis (optional, needs GROQ_API_KEY)', 'Reports'],
  ['POST', '/api/v1/ai/patterns', 'AI explanation of signal-quality patterns (optional)', 'Reports'],
  ['POST', '/api/v1/ai/compare', 'AI comparison of two analyses (optional)', 'Reports'],
];
