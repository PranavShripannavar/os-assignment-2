import { validateMeasurement } from '../../../lib/validation.mjs';
export const runtime = 'nodejs';
export const maxDuration = 60;
const base = 'https://generativelanguage.googleapis.com/v1beta';
type Model = { name: string; supportedGenerationMethods?: string[] };

export async function POST(request: Request) {
  let measured;
  try {
    const text = await request.text();
    if (text.length > 16000) return Response.json({ error: 'Measurement is too large.' }, { status: 413 });
    measured = validateMeasurement(JSON.parse(text));
  } catch { return Response.json({ error: 'Run a valid benchmark before requesting analysis.' }, { status: 400 }); }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'Gemini is not configured. Measured results remain available.' }, { status: 503 });
  try {
    const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
    const listing = await fetch(`${base}/models?pageSize=100`, { headers, signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!listing.ok) throw new Error('Models unavailable');
    const models: Model[] = (await listing.json()).models ?? [];
    const available = models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
    const newest = (regex: RegExp) => available.filter(m => regex.test(m.name)).sort((a,b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0];
    const choices = [newest(/^models\/gemini-\d+(\.\d+)?-flash$/), newest(/^models\/gemini-\d+(\.\d+)?-flash-preview$/), available.find(m => m.name === 'models/gemini-flash-latest')].filter((m): m is Model => !!m);
    const body = JSON.stringify({ systemInstruction: { parts: [{ text: 'Explain a student OS multithreading benchmark in 250–400 words, using markdown headings: What happened; Why it happened; In an AI pipeline. These are user-device measurements, structurally validated but not server-attested. Both cold runs use dedicated browser Web Workers, one worker vs N workers, identical seeded 16-sample sensor windows and spectral feature extraction. Dataset generation is excluded; wall time includes worker creation, module loading, copying, transfer, computation, coordination and receiving results; worker termination is excluded. Compute timing is per worker. The baseline runs first, so cache/JIT/order and other system activity may bias a single trial. Do not claim overhead is isolated: wall minus maximum worker compute is only non-kernel elapsed time and includes scheduling. Do not claim cores, CPU utilization, OS scheduling policy or exact hardware are known. Use only the supplied measured numbers. Explain slower parallel runs honestly; speedup below 1 means slowdown. Mention thread lifecycle, isolated memory/message passing and no shared mutable data. Connect partitioning to parallel AI feature preprocessing, not model training. If equality fails, do not declare the comparison valid. Never invent timings or claim speedup is guaranteed.' }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(measured) }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 4096 } });
    const deadline = Date.now() + 45000;
    for (const model of choices) {
      const response = await fetch(`${base}/${model.name}:generateContent`, { method: 'POST', headers, body, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
      if (!response.ok) { if ([404,429,503].includes(response.status)) continue; throw new Error('Generation unavailable'); }
      const candidate = (await response.json()).candidates?.[0];
      const markdown = candidate?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
      if (!markdown || candidate.finishReason !== 'STOP' || markdown.includes(key)) throw new Error('Incomplete response');
      return Response.json({ markdown, model: model.name.replace('models/', '') }, { headers: { 'Cache-Control': 'no-store' } });
    }
    throw new Error('No available model');
  } catch { return Response.json({ error: 'Gemini is temporarily unavailable. Your benchmark is saved on screen; try analysis again.' }, { status: 502 }); }
}
