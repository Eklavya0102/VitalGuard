import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getConfig, getHealth, getScenarios } from '../services/api';

const AppContext = createContext(null);
const POLL_MS = 30000;

export function AppProvider({ children }) {
  // Backend status
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState(null);
  const [scenarios, setScenarios] = useState({});
  const [connection, setConnection] = useState('checking'); // checking | online | offline
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Working data (session only, as in the original)
  const [data, setData] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [source, setSource] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [csv, setCsv] = useState(null);
  const [reports, setReports] = useState([]);
  const [activity, setActivity] = useState([]);
  const [chartMetric, setChartMetric] = useState('ppg_value');
  const [noticeVisible, setNoticeVisible] = useState(true);

  const loadSystem = useCallback(async () => {
    setRefreshing(true);
    try {
      const [h, c, s] = await Promise.all([getHealth(), getConfig(), getScenarios()]);
      setHealth(h);
      setConfig(c);
      setScenarios(s.scenarios || c.scenarios || {});
      setConnection('online');
      setLastUpdated(new Date());
      return true;
    } catch {
      // Health is cleared so the status page cannot show a stale "Responding".
      setHealth(null);
      setConnection('offline');
      return false;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSystem();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadSystem();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadSystem]);

  const storeSimulation = useCallback((result) => {
    setSimulation(result);
    setData(result.data || []);
    setMetadata(result.metadata || {});
    setSource(result.source || 'python');
    setAnalysis(null);
    setChartMetric('ppg_value');
  }, []);

  const storeAnalysis = useCallback((result, nextData, nextSource, nextMetadata, activityItem) => {
    setAnalysis(result);
    setData(nextData);
    setSource(nextSource);
    setMetadata(nextMetadata);
    setActivity((a) => [activityItem, ...a].slice(0, 10));
  }, []);

  const addReport = useCallback((r) => setReports((list) => [r, ...list]), []);

  const value = useMemo(
    () => ({
      health, config, scenarios, connection, lastUpdated, refreshing, loadSystem,
      data, metadata, source, simulation, analysis, csv, reports, activity,
      chartMetric, setChartMetric, noticeVisible, dismissNotice: () => setNoticeVisible(false),
      storeSimulation, storeAnalysis, setCsv, addReport,
    }),
    [health, config, scenarios, connection, lastUpdated, refreshing, loadSystem, data, metadata, source,
      simulation, analysis, csv, reports, activity, chartMetric, noticeVisible, storeSimulation, storeAnalysis, addReport]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
