import { useState, useMemo } from 'react';
import Icon from '../components/Icon';
import SignalChart from '../components/SignalChart';
import { Chip, Callout, PageHead, Panel, Empty, KV, Provenance, DatasetSummary, Scroll } from '../components/ui';
import { api } from '../api';
import { downloadText, MAX_ANALYSIS_ROWS } from '../lib/format';
import { countOutsideLimits } from '../lib/signal';
import { CSV_COLUMNS, SIGNALS } from '../lib/meta';

const MAX_BYTES = 10 * 1024 * 1024; // backend CSVParser limit

export default function ImportPage({ csv, setCsv, loadDataset, runAnalysis, analyzing, ranges, data, source, chartMetric, setChartMetric, toast }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const select = f => {
    setError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) { setError('Please choose a .csv file.'); return; }
    if (f.size > MAX_BYTES) { setError('The file exceeds the backend limit of 10 MB.'); return; }
    setFile(f);
  };

  const upload = async f => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.uploadCsv(f);
      if (!result.success) throw new Error('The backend did not accept the file.');
      setCsv(result);
      loadDataset({ rows: result.data || [], meta: { filename: result.filename, columns: result.columns, row_count: result.row_count }, src: 'upload' });
      toast(`Parsed ${(result.row_count ?? result.data?.length ?? 0).toLocaleString()} valid rows from ${result.filename}.`, 'success');
    } catch (err) {
      setError(err.message);
      toast(`CSV upload failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadExample = async () => {
    setBusy(true);
    try {
      const ex = await api.exampleCsv(); // { content, filename }
      if (typeof ex?.content !== 'string') throw new Error('Unexpected example CSV response.');
      return ex;
    } catch (err) {
      toast(`Example CSV failed: ${err.message}`, 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const downloadExample = async () => {
    const ex = await loadExample();
    if (ex) downloadText(ex.filename || 'example.csv', ex.content, 'text/csv');
  };

  const validateExample = async () => {
    const ex = await loadExample();
    if (!ex) return;
    const f = new File([ex.content], ex.filename || 'example.csv', { type: 'text/csv' });
    setFile(f);
    await upload(f);
  };

  const rows = useMemo(() => csv?.data || [], [csv]);
  const shownCols = useMemo(() => [...new Set(rows.slice(0, 200).flatMap(r => Object.keys(r)))], [rows]);
  const limits = useMemo(() => countOutsideLimits(rows, ranges), [rows, ranges]);
  const outside = Object.entries(limits).filter(([, v]) => v.count > 0);
  const current = source === 'upload' && data === rows;
  const droppedCols = (csv?.columns || []).filter(c => !shownCols.includes(c));

  return (
    <div className="page">
      <PageHead
        eyebrow="Workspace"
        title="Import data"
        lead="Upload a CSV (for example exported from MATLAB / Simulink). The backend parses and validates it; the parsed rows are what gets analyzed."
      />

      <div className="grid-split">
        <div className="stack">
          <Panel title="CSV dataset">
            <label
              className={`dropzone ${dragOver ? 'over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); select(e.dataTransfer.files?.[0]); }}
            >
              <Icon name="import" size={26} />
              <strong>Drop a CSV file here, or browse</strong>
              <span>UTF-8 or Latin-1 · up to 10 MB · up to 100,000 rows</span>
              <span className="btn btn-secondary" aria-hidden="true">Choose file</span>
              <input type="file" accept=".csv,text/csv" onChange={e => { select(e.target.files?.[0]); e.target.value = ''; }} />
            </label>

            {file && (
              <div className="file-row">
                <Icon name="file" />
                <div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB · not yet uploaded</small></div>
                <button className="icon-btn" onClick={() => setFile(null)} aria-label="Remove selected file"><Icon name="close" size={16} /></button>
              </div>
            )}
            {error && <Callout tone="bad" title="Upload problem">{error}</Callout>}

            <div className="btn-row stack-sm">
              <button className="btn btn-primary" onClick={() => file && upload(file)} disabled={!file || busy}>
                {busy ? <><span className="spinner" /> Working…</> : 'Upload and validate'}
              </button>
            </div>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={downloadExample} disabled={busy}><Icon name="download" size={14} /> Download example CSV</button>
              <button className="btn btn-secondary" onClick={validateExample} disabled={busy}>Validate the example</button>
            </div>
            <p className="hint">The backend’s example has only 5 rows, so most features cannot be computed from it. It illustrates the format only.</p>
          </Panel>

          <Panel title="Supported columns" sub="Rules as implemented by the backend CSV parser.">
            <Scroll label="Supported CSV columns">
              <table className="data">
                <thead><tr><th>Column</th><th>Required</th><th>Handling</th></tr></thead>
                <tbody>
                  {CSV_COLUMNS.map(c => (
                    <tr key={c.name}>
                      <td><code>{c.name}</code></td>
                      <td>{c.required ? <Chip tone="info">Required</Chip> : <span className="muted">Optional</span>}</td>
                      <td className="wrap">{c.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
            <p className="hint">Rows whose pulse or SpO₂ cannot be read as numbers are skipped and reported. Values outside the software limits are not rejected by the parser; the analysis step flags them.</p>
          </Panel>
        </div>

        <Panel
          title="Import preview"
          sub={csv ? undefined : 'Parsed rows and validation details appear here.'}
          aside={csv ? <Provenance source="upload" metadata={{ filename: csv.filename }} /> : <Chip>No file parsed</Chip>}
        >
          {!csv ? (
            <Empty title="Waiting for a dataset">Choose a CSV and upload it to see the backend’s validation result.</Empty>
          ) : (
            <>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing || !current || rows.length > MAX_ANALYSIS_ROWS}>
                  {analyzing ? <><span className="spinner" /> Analyzing…</> : <>Analyze imported data <Icon name="arrow" size={14} /></>}
                </button>
              </div>
              {!current && <Callout tone="info">Another dataset is currently loaded in the workspace. Upload this file again to analyze it.</Callout>}

              <KV rows={[
                ['File', csv.filename],
                ['Valid rows parsed', (csv.row_count ?? rows.length).toLocaleString()],
                ['Columns in header', (csv.columns || []).join(', ')],
                ['Required columns', (csv.required_columns || []).join(', ')],
                ['Optional columns present', (csv.optional_columns_present || []).join(', ') || 'none'],
                ['Optional columns missing', (csv.optional_columns_missing || []).join(', ') || 'none'],
              ]} />

              {!csv.optional_columns_present?.includes('timestamp') && (
                <Callout tone="warn" title="No timestamp column">The backend will assume uniform 100 Hz sampling, so the sampling-regularity feature will not reflect your real timing.</Callout>
              )}
              {droppedCols.length > 0 && (
                <Callout tone="info" title="Columns not forwarded">The backend parser did not keep: {droppedCols.join(', ')}. They are not used in analysis.</Callout>
              )}
              {csv.errors?.length > 0 && (
                <Callout tone="warn" title={`${csv.errors.length} row issue${csv.errors.length > 1 ? 's' : ''} reported by the backend`}>
                  <ul className="plain">{csv.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>
                  {csv.errors.length > 8 ? <small>Showing 8 of {csv.errors.length}. Rows with issues were skipped.</small> : <small>Rows with issues were skipped.</small>}
                </Callout>
              )}
              {outside.length > 0 && (
                <Callout tone="warn" title="Values outside backend software limits (frontend check)">
                  <ul className="plain">{outside.map(([k, v]) => <li key={k}>{v.count.toLocaleString()} <code>{k}</code> values outside {v.min}–{v.max}. The parser accepted these rows; the analysis step will flag them.</li>)}</ul>
                </Callout>
              )}

              <h3>Signal preview</h3>
              <div className="chart-select">
                <label htmlFor="imp-metric" className="sr-only">Signal</label>
                <select id="imp-metric" value={chartMetric} onChange={e => setChartMetric(e.target.value)}>
                  {SIGNALS.filter(s => shownCols.includes(s.key)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <SignalChart data={rows} metric={shownCols.includes(chartMetric) ? chartMetric : 'pulse_bpm'} source="upload" height={220} />

              <h3>Parsed rows</h3>
              <Scroll label="First parsed rows">
                <table className="data">
                  <thead><tr>{shownCols.map(k => <th key={k} className="num">{k}</th>)}</tr></thead>
                  <tbody>
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i}>{shownCols.map(k => <td key={k} className="num">{r[k] === null || r[k] === undefined ? '—' : String(Number(Number(r[k]).toFixed(3)))}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
              <p className="hint">Showing the first 10 of {rows.length.toLocaleString()} parsed rows.</p>

              <h3>Column summary</h3>
              <DatasetSummary data={rows} />
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
