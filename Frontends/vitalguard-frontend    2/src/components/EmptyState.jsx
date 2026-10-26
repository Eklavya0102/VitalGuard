export default function EmptyState({ icon: Icon, title, children, actions, compact = false }) {
  return (
    <div className={`empty${compact ? ' empty-compact' : ''}`}>
      {Icon && <span className="empty-icon" aria-hidden="true"><Icon size={20} /></span>}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}
