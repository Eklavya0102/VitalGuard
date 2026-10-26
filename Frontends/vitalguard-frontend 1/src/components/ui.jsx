import Icon from './Icon';
import { DISCLAIMER, sourceInfo, fmt, pct } from '../lib/format';
import { summarizeDataset } from '../lib/signal';
import { useMemo } from 'react';

export const Chip = ({ tone = 'neutral', children, title }) => (
  <span className={`chip chip-${tone}`} title={title}>{children}</span>
);

export const Callout = ({ tone = 'info', title, children }) => (
  <div className={`callout callout-${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
    <Icon name={tone === 'info' ? 'about' : 'alert'} size={16} className="callout-icon" />
    <div>{title ? <strong>{title}</strong> : null}{children}</div>
  </div>
);

export const PageHead = ({ eyebrow = 'VitalGuard', title, lead, actions }) => (
  <header className="page-head">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1 id="page-title" tabIndex={-1}>{title}</h1>
      {lead ? <p className="lead">{lead}</p> : null}
    </div>
    {actions ? <div className="page-actions">{actions}</div> : null}
  </header>
);

export const Panel = ({ title, sub, aside, children, className = '' }) => (
  <section className={`panel ${className}`}>
    {(title || aside) && (
      <div className="panel-head">
        <div>{title ? <h2>{title}</h2> : null}{sub ? <p className="sub">{sub}</p> : null}</div>
        {aside ? <div className="panel-aside">{aside}</div> : null}
      </div>
    )}
    {children}
  </section>
);

export const Empty = ({ title, children, actions }) => (
  <div className="empty">
    <strong>{title}</strong>
    {children ? <p>{children}</p> : null}
    {actions ? <div className="btn-row center">{actions}</div> : null}
  </div>
);

export const Disclaimer = ({ compact = false }) => (
  <aside className={`disclaimer ${compact ? 'compact' : ''}`} aria-label="Research prototype disclaimer">
    <Icon name="about" size={16} className="disclaimer-icon" />
    <p>{DISCLAIMER}</p>
  </aside>
);

export const Provenance = ({ source, metadata }) => {
  const info = sourceInfo(source);
  const tone = info.kind === 'simulated' ? 'sim' : info.kind === 'uploaded' ? 'upload' : 'neutral';
  const tag = info.kind === 'simulated' ? 'Synthetic data' : info.kind === 'uploaded' ? 'User-supplied data' : null;
  return (
    <span className="prov" title={info.detail}>
      <Chip tone={tone}>{info.label}</Chip>
      {tag ? <span className="prov-tag">{tag}</span> : null}
      {metadata?.scenario_name ? <span className="prov-tag">{metadata.scenario_name}</span> : null}
      {metadata?.filename ? <span className="prov-tag">{metadata.filename}</span> : null}
    </span>
  );
};

export const KV = ({ rows }) => (
  <dl className="kv">
    {rows.filter(Boolean).map(([k, v, note], i) => (
      <div key={i} className="kv-row">
        <dt>{k}</dt>
        <dd>{v ?? '—'}{note ? <small>{note}</small> : null}</dd>
      </div>
    ))}
  </dl>
);

export const Stat = ({ label, value, unit, foot, tone }) => (
  <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}{unit ? <small>{unit}</small> : null}</span>
    {foot ? <span className="stat-foot">{foot}</span> : null}
  </div>
);

export const Scroll = ({ children, label }) => (
  <div className="scroll" tabIndex={0} role="region" aria-label={label}>{children}</div>
);

/** Browser-side per-column summary of the loaded rows (labelled as such). */
export function DatasetSummary({ data }) {
  const s = useMemo(() => summarizeDataset(data), [data]);
  if (!s.count) return null;
  return (
    <div>
      <p className="sub">
        Computed in the browser from the {s.count.toLocaleString()} loaded rows
        {s.span !== null ? ` · time span ${fmt(s.span, 2)} s (from timestamps)` : ' · no timestamp column'}.
      </p>
      <Scroll label="Dataset column summary">
        <table className="data">
          <thead><tr><th>Column</th><th className="num">Valid</th><th className="num">Missing</th><th className="num">Min</th><th className="num">Mean</th><th className="num">Max</th></tr></thead>
          <tbody>
            {s.columns.map(c => (
              <tr key={c.key}>
                <td><code>{c.key}</code></td>
                <td className="num">{c.valid.toLocaleString()}</td>
                <td className="num">{c.missing ? `${c.missing.toLocaleString()} (${pct(c.missing / s.count)})` : '0'}</td>
                <td className="num">{fmt(c.min, 2)}</td>
                <td className="num">{fmt(c.mean, 2)}</td>
                <td className="num">{fmt(c.max, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
    </div>
  );
}
