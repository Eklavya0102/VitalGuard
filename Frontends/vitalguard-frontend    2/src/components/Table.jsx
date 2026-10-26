export default function Table({ label, children }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table>{children}</table>
    </div>
  );
}
