#!/usr/bin/env python3
"""Generate an HTML dashboard from pipeline logs and metrics."""

import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

METRICS_FILE = Path(__file__).parent / "metrics.json"
LOG_FILE = Path(__file__).parent / "logs" / "pipeline.log"
OUTPUT_FILE = Path(__file__).parent / "dashboard.html"

def load_metrics():
    if not METRICS_FILE.exists():
        return {}
    with open(METRICS_FILE, "r") as f:
        return json.load(f)

def load_logs():
    if not LOG_FILE.exists():
        return []
    entries = []
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except Exception:
                continue
    return entries

def build_time_series(logs):
    """Build pass/fail per run and cost timeline from logs."""
    runs = defaultdict(lambda: {"passed": 0, "failed": 0, "cost": 0.0, "repairs": 0})
    current_run = None

    for entry in logs:
        ts = entry.get("timestamp")
        msg = entry.get("message", "")
        logger_name = entry.get("logger", "")

        # Heuristic: new run starts with "Orchestrator started"
        if "Orchestrator started" in msg:
            current_run = ts[:19] if ts else "unknown"
            runs[current_run]  # ensure key exists

        if current_run is None:
            continue

        # Parse test results from tool logs
        if "tests.passed" in msg:
            # message format: "tests.passed" increment, but we need to extract number
            # We'll just increment from metrics file later; logs only show increments
            pass
        # For cost: we have "LLM call: ... cost $0.XXXX" in cost_tracker logs
        if "cost $" in msg and "LLM call" in msg:
            try:
                cost_part = msg.split("cost $")[-1].strip()
                runs[current_run]["cost"] += float(cost_part)
            except Exception:
                pass

        # Repair attempts: "Repair node started"
        if "Repair node started" in msg:
            runs[current_run]["repairs"] += 1

    # Convert to sorted list for chart
    sorted_runs = sorted(runs.items())
    labels = [r[0][:19] for r in sorted_runs]
    repairs = [r[1]["repairs"] for r in sorted_runs]
    costs = [round(r[1]["cost"], 4) for r in sorted_runs]
    return labels, repairs, costs

def build_html(metrics, labels, repairs, costs):
    total_tests = metrics.get("tests.executed", 0)
    passed = metrics.get("tests.passed", 0)
    failed = metrics.get("tests.failed", 0)
    total_repairs = metrics.get("repairs.attempted", 0)
    total_cost = metrics.get("llm.cost_dollars", 0)
    rag_hits = metrics.get("rag.hits", 0)
    rag_retrievals = metrics.get("rag.retrievals", 0)
    rag_rate = (rag_hits / rag_retrievals * 100) if rag_retrievals else 0

    html = f"""<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <title>Test Automation Pipeline Dashboard</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; background: #f5f5f5; }}
        .card {{ background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }}
        .stat {{ text-align: center; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; }}
        .stat-label {{ color: #666; font-size: 0.9rem; text-transform: uppercase; }}
        canvas {{ max-width: 100%; margin-top: 1rem; }}
        h2 {{ margin-top: 0; }}
      </style>
      </head>
      <body>
      <h1>Test Automation Pipeline Dashboard</h1>
      <div class="grid">
        <div class="card stat">
          <div class="stat-value">{total_tests}</div>
          <div class="stat-label">Tests Executed</div>
        </div>
        <div class="card stat">
          <div class="stat-value" style="color:green">{passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="card stat">
          <div class="stat-value" style="color:red">{failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="card stat">
          <div class="stat-value">{total_repairs}</div>
          <div class="stat-label">Repairs Attempted</div>
        </div>
        <div class="card stat">
          <div class="stat-value">${total_cost:.4f}</div>
          <div class="stat-label">LLM Cost</div>
        </div>
        <div class="card stat">
          <div class="stat-value">{rag_rate:.1f}%</div>
          <div class="stat-label">RAG Hit Rate</div>
        </div>
      </div>

      <div class="card">
        <h2>Repair Attempts per Run</h2>
        <canvas id="repairChart"></canvas>
      </div>

      <div class="card">
        <h2>LLM Cost per Run (USD)</h2>
        <canvas id="costChart"></canvas>
      </div>

      <script>
      const labels = {json.dumps(labels)};
      new Chart(document.getElementById('repairChart'), {{
        type: 'bar',
        data: {{
          labels: labels,
          datasets: [{{
            label: 'Repairs',
            data: {json.dumps(repairs)},
            backgroundColor: '#f39c12'
          }}]
        }}
      }});

      new Chart(document.getElementById('costChart'), {{
        type: 'line',
        data: {{
          labels: labels,
          datasets: [{{
            label: 'Cost $',
            data: {json.dumps(costs)},
            borderColor: '#3498db',
            fill: false
          }}]
        }}
      }});
      </script>
      </body>
      </html>"""
    return html

def main():
    metrics = load_metrics()
    logs = load_logs()
    labels, repairs, costs = build_time_series(logs)
    html = build_html(metrics, labels, repairs, costs)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Dashboard generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()