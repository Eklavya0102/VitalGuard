import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { postAnalyze } from '../services/api';
import { sourceName, timeLabel, titleCase } from '../utils/format';

// Runs POST /analyze exactly as the original analyzeData() did, then opens the analysis page.
export function useAnalyze() {
  const { scenarios, storeAnalysis } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);

  async function analyze(data, source = 'upload', metadata = null) {
    if (!Array.isArray(data) || !data.length) {
      toast('There are no samples available to analyze.', 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const normalizedSource = ['matlab', 'python', 'upload'].includes(source)
        ? source
        : source === 'python_fallback' ? 'python' : 'upload';
      const result = await postAnalyze({ data, source: normalizedSource, metadata: metadata || undefined });
      if (!result.success) throw new Error(result.message || 'Analysis did not complete');
      const scenario =
        metadata?.scenario_name || scenarios[metadata?.scenario]?.name || titleCase(metadata?.scenario || 'Dataset analysis');
      storeAnalysis(result, data, source, metadata, {
        title: scenario,
        source: sourceName(source),
        time: timeLabel(),
        score: Number(result.quality_score?.overall),
      });
      toast('Signal analysis completed.', 'success');
      navigate('/analysis');
    } catch (err) {
      toast(`Analysis failed: ${err.message}`, 'error');
      setAnalyzing(false);
    }
  }

  return { analyze, analyzing };
}
