# Migration report

## Source material
The supplied files were `index.html`, `styles.css` and `app.js`. **Backend source code and API docs were not supplied**, so every backend contract below was derived from `app.js` only and has not been checked against the FastAPI code.

## Preserved backend integrations (all in `src/services/api.js`)
| Method | Path (under API base) | Used for | Payload |
|---|---|---|---|
| GET | `/health` | status, connection pill, MATLAB flag | – |
| GET | `/config` | status page, clinical-range flag | – |
| GET | `/scenarios` | scenario list (falls back to `config.scenarios`) | – |
| POST | `/simulate` | Simulation lab | `{scenario, duration, sample_rate, use_matlab, seed?}` |
| POST | `/analyze` | Analysis | `{data, source: matlab\|python\|upload, metadata?}` |
| POST | `/upload/csv` | CSV import | multipart, field `file` |
| GET | `/example.csv` | example download (JSON `{content, filename}` or raw file fallback) | – |
| POST | `/report` | Reports | `{analysis_result, format: summary\|json\|csv, include_raw_data: false}` |

Unchanged: 45 s timeout, JSON `Content-Type` (omitted for FormData), error-message extraction (`detail`/`message`), 30 s status polling while the tab is visible, 10 MB / `.csv` upload checks, duration 10–600 s and rate 10–1000 Hz validation.

## UI and architecture summary
- Hash-less React Router routes replace the in-memory page switch; the original page names and features are all kept.
- Design: cool paper background, ink text, a single teal accent, IBM Plex Sans. The signal chart is a dark monitor surface, the one deliberate departure from the otherwise quiet interface.
- Overview uses a single divided readout strip instead of four separate cards; secondary pages use layouts suited to their task (form + result, table-led analysis).
- Unicode glyph icons replaced by Lucide SVG icons; body text raised from 9–11 px to 12–14 px.
- Canvas chart kept (no charting dependency), now resize-aware, with a hover readout and an accessible text summary.
- Accessibility: semantic landmarks, labelled controls, keyboard-reachable file input and tables, visible focus, inline validation messages, `aria-live` toasts, reduced-motion support, Esc-closable mobile drawer.
- Dependencies: react, react-dom, react-router-dom, lucide-react (dev: vite, @vitejs/plugin-react).

## Deliberate changes from the original behaviour
1. `VITE_API_BASE_URL` added; `window.VITALGUARD_API_BASE` still takes priority.
2. On a failed status check, cached health is cleared so System status no longer shows a stale "Responding".
3. Completeness / sampling regularity use one helper (0–1 or 0–100 input) on every page; the original overview formula could show 10000% for 0–100 input and 0.0% for missing values (now "—").
4. Chart axis precision adapts to the value range (originally integers, which hid 0–1 signals).
5. Simulation inline field errors were added alongside the original toasts.
6. The simulation form resets when you leave the page (the original also re-rendered fresh); the dataset and analysis persist for the session.

## Testing report
Environment: Node 22, headless Chromium (Playwright) against `vite preview`, with a **throwaway mock server written from the contracts inferred above** (kept outside the project). It is not the real backend.

Verified (automated, passing): production build; all 7 routes and deep links; health/config/scenarios load and connection pill; scenario list and description; simulation validation and run; sample table; simulation CSV download; analyze → analysis page (score, components, artifact table); chart metric switch and hover readout; overview readouts and activity; report generation and download (JSON); CSV upload (multipart) and preview; example CSV download; status page; no horizontal overflow at 390 px on every page; mobile drawer open/Esc close. Request methods, paths and JSON bodies were checked in the mock's request log.

Not verified:
- Behaviour against the real FastAPI backend (response shapes beyond what `app.js` reads).
- MATLAB toggle with `matlab_available: true`; report formats `summary` and `csv`; large datasets; backend error responses and the 45 s timeout path.
- Tablet breakpoint by eye, Safari/Firefox, and screen-reader behaviour.
- Google Fonts loading (blocked in the test sandbox; falls back to system fonts).

## Remaining limitations
- Session data is memory-only, as in the original.
- No automated test suite is included in the project.
