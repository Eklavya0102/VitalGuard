export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadText = (text, filename, mime = 'text/plain') =>
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);

// Returns false when there is nothing to export.
export function downloadDataCsv(data, filename) {
  if (!data?.length) return false;
  const cols = [...new Set(data.flatMap((r) => Object.keys(r)))];
  const csv = [
    cols.join(','),
    ...data.map((row) =>
      cols
        .map((k) => {
          const s = String(row[k] ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    ),
  ].join('\n');
  downloadText(csv, filename, 'text/csv');
  return true;
}
