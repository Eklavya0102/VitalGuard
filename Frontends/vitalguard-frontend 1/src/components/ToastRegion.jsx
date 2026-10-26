export default function ToastRegion({ toasts }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || ''}`} role={t.type === 'error' ? 'alert' : 'status'}>{t.message}</div>
      ))}
    </div>
  );
}
