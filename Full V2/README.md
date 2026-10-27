# VitalGuard Full Stack (MED-PS-010)

React 18 + Vite frontend (`vitalguard-frontend/`) and Python/FastAPI backend (`backend/`).

> **Research prototype.** Outputs are for signal-quality research and demonstration, not clinical diagnosis or treatment. Physiological ranges are not age-specific clinical reference standards (`clinical_ranges_configured: false`). Simulated data is synthetic. AI text is explanatory only and is not clinically validated.

## Run locally
Backend (64-bit Python 3.11-3.13 recommended; check with `python -c "import struct;print(struct.calcsize('P')*8)"` -> should print 64):
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # optional; add GROQ_API_KEY for AI explanations
python -m uvicorn app.main:app --reload --port 8000    # docs at http://localhost:8000/docs
```
Frontend (Node 18+):
```bash
cd vitalguard-frontend
npm ci
cp .env.example .env            # optional
npm install
npm run dev                     # http://localhost:5173
```

## Environment variables
| Where | Variable | Default | Purpose |
|---|---|---|---|
| frontend | `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend base URL including `/api/v1` (baked in at build time) |
| backend | `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed browser origins |
| backend | `GROQ_API_KEY` | empty | Enables `/api/v1/ai/*`; without it they return 503 |
| backend | `GROQ_MODEL`, `GROQ_TIMEOUT_SECONDS` | `openai/gpt-oss-20b`, `20` | AI model and timeout |
| backend | `MATLAB_PATH`, `MATLAB_TIMEOUT` | empty, `60` | Enables MATLAB/Simulink if the path exists |
| backend | `ENVIRONMENT` | `development` | Label only |

Never commit `.env` files. Rotate any API key that has been shared or zipped.

## Deployment / CORS
Deploy the backend, then set `CORS_ORIGINS` to the exact frontend origin (scheme + host, no trailing slash). Build the frontend with `VITE_API_BASE_URL` pointing at the deployed backend.

## Checks
```bash
cd backend && python -m pytest
cd vitalguard-frontend && npm run lint && npm test && npm run build
cd vitalguard-frontend && npm run check:contract   # needs a running backend
```

## What changed in this integration (backend)
Based on your updated backend. Three small fixes were needed:
1. `CORS_ORIGINS` is configurable (was hard-coded to localhost).
2. `ai_analysis.py` now reads `GROQ_API_KEY`/model/timeout from the app settings; before, a key in `.env` was invisible to it because `.env` is not copied into `os.environ`.
3. `ai_analysis.py` no longer turns "Groq is not configured" into "temporarily unavailable".
Also: `openpyxl` added to requirements (the infant dataset loader needs it), and `tests/test_ai_analysis.py` added. Removed from the package: `.env`, `.bak` backups, one-off `fix_*`/`patch_*` scripts, and the Simulink `slprj` cache.

## Verification status
Verified in the build environment (which could not install FastAPI or Vite because package registries were blocked):
- Frontend unit tests: 22/22 pass. Whole frontend bundles with esbuild. Browser test (Chromium) of the AI flow against a backend-**shaped stub**: 12/12 pass, including 503/422 handling, compare, payload size, no raw samples, and no horizontal overflow at 390px.
- Backend: 112 service tests + the infant dataset loader script pass; the AI service tests pass with a fake client.

**Not run:** the real FastAPI server, `tests/test_api*.py` and the route test in `test_ai_analysis.py`, `npm run lint`, `npm run build` (Vite), `npm run check:contract`, MATLAB/Simulink, and any call to the real Groq API. Run the Checks above before relying on it.

## Known limitations
- `/example.csv` returns JSON `{content, filename}`; the UI converts it to a download.
- `/analyze` accepts at most 100,000 rows. `include_raw_data` in reports is ignored by the backend.
- MATLAB supports 6 scenarios; the other simulator scenarios use Python (the backend reports a fallback).
- AI compare uses analyses from the current browser session only. Uploaded-data summaries go to Groq when you use AI; avoid it for data you must keep private.
- No authentication or database; no hardware connectivity.
