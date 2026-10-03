"""Summarize k6's export with an explicit duration for the fixed-load phase."""
import json
import sys
from pathlib import Path

summary_path, mode, vus, ramp_seconds, hold_seconds, exit_code = sys.argv[1:]
path = Path(summary_path)
metadata = {
    'mode': mode,
    'configured_vus': 1 if mode == 'smoke' else int(vus),
    'ramp_seconds': int(ramp_seconds),
    'hold_seconds': int(hold_seconds),
    'k6_exit_code': int(exit_code),
    'workload': 'Three authenticated REST reads, sequential with think time',
    'success_definition': 'HTTP 200 and JSON object without explicit success=false',
}
if not path.exists():
    print(f'No k6 summary export; exit code {exit_code}. Check the .log report.')
    sys.exit(0)

data = json.loads(path.read_text())
metrics = data.get('metrics', {})

def values(name):
    metric = metrics.get(name, {})
    # k6 summary-export uses flat values; handleSummary uses nested values.
    return metric.get('values', metric)

def latency(value):
    return 'N/A' if value is None else f'{value:.2f} ms'

print('\nNRAPP LOAD TEST REPORT')
print(f'k6 exit code: {exit_code}; configured VUs: {metadata["configured_vus"]}')
if mode == 'load':
    count = values('hold_requests').get('count', 0)
    success = values('hold_success').get('rate', values('hold_success').get('value'))
    durations = values('hold_duration')
    requests = values('http_reqs')
    overall_rate = requests.get('rate', 0)
    # k6's Counter rate divides count by elapsed test duration. This script has
    # no setup/teardown HTTP requests, so http_reqs gives the same run window.
    elapsed_seconds = requests.get('count', 0) / overall_rate if overall_rate else None
    hold_complete = int(exit_code) == 0 or (
        elapsed_seconds is not None and elapsed_seconds >= int(ramp_seconds) + int(hold_seconds)
    )
    metadata['elapsed_test_seconds'] = elapsed_seconds
    metadata['hold_phase_completed'] = hold_complete
    metadata['all_thresholds_passed'] = int(exit_code) == 0
    metadata['hold_completed_responses'] = count
    metadata['hold_rps'] = count / int(hold_seconds) if hold_complete else None
    metadata['hold_success_percent'] = success * 100 if success is not None else None
    metadata['hold_p95_ms'] = durations.get('p(95)')
    metadata['hold_p99_ms'] = durations.get('p(99)')
    endpoint_durations = {
        name: values(f'hold_duration_{name}')
        for name in ('profile', 'my_tasks', 'chats')
    }
    metadata['hold_endpoints_ms'] = {
        name: {'p95': metric.get('p(95)'), 'p99': metric.get('p(99)')}
        for name, metric in endpoint_durations.items()
    }
    print(f'Fixed-load phase: {hold_seconds}s; completed responses: {count}')
    if hold_complete:
        print(f'Fixed-load RPS: {metadata["hold_rps"]:.2f}')
    else:
        print('Fixed-load interval not completed; no full-interval RPS reported.')
    if int(exit_code) != 0:
        print('Thresholds failed or run interrupted. These observations do not establish passing capacity.')
    print('Fixed-load success: ' + ('N/A' if success is None else f'{success * 100:.2f}%'))
    print(f'Fixed-load p95: {latency(durations.get("p(95)"))}')
    print(f'Fixed-load p99: {latency(durations.get("p(99)"))}')
    for name, metric in endpoint_durations.items():
        if metric:
            print(f'  {name} p95/p99: {latency(metric.get("p(95)"))} / {latency(metric.get("p(99)"))}')
else:
    durations = values('http_req_duration')
    print(f'Overall p95: {latency(durations.get("p(95)"))}')
    print(f'Overall p99: {latency(durations.get("p(99)"))}')

metadata_path = path.with_suffix('.measurement.json')
metadata_path.write_text(json.dumps(metadata, indent=2) + '\n')
print(f'Measurement: {metadata_path}')
print(f'Full summary: {path}')
