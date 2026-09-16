import { processRows } from './compute.mjs';
self.onmessage = ({ data }) => {
  try {
    const started = performance.now();
    const result = processRows(new Float64Array(data.buffer), data.bands);
    self.postMessage({ ...result, id: data.id, computeMs: performance.now() - started });
  } catch {
    self.postMessage({ error: 'Worker could not process its partition.' });
  }
};
