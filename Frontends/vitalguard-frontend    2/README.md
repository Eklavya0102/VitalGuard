# VitalGuard — Signal Reliability Console (React)

React + Vite migration and redesign of the original HTML/CSS/JS frontend for Pediatric VitalGuard AI (MED-PS-010). The FastAPI backend is unchanged and treated as a fixed dependency.

## Requirements
- Node.js 18+ (developed on Node 22)
- The existing VitalGuard FastAPI backend running (default `http://localhost:8000`)

## Install and run
```bash
npm install
cp .env.example .env     # optional; edit VITE_API_BASE_URL if your backend is elsewhere
npm run dev              # http://localhost:5173
```

## Production build
```bash
npm run build            # output in dist/
npm run preview          # serve the build locally
```
For static hosting, route all paths to `index.html` (a `vercel.json` rewrite is included).

## Backend configuration
The API base URL is resolved in this order:
1. `window.VITALGUARD_API_BASE` — the original app's convention. Set it in `public/config.js` (no rebuild needed for deployed copies).
2. `VITE_API_BASE_URL` — build-time env var (`.env`).
3. Default `http://localhost:8000/api/v1`.

Include the `/api/v1` prefix. If the frontend runs on a different origin than the backend, CORS must be enabled on the backend (as with the original frontend).

## Structure
```
src/
  components/   Sidebar, Topbar, SignalMonitor (canvas chart), Badge, Table, EmptyState...
  context/      AppContext (session state, health polling), ToastContext
  hooks/        useAnalyze (POST /analyze + navigation)
  layouts/      AppLayout
  pages/        Overview, Analysis, Simulation, ImportData, Reports, Status, About
  services/     api.js (all backend calls)
  styles/       index.css (tokens + styles)
  utils/        format, series, download helpers
```
Routes: `/`, `/analysis`, `/simulation`, `/import`, `/reports`, `/status`, `/about`.

See `docs/MIGRATION_REPORT.md` for the endpoint list, UI changes, testing report and limitations.
