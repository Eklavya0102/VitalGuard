import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ToastRegion from './components/ToastRegion';

import OverviewPage from './pages/OverviewPage';
import SimulationPage from './pages/SimulationPage';
import AnalysisPage from './pages/AnalysisPage';
import ImportPage from './pages/ImportPage';
import ReportsPage from './pages/ReportsPage';
import StatusPage from './pages/StatusPage';
import AboutPage from './pages/AboutPage';

const API_BASE = 'http://localhost:8000/api/v1';

export default function App() {
  const [page, setPage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App State matching original backend contracts
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState(null);
  const [scenarios, setScenarios] = useState({});
  const [data, setData] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [source, setSource] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [reports, setReports] = useState([]);
  const [activity, setActivity] = useState([]);
  const [csv, setCsv] = useState(null);
  const [notice, setNotice] = useState(true);
  const [chartMetric, setChartMetric] = useState('ppg_value');
  const [toasts, setToasts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('Waiting for backend');

  const toast = (message, type = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  };

  const loadSystem = async () => {
    try {
      const [hRes, cRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/health`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/config`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/scenarios`).then(r => r.json()).catch(() => null)
      ]);

      if (hRes) setHealth(hRes);
      if (cRes) setConfig(cRes);
      if (sRes) setScenarios(sRes.scenarios || cRes?.scenarios || {});
      
      setLastUpdated(`Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch {
      setLastUpdated('Backend unavailable');
    }
  };

  useEffect(() => {
    loadSystem();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadSystem();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        health={health}
      />
      <div className="main-area">
        <Navbar
          page={page}
          setSidebarOpen={setSidebarOpen}
          onRefresh={async () => {
            await loadSystem();
            toast(health ? 'System status refreshed' : 'Backend unavailable', health ? 'success' : 'error');
          }}
          health={health}
        />
        <div className="content">
          {page === 'overview' && (
            <OverviewPage
              health={health}
              data={data}
              source={source}
              analysis={analysis}
              notice={notice}
              setNotice={setNotice}
              setPage={setPage}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
              activity={activity}
              lastUpdated={lastUpdated}
            />
          )}
          {page === 'simulation' && (
            <SimulationPage
              scenarios={scenarios}
              health={health}
              simulation={simulation}
              setSimulation={setSimulation}
              setData={setData}
              setMetadata={setMetadata}
              setSource={setSource}
              setAnalysis={setAnalysis}
              setPage={setPage}
              toast={toast}
            />
          )}
          {page === 'analysis' && (
            <AnalysisPage
              analysis={analysis}
              data={data}
              source={source}
              setPage={setPage}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
            />
          )}
          {page === 'import' && (
            <ImportPage
              csv={csv}
              setCsv={setCsv}
              setData={setData}
              setMetadata={setMetadata}
              setSource={setSource}
              setAnalysis={setAnalysis}
              setPage={setPage}
              toast={toast}
            />
          )}
          {page === 'reports' && (
            <ReportsPage
              analysis={analysis}
              reports={reports}
              setReports={setReports}
              setPage={setPage}
              toast={toast}
            />
          )}
          {page === 'status' && (
            <StatusPage
              health={health}
              config={config}
              scenarios={scenarios}
              onRefresh={loadSystem}
            />
          )}
          {page === 'about' && <AboutPage />}
        </div>
      </div>
      <ToastRegion toasts={toasts} />
    </div>
  );
}