export function getSeries(data, key) {
  return (data || [])
    .map((d, i) => ({
      x: Number.isFinite(Number(d.timestamp)) ? Number(d.timestamp) : i,
      y: d[key] === null || d[key] === undefined ? null : Number(d[key]),
    }))
    .filter((p) => Number.isFinite(p.x));
}

export function meanField(data, key) {
  const vals = (data || [])
    .map((d) => d[key])
    .filter((v) => v !== null && v !== undefined && Number.isFinite(Number(v)))
    .map(Number);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
