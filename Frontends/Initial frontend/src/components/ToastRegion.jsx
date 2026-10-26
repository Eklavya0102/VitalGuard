export default function ToastRegion({ toasts }) {
  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || ''}`}>{t.message}</div>
      ))}
    </div>
  );
}