import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ToastRegion from './components/ToastRegion';
import { Disclaimer } from './components/ui';

import OverviewPage from './pages/OverviewPage';
import SimulationPage from './pages/SimulationPage';
import AnalysisPage from './pages/AnalysisPage';
import ImportPage from './pages/ImportPage';
import ReportsPage from './pages/ReportsPage';
import StatusPage from './pages/StatusPage';
import AboutPage from './pages/AboutPage';

import { api } from './api';
import { analysisSourceFor, MAX_ANALYSIS_ROWS, timeLabel } from './lib/format';

export default function App() {
  const [page, setPage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Backend system state
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [root, setRoot] = useState(null);
  const [config, setConfig] = useState(null);
  const [scenarios, setScenarios] = useState({});
  const [ranges, setRanges] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dataset + results. `analysis` always corresponds to the current `data`.
  const [data, setData] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [source, setSource] = useState(null); // python | python_fallback | matlab | upload
  const [simulation, setSimulation] = useState(null);
  const [csv, setCsv] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reports, setReports] = useState([]);
  const [activity, setActivity] = useState([]);
  const [chartMetric, setChartMetric] = useState('ppg_value');
  const [toasts, setToasts] = useState([]);
  const mainRef = useRef(null);

  const toast = useCallback((message, type = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), type === 'error' ? 7000 : 4200);
  }, []);

  const loadSystem = useCallback(async () => {
    setRefreshing(true);
    const [h, c, s, r, rt] = await Promise.allSettled([api.health(), api.config(), api.scenarios(), api.ranges(), api.root()]);
    if (h.status === 'fulfilled') { setHealth(h.value); setHealthError(null); }
    else { setHealth(null); setHealthError(h.reason?.message || 'Backend unavailable'); }
    if (c.status === 'fulfilled') setConfig(c.value);
    if (s.status === 'fulfilled') setScenarios(s.value.scenarios || {});
    else if (c.status === 'fulfilled') setScenarios(c.value.scenarios || {});
    if (r.status === 'fulfilled') setRanges(r.value.ranges || null);
    else if (c.status === 'fulfilled') setRanges(c.value.physiological_ranges || null);
    if (rt.status === 'fulfilled') setRoot(rt.value);
    setLastChecked(new Date());
    setRefreshing(false);
    return h.status === 'fulfilled';
  }, []);

  useEffect(() => {
    loadSystem();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') loadSystem(); }, 30000);
    return () => clearInterval(timer);
  }, [loadSystem]);

  // Move focus to the page heading on navigation (keyboard / screen-reader users)
  useEffect(() => {
    mainRef.current?.querySelector('#page-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Replace the working dataset. Any earlier analysis no longer applies, so it is cleared. */
  const loadDataset = useCallback(({ rows, meta, src }) => {
    setData(rows || []);
    setMetadata(meta || null);
    setSource(src);
    setAnalysis(null);
    const first = ['ppg_value', 'pulse_bpm'].find(k => (rows || []).some(r => r?.[k] !== null && r?.[k] !== undefined));
    setChartMetric(first || 'pulse_bpm');
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!data.length) { toast('Load a simulation or CSV first.', 'error'); return false; }
    if (data.length > MAX_ANALYSIS_ROWS) {
      toast(`The analysis endpoint accepts at most ${MAX_ANALYSIS_ROWS.toLocaleString()} rows; this dataset has ${data.length.toLocaleString()}. Re-run the simulation with a shorter duration or lower rate.`, 'error');
      return false;
    }
    setAnalyzing(true);
    try {
      const result = await api.analyze({ data, source: analysisSourceFor(source), metadata });
      setAnalysis(result);
      const q = result.quality_score;
      setActivity(prev => [{
        id: Date.now(),
        title: metadata?.scenario_name || metadata?.filename || 'Dataset',
        source,
        time: timeLabel(),
        score: q?.overall ?? null,
        category: q?.category,
        samples: result.sample_count,
      }, ...prev].slice(0, 20));
      toast('Analysis completed by the backend.', 'success');
      setPage('analysis');
      return true;
    } catch (err) {
      toast(`Analysis failed: ${err.message}`, 'error');
      return false;
    } finally {
      setAnalyzing(false);
    }
  }, [data, source, metadata, toast]);

  const shared = { health, config, scenarios, ranges, data, metadata, source, analysis, analyzing, runAnalysis, loadDataset, setPage, toast, chartMetric, setChartMetric };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); mainRef.current?.querySelector('#page-title')?.focus(); }}>Skip to content</a>
      <Sidebar page={page} setPage={setPage} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} health={health} root={root} />
      <div className="main-area">
        <Navbar
          page={page}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onRefresh={async () => { const ok = await loadSystem(); toast(ok ? 'System status refreshed.' : 'Backend unavailable.', ok ? 'success' : 'error'); }}
          health={health}
          healthError={healthError}
          refreshing={refreshing}
        />
        <main className="content" id="main" ref={mainRef}>
          {page === 'overview' && <OverviewPage {...shared} activity={activity} lastChecked={lastChecked} healthError={healthError} />}
          {page === 'simulation' && <SimulationPage {...shared} simulation={simulation} setSimulation={setSimulation} />}
          {page === 'analysis' && <AnalysisPage {...shared} />}
          {page === 'import' && <ImportPage {...shared} csv={csv} setCsv={setCsv} />}
          {page === 'reports' && <ReportsPage {...shared} reports={reports} setReports={setReports} />}
          {page === 'status' && <StatusPage {...shared} root={root} healthError={healthError} lastChecked={lastChecked} onRefresh={loadSystem} refreshing={refreshing} />}
          {page === 'about' && <AboutPage root={root} />}
        </main>
        <footer className="app-footer">
          <Disclaimer compact />
          <div className="foot-meta"><span>VitalGuard · {root?.identifier || 'MED-PS-010'}</span><span>Frontend v1.1.0</span></div>
        </footer>
      </div>
      <ToastRegion toasts={toasts} />
    </div>
  );
}
