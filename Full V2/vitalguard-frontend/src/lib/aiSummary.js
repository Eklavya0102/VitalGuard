// Builds the compact summary sent to /ai/* endpoints. Only values returned by the backend
// analysis are used; raw signal samples and uploaded filenames are never included.
import { sourceInfo } from './format.js';

// The backend rejects payloads over 20,000 characters (ASCII-escaped); stay well under.
export const AI_PAYLOAD_BUDGET = 15000;

const META_KEYS_MAX = 30;

function scalarMetadata(metadata) {
  const out = {};
  if (!metadata || typeof metadata !== 'object') return out;
  for (const [k, v] of Object.entries(metadata)) {
    if (Object.keys(out).length >= META_KEYS_MAX) break;
    if (k === 'filename') continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 200);
  }
  return out;
}

export function buildAiSummary(analysis, metadata, source) {
  if (!analysis || typeof analysis !== 'object') return null;
  const q = analysis.quality_score || {};
  const info = sourceInfo(source);
  const artifacts = Array.isArray(analysis.artifacts) ? analysis.artifacts : [];

  const full = {
    data_source: analysis.data_source ?? null,
    provenance: info.label,
    synthetic_data: info.kind === 'simulated',
    sample_count: analysis.sample_count ?? null,
    metadata: scalarMetadata(metadata ?? analysis.metadata),
    quality_score: {
      overall: q.overall ?? null,
      category: q.category ?? null,
      label: q.label ?? null,
      components: q.components ?? {},
      weights: q.weights ?? {},
      contributions: q.contributions ?? {},
      unavailable_features: q.unavailable_features ?? [],
      explanations: q.explanations ?? [],
    },
    artifact_count: artifacts.length,
    artifacts: artifacts.slice(0, 25).map(a => ({
      type: a?.type, severity: a?.severity, confidence: a?.confidence,
      start_index: a?.start_index ?? null, end_index: a?.end_index ?? null, explanation: a?.explanation,
    })),
    features: analysis.features?.values ?? {},
    physiological: analysis.physiological ?? {},
    data_quality: analysis.data_quality ?? {},
  };

  // Shrink in steps until the payload fits; each step is recorded so nothing is silently lost.
  const dropped = [];
  const size = o => JSON.stringify(o).length;
  const steps = [
    ['artifact details trimmed to 10', o => { o.artifacts = o.artifacts.slice(0, 10); }],
    ['feature values omitted', o => { o.features = {}; }],
    ['artifact details omitted', o => { o.artifacts = []; }],
    ['quality explanations omitted', o => { o.quality_score.explanations = []; }],
    ['metadata omitted', o => { o.metadata = {}; }],
  ];
  for (const [note, apply] of steps) {
    if (size(full) <= AI_PAYLOAD_BUDGET) break;
    apply(full);
    dropped.push(note);
  }
  if (dropped.length) full.truncated = dropped;
  return full;
}
