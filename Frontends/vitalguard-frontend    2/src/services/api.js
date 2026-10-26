// API service layer. Endpoint paths, methods, payloads, headers, the 45 s timeout
// and error handling are carried over unchanged from the original app.js.
const DEFAULT_API_BASE = 'http://localhost:8000/api/v1';

// Same precedence idea as the original (window global first), plus a Vite env var.
export const API_BASE = (
  window.VITALGUARD_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE
).replace(/\/$/, '');

const TIMEOUT_MS = 45000;

export async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    });
    const type = response.headers.get('content-type') || '';
    const body = type.includes('json') ? await response.json() : await response.text();
    if (!response.ok) {
      const detail =
        body && typeof body === 'object' ? body.detail || body.message || JSON.stringify(body) : body;
      throw new Error(detail || `Request failed (${response.status})`);
    }
    return body;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out. Check that the backend is running.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export const getHealth = () => api('/health');
export const getConfig = () => api('/config');
export const getScenarios = () => api('/scenarios');
export const postSimulate = (body) => api('/simulate', { method: 'POST', body: JSON.stringify(body) });
export const postAnalyze = (body) => api('/analyze', { method: 'POST', body: JSON.stringify(body) });
export const postReport = (body) => api('/report', { method: 'POST', body: JSON.stringify(body) });
export const postCsv = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api('/upload/csv', { method: 'POST', body: form });
};
export const getExampleCsv = () => api('/example.csv');

// Original fallback when /example.csv does not return a JSON { content, filename } body.
export async function fetchExampleCsvBlob() {
  const response = await fetch(`${API_BASE}/example.csv`);
  if (!response.ok) throw new Error('Could not download example');
  return response.blob();
}
