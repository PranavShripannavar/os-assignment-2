"""Assignment 2: actual native Python threads; standard library only.
Run: python python/benchmark.py --records 10000 --threads 4 --bands 32
CPython's GIL usually limits this pure-Python CPU workload. No speedup is assumed.
"""
import argparse
import json
import math
import threading
import time
from concurrent.futures import ThreadPoolExecutor


def dataset(count):
    state = 42
    values = []
    for _ in range(count * 16):
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        values.append(state / 4294967296)
    return values


def process(values, start, end, bands, barrier=None):
    if barrier:
        barrier.wait()
    began = time.perf_counter()
    checksum = anomalies = 0
    for record in range(start, end):
        energy = 0
        for band in range(1, bands + 1):
            real = imaginary = 0
            for sample in range(16):
                phase = 2 * math.pi * band * sample / (2 * bands)
                centered = values[record * 16 + sample] - 0.5
                real += centered * math.cos(phase)
                imaginary += centered * math.sin(phase)
            energy += (real * real + imaginary * imaginary) / 16
        score = energy / bands
        checksum += math.floor(score * 1e6 + 0.5)
        anomalies += score > 0.1
    return dict(start=start, end=end, count=end-start, threadId=threading.get_native_id(),
                checksum=checksum, anomalies=anomalies, computeMs=(time.perf_counter()-began)*1000)


def benchmark(count, threads, bands):
    values = dataset(count)
    began = time.perf_counter()
    single = process(values, 0, count, bands)
    single_ms = (time.perf_counter()-began)*1000
    barrier = threading.Barrier(threads)
    began = time.perf_counter()
    with ThreadPoolExecutor(max_workers=threads) as pool:
        futures = [pool.submit(process, values, i*count//threads, (i+1)*count//threads, bands, barrier)
                   for i in range(threads)]
        chunks = [future.result() for future in futures]
    multi_ms = (time.perf_counter()-began)*1000
    equal = all(sum(c[key] for c in chunks) == single[key] for key in ('count', 'checksum', 'anomalies'))
    return dict(records=count, threads=threads, bands=bands, singleMs=single_ms, multiMs=multi_ms,
                speedup=single_ms/multi_ms, equal=equal, single=single, workers=chunks,
                methodology='Python main-thread baseline vs native worker threads. Dataset generation excluded. Parallel time includes pool creation, barrier synchronization and shutdown. GIL may prevent CPU parallelism.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--records', type=int, default=10000)
    parser.add_argument('--threads', type=int, choices=[2, 4, 8], default=4)
    parser.add_argument('--bands', type=int, choices=[8, 32, 64], default=32)
    args = parser.parse_args()
    if not 1000 <= args.records <= 100000:
        parser.error('records must be between 1000 and 100000')
    result = benchmark(args.records, args.threads, args.bands)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result['equal'] else 1)
