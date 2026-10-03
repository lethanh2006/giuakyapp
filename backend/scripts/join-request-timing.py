#!/usr/bin/env python3
"""Join NRApp k6, Nginx and Gateway timing logs by response request ID.

The output contains timing fields only. It does not copy URLs, tokens or bodies.
Missing columns stay blank; a partial join must not be interpreted as a trace.
"""

import argparse
import csv
import json
import math
import re
from pathlib import Path


NGINX_FIELD = re.compile(r"(\w+)=([^\s]+)")
K6_MESSAGE = re.compile(r'msg="((?:[^"\\]|\\.)*)"')
FIELDS = [
    "request_id", "k6_endpoint", "k6_status", "k6_duration_ms",
    "k6_waiting_ms", "k6_receiving_ms", "nginx_status",
    "nginx_total_ms", "nginx_upstream_ms", "nginx_connect_ms",
    "nginx_header_ms", "gateway_status", "gateway_total_ms",
    "gateway_auth_ms", "gateway_upstream_ms", "gateway_other_ms",
    "k6_minus_nginx_ms", "nginx_minus_gateway_ms", "k6_minus_gateway_ms",
]


def parse_k6(path):
    rows = {}
    if not path:
        return rows
    for line in path.read_text().splitlines():
        if "slow_response" not in line:
            continue
        try:
            match = K6_MESSAGE.search(line)
            payload = json.loads('"' + match.group(1) + '"') if match else line
            item = json.loads(payload)
        except (ValueError, UnicodeError, AttributeError):
            continue
        if item.get("event") != "slow_response" or not item.get("request_id"):
            continue
        rows[item["request_id"]] = {
            "k6_endpoint": item.get("endpoint", ""),
            "k6_status": item.get("status", ""),
            "k6_duration_ms": item.get("duration_ms", ""),
            "k6_waiting_ms": item.get("waiting_ms", ""),
            "k6_receiving_ms": item.get("receiving_ms", ""),
        }
    return rows


def parse_nginx(path):
    rows = {}
    if not path:
        return rows
    for line in path.read_text().splitlines():
        item = dict(NGINX_FIELD.findall(line))
        request_id = item.get("rid")
        if not request_id or request_id == "-":
            continue
        row = {"nginx_status": item.get("status", "")}
        for source, target in (
            ("total", "nginx_total_ms"),
            ("upstream", "nginx_upstream_ms"),
            ("connect", "nginx_connect_ms"),
            ("header", "nginx_header_ms"),
        ):
            try:
                row[target] = round(float(item[source]) * 1000, 2)
            except (KeyError, ValueError):
                pass
        rows[request_id] = row
    return rows


def parse_gateway(path):
    rows = {}
    if not path:
        return rows
    for line in path.read_text().splitlines():
        try:
            item = json.loads(line)
        except ValueError:
            continue
        if item.get("event.name") != "http.request.perf":
            continue
        request_id = item.get("request_id")
        if not request_id or request_id == "unknown":
            continue
        rows[request_id] = {
            "gateway_status": item.get("http.response.status_code", ""),
            "gateway_total_ms": item.get("total_ms", ""),
            "gateway_auth_ms": item.get("auth_ms", ""),
            "gateway_upstream_ms": item.get("upstream_ms", ""),
            "gateway_other_ms": item.get("other_ms", ""),
        }
    return rows


def difference(row, first, second):
    if row.get(first, "") == "" or row.get(second, "") == "":
        return ""
    try:
        return round(float(row[first]) - float(row[second]), 2)
    except (TypeError, ValueError):
        return ""


def describe(name, rows):
    values = sorted(float(row[name]) for row in rows if row.get(name, "") != "")
    if not values:
        return f"{name}: 0 samples"
    return (
        f"{name}: n={len(values)} median={values[(len(values)-1)//2]:.2f} "
        f"p95={values[math.ceil(0.95*len(values))-1]:.2f} "
        f"p99={values[math.ceil(0.99*len(values))-1]:.2f} "
        f">500ms={sum(value > 500 for value in values)}"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--k6-log", type=Path)
    parser.add_argument("--nginx-log", type=Path)
    parser.add_argument("--gateway-log", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not any((args.k6_log, args.nginx_log, args.gateway_log)):
        parser.error("provide at least one log")

    k6 = parse_k6(args.k6_log)
    nginx = parse_nginx(args.nginx_log)
    gateway = parse_gateway(args.gateway_log)
    ids = k6.keys() if args.k6_log else (nginx.keys() if args.nginx_log else gateway.keys())
    output = []
    for request_id in ids:
        row = {"request_id": request_id}
        row.update(k6.get(request_id, {}))
        row.update(nginx.get(request_id, {}))
        row.update(gateway.get(request_id, {}))
        row["k6_minus_nginx_ms"] = difference(row, "k6_duration_ms", "nginx_total_ms")
        row["nginx_minus_gateway_ms"] = difference(row, "nginx_total_ms", "gateway_total_ms")
        row["k6_minus_gateway_ms"] = difference(row, "k6_duration_ms", "gateway_total_ms")
        output.append(row)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(output)
    print(f"k6 IDs={len(k6)}, Nginx IDs={len(nginx)}, Gateway IDs={len(gateway)}")
    print(f"output rows={len(output)}, matched Nginx={sum(id in nginx for id in ids)}, "
          f"matched Gateway={sum(id in gateway for id in ids)}")
    for field in ("k6_duration_ms", "nginx_total_ms", "nginx_upstream_ms", "gateway_total_ms"):
        print(describe(field, output))
    print(f"CSV: {args.output}")


if __name__ == "__main__":
    main()
