# VitalGuard Full Stack (MED-PS-010)

React 18 + Vite frontend (`vitalguard-frontend/`) and Python/FastAPI backend (`backend/`).

> **Research prototype.** Outputs are for signal-quality research and demonstration, not clinical diagnosis or treatment. Physiological ranges are not age-specific clinical reference standards (`clinical_ranges_configured: false`). Simulated data is synthetic.

## Run locally
Backend (64-bit Python 3.11-3.13 recommended; check with `python -c "import struct;print(struct.calcsize('P')*8)"` -> should print 64):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # optional
python -m uvicorn app.main:app --reload --port 8000   # docs at http://localhost:8000/docs
```
Frontend (Node 18+):
```bash
cd vitalguard-frontend
npm ci
cp .env.example .env            # optional
npm run dev                     # http://localhost:5173
```

## Environment variables
| Where | Variable | Default | Purpose |
|---|---|---|---|
| frontend | `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend base URL including `/api/v1` (baked in at build time) |
| backend | `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed browser origins |
| backend | `MATLAB_PATH` | empty | Enables MATLAB if the path exists |
| backend | `ENVIRONMENT` | `development` | Label only |

## Deployment / CORS
Deploy the backend, then set `CORS_ORIGINS` to the exact frontend origin (scheme + host, no trailing slash). Build the frontend with `VITE_API_BASE_URL` pointing at the deployed backend. Do not commit `.env` files.

## Checks
```bash
cd backend && python -m pytest
cd vitalguard-frontend && npm run lint && npm test && npm run build
cd vitalguard-frontend && npm run check:contract   # needs a running backend
```

## Verification status
This package was assembled in an environment where PyPI and npm were blocked. **Not run there:** the FastAPI server, the backend API tests, frontend lint/build, the live contract check, and all browser workflows. **Run there and passed:** frontend unit tests (17/17) and 112 backend service tests that do not need FastAPI. Run the checks above before relying on it.

## Known limitations
- The backend's CORS change (`CORS_ORIGINS`) is the only backend edit and is untested.
- `/example.csv` returns JSON `{content, filename}`; the UI converts it to a download.
- `/analyze` accepts at most 100,000 rows. `include_raw_data` in reports is ignored by the backend.
- `backend/requirements.txt` uses minimum versions, not exact pins, so newer Python versions get prebuilt wheels. The backend service tests passed on numpy 2.5 / pandas 3.0 / scipy 1.18 / pydantic 2.13, but the full API was not run on those versions.
- No authentication or database; no hardware connectivity.
See `vitalguard-frontend/README.md` for further frontend notes.
