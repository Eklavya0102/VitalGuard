export const metricNames = {
  ppg_value: 'PPG waveform',
  pulse_bpm: 'Pulse rate',
  spo2_percent: 'SpO₂',
  motion: 'Motion intensity',
  contact: 'Sensor contact',
  ppg_amplitude: 'PPG amplitude',
};
export const metricUnits = {
  ppg_value: 'amplitude',
  pulse_bpm: 'bpm',
  spo2_percent: '%',
  motion: 'relative scale',
  contact: 'relative scale',
  ppg_amplitude: 'amplitude',
};
// Options offered in the signal selector (same set as the original).
export const chartMetricOptions = ['ppg_value', 'pulse_bpm', 'spo2_percent', 'motion', 'contact'];

export const fmt = (v, digits = 1) => (Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '—');

export const titleCase = (s) =>
  String(s || 'unknown').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function qualityClass(category = '') {
  const c = String(category).toLowerCase();
  if (c.includes('high') || c.includes('good')) return 'good';
  if (c.includes('moderate') || c.includes('medium') || c.includes('fair')) return 'warn';
  if (c.includes('low') || c.includes('poor')) return 'bad';
  return 'neutral';
}

export function sourceName(source) {
  return (
    { python: 'Python simulation', python_fallback: 'Python fallback', matlab: 'MATLAB / Simulink', upload: 'CSV upload' }[source] ||
    titleCase(source || 'No data source')
  );
}

// Backend ratios may arrive as 0–1 or 0–100; normalise to a percentage number.
export const toPercent = (v) => (Number(v) > 1 ? Number(v) : Number(v) * 100);

export const timeLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
