"""
AINGO Search Flow — End-to-End Evaluation Harness

Tests the full pipeline: query → search-flow → embedding-service → response.
Measures: answer relevance (keyword hit rate), retrieval recall, e2e latency.

Usage:
    # Ensure all services are running:
    #   embedding-service (8003), qdrant (6333), search-flow (8000)
    # And eval docs are ingested (run eval_retrieval.py --no-cleanup first)
    cd services/search-flow
    uv run python tests/eval_e2e.py

Output:
    tests/reports/eval_e2e_results.json
"""

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

EVAL_DATASET_PATH = os.path.join(os.path.dirname(__file__), "eval_dataset.json")
REPORT_DIR = os.path.join(os.path.dirname(__file__), "reports")


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class E2EQueryResult:
    query_id: str
    query: str
    category: str
    expected_source_files: List[str]
    expected_keywords: List[str]

    # Results
    response_text: str = ""
    cited_files: List[str] = field(default_factory=list)
    latency_ms: float = 0.0

    # Metrics
    keyword_hit_rate: float = 0.0
    keyword_hits: List[str] = field(default_factory=list)
    keyword_misses: List[str] = field(default_factory=list)
    retrieval_recall: float = 0.0
    has_answer: bool = False


@dataclass
class E2ESummary:
    total_queries: int = 0
    avg_keyword_hit_rate: float = 0.0
    avg_retrieval_recall: float = 0.0
    avg_latency_ms: float = 0.0
    answer_rate: float = 0.0
    per_category: Dict[str, dict] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_dataset(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def keyword_hit_rate(response: str, keywords: List[str]) -> tuple:
    """Returns (hit_rate, hits, misses)."""
    response_lower = response.lower()
    hits = [kw for kw in keywords if kw.lower() in response_lower]
    misses = [kw for kw in keywords if kw.lower() not in response_lower]
    rate = len(hits) / len(keywords) if keywords else 0.0
    return rate, hits, misses


def retrieval_recall(cited: List[str], expected: List[str]) -> float:
    """Fraction of expected source files that appear in citations."""
    if not expected:
        return 0.0
    cited_set = set(cited)
    return len(cited_set & set(expected)) / len(expected)


# ---------------------------------------------------------------------------
# Call search-flow
# ---------------------------------------------------------------------------

def call_search_flow(base_url: str, query: str, mode: str = "search") -> dict:
    """
    Call search-flow streaming endpoint, consume the stream,
    return final response text, citations, and latency.
    """
    payload = {
        "query": query,
        "history": [],
        "attachments": [],
        "mode": mode,
        "metadata": {
            "user_info": {"name": "EvalBot", "role": "Evaluator"},
            "session_context": {"current_project": "AINGO Eval"}
        }
    }

    response_text = ""
    citations = []
    t0 = time.perf_counter()

    with httpx.Client(timeout=120.0) as client:
        with client.stream("POST", f"{base_url}/api/v1/completions/stream", json=payload) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line.strip():
                    continue
                try:
                    event = json.loads(line)
                    event_type = event.get("type", "")
                    content = event.get("content", "")

                    if event_type == "token":
                        response_text += content
                    elif event_type == "result":
                        if isinstance(content, dict):
                            response_text = content.get("response", response_text)
                            citations = content.get("citations", [])
                except json.JSONDecodeError:
                    pass

    latency = (time.perf_counter() - t0) * 1000

    # Extract file paths from citations
    cited_files = []
    for c in citations:
        if isinstance(c, dict):
            fp = c.get("file_path", "")
            if fp:
                cited_files.append(fp)

    return {
        "response": response_text,
        "citations": cited_files,
        "latency_ms": latency,
    }


# ---------------------------------------------------------------------------
# Evaluate
# ---------------------------------------------------------------------------

def evaluate(base_url: str, dataset: dict) -> dict:
    queries = dataset["queries"]
    results: List[E2EQueryResult] = []

    for qi, q in enumerate(queries, 1):
        qr = E2EQueryResult(
            query_id=q["id"],
            query=q["query"],
            category=q.get("category", ""),
            expected_source_files=q["expected_source_files"],
            expected_keywords=q["expected_keywords"],
        )

        try:
            res = call_search_flow(base_url, q["query"])
            qr.response_text = res["response"]
            qr.cited_files = res["citations"]
            qr.latency_ms = res["latency_ms"]
            qr.has_answer = bool(qr.response_text.strip())

            # Keyword hit rate
            rate, hits, misses = keyword_hit_rate(qr.response_text, q["expected_keywords"])
            qr.keyword_hit_rate = rate
            qr.keyword_hits = hits
            qr.keyword_misses = misses

            # Retrieval recall
            qr.retrieval_recall = retrieval_recall(qr.cited_files, q["expected_source_files"])

            status = f"KW={rate:.0%}" if qr.has_answer else "NO_ANSWER"
            print(f"  [{qi}/{len(queries)}] {status}  {qr.latency_ms:.0f}ms  \"{q['query'][:50]}\"")

        except Exception as e:
            print(f"  [{qi}/{len(queries)}] ERROR  \"{q['query'][:50]}\" — {e}")
            qr.response_text = f"ERROR: {e}"

        results.append(qr)

    # --- Aggregate ---
    summary = E2ESummary(total_queries=len(results))
    summary.avg_keyword_hit_rate = sum(r.keyword_hit_rate for r in results) / len(results)
    summary.avg_retrieval_recall = sum(r.retrieval_recall for r in results) / len(results)
    summary.avg_latency_ms = sum(r.latency_ms for r in results) / len(results)
    summary.answer_rate = sum(1 for r in results if r.has_answer) / len(results)

    # Per-category breakdown
    categories: Dict[str, List[E2EQueryResult]] = {}
    for r in results:
        categories.setdefault(r.category, []).append(r)

    for cat, cat_results in categories.items():
        n = len(cat_results)
        summary.per_category[cat] = {
            "count": n,
            "avg_keyword_hit_rate": sum(r.keyword_hit_rate for r in cat_results) / n,
            "avg_latency_ms": sum(r.latency_ms for r in cat_results) / n,
            "answer_rate": sum(1 for r in cat_results if r.has_answer) / n,
        }

    return {
        "summary": asdict(summary),
        "per_query": [asdict(r) for r in results],
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_summary(report: dict):
    s = report["summary"]
    print("\n" + "=" * 60)
    print("  SEARCH FLOW — E2E EVALUATION REPORT")
    print("=" * 60)
    print(f"  Total queries:        {s['total_queries']}")
    print(f"  Answer rate:          {s['answer_rate']:.1%}")
    print(f"  Avg keyword hit:      {s['avg_keyword_hit_rate']:.1%}")
    print(f"  Avg retrieval recall: {s['avg_retrieval_recall']:.1%}")
    print(f"  Avg latency:          {s['avg_latency_ms']:.0f} ms")
    print()

    print("  Per-category breakdown:")
    for cat, stats in s.get("per_category", {}).items():
        print(f"    {cat:>20s}: KW={stats['avg_keyword_hit_rate']:.0%}  "
              f"lat={stats['avg_latency_ms']:.0f}ms  "
              f"ans={stats['answer_rate']:.0%}  (n={stats['count']})")

    print("=" * 60)


def save_report(report: dict, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "eval_e2e_results.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n  📄 Report saved to: {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="AINGO Search Flow E2E Eval")
    parser.add_argument("--url", default="http://localhost:8000", help="Search-flow base URL")
    parser.add_argument("--dataset", default=EVAL_DATASET_PATH, help="Path to eval dataset")
    args = parser.parse_args()

    print(f"\n🔬 AINGO E2E Search Flow Eval")
    print(f"   Target: {args.url}")
    print(f"   Dataset: {args.dataset}\n")

    dataset = load_dataset(args.dataset)

    print("🔍 Running E2E evaluation...")
    report = evaluate(args.url, dataset)

    print_summary(report)
    save_report(report, REPORT_DIR)

    print("\n✅ E2E Evaluation complete!\n")


if __name__ == "__main__":
    main()
