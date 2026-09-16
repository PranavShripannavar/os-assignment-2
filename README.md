# Threadlab · OS Assignment 2

A working multithreaded sensor-data processing experiment with a Next.js frontend, real browser Web Workers, a server-side Gemini analysis endpoint, and a standalone Python submission implementation.

Pranav Shripannavar · PRN 202501110195 · Division C · Batch C2 · Course OS · Assignment 2

**Live application:** https://os-assignment-2-sigma.vercel.app

**Report:** [OS Assignment 2 report](OS-Assignment2-Report-Pranav-Shripannavar.pdf)

## Run locally

Requires Node.js 22.13+ and npm. Python implementation requires Python 3.9+ with no third-party packages.

```sh
npm ci
cp .env.example .env.local
# Set GEMINI_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000. Benchmarking works independently of Gemini availability.

```sh
npm test
npm run build
npm start
python python/benchmark.py --records 10000 --threads 4 --bands 32
```

## What to demonstrate

1. Select 10,000 records, 4 threads and Balanced complexity.
2. Run benchmark. One worker handles the complete dataset, followed by four independent workers.
3. Inspect elapsed times, relative speed and output equality.
4. Inspect each worker's partition, completion, count, compute time and checksum.
5. Try 1,000 vs 100,000 records and 2 vs 8 threads. Repeat trials; speedup is not guaranteed.
6. Export the measurement JSON and request Gemini analysis.
7. Run the Python command to show a main-thread baseline and actual native thread IDs.

## Structure

| Path | Purpose |
|---|---|
| `app/page.tsx`, `app/globals.css` | Responsive UI, Framer Motion animation and Lenis scrolling |
| `public/compute.mjs` | Seeded input, balanced partitioning and shared feature-extraction algorithm |
| `public/worker.mjs` | Dedicated worker entry point |
| `lib/benchmark.ts` | Worker creation, transfer, timing, completion, cancellation and cleanup |
| `app/api/analyze/route.ts` | Gemini backend; discovers available Flash models and handles failures |
| `lib/validation.mjs` | Validates browser measurements and recomputes aggregates |
| `python/benchmark.py` | Standalone Python implementation with native threads |
| `tests/compute.test.mjs` | Partition, determinism, correctness, native-thread and validation tests |
| `evidence/` | Actual execution evidence |

## Methodology

**Dataset:** deterministic linear-congruential generator with seed 42. Each record is a 16-sample sensor window. Choose 1,000, 10,000, 50,000 or 100,000 records. A fixed seed makes results reproducible; timings remain hardware-dependent.

**Processing:** center samples around zero, project each window onto 8, 32 or 64 frequency bands, compute mean spectral energy, and flag energy above 0.1. Quantize each record's energy to an integer before summing, making reduction independent of partition order. The energy checksum, anomaly count and processed record count must match between runs. This is feature preprocessing, not model training.

**Partitioning:** worker i receives `[floor(i*N/T), floor((i+1)*N/T))`. Ranges cover every record exactly once; sizes differ by at most one. The UI uses inclusive, one-based ranges for readability; exported JSON uses zero-based half-open ranges.

**Browser timing:** baseline uses one dedicated Web Worker so the interface stays responsive. The parallel version uses 2, 4 or 8 workers. Both runs are cold (new workers) and execute identical code on identical data. Dataset generation is excluded. Wall time starts before worker creation and includes module loading, chunk copying, transfer, computation, scheduling, coordination and result delivery. Worker termination is excluded. Each worker also measures its compute-only elapsed time. Completion is established by an actual message, never by an animation or a timer. All workers terminate on success, error, cancellation or timeout.

**Interpretation:** speedup = single wall time / parallel wall time. Above 1 is faster; below 1 is slower. Wall time minus the longest worker computation is non-kernel elapsed time, not a precise isolated overhead measurement. Logical processor count is only a browser hint, not evidence of worker-to-core allocation. The baseline runs first; cache/JIT warming, thermal state, browser limits and competing system activity can bias a single trial. Repeat experiments and compare distributions before generalizing.

**Python timing:** the baseline runs directly on the main thread. `ThreadPoolExecutor` launches native worker threads; a barrier ensures all requested threads participate. Input is read-only and reductions happen after futures complete. Timing includes pool creation, synchronization and pool shutdown. CPython's default Global Interpreter Lock (GIL) may serialize this pure-Python CPU-bound code; a slower multithreaded result is expected on many interpreters. Python and browser timings are separate experiments and should not be compared as equivalent runtimes.

**AI:** Gemini interprets browser measurements. The backend validates shapes, ranges, completion counts and timing bounds, strips unrelated text and recomputes aggregates. It does not attest measurements from the user's browser. Gemini cannot change benchmark outputs. Errors leave the experiment available for retry.

## OS concepts and viva

- A process owns resources; threads execute within an execution environment. Browser workers are genuine background execution threads with isolated JavaScript memory, but browser internals determine their underlying process placement.
- Lifecycle: create → start/load → compute → send completion → terminate. UI labels indicate application-level events, not kernel scheduler states or PCB inspection.
- Partitioning independent records avoids shared mutable state. Transferable buffers move ownership; message passing synchronizes completion.
- Thread overhead can dominate small tasks. More threads than useful CPU capacity may increase scheduling and memory costs.
- AI pipelines use the same partition/process/reduce pattern for independent feature preprocessing. Full model training and GPU scheduling are outside scope.
- Unit 2: Process and Thread Management. CO2: applying process management and synchronization techniques to system-level problems.

## Requirements coverage

| Assignment requirement | Implementation / evidence |
|---|---|
| Large dataset | Default 10,000 windows; up to 100,000 |
| Single-thread version | One browser worker; Python main-thread baseline |
| Multithreaded version | 2/4/8 browser workers; Python native threads |
| Divide data and report per-thread work | Balanced contiguous ranges and completion cards |
| Measure both times | End-to-end comparison and exported JSON |
| Explain overhead | Deterministic verdict, methodology and Gemini analysis |
| Tests, report and screenshots | Automated tests, evidence directory and accompanying report |

## Deployment

Deploy as a Next.js project on Vercel. Set `GEMINI_API_KEY` as a server environment variable, then redeploy. The `/api/analyze` Node.js function has a 60-second maximum duration. No database is required. Measurements exist only in browser memory unless exported.

The delivered production site was deployed directly and verified with Gemini configured for Production. Automatic deployments from GitHub are not connected. Source and submission documents are pushed to this repository; later code changes require a new deployment.

## References

- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Python: concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html)
- [Python: threading and the GIL](https://docs.python.org/3/library/threading.html#gil-and-performance-considerations)
- [Gemini API documentation](https://ai.google.dev/gemini-api/docs)
