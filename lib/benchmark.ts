// The same pure computation is shared by real browser workers and Node tests.
import { dataset, partition, WIDTH } from '../public/compute.mjs';

export type Chunk = { id: number; start: number; end: number; count: number; checksum: number; anomalies: number; computeMs: number };
export type Run = { wallMs: number; chunks: Chunk[]; count: number; checksum: number; anomalies: number };
export type Result = { records: number; threads: number; bands: number; logicalCores: number; timestamp: string; single: Run; multi: Run; equal: boolean };
export type Progress = { stage: 'single' | 'multi'; completed: number; total: number };

function execute(values: Float64Array, bands: number, threads: number, signal: AbortSignal, update: (completed: number) => void): Promise<Run> {
  const workers: Worker[] = [];
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const chunks: Chunk[] = [];
    const cleanup = () => { workers.forEach(w => w.terminate()); clearTimeout(timeout); signal.removeEventListener('abort', abort); };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const abort = () => fail(new Error('Benchmark cancelled.'));
    const timeout = setTimeout(() => fail(new Error('Benchmark timed out. Try fewer records.')), 90000);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    try {
      for (const range of partition(values.length / WIDTH, threads) as { id: number; start: number; end: number }[]) {
        const worker = new Worker('/worker.mjs', { type: 'module', name: `sensor-${range.id + 1}` });
        workers.push(worker);
        worker.onerror = () => fail(new Error('A worker failed. Please reload and retry.'));
        worker.onmessage = ({ data }) => {
          if (data.error) { fail(new Error(data.error)); return; }
          chunks.push({ ...range, ...data });
          update(chunks.length);
          if (chunks.length === threads) {
            const result = { wallMs: performance.now() - started, chunks: chunks.sort((a, b) => a.id - b.id), count: chunks.reduce((n, c) => n + c.count, 0), checksum: chunks.reduce((n, c) => n + c.checksum, 0), anomalies: chunks.reduce((n, c) => n + c.anomalies, 0) };
            cleanup(); resolve(result);
          }
        };
        const copy = values.slice(range.start * WIDTH, range.end * WIDTH);
        worker.postMessage({ buffer: copy.buffer, bands, id: range.id }, [copy.buffer]);
      }
    } catch { fail(new Error('Workers are unavailable in this browser.')); }
  });
}

export async function benchmark(records: number, threads: number, bands: number, signal: AbortSignal, update: (p: Progress) => void): Promise<Result> {
  const values = dataset(records);
  update({ stage: 'single', completed: 0, total: 1 });
  const single = await execute(values, bands, 1, signal, completed => update({ stage: 'single', completed, total: 1 }));
  update({ stage: 'multi', completed: 0, total: threads });
  const multi = await execute(values, bands, threads, signal, completed => update({ stage: 'multi', completed, total: threads }));
  return { records, threads, bands, logicalCores: navigator.hardwareConcurrency || 0, timestamp: new Date().toISOString(), single, multi, equal: single.count === multi.count && single.checksum === multi.checksum && single.anomalies === multi.anomalies };
}
