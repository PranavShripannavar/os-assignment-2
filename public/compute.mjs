export const WIDTH = 16;

export function partition(count, threads) {
  if (!Number.isInteger(count) || !Number.isInteger(threads) || count < 1 || threads < 1 || threads > count) throw new Error('Invalid partition');
  return Array.from({ length: threads }, (_, id) => ({ id, start: Math.floor(id * count / threads), end: Math.floor((id + 1) * count / threads) }));
}

export function dataset(count, seed = 42) {
  const values = new Float64Array(count * WIDTH);
  let state = seed >>> 0;
  for (let i = 0; i < values.length; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    values[i] = state / 4294967296;
  }
  return values;
}

// Extract spectral energy from each independent, 16-sample sensor window.
// Quantize per record before reducing so partition order cannot change the checksum.
export function processRows(values, bands) {
  let checksum = 0, anomalies = 0;
  for (let offset = 0; offset < values.length; offset += WIDTH) {
    let energy = 0;
    for (let band = 1; band <= bands; band++) {
      let real = 0, imaginary = 0;
      for (let sample = 0; sample < WIDTH; sample++) {
        const phase = 2 * Math.PI * band * sample / (2 * bands);
        const centered = values[offset + sample] - 0.5;
        real += centered * Math.cos(phase);
        imaginary += centered * Math.sin(phase);
      }
      energy += (real * real + imaginary * imaginary) / WIDTH;
    }
    const score = energy / bands;
    checksum += Math.round(score * 1e6);
    if (score > 0.1) anomalies++;
  }
  return { count: values.length / WIDTH, checksum, anomalies };
}
