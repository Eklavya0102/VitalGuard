# VitalGuard Full Stack (MED-PS-010)

**Pediatric VitalGuard AI: an adaptive measurement-reliability system for detecting unreliable vital-sign readings during movement.**

> **Research prototype.** Outputs are for signal-quality research and demonstration, not clinical diagnosis or treatment. Physiological ranges are not age-specific clinical reference standards (`clinical_ranges_configured: false`). Simulated data is synthetic. AI text is explanatory only and is not clinically validated.

## Project concept

### Problem statement
Development of an adaptive pediatric measurement system for detecting unreliable vital-sign readings during movement. Obtaining reliable measurements from infants and young children is difficult because of movement, crying, poor sensor contact, and changing body size. A reading that looks plausible can still be wrong, and acting on it, or repeating a good measurement unnecessarily, costs clinicians time and attention.

### Core idea
Decide **whether a reading can be trusted before anyone interprets it**. The system separates two questions that are often confused:

1. **Signal quality:** was the measurement captured reliably (motion, sensor contact, noise, completeness, sampling)?
2. **Physiological plausibility:** if it was captured reliably, is the value within the expected pediatric range?

A reading with poor signal quality is flagged for repetition or review *regardless* of how normal its value looks, and the two results are always shown separately.

### Proposed innovation and how this project addresses it
| Proposed component | In this project |
|---|---|
| Pediatric monitoring device recording vital signs with age-appropriate protocols | **Simulated.** A Python simulator (12 scenarios) and an optional MATLAB/Simulink model (6 scenarios) generate synthetic pulse, SpO2, PPG, motion and contact signals. The Simulink path is informed by a synthetic infant reference dataset (0-6 months). No physical hardware exists. |
| Contact-quality sensor checking placement and sensor contact | **Modelled as a signal.** A contact channel is analysed and `poor_contact` artifacts are detected. |
| Motion detection module identifying movement-related disturbances | **Implemented.** A motion channel drives `movement` artifact detection and the motion component of the quality score. |
| Signal-quality analysis engine deciding whether readings are reliable or need repetition | **Implemented.** Features (SNR, pulse stability, completeness, sampling regularity) and artifact events (movement, poor contact, excessive noise, baseline drift, signal dropout, irregular sampling, abrupt pulse change, insufficient data) feed a weighted 0-100 quality score with a High / Moderate / Low / Insufficient-evidence category and a plain-language explanation of each component. |
| Age-specific validation against pediatric reference ranges | **Partly implemented.** Pulse and SpO2 are checked against software limits and typical pediatric ranges, and a synthetic infant reference dataset is used for simulation profiles. Ranges are **not** established clinical standards, which the app states everywhere (`clinical_ranges_configured: false`). |
| Monitoring dashboard showing validated readings and flagging unreliable ones for professional review | **Implemented.** A React dashboard shows signals with artifact bands, quality breakdowns, physiological checks, data provenance, downloadable reports (JSON, CSV, summary), CSV import, and optional AI-written explanations. |

### How it works
```
 Source data                 Backend analysis (FastAPI)                        Dashboard (React)
 -----------                 ---------------------------                       -----------------
 Simulator (Python/MATLAB)   features -> artifact detection -> quality score    Overview, Simulation lab,
 or uploaded CSV        ->    physiological validation (kept separate)     ->  Signal analysis, Import,
                              data-quality summary                              Reports, System status
                              reports (JSON / CSV / summary)
                              optional AI explanation (Groq), never alters scores
```
1. **Acquire:** generate a synthetic scenario (clean, movement, poor contact, noise, drift, dropout, mixed and more) or import a CSV.
2. **Analyse:** the backend extracts features, detects artifact events with their locations and confidence, and computes the quality score.
3. **Validate:** pulse and SpO2 are evaluated against configured ranges, independently of signal quality.
4. **Decide and flag:** the dashboard shows whether the reading looks reliable, why not, and which segments to re-measure or send for professional review.
5. **Report:** export a structured report, optionally with an AI explanation that is labelled AI-generated and never changes a score.

### Design principles
- **Honest provenance:** every dataset is labelled *Simulated* (Python / MATLAB / fallback) or *Uploaded CSV*; synthetic data is never presented as real measurement.
- **No silent fallbacks:** the UI never invents readings, scores, or backend connectivity; errors are shown as errors.
- **Quality is not plausibility:** both are reported, separately.
- **Decision support, not diagnosis:** it flags measurements for human review and makes no clinical claims.

### Intended users
Clinicians and biomedical researchers evaluating how motion and sensor problems affect pediatric vital-sign reliability, and student/engineering teams prototyping a pediatric monitoring workflow.

### Current scope and future work
Implemented here: simulation, CSV import, analysis, reporting and the dashboard. Not implemented: real sensor hardware, real-time streaming, clinically validated age-specific reference ranges, authentication and storage of patient data, and any clinical validation. Natural next steps are device integration, clinically sourced age-banded ranges, real-time analysis, and a validation study.

## Run locally
Backend (64-bit Python 3.11-3.13 recommended; check with `python -c "import struct;print(struct.calcsize('P')*8)"` -> should print 64):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # optional; add GROQ_API_KEY for AI explanations
python -m uvicorn app.main:app --reload --port 8000    # docs at http://localhost:8000/docs
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
| backend | `GROQ_API_KEY` | empty | Enables `/api/v1/ai/*`; without it they return 503 |
| backend | `GROQ_MODEL`, `GROQ_TIMEOUT_SECONDS` | `openai/gpt-oss-20b`, `20` | AI model and timeout |
| backend | `MATLAB_PATH`, `MATLAB_TIMEOUT` | empty, `60` | Enables MATLAB/Simulink if the path exists |
| backend | `ENVIRONMENT` | `development` | Label only |

The backend reads `backend/.env` (wherever you start it from). **Restart uvicorn after editing `.env`**: `--reload` does not watch it. Never commit `.env` files. Rotate any API key that has been shared or zipped.

## Deployment / CORS
Deploy the backend, then set `CORS_ORIGINS` to the exact frontend origin (scheme + host, no trailing slash). Build the frontend with `VITE_API_BASE_URL` pointing at the deployed backend.

## Checks
```bash
cd backend && python -m pytest
cd vitalguard-frontend && npm run lint && npm test && npm run build
cd vitalguard-frontend && npm run check:contract   # needs a running backend
```

## What changed in this integration (backend)
Based on your updated backend. Small fixes were needed:
0. `.env` is loaded from `backend/.env` by absolute path (was relative to the working directory).
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
