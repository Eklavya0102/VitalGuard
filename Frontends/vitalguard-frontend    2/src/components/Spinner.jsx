// Button content that swaps to a spinner + label while an action is running.
export default function Busy({ busy, label, children }) {
  return busy ? (
    <>
      <span className="spinner" aria-hidden="true" />
      {label}
    </>
  ) : (
    children
  );
}
