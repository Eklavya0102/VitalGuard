// Thin client for the VitalGuard FastAPI backend. No response is ever synthesised here:
// every function returns exactly what the backend sent, or throws an ApiError.

const DEFAULT_BASE = 'http://localhost:8000/api/v1';

export const API_BASE = String(import.meta.env?.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
export const API_ROOT = API_BASE.replace(/\/api\/v1$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Turn FastAPI error bodies (string detail, validation-error array, or message) into text. */
export function extractError(body, status) {
  if (body && typeof body === 'object') {
    const d = body.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      const parts = d.map(e => {
        const loc = Array.isArray(e?.loc) ? e.loc.filter(p => p !== 'body').join('.') : '';
        const msg = String(e?.msg ?? 'invalid value').replace(/^Value error,\s*/, '');
        return loc ? `${loc}: ${msg}` : msg;
      });
      if (parts.length) return parts.join('; ');
    }
    if (typeof body.message === 'string') return body.message;
  }
  return status ? `Request failed (HTTP ${status})` : 'Request failed';
}

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(`Cannot reach the backend at ${API_ROOT}. Is it running, and does CORS allow this origin?`);
  }
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!res.ok) throw new ApiError(extractError(body, res.status), res.status, body ?? text);
  return body;
}

const json = (method, payload, signal) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal,
});

export const api = {
  root: (signal) => request(`${API_ROOT}/`, { signal }),
  health: (signal) => request(`${API_BASE}/health`, { signal }),
  config: (signal) => request(`${API_BASE}/config`, { signal }),
  scenarios: (signal) => request(`${API_BASE}/scenarios`, { signal }),
  ranges: (signal) => request(`${API_BASE}/ranges`, { signal }),
  /** Backend returns JSON { content, filename } (not a raw CSV body). */
  exampleCsv: () => request(`${API_BASE}/example.csv`),
  simulate: (payload) => request(`${API_BASE}/simulate`, json('POST', payload)),
  analyze: (payload) => request(`${API_BASE}/analyze`, json('POST', payload)),
  report: (payload) => request(`${API_BASE}/report`, json('POST', payload)),
  /** AI explanations (Groq via backend). Body is {payload}; response is {success, data}. 503 = not configured/unavailable. */
  aiReport: (payload, signal) => request(`${API_BASE}/ai/report`, json('POST', { payload }, signal)),
  aiPatterns: (payload, signal) => request(`${API_BASE}/ai/patterns`, json('POST', { payload }, signal)),
  aiCompare: (baseline, comparison, signal) => request(`${API_BASE}/ai/compare`, json('POST', { baseline, comparison }, signal)),
  uploadCsv: (file) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return request(`${API_BASE}/upload/csv`, { method: 'POST', body: form });
  },
};
