'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import Markdown from 'react-markdown';
import { benchmark, type Result, type Progress } from '@/lib/benchmark';

const number = (n: number) => n.toLocaleString('en-US');
const ms = (n: number) => `${n.toFixed(1)} ms`;
const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  const [records, setRecords] = useState(10000), [threads, setThreads] = useState(4), [bands, setBands] = useState(32);
  const [result, setResult] = useState<Result | null>(null), [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState(''), [analysis, setAnalysis] = useState(''), [model, setModel] = useState(''), [thinking, setThinking] = useState(false);
  const [cores, setCores] = useState(0);
  const controller = useRef<AbortController | null>(null), aiController = useRef<AbortController | null>(null);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, [0, 650], [0, 95]);
  useEffect(() => {
    setCores(navigator.hardwareConcurrency || 0);
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? null : new Lenis({ autoRaf: true, anchors: true, duration: 0.9 });
    return () => { smooth?.destroy(); controller.current?.abort(); aiController.current?.abort(); };
  }, []);
  async function run() {
    aiController.current?.abort(); setThinking(false); setError(''); setAnalysis(''); setModel(''); setResult(null);
    const active = new AbortController(); controller.current = active;
    try { setResult(await benchmark(records, threads, bands, active.signal, setProgress)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Benchmark failed.'); }
    finally { setProgress(null); }
  }
  async function analyze() {
    if (!result) return;
    setThinking(true); setError('');
    const active = new AbortController(); aiController.current = active;
    const timeout = setTimeout(() => active.abort(), 65000);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result), signal: active.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAnalysis(data.markdown); setModel(data.model);
    } catch (e) { if (!active.signal.aborted) setError(e instanceof Error ? e.message : 'Analysis failed.'); else setError('Analysis cancelled or timed out. Please retry.'); }
    finally { clearTimeout(timeout); setThinking(false); }
  }
  function download() {
    const link = document.createElement('a');
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    link.download = 'threadlab-measurement.json'; document.body.appendChild(link); link.click(); link.remove();
  }
  const speedup = result ? result.single.wallMs / result.multi.wallMs : 0;
  const longest = result ? Math.max(result.single.wallMs, result.multi.wallMs) : 1;
  const reveal = { initial: { opacity: 0, y: reduced ? 0 : 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55 } };
  return <>
    <a className="skip" href="#lab">Skip to experiment</a>
    <header className="nav wrap"><a href="#" className="brand" aria-label="Threadlab home"><span className="brand-icon">╋</span> threadlab<span className="brand-dot">®</span></a><nav aria-label="Main navigation"><a href="#lab">The lab</a><a href="#method">How it works</a><a className="nav-github" href="https://github.com/PranavShripannavar/os-assignment-2" target="_blank" rel="noreferrer">Source <Arrow /></a></nav></header>
    <main>
      <section className="hero wrap">
        <motion.div {...reveal} className="hero-copy"><div className="eyebrow"><span className="status-dot" /> SYSTEMS, IN MOTION <span className="tag">VOL. 02</span></div><h1>One dataset.<br />Many threads.<br /><span>See the difference.</span></h1><p>Split the work. Watch it run. Find out when<br className="desktop-break" /> parallel processing actually pays off.</p><a className="button primary hero-button" href="#lab">Enter the lab <Arrow /></a><div className="hero-note"><span>REAL WORKERS</span><i /><span>REAL MEASUREMENTS</span></div></motion.div>
        <motion.div className="machine" role="img" style={{ y: reduced ? 0 : drift }} aria-label="Diagram: a dataset splits into four parallel worker threads and combines into a verified result"><div className="machine-top"><span>PARALLEL EXECUTION ENGINE</span><span className="machine-code">TL / 004</span></div><div className="input-chip"><span className="chip-icon">▦</span><div>Sensor dataset<small>10,000 independent windows</small></div><span className="chip-count">IN</span></div><div className="split-line"><span>PARTITION</span></div><div className="worker-art">{[1,2,3,4].map((n) => <div className="art-track" key={n}><span className="track-no">0{n}</span><div className="thread-chip"><span className="thread-symbol">↳</span><strong>W{n}</strong><div className="signal-bars">{[1,2,3,4,5].map(i => <span key={i} style={{ animationDelay: `${(n+i)*.2}s` }} />)}</div></div><span className="track-end">●</span></div>)}</div><div className="merge-line" /><div className="output-chip"><span>✓</span> One verified result <small>MERGE</small></div><div className="machine-bottom"><span><i /> ISOLATED MEMORY</span><span>MESSAGE PASSING ↗</span></div></motion.div>
      </section>
      <div className="spec-strip"><div className="wrap"><span><b>01</b> PARTITION THE DATA</span><span>↗</span><span><b>02</b> PROCESS IN PARALLEL</span><span>↗</span><span><b>03</b> COMPARE THE COST</span></div></div>
      <section id="lab" className="lab wrap section">
        <motion.div {...reveal} className="section-heading"><div><div className="eyebrow">01 / THE EXPERIMENT</div><h2>Less theory.<br /><span>More threads.</span></h2></div><p>Your browser. Your hardware. Actual execution.<br />Start with 10,000 records and see what changes.</p></motion.div>
        <div className="lab-grid">
          <aside className="config panel"><div className="panel-title"><h3>Configure workload</h3><span>01—03</span></div><fieldset disabled={!!progress || thinking}><label htmlFor="records">01 <span>Sensor records</span></label><select id="records" value={records} onChange={e => setRecords(+e.target.value)}>{[1000,10000,50000,100000].map(n => <option key={n} value={n}>{number(n)} records</option>)}</select><label htmlFor="threads">02 <span>Worker threads</span></label><div className="segmented" role="group" aria-label="Worker threads">{[2,4,8].map(n => <button key={n} aria-pressed={threads===n} onClick={() => setThreads(n)}>{n}<small>threads</small></button>)}</div><label htmlFor="bands">03 <span>Feature complexity</span></label><select id="bands" value={bands} onChange={e => setBands(+e.target.value)}><option value={8}>Light · 8 frequency bands</option><option value={32}>Balanced · 32 frequency bands</option><option value={64}>Heavy · 64 frequency bands</option></select></fieldset><div className="device-note"><span className="status-dot" />{cores ? `${cores} logical processors reported` : 'Detecting browser capabilities'}<small>Worker count does not guarantee core allocation.</small></div>{progress ? <button className="button cancel" onClick={() => controller.current?.abort()}>Cancel benchmark <span>×</span></button> : <button className="button primary run-button" onClick={run} disabled={thinking}>Run benchmark <Arrow /></button>}<p className="config-foot">Same data. Same algorithm. One worker vs. {threads}.<br />Results include worker startup and transfer.</p></aside>
          <div className="results panel" aria-busy={!!progress}><div className="panel-title"><h3>Execution overview</h3><span className={`live-status ${progress ? 'running' : ''}`}><i />{progress ? 'RUNNING' : result ? 'COMPLETE' : 'READY'}</span></div>
            {!result && !progress && <div className="empty-state"><div className="empty-symbol">↳<span>↳</span></div><h3>A little parallel thinking.</h3><p>Run an experiment to reveal execution times,<br />thread allocations and a verified comparison.</p><div className="empty-details"><span>SEED 42</span><span>16 SAMPLES / RECORD</span><span>NO SIMULATED TIMINGS</span></div></div>}
            {progress && <div className="empty-state" role="status"><div className="processing-orbit" /><h3>{progress.stage==='single' ? 'Establishing the baseline.' : 'Dividing the work.'}</h3><p>{progress.stage==='single' ? 'One worker processes the entire dataset.' : `${progress.total} workers process independent partitions.`}</p><span className="mono">{progress.completed} / {progress.total} workers completed</span><p className="small">The UI stays responsive while background threads compute.</p></div>}
            {result && <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}><div className="metric-row"><div><span>SINGLE THREAD</span><strong>{result.single.wallMs.toFixed(1)}<small>ms</small></strong></div><div><span>{result.threads} THREADS</span><strong>{result.multi.wallMs.toFixed(1)}<small>ms</small></strong></div><div className="accent-metric"><span>RELATIVE SPEED</span><strong>{speedup.toFixed(2)}<small>×</small></strong></div></div><div className="comparison-chart" role="img" aria-label="End-to-end elapsed time comparison">{[{ label:'Single thread', run:result.single, style:'baseline' },{ label:`${result.threads} threads`, run:result.multi, style:'parallel' }].map(row => <div className="bar-row" key={row.label}><div><span>{row.label}</span><strong>{ms(row.run.wallMs)}</strong></div><div className="bar-track"><motion.div className={row.style} initial={{ width:0 }} animate={{ width:`${Math.max(1,row.run.wallMs/longest*100)}%` }} transition={{ duration:reduced ? 0 : .7 }} /></div></div>)}<span className="chart-caption">END-TO-END ELAPSED TIME · LOWER IS BETTER</span></div><div className={`verdict ${!result.equal ? 'failed' : ''}`}><span className="verdict-icon">{result.equal ? '✓' : '!'}</span><div><strong>{!result.equal ? 'Output mismatch — comparison invalid' : speedup>=1 ? `Parallel execution is ${speedup.toFixed(2)}× as fast.` : `More threads took ${((1/speedup-1)*100).toFixed(1)}% longer.`}</strong><p>{result.equal ? 'Identical record counts, energy checksum and anomaly count.' : 'Do not interpret timings until the output mismatch is resolved.'}</p></div></div><div className="result-actions"><span>{number(result.records)} RECORDS · {result.bands} BANDS</span><button onClick={download}>Export measurement ↓</button></div></motion.div>}
          </div>
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        {result && <motion.div {...reveal} className="thread-section"><div className="subheading"><h3>Every thread. Accounted for.</h3><span>LAST COMPLETED RUN / {result.threads} WORKERS</span></div><div className="thread-grid">{result.multi.chunks.map(chunk => <motion.article whileHover={reduced ? {} : { y:-5 }} className="thread-card" key={chunk.id}><div className="thread-card-head"><span>WORKER 0{chunk.id+1}</span><span className="complete-badge">✓ COMPLETE</span></div><strong>{number(chunk.count)}<small>records processed</small></strong><div className="allocation-line"><i style={{ left:`${chunk.start/result.records*100}%`,width:`${chunk.count/result.records*100}%` }} /></div><dl><div><dt>Record range</dt><dd>{number(chunk.start+1)}–{number(chunk.end)}</dd></div><div><dt>Compute time</dt><dd>{ms(chunk.computeMs)}</dd></div><div><dt>Anomalies</dt><dd>{number(chunk.anomalies)}</dd></div><div><dt>Checksum</dt><dd>{number(chunk.checksum)}</dd></div></dl></motion.article>)}</div><div className="baseline-note"><strong>Baseline worker</strong><span>Records 1–{number(result.records)}</span><span>{ms(result.single.chunks[0].computeMs)} compute</span><span>✓ {number(result.single.count)} processed</span></div><div className="integrity"><span>OUTPUT INTEGRITY</span><p>Energy checksum <b>{number(result.multi.checksum)}</b> <i>·</i> Anomalies <b>{number(result.multi.anomalies)}</b> <i>·</i> Non-kernel elapsed time <b>{ms(Math.max(0,result.multi.wallMs-Math.max(...result.multi.chunks.map(c=>c.computeMs))))}</b></p><small>Non-kernel time is wall time minus the longest worker computation. It includes startup, copying, loading, communication and scheduling; it is not an isolated overhead measurement.</small></div></motion.div>}
      </section>
      <section className="analysis-section"><div className="wrap analysis-grid"><div><div className="eyebrow">02 / MAKE SENSE OF IT</div><h2>Numbers tell a story.<br /><span>Understand yours.</span></h2><p>Gemini interprets your measured run and connects<br className="desktop-break" /> the results to real AI data pipelines.</p><button className="button light" onClick={analyze} disabled={!result || !!progress || thinking}>{thinking ? 'Reading the results…' : analysis ? 'Analyze again' : 'Analyze this run'} <Arrow /></button><small className="analysis-note">{!result ? 'Run a benchmark to unlock analysis.' : 'Only benchmark measurements are sent for analysis.'}</small></div><div className="analysis-content" aria-live="polite">{analysis ? <><div className="model-label">GEMINI / {model}</div><div className="markdown"><Markdown>{analysis}</Markdown></div></> : <><span className="quote-mark">“</span><h3>{thinking ? 'Connecting the measurements to the mechanics.' : 'Faster isn’t a promise. It’s a measurement.'}</h3><p>{thinking ? 'Examining workload size, thread overhead and the limits of this trial…' : 'More threads can help. Startup costs, scheduling and smaller workloads can change the answer. Measure first.'}</p><span className="model-label">{thinking ? 'ANALYSIS IN PROGRESS' : 'AN EXPERIMENT, NOT AN ASSUMPTION'}</span></>}</div></div></section>
      <section id="method" className="wrap section method"><div className="section-heading"><div><div className="eyebrow">03 / UNDER THE HOOD</div><h2>Parallel, by design.</h2></div><p>Independent work. Isolated memory.<br />A shared goal, without shared state.</p></div><div className="method-grid">{[{n:'01',icon:'▦',title:'Prepare the signal',text:'A seeded generator creates sensor windows with 16 samples each. Every run uses exactly the same input. Dataset generation happens before timing starts.'},{n:'02',icon:'⑂',title:'Split. Process. Merge.',text:'Contiguous, balanced partitions go to dedicated Web Workers. Each extracts spectral energy and flags anomalies. Message passing returns results; workers are then terminated.'},{n:'03',icon:'≋',title:'Compare honestly',text:'One cold worker runs first, then N cold workers. Wall time includes startup, loading, copying and result delivery. Repeat trials: cache, JIT and system activity can affect a single result.'}].map(item => <motion.article {...reveal} whileHover={reduced ? {} : { y:-5 }} key={item.n}><div className="method-card-top"><span>{item.n}</span><span>{item.icon}</span></div><h3>{item.title}</h3><p>{item.text}</p></motion.article>)}</div><div className="os-note"><span>THE OS CONNECTION</span><p>Thread lifecycle → workload partitioning → concurrent execution → completion and cleanup.<br />The same pattern powers parallel feature preprocessing in machine-learning pipelines.</p><a href="https://github.com/PranavShripannavar/os-assignment-2#methodology" target="_blank" rel="noreferrer">Read methodology <Arrow /></a></div></section>
    </main><footer className="wrap"><div className="footer-main"><a href="#" className="brand"><span className="brand-icon">╋</span> threadlab</a><span>BUILT TO MAKE SYSTEMS VISIBLE.</span><a href="#">Back to top ↑</a></div><div className="student"><span>Pranav Shripannavar · PRN 202501110195</span><span>Division C · Batch C2 · OS · Assignment 2</span></div></footer>
  </>;
}
