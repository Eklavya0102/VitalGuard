import { useState } from 'react';

export default function ImportPage({ csv, setCsv, setData, setMetadata, setSource, setAnalysis, setPage, toast }) {
  const [csvFile, setCsvFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const selectFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { toast('Please select a .csv file.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('The CSV must be smaller than 10 MB.', 'error'); return; }
    setCsvFile(file);
  };

  const uploadCsv = async () => {
    if (!csvFile) { toast('Choose a CSV file first.', 'error'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', csvFile);
      const res = await fetch('http://localhost:8000/api/v1/upload/csv', { method: 'POST', body: form });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error('CSV validation did not succeed');

      setCsv(result);
      toast(`Parsed ${(result.row_count || result.data?.length || 0)} valid rows.`, 'success');
    } catch (err) {
      toast(`CSV upload failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const analyzeUpload = async () => {
    if (!csv) return;
    setBusy(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: csv.data, source: 'upload', metadata: { filename: csv.filename, columns: csv.columns } })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error('Analysis did not complete');

      setAnalysis(result);
      setData(csv.data);
      setSource('upload');
      setMetadata({ filename: csv.filename, columns: csv.columns });
      toast('Signal analysis completed.', 'success');
      setPage('analysis');
    } catch (err) {
      toast(`Analysis failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const downloadExample = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/example.csv');
      if (!res.ok) throw new Error('Could not download example');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'example.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(`Example download failed: ${e.message}`, 'error');
    }
  };

  return (
    <div className="workspace-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">VITALGUARD WORKSPACE</div>
          <h1>Import data</h1>
          <p>Upload CSV samples exported from MATLAB / Simulink or another signal workflow.</p>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="form-panel">
          <h2>CSV dataset</h2>
          <p className="panel-description">The backend validates the file and parses required pulse and SpO₂ columns before analysis.</p>

          <label
            className={`dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files?.[0]); }}
          >
            <div className="drop-icon">⇧</div>
            <strong>Drop your CSV file here</strong>
            <p>or browse files from your computer<br />CSV format · maximum 10 MB</p>
            <span className="button button-secondary">Choose CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={e => selectFile(e.target.files?.[0])} />
          </label>

          {csvFile && (
            <div className="file-meta">
              <span className="file-icon">▤</span>
              <div>
                <strong>{csvFile.name}</strong>
                <small>{(csvFile.size / 1024).toFixed(1)} KB · Ready to upload</small>
              </div>
              <button onClick={() => setCsvFile(null)} aria-label="Remove file">×</button>
            </div>
          )}

          <div className="field-hint" style={{ margin: '14px 0' }}>
            Required columns: <code>pulse_bpm</code>, <code>spo2_percent</code>. Optional columns include timestamp, motion, contact, ppg_amplitude and ppg_value.
          </div>

          <button className="button button-primary full-button" onClick={uploadCsv} disabled={!csvFile || busy}>
            {busy ? <><span className="spinner"></span> Validating…</> : 'Upload and validate'}
          </button>
          <button className="button button-secondary full-button" onClick={downloadExample} style={{ marginTop: '8px' }}>Download example CSV</button>
        </section>

        <section className="result-panel">
          <div className="result-head">
            <div>
              <h2>Import preview</h2>
              <p>Review parsed rows before analysis</p>
            </div>
            <span className={`status-chip ${csv ? 'good' : 'neutral'}`}>{csv ? 'Validated' : 'No file parsed'}</span>
          </div>

          {!csv ? (
            <div className="result-placeholder">
              <span className="empty-icon" style={{ fontSize: '25px' }}>▤</span>
              <strong>Waiting for a dataset</strong>
              <p>After upload, parsed rows and validation details will appear here.</p>
            </div>
          ) : (
            <div>
              <div className="quality-hero">
                <div className="quality-number">{(csv.row_count || csv.data?.length || 0).toLocaleString()}<small> rows</small></div>
                <div className="quality-copy">
                  <strong>{csv.filename || 'Imported CSV'}</strong>
                  <p>{(csv.columns || []).length} columns · {csv.errors?.length || 0} parsing warnings</p>
                </div>
              </div>

              <div className="assessment-grid">
                <div className="assessment-item"><span>Required columns</span><strong>{(csv.required_columns || []).join(', ')}</strong></div>
                <div className="assessment-item"><span>Optional columns found</span><strong>{(csv.optional_columns_present || []).length}</strong></div>
              </div>

              {csv.errors?.length ? (
                <div className="callout">{csv.errors.slice(0, 5).join('<br>')}</div>
              ) : null}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{(csv.columns || []).slice(0, 8).map(k => <th key={k}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(csv.data || []).slice(0, 8).map((row, i) => (
                      <tr key={i}>
                        {(csv.columns || []).slice(0, 8).map(k => <td key={k}>{row[k] ?? '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ marginTop: '10px' }}>Showing up to 8 rows and 8 columns.</p>
              <button className="button button-primary" onClick={analyzeUpload} style={{ marginTop: '12px' }} disabled={busy}>Analyze imported data →</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}