# VitalGuard Frontend (v1.2.0)

React 18 + Vite console for the VitalGuard (MED-PS-010) FastAPI backend: simulation, CSV import, signal-quality analysis, and reports.

> VitalGuard is a simulation-based research prototype. Its outputs are intended for signal-quality research and demonstration, not standalone clinical diagnosis or treatment decisions. The configured physiological ranges have not been established as age-specific clinical reference standards.

## Setup

Requires Node 18+ (developed on Node 22).

```bash
npm install
cp .env.example .env        # optional; defaults to http://localhost:8000/api/v1
npm run dev                 # http://localhost:5173
```

Start the backend first, from its own folder (the backend only allows CORS origins `localhost:5173` and `localhost:3000`):

```bash
python -m uvicorn app.main:app --reload --port 8000
```

| Command | Purpose |
|---|---|
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint (config included) |
| `npm test` | Unit tests for the pure logic (Node built-in runner, no extra deps) |
| `npm run check:contract` | Calls a **running** backend and verifies every field the UI reads |

## Pages
Overview · Simulation lab · Import data · Signal analysis · Reports (with optional AI explanation) · System status · About & limitations.

## Data integrity rules
- No page generates or estimates data; everything comes from backend responses.
- Datasets are labelled **Simulated** (Python / MATLAB / Python fallback) or **Uploaded CSV** everywhere they appear.
- Signal quality and physiological plausibility are displayed separately; `clinical_ranges_configured: false` is surfaced.
- Missing values are drawn as gaps, never interpolated.

## Backend behaviours the UI accommodates (backend not modified)
- `/analyze` accepts only `source` of `matlab|python|upload`; a `python_fallback` simulation is sent as `python` but still displayed as a fallback.
- `/example.csv` returns JSON `{content, filename}`; the UI converts it to a real CSV download.
- Error bodies vary (`detail` string, validation array, or `message`); all are surfaced.
- `/analyze` accepts at most 100,000 rows; the UI warns before running larger simulations.
- Completeness/dropout are computed from `pulse_bpm` only; the UI adds a browser-side PPG missing-sample check, labelled as such.
- Without a `timestamp` column the backend assumes 100 Hz; the UI warns that sampling regularity is then uninformative.
- The CSV parser accepts values outside the software limits (its row errors are discarded); the UI flags them as a frontend check.
- `signal_quality` is accepted as a header but not parsed; the UI discloses it.

## Optional AI explanations (Reports page)
Calls `POST /ai/report`, `/ai/patterns` and `/ai/compare`. The backend needs `GROQ_API_KEY`; without it these return HTTP 503 and the UI shows the backend's message while everything else keeps working. The UI sends a compact summary of the backend analysis (scores, artifacts, feature values, scalar metadata). It never sends raw samples or uploaded file names, and it keeps the payload under the backend's 20,000-character limit (recording anything it had to trim). AI text is labelled AI-generated, synthetic and not clinically validated, and never changes a score. Compare uses earlier analyses from the current browser session (memory only).

## Not exposed by the backend (so not in the UI)
The `Preprocessor` notes, `MATLABAdapter.check_availability` details (only the boolean is in `/health`), artifact thresholds, and raw-data inclusion in reports (`include_raw_data` is ignored). Raw samples can be downloaded as CSV from the browser instead. No hardware connectivity exists or is implied.

## Structure
`src/api.js` API client · `src/lib/` formatting, metadata, signal math (+ tests) · `src/components/` shell, chart, shared UI · `src/pages/` one file per page · `scripts/contract-check.mjs` live contract check.
