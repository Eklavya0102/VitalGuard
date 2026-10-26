import PageHeader from '../components/PageHeader';

export default function About() {
  return (
    <>
      <PageHeader title="About VitalGuard" description="A research prototype for pediatric measurement reliability." />
      <section className="panel prose">
        <h2>Why this system exists</h2>
        <p>Obtaining reliable vital-sign measurements from infants and young children can be difficult. Movement, crying, poor sensor contact, and changing body size can affect the quality of collected signals. VitalGuard explores a workflow for detecting signal disturbances and flagging readings that may need repetition or professional review.</p>
        <h2>What the prototype evaluates</h2>
        <ul>
          <li>Motion-related disturbances and signal artifacts.</li>
          <li>Sensor contact and signal completeness where those fields are available.</li>
          <li>Signal-quality scores and their component breakdowns.</li>
          <li>Physiological plausibility checks returned by the backend.</li>
          <li>Simulated datasets and CSV data exported from MATLAB / Simulink.</li>
        </ul>
        <h2>How to use the demo</h2>
        <ol>
          <li>Open Simulation Lab and choose a scenario such as Clean Signal or Movement Artifact.</li>
          <li>Run the simulation and inspect the generated signal.</li>
          <li>Analyze the samples and review the quality score, artifact events, and validation warnings.</li>
          <li>Import your own compatible CSV file or export a report.</li>
        </ol>
        <div className="callout">
          <b>Research limitation</b><br />
          VitalGuard is a simulation-based research prototype. Its outputs are intended for signal-quality research and demonstration, not standalone clinical diagnosis or treatment decisions. The configured physiological ranges have not been established as age-specific clinical reference standards. Do not use this interface to make decisions about a child&rsquo;s care.
        </div>
        <h2>Data provenance</h2>
        <p>Generated samples are marked as Python or MATLAB output according to the backend response. Uploaded datasets are marked as CSV imports. The frontend keeps recent activity in browser memory only; it does not persist patient data or claim to connect to physical monitoring hardware.</p>
        <h2>Project identification</h2>
        <p><b>Project code:</b> MED-PS-010<br /><b>Service:</b> Pediatric VitalGuard AI<br /><b>Backend:</b> FastAPI · Python signal simulation and analysis</p>
      </section>
    </>
  );
}
