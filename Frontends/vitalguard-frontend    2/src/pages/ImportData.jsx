import { useRef, useState } from 'react';
import { ArrowRight, FileSpreadsheet, Table2, Upload, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useAnalyze } from '../hooks/useAnalyze';
import { fetchExampleCsvBlob, getExampleCsv, postCsv } from '../services/api';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Table from '../components/Table';
import Busy from '../components/Spinner';
import { downloadBlob, downloadText } from '../utils/download';

const MAX_BYTES = 10 * 1024 * 1024;

export default function ImportData() {
  const { csv, setCsv } = useApp();
  const toast = useToast();
  const { analyze, analyzing } = useAnalyze();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  function select(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) return toast('Please select a .csv file.', 'error');
    if (f.size > MAX_BYTES) return toast('The CSV must be smaller than 10 MB.', 'error');
    setFile(f);
  }

  function clear() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function upload() {
    if (!file) return toast('Choose a CSV file first.', 'error');
    setUploading(true);
    try {
      const result = await postCsv(file);
      if (!result.success) throw new Error('CSV validation did not succeed');
      setCsv(result);
      toast(`Parsed ${result.row_count || result.data?.length || 0} valid rows.`, 'success');
    } catch (err) {
      toast(`CSV upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function downloadExample() {
    try {
      const result = await getExampleCsv();
      if (result && result.content) downloadText(result.content, result.filename || 'example.csv', 'text/csv');
      else downloadBlob(await fetchExampleCsvBlob(), 'example.csv');
    } catch (e) {
      toast(`Example download failed: ${e.message}`, 'error');
    }
  }

  const c = csv;
  const cols = c?.columns || [];

  return (
    <>
      <PageHeader title="Import data" description="Upload CSV samples exported from MATLAB / Simulink or another signal workflow." />
      <div className="workspace">
        <section className="panel" aria-labelledby="imp-h">
          <h2 id="imp-h">CSV dataset</h2>
          <p className="panel-desc">The backend validates the file and parses required pulse and SpO₂ columns before analysis.</p>
          <label
            className={`dropzone${drag ? ' drag' : ''}`}
            htmlFor="csvFile"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); select(e.dataTransfer.files?.[0]); }}
          >
            <Upload size={24} aria-hidden="true" />
            <strong>Drop your CSV file here</strong>
            <p>or browse files from your computer<br />CSV format · maximum 10 MB</p>
            <span className="btn btn-secondary">Choose CSV file</span>
            <input ref={inputRef} id="csvFile" className="sr-only" type="file" accept=".csv,text/csv" onChange={(e) => select(e.target.files?.[0])} />
          </label>
          {file && (
            <div className="file-meta">
              <FileSpreadsheet size={20} aria-hidden="true" />
              <div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB · Ready to upload</small></div>
              <button className="icon-btn icon-btn-plain" aria-label="Remove file" onClick={clear}><X size={16} /></button>
            </div>
          )}
          <p className="hint spaced">Required columns: <code>pulse_bpm</code>, <code>spo2_percent</code>. Optional columns include timestamp, motion, contact, ppg_amplitude and ppg_value.</p>
          <button className="btn btn-primary btn-block" disabled={!file || uploading} onClick={upload}>
            <Busy busy={uploading} label="Validating…">Upload and validate</Busy>
          </button>
          <button className="btn btn-secondary btn-block gap-top" onClick={downloadExample}>Download example CSV</button>
        </section>

        <section className="panel" aria-labelledby="imp-p">
          <div className="panel-head ruled">
            <div><h2 id="imp-p">Import preview</h2><p>Review parsed rows before analysis</p></div>
            <Badge tone={c ? 'good' : 'neutral'}>{c ? 'Validated' : 'No file parsed'}</Badge>
          </div>
          {!c ? (
            <EmptyState icon={Table2} title="Waiting for a dataset">After upload, parsed rows and validation details will appear here.</EmptyState>
          ) : (
            <>
              <div className="summary">
                <div className="score-line"><span className="score-big">{(c.row_count || c.data?.length || 0).toLocaleString()}</span><span className="score-of">rows</span></div>
                <div>
                  <strong>{c.filename || 'Imported CSV'}</strong>
                  <p className="muted">{cols.length} columns · {c.errors?.length || 0} parsing warnings</p>
                </div>
              </div>
              <dl className="facts">
                <div><dt>Required columns</dt><dd>{(c.required_columns || []).join(', ')}</dd></div>
                <div><dt>Optional columns found</dt><dd>{(c.optional_columns_present || []).length}</dd></div>
              </dl>
              {c.errors?.length > 0 && <div className="callout">{c.errors.slice(0, 5).map((e, i) => <div key={i}>{String(e)}</div>)}</div>}
              <Table label="Parsed rows">
                <thead><tr>{cols.slice(0, 8).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>
                  {(c.data || []).slice(0, 8).map((row, i) => (
                    <tr key={i}>{cols.slice(0, 8).map((k) => <td key={k} className="num">{String(row[k] ?? '—')}</td>)}</tr>
                  ))}
                </tbody>
              </Table>
              <p className="hint spaced">Showing up to 8 rows and 8 columns.</p>
              <button className="btn btn-primary" disabled={analyzing} onClick={() => analyze(c.data, 'upload', { filename: c.filename, columns: c.columns })}>
                <Busy busy={analyzing} label="Analyzing…">Analyze imported data<ArrowRight size={16} aria-hidden="true" /></Busy>
              </button>
            </>
          )}
        </section>
      </div>
    </>
  );
}
