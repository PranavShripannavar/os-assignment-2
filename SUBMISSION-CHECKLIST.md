# OS Assignment 2 submission

Pranav Shripannavar · 202501110195 · C · C2 · OS

- [x] Real single-thread and multithread computation
- [x] Default 10,000-record dataset, up to 100,000 records
- [x] Balanced partitioning and per-thread completion/count/timing
- [x] Measured wall times, speed comparison and output equality
- [x] Python implementation with actual native thread IDs
- [x] Gemini backend tested on production
- [x] Framer Motion, smooth scrolling, hover motion and reduced-motion styling
- [x] Responsive 375 px layout; zero automated accessibility violations
- [x] Six automated tests; build passes; dependency audit reports zero vulnerabilities
- [x] Report PDF, live screenshots and machine-readable execution evidence
- [x] GitHub source pushed under Pranav Shripannavar; no co-author attribution
- [x] Vercel production deployment verified

## Submit

1. `OS-Assignment2-Report-Pranav-Shripannavar.pdf`
2. `Pranav-Shripannavar-Assignment2-Source.zip`
3. Repository: https://github.com/PranavShripannavar/os-assignment-2
4. Live demo: https://os-assignment-2-sigma.vercel.app

The ZIP includes source, report, README and evidence. Install dependencies with `npm ci`; configure `.env.local` for Gemini. The Python submission runs with the standard library alone.

## Quick viva

- Demonstrate default input, partition cards, timing comparison and matching outputs.
- Explain why 1,000 records can be slower with more threads.
- Explain isolated worker memory, transferable buffers and completion messages.
- Explain why CPython's GIL can limit CPU-bound threading.
- Distinguish measured computation from Gemini's interpretation.

Production deployment is direct; automatic GitHub deployments are not connected.
