"""
AINGO Benchmark Report Generator

Reads eval JSON results and generates a single-file HTML dashboard with charts.
Supports: retrieval eval, E2E eval, and optional RAGFlow comparison.

Usage:
    cd services/search-flow
    uv run python tests/benchmark_report.py

    # Custom paths:
    uv run python tests/benchmark_report.py \
        --retrieval ../embedding-service/tests/reports/eval_retrieval_results.json \
        --e2e tests/reports/eval_e2e_results.json \
        --ragflow tests/reports/eval_ragflow_results.json

Output:
    tests/reports/benchmark.html
"""

import argparse
import json
import os
import sys
from datetime import datetime

REPORT_DIR = os.path.join(os.path.dirname(__file__), "reports")

RETRIEVAL_DEFAULT = os.path.join(
    os.path.dirname(__file__), "..", "..", "embedding-service", "tests", "reports", "eval_retrieval_results.json"
)
E2E_DEFAULT = os.path.join(REPORT_DIR, "eval_e2e_results.json")
RAGFLOW_DEFAULT = os.path.join(REPORT_DIR, "eval_ragflow_results.json")


def load_json(path: str) -> dict | None:
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def generate_html(retrieval: dict | None, e2e: dict | None, ragflow: dict | None) -> str:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Prepare data for JS
    retrieval_json = json.dumps(retrieval) if retrieval else "null"
    e2e_json = json.dumps(e2e) if e2e else "null"
    ragflow_json = json.dumps(ragflow) if ragflow else "null"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AINGO Benchmark Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Inter', -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }}
  .header {{ background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 2rem; border-bottom: 1px solid #334155; }}
  .header h1 {{ font-size: 1.8rem; font-weight: 700; color: #f8fafc; }}
  .header .meta {{ color: #94a3b8; font-size: 0.85rem; margin-top: 0.5rem; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 1.5rem; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }}
  .card {{ background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }}
  .card h3 {{ font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }}
  .metric {{ font-size: 2.5rem; font-weight: 700; }}
  .metric.good {{ color: #34d399; }}
  .metric.warn {{ color: #fbbf24; }}
  .metric.bad {{ color: #f87171; }}
  .metric-sub {{ font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }}
  .chart-container {{ background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; margin-bottom: 1.5rem; }}
  .chart-container h2 {{ font-size: 1.1rem; margin-bottom: 1rem; color: #f1f5f9; }}
  .chart-wrap {{ position: relative; height: 300px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th {{ text-align: left; padding: 0.75rem; color: #94a3b8; border-bottom: 2px solid #334155; font-weight: 600; }}
  td {{ padding: 0.75rem; border-bottom: 1px solid #1e293b; }}
  tr:hover td {{ background: #1e293b; }}
  .tag {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }}
  .tag-hit {{ background: #064e3b; color: #34d399; }}
  .tag-miss {{ background: #7f1d1d; color: #f87171; }}
  .section-title {{ font-size: 1.3rem; font-weight: 700; margin: 2rem 0 1rem; color: #f1f5f9; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; }}
  .empty-state {{ text-align: center; padding: 3rem; color: #64748b; }}
  .comparison {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }}
  @media (max-width: 768px) {{ .comparison {{ grid-template-columns: 1fr; }} }}
</style>
</head>
<body>

<div class="header">
  <h1>🔬 AINGO Benchmark Report</h1>
  <div class="meta">Generated: {timestamp}</div>
</div>

<div class="container" id="app">
  <div id="retrieval-section"></div>
  <div id="e2e-section"></div>
  <div id="comparison-section"></div>
</div>

<script>
const retrievalData = {retrieval_json};
const e2eData = {e2e_json};
const ragflowData = {ragflow_json};

function metricClass(val, good=0.8, warn=0.5) {{
  if (val >= good) return 'good';
  if (val >= warn) return 'warn';
  return 'bad';
}}

function pct(val) {{ return (val * 100).toFixed(1) + '%'; }}

// ============================================================
// RETRIEVAL SECTION
// ============================================================
function renderRetrieval() {{
  const el = document.getElementById('retrieval-section');
  if (!retrievalData) {{ el.innerHTML = '<div class="empty-state">No retrieval eval data found.</div>'; return; }}

  const s = retrievalData.summary;
  const kValues = Object.keys(s.avg_recall_at_k).map(Number).sort((a,b) => a-b);

  let html = '<h2 class="section-title">📚 Embedding Service — Retrieval Eval</h2>';

  // KPI Cards
  html += '<div class="grid">';
  html += `<div class="card"><h3>MRR</h3><div class="metric ${{metricClass(s.mrr)}}">${{(s.mrr).toFixed(4)}}</div><div class="metric-sub">Mean Reciprocal Rank</div></div>`;
  const r5 = s.avg_recall_at_k['5'] || 0;
  html += `<div class="card"><h3>Recall@5</h3><div class="metric ${{metricClass(r5)}}">${{pct(r5)}}</div><div class="metric-sub">With reranking</div></div>`;
  const p5 = s.avg_precision_at_k['5'] || 0;
  html += `<div class="card"><h3>Precision@5</h3><div class="metric ${{metricClass(p5)}}">${{pct(p5)}}</div><div class="metric-sub">With reranking</div></div>`;
  html += `<div class="card"><h3>Avg Latency</h3><div class="metric good">${{s.avg_latency_ms.toFixed(0)}}ms</div><div class="metric-sub">No-rerank: ${{s.avg_latency_no_rerank_ms.toFixed(0)}}ms</div></div>`;
  html += '</div>';

  // Recall@K chart
  html += '<div class="chart-container"><h2>Recall@K / Precision@K</h2><div class="chart-wrap"><canvas id="recallChart"></canvas></div></div>';

  // Reranking impact chart
  html += '<div class="chart-container"><h2>Reranking Impact (Δ Recall)</h2><div class="chart-wrap"><canvas id="rerankChart"></canvas></div></div>';

  // Per-query table
  html += '<div class="chart-container"><h2>Per-Query Results</h2><table><thead><tr><th>Query</th><th>Category</th><th>RR</th><th>R@5</th><th>Latency</th></tr></thead><tbody>';
  for (const q of retrievalData.per_query) {{
    const rr = q.reciprocal_rank;
    html += `<tr><td>${{q.query.substring(0,60)}}</td><td><span class="tag tag-hit">${{q.category}}</span></td><td class="${{metricClass(rr)}}">${{rr.toFixed(2)}}</td><td>${{pct(q.recall_at_k['5'] || 0)}}</td><td>${{q.latency_ms.toFixed(0)}}ms</td></tr>`;
  }}
  html += '</tbody></table></div>';

  el.innerHTML = html;

  // Render charts
  const recallLabels = kValues.map(k => '@' + k);
  new Chart(document.getElementById('recallChart'), {{
    type: 'bar',
    data: {{
      labels: recallLabels,
      datasets: [
        {{ label: 'Recall (reranked)', data: kValues.map(k => s.avg_recall_at_k[k] || 0), backgroundColor: '#34d399' }},
        {{ label: 'Precision (reranked)', data: kValues.map(k => s.avg_precision_at_k[k] || 0), backgroundColor: '#60a5fa' }},
        {{ label: 'Recall (no rerank)', data: kValues.map(k => s.avg_recall_no_rerank_at_k[k] || 0), backgroundColor: '#94a3b8' }}
      ]
    }},
    options: {{ responsive: true, maintainAspectRatio: false, scales: {{ y: {{ beginAtZero: true, max: 1, ticks: {{ color: '#94a3b8' }} }}, x: {{ ticks: {{ color: '#94a3b8' }} }} }}, plugins: {{ legend: {{ labels: {{ color: '#e2e8f0' }} }} }} }}
  }});

  new Chart(document.getElementById('rerankChart'), {{
    type: 'bar',
    data: {{
      labels: recallLabels,
      datasets: [{{ label: 'Δ Recall from reranking', data: kValues.map(k => s.rerank_recall_delta[k] || 0), backgroundColor: kValues.map(k => (s.rerank_recall_delta[k] || 0) >= 0 ? '#34d399' : '#f87171') }}]
    }},
    options: {{ responsive: true, maintainAspectRatio: false, scales: {{ y: {{ ticks: {{ color: '#94a3b8' }} }}, x: {{ ticks: {{ color: '#94a3b8' }} }} }}, plugins: {{ legend: {{ labels: {{ color: '#e2e8f0' }} }} }} }}
  }});
}}

// ============================================================
// E2E SECTION
// ============================================================
function renderE2E() {{
  const el = document.getElementById('e2e-section');
  if (!e2eData) {{ el.innerHTML = '<div class="empty-state">No E2E eval data found.</div>'; return; }}

  const s = e2eData.summary;

  let html = '<h2 class="section-title">🤖 Search Flow — E2E AI Eval</h2>';

  // KPI Cards
  html += '<div class="grid">';
  html += `<div class="card"><h3>Answer Rate</h3><div class="metric ${{metricClass(s.answer_rate)}}">${{pct(s.answer_rate)}}</div></div>`;
  html += `<div class="card"><h3>Keyword Hit Rate</h3><div class="metric ${{metricClass(s.avg_keyword_hit_rate)}}">${{pct(s.avg_keyword_hit_rate)}}</div><div class="metric-sub">Avg across all queries</div></div>`;
  html += `<div class="card"><h3>Retrieval Recall</h3><div class="metric ${{metricClass(s.avg_retrieval_recall)}}">${{pct(s.avg_retrieval_recall)}}</div><div class="metric-sub">Correct source docs cited</div></div>`;
  html += `<div class="card"><h3>Avg Latency</h3><div class="metric good">${{s.avg_latency_ms.toFixed(0)}}ms</div><div class="metric-sub">End-to-end</div></div>`;
  html += '</div>';

  // Per-category chart
  html += '<div class="chart-container"><h2>Performance by Category</h2><div class="chart-wrap"><canvas id="categoryChart"></canvas></div></div>';

  // Per-query table
  html += '<div class="chart-container"><h2>Per-Query Breakdown</h2><table><thead><tr><th>Query</th><th>Cat</th><th>KW Hit</th><th>Hits</th><th>Misses</th><th>Latency</th></tr></thead><tbody>';
  for (const q of e2eData.per_query) {{
    const kwHits = q.keyword_hits.map(k => `<span class="tag tag-hit">${{k}}</span>`).join(' ');
    const kwMisses = q.keyword_misses.map(k => `<span class="tag tag-miss">${{k}}</span>`).join(' ');
    html += `<tr><td>${{q.query.substring(0,50)}}</td><td>${{q.category}}</td><td class="${{metricClass(q.keyword_hit_rate)}}">${{pct(q.keyword_hit_rate)}}</td><td>${{kwHits}}</td><td>${{kwMisses}}</td><td>${{q.latency_ms.toFixed(0)}}ms</td></tr>`;
  }}
  html += '</tbody></table></div>';

  el.innerHTML = html;

  // Category chart
  const cats = Object.keys(s.per_category);
  new Chart(document.getElementById('categoryChart'), {{
    type: 'bar',
    data: {{
      labels: cats,
      datasets: [
        {{ label: 'Keyword Hit Rate', data: cats.map(c => s.per_category[c].avg_keyword_hit_rate), backgroundColor: '#34d399' }},
        {{ label: 'Answer Rate', data: cats.map(c => s.per_category[c].answer_rate), backgroundColor: '#60a5fa' }}
      ]
    }},
    options: {{ responsive: true, maintainAspectRatio: false, scales: {{ y: {{ beginAtZero: true, max: 1, ticks: {{ color: '#94a3b8' }} }}, x: {{ ticks: {{ color: '#94a3b8' }} }} }}, plugins: {{ legend: {{ labels: {{ color: '#e2e8f0' }} }} }} }}
  }});
}}

// ============================================================
// COMPARISON SECTION (RAGFlow)
// ============================================================
function renderComparison() {{
  const el = document.getElementById('comparison-section');
  if (!ragflowData) {{ return; }}

  const rs = ragflowData.summary;
  let aingoS = null;
  if (retrievalData) aingoS = retrievalData.summary;

  let html = '<h2 class="section-title">⚔️ AINGO vs RAGFlow Comparison</h2>';
  html += '<div class="chart-container"><div class="chart-wrap"><canvas id="comparisonChart"></canvas></div></div>';

  // Side-by-side metrics
  html += '<div class="grid">';
  if (aingoS) {{
    html += `<div class="card"><h3>AINGO MRR</h3><div class="metric ${{metricClass(aingoS.mrr)}}">${{aingoS.mrr.toFixed(4)}}</div></div>`;
  }}
  html += `<div class="card"><h3>RAGFlow MRR</h3><div class="metric ${{metricClass(rs.mrr)}}">${{rs.mrr.toFixed(4)}}</div></div>`;
  html += '</div>';

  el.innerHTML = html;

  // Comparison chart
  const kValues = Object.keys(rs.avg_recall_at_k).map(Number).sort((a,b) => a-b);
  const datasets = [
    {{ label: 'RAGFlow Recall', data: kValues.map(k => rs.avg_recall_at_k[k] || 0), backgroundColor: '#f59e0b' }}
  ];
  if (aingoS) {{
    datasets.unshift({{ label: 'AINGO Recall', data: kValues.map(k => aingoS.avg_recall_at_k[k] || 0), backgroundColor: '#34d399' }});
  }}

  new Chart(document.getElementById('comparisonChart'), {{
    type: 'bar',
    data: {{ labels: kValues.map(k => '@' + k), datasets }},
    options: {{ responsive: true, maintainAspectRatio: false, scales: {{ y: {{ beginAtZero: true, max: 1, ticks: {{ color: '#94a3b8' }} }}, x: {{ ticks: {{ color: '#94a3b8' }} }} }}, plugins: {{ legend: {{ labels: {{ color: '#e2e8f0' }} }} }} }}
  }});
}}

// ============================================================
// INIT
// ============================================================
renderRetrieval();
renderE2E();
renderComparison();
</script>
</body>
</html>"""
    return html


def main():
    parser = argparse.ArgumentParser(description="AINGO Benchmark Report Generator")
    parser.add_argument("--retrieval", default=RETRIEVAL_DEFAULT, help="Retrieval eval JSON")
    parser.add_argument("--e2e", default=E2E_DEFAULT, help="E2E eval JSON")
    parser.add_argument("--ragflow", default=RAGFLOW_DEFAULT, help="RAGFlow eval JSON")
    parser.add_argument("--output", default=os.path.join(REPORT_DIR, "benchmark.html"))
    args = parser.parse_args()

    retrieval = load_json(args.retrieval)
    e2e = load_json(args.e2e)
    ragflow = load_json(args.ragflow)

    found = []
    if retrieval: found.append("retrieval")
    if e2e: found.append("e2e")
    if ragflow: found.append("ragflow")

    if not found:
        print("⚠️  No eval data found. Run eval scripts first.")
        sys.exit(1)

    print(f"📊 Generating benchmark report with: {', '.join(found)}")

    html = generate_html(retrieval, e2e, ragflow)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        f.write(html)

    print(f"✅ Report saved to: {args.output}")
    print(f"   Open in browser: file://{os.path.abspath(args.output)}")


if __name__ == "__main__":
    main()
