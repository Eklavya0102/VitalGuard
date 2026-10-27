import { useEffect, useMemo, useRef, useState } from 'react';
import { Chip, Callout, Panel } from './ui';
import { api } from '../api';
import { buildAiSummary } from '../lib/aiSummary';

const TASKS = {
  report: { label: 'Report', description: 'Short written summary, findings, limitations and suggested checks.' },
  patterns: { label: 'Patterns', description: 'Explains the signal-quality findings in the current analysis.' },
  compare: { label: 'Compare', description: 'Compares the current analysis with an earlier one from this session.' },
};

const List = ({ title, items }) => (items?.length ? (
  <>
    <h3>{title}</h3>
    <ul className="ai-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
  </>
) : null);

/** Optional, clearly labelled AI explanation. Never alters or replaces the deterministic analysis. */
export default function AiPanel({ analysis, source, metadata, history }) {
  const [task, setTask] = useState('report');
  const [baselineId, setBaselineId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const analysisKey = analysis?.timestamp ?? null;
  const candidates = useMemo(() => (history || []).filter(h => h.id !== analysisKey), [history, analysisKey]);

  // A new analysis invalidates any earlier AI text; leaving the page cancels an in-flight request.
  useEffect(() => { setResult(null); setError(null); }, [analysisKey]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    if (busy) return;
    const current = buildAiSummary(analysis, metadata, source);
    if (!current) return;
    let baseline = null;
    if (task === 'compare') {
      baseline = candidates.find(c => c.id === (baselineId || candidates[0]?.id));
      if (!baseline) { setError('Run a second analysis in this session to compare against.'); return; }
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = task === 'report' ? await api.aiReport(current, ctrl.signal)
        : task === 'patterns' ? await api.aiPatterns(current, ctrl.signal)
          : await api.aiCompare(baseline.summary, current, ctrl.signal);
      if (!res?.success || !res.data) throw new Error('The backend returned no AI result.');
      setResult({ task, data: res.data, truncated: current.truncated });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err.message);
    } finally {
      if (abortRef.current === ctrl) setBusy(false);
    }
  };

  const d = result?.data;
  return (
    <Panel title="AI explanation" sub="Optional. Explains the analysis; it does not change any score." aside={<Chip tone="neutral">Optional</Chip>}>
      <Callout tone="info" title="What is sent">
        A compact summary of the current analysis (scores, artifact list, feature values, metadata) goes to the backend, which forwards it to Groq. Raw samples and file names are not sent. Requires <code>GROQ_API_KEY</code> on the backend.
      </Callout>
      {!analysis ? <p className="hint">Analyze a dataset first.</p> : (
        <>
          <fieldset className="radio-group">
            <legend>Explanation type</legend>
            {Object.entries(TASKS).map(([k, t]) => (
              <label key={k} className={`radio ${task === k ? 'on' : ''}`}>
                <input type="radio" name="ai-task" value={k} checked={task === k} onChange={() => setTask(k)} />
                <span><strong>{t.label}</strong><small>{t.description}</small></span>
              </label>
            ))}
          </fieldset>
          {task === 'compare' && (
            <div className="field">
              <label htmlFor="ai-baseline">Compare against</label>
              <select id="ai-baseline" value={baselineId || candidates[0]?.id || ''} onChange={e => setBaselineId(e.target.value)} disabled={!candidates.length}>
                {candidates.length === 0 ? <option value="">No earlier analysis in this session</option> : candidates.map(c => <option key={c.id} value={c.id}>{c.label} · {c.time}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary btn-block" onClick={run} disabled={busy || (task === 'compare' && !candidates.length)}>
            {busy ? <><span className="spinner" /> Asking the AI service…</> : 'Generate AI explanation'}
          </button>
        </>
      )}
      {error && <Callout tone="bad" title="AI explanation unavailable">{error}</Callout>}
      {d && (
        <div className="ai-result" aria-live="polite">
          <div className="prov-row">
            <Chip tone="neutral">AI-generated · {d.provider || 'groq'}{d.model ? ` · ${d.model}` : ''}</Chip>
            {d.synthetic_data ? <Chip tone="sim">Synthetic data</Chip> : null}
            {d.clinical_validation === false ? <Chip tone="neutral">Not clinically validated</Chip> : null}
          </div>
          <h3>{d.title}</h3>
          <p>{d.summary}</p>
          <List title="Findings" items={d.findings} />
          <List title="Limitations" items={d.limitations} />
          <List title="Recommended checks" items={d.recommended_checks} />
          {d.disclaimer ? <p className="hint">{d.disclaimer}</p> : null}
          {result.truncated?.length ? <p className="hint">Summary was reduced to fit the size limit: {result.truncated.join('; ')}.</p> : null}
        </div>
      )}
    </Panel>
  );
}
