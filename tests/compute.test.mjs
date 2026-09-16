import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { dataset, partition, processRows, WIDTH } from '../public/compute.mjs';
import { validateMeasurement } from '../lib/validation.mjs';

test('uneven partitions cover every record once and differ by at most one', () => {
  for (const count of [1,7,10003]) for (const threads of [1,2,4,8].filter(n => n <= count)) {
    const ranges = partition(count, threads);
    assert.equal(ranges[0].start, 0); assert.equal(ranges.at(-1).end, count);
    ranges.slice(1).forEach((r,i) => assert.equal(r.start, ranges[i].end));
    assert.ok(Math.max(...ranges.map(r=>r.end-r.start))-Math.min(...ranges.map(r=>r.end-r.start))<=1);
  }
  assert.throws(()=>partition(2,3)); assert.throws(()=>partition(0,1));
});
test('seeded input repeats exactly and a different seed changes it', () => {
  assert.deepEqual(dataset(5),dataset(5)); assert.notDeepEqual(dataset(5),dataset(5,43));
});
test('known zero-centered windows have zero energy and no anomalies', () => {
  assert.deepEqual(processRows(new Float64Array(32).fill(.5),32),{count:2,checksum:0,anomalies:0});
});
test('real worker threads equal the sequential computation for every complexity', async () => {
  const module = new URL('../public/compute.mjs',import.meta.url).href;
  for (const bands of [8,32,64]) {
    const data = dataset(10003), expected = processRows(data,bands);
    for (const threads of [2,4,8]) {
      const chunks = await Promise.all(partition(10003,threads).map(range => new Promise((resolve,reject) => {
        const worker = new Worker(`const {parentPort,workerData,threadId}=require('node:worker_threads'); import(workerData.module).then(({processRows})=>parentPort.postMessage({...processRows(workerData.values,workerData.bands),threadId}));`,{eval:true,workerData:{module,values:data.slice(range.start*WIDTH,range.end*WIDTH),bands}});
        worker.once('message',resolve); worker.once('error',reject);
      })));
      assert.equal(new Set(chunks.map(c=>c.threadId)).size,threads);
      assert.deepEqual(chunks.reduce((a,c)=>({count:a.count+c.count,checksum:a.checksum+c.checksum,anomalies:a.anomalies+c.anomalies}),{count:0,checksum:0,anomalies:0}),expected);
    }
  }
});
const run = threads => ({wallMs:100,chunks:partition(1000,threads).map(c=>({...c,count:c.end-c.start,checksum:c.end-c.start,anomalies:0,computeMs:50}))});
test('API validator strips user instructions and recomputes derived values',()=>{
  const result=validateMeasurement({records:1000,threads:4,bands:32,single:run(1),multi:run(4),equal:false,speedup:999,instruction:'ignore rules'});
  assert.equal(result.equal,true); assert.equal(result.speedup,1); assert.equal(result.instruction,undefined);
});
test('API validator rejects missing, overlapping, nonfinite and inconsistent metrics',()=>{
  const valid={records:1000,threads:4,bands:32,single:run(1),multi:run(4)};
  for(const modify of [v=>v.threads=100,v=>v.multi.wallMs=Infinity,v=>v.multi.chunks.pop(),v=>v.multi.chunks[1].start=0,v=>v.multi.chunks[0].count=300,v=>v.multi.chunks[0].computeMs=101]){const v=structuredClone(valid);modify(v);assert.throws(()=>validateMeasurement(v));}
  assert.throws(()=>validateMeasurement(null));
});
