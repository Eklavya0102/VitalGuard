import { PageHead, Panel, Callout, Disclaimer, KV, Chip } from '../components/ui';

export default function AboutPage({ root }) {
  return (
    <div className="page">
      <PageHead eyebrow="System" title="About & limitations" lead="What this research prototype does, where its data comes from, and what it must not be used for." />
      <Disclaimer />

      <div className="grid-2">
        <Panel title="Purpose">
          <p>Reliable vital-sign measurements are hard to obtain from infants and young children. Movement, crying and poor sensor contact degrade signals. VitalGuard explores how to detect those disturbances in pulse and SpO₂ signals and to say how trustworthy a recording appears.</p>
          <h3>What the system evaluates</h3>
          <ul className="bullets">
            <li>Signal-quality score with transparent, weighted components.</li>
            <li>Artifact events: movement, poor contact, noise, baseline drift, dropout, abrupt pulse change, irregular sampling, insufficient data.</li>
            <li>Extracted features such as SNR, pulse stability, completeness and sampling regularity.</li>
            <li>Physiological plausibility against software limits and configured typical ranges, reported separately from signal quality.</li>
          </ul>
        </Panel>

        <Panel title="Data provenance">
          <p>Every dataset is labelled with where it came from:</p>
          <KV rows={[
            [<Chip key="a" tone="sim">Simulated · Python</Chip>, 'Synthetic signals from the backend Python simulator.'],
            [<Chip key="b" tone="sim">Simulated · MATLAB</Chip>, 'Synthetic signals from the MATLAB/Simulink adapter, if configured.'],
            [<Chip key="c" tone="sim">Python (MATLAB fallback)</Chip>, 'MATLAB was requested but the backend used Python.'],
            [<Chip key="d" tone="upload">Uploaded CSV</Chip>, 'Rows you supplied; the app cannot verify their origin.'],
          ]} />
          <p className="hint">No page in this application generates, estimates or substitutes data. All results come from backend responses.</p>
        </Panel>
      </div>

      <Panel title="Limitations">
        <ul className="bullets">
          <li><b>Not clinically validated.</b> Quality scores and artifact thresholds have not been validated against clinical outcomes.</li>
          <li><b>No age-specific clinical ranges.</b> The backend reports <code>clinical_ranges_configured: false</code>. The “typical pediatric” bounds are informational only.</li>
          <li><b>Quality is not normality.</b> A high-quality signal can contain unusual values, and a poor one can contain typical values. The two assessments are deliberately separate.</li>
          <li><b>Simulated data.</b> Simulated signals are synthetic approximations. They do not represent any real patient.</li>
          <li><b>No hardware connectivity.</b> This application does not connect to any sensor or monitor.</li>
          <li><b>Absence of artifacts is not proof of reliability.</b> The detector covers a limited set of disturbance types.</li>
          <li><b>Backend quirks worth knowing.</b> Completeness and dropout are computed from <code>pulse_bpm</code> only; without a timestamp column the backend assumes 100 Hz; the CSV parser accepts values outside the software limits and leaves flagging to the analysis step.</li>
        </ul>
        <Callout tone="warn" title="Intended use">For signal-quality research and demonstration only — not for diagnosis, treatment decisions or patient monitoring.</Callout>
      </Panel>

      <Panel title="Project identification">
        <KV rows={[
          ['Project code', root?.identifier || 'MED-PS-010'],
          ['Service', root?.name || 'Pediatric VitalGuard AI'],
          ['Backend', 'FastAPI (Python): simulation, analysis, reporting'],
          ['Frontend', 'React 18 + Vite'],
        ]} />
      </Panel>
    </div>
  );
}
