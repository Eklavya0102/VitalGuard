export default function AboutPage() {
  return (
    <div className="workspace-page">
      <section className="page-heading">
        <div>
          <div className="eyebrow">VITALGUARD WORKSPACE</div>
          <h1>About VitalGuard</h1>
          <p>A research prototype for pediatric measurement reliability.</p>
        </div>
      </section>

      <section className="result-panel prose">
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
          VitalGuard is a simulation-based research prototype. Its outputs are intended for signal-quality research and demonstration, not standalone clinical diagnosis or treatment decisions.
        </div>

        <h2>Project identification</h2>
        <p><b>Project code:</b> MED-PS-010<br /><b>Service:</b> Pediatric VitalGuard AI<br /><b>Backend:</b> FastAPI · Python signal simulation and analysis</p>
      </section>
    </div>
  );
}