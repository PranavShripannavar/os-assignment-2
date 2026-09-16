export function validateMeasurement(value) {
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  const time = n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 120000;
  if (!value || !integer(value.records, 1000, 100000) || ![2, 4, 8].includes(value.threads) || ![8, 32, 64].includes(value.bands)) throw new Error('Invalid settings');
  const clean = (run, threads) => {
    if (!run || !time(run.wallMs) || !Array.isArray(run.chunks) || run.chunks.length !== threads) throw new Error('Invalid run');
    const chunks = run.chunks.map((c, id) => {
      const start = Math.floor(id * value.records / threads), end = Math.floor((id + 1) * value.records / threads);
      if (!c || c.id !== id || c.start !== start || c.end !== end || c.count !== end - start || !integer(c.checksum, 0, Number.MAX_SAFE_INTEGER) || !integer(c.anomalies, 0, c.count) || !time(c.computeMs) || c.computeMs > run.wallMs) throw new Error('Invalid chunk');
      return { id, start, end, count: c.count, checksum: c.checksum, anomalies: c.anomalies, computeMs: c.computeMs };
    });
    return { wallMs: run.wallMs, chunks, count: chunks.reduce((n,c) => n + c.count, 0), checksum: chunks.reduce((n,c) => n + c.checksum, 0), anomalies: chunks.reduce((n,c) => n + c.anomalies, 0) };
  };
  const single = clean(value.single, 1), multi = clean(value.multi, value.threads);
  return { records: value.records, threads: value.threads, bands: value.bands, single, multi, equal: single.checksum === multi.checksum && single.anomalies === multi.anomalies, speedup: single.wallMs / multi.wallMs };
}
