#!/usr/bin/env python3
"""Read-only sequential /health probe with one reusable HTTP connection."""

import argparse
import json
import math
import socket
import statistics
import time

import requests


def percentile(values, fraction):
    ordered = sorted(values)
    return round(ordered[math.ceil(len(ordered) * fraction) - 1], 2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--delay", type=float, default=0.1)
    parser.add_argument("--resolve-ip", help="map the URL hostname to this IP without changing system DNS")
    args = parser.parse_args()
    if args.count < 2 or args.delay < 0:
        parser.error("count must be >=2 and delay >=0")

    session = requests.Session()
    session.trust_env = False
    if args.resolve_ip:
        from urllib.parse import urlsplit

        target_host = urlsplit(args.url).hostname
        original_getaddrinfo = socket.getaddrinfo

        def resolve_for_probe(host, *resolver_args, **resolver_kwargs):
            if host == target_host:
                host = args.resolve_ip
            return original_getaddrinfo(host, *resolver_args, **resolver_kwargs)

        socket.getaddrinfo = resolve_for_probe
    samples = []
    for index in range(args.count):
        started = time.perf_counter()
        response = session.get(args.url, timeout=10)
        response.content
        elapsed_ms = (time.perf_counter() - started) * 1000
        samples.append({"index": index, "status": response.status_code,
                        "duration_ms": round(elapsed_ms, 2)})
        if args.delay:
            time.sleep(args.delay)

    durations = [sample["duration_ms"] for sample in samples[1:]]
    print(json.dumps({
        "url": args.url,
        "count": len(samples),
        "first_ms": samples[0]["duration_ms"],
        "warm_count": len(durations),
        "warm_median_ms": round(statistics.median(durations), 2),
        "warm_p95_ms": percentile(durations, 0.95),
        "warm_p99_ms": percentile(durations, 0.99),
        "warm_max_ms": max(durations),
        "warm_over_500_ms": sum(value > 500 for value in durations),
        "statuses": sorted(set(sample["status"] for sample in samples)),
        "slowest": sorted(samples[1:], key=lambda sample: sample["duration_ms"], reverse=True)[:5],
    }, indent=2))


if __name__ == "__main__":
    main()
