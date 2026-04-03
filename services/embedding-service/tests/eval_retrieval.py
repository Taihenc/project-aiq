"""
AINGO Embedding Service — Retrieval Evaluation Harness

Evaluates the embedding-service search pipeline against a ground-truth dataset.
Measures: Recall@K, Precision@K, MRR, latency, and reranking impact.

Usage:
    # Ensure embedding-service + Qdrant are running (localhost:8003 / :6333)
    cd services/embedding-service
    uv run python tests/eval_retrieval.py

    # Custom URL:
    uv run python tests/eval_retrieval.py --url http://my-host:8003

Output:
    tests/reports/eval_retrieval_results.json
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

K_VALUES = [1, 3, 5, 10]  # Recall@K / Precision@K


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class QueryResult:
    query_id: str
    query: str
    category: str
    relevant_doc_ids: List[str]
    retrieved_doc_ids: List[str] = field(default_factory=list)
    retrieved_file_paths: List[str] = field(default_factory=list)
    similarity_scores: List[float] = field(default_factory=list)
    reranking_scores: List[float] = field(default_factory=list)
    latency_ms: float = 0.0
    recall_at_k: Dict[int, float] = field(default_factory=dict)
    precision_at_k: Dict[int, float] = field(default_factory=dict)
    reciprocal_rank: float = 0.0

    # Reranking comparison
    latency_no_rerank_ms: float = 0.0
    retrieved_no_rerank_ids: List[str] = field(default_factory=list)
    recall_no_rerank_at_k: Dict[int, float] = field(default_factory=dict)


@dataclass
class EvalSummary:
    total_queries: int = 0
    avg_recall_at_k: Dict[int, float] = field(default_factory=dict)
    avg_precision_at_k: Dict[int, float] = field(default_factory=dict)
    mrr: float = 0.0
    avg_latency_ms: float = 0.0
    avg_latency_no_rerank_ms: float = 0.0
    avg_recall_no_rerank_at_k: Dict[int, float] = field(default_factory=dict)
    rerank_recall_delta: Dict[int, float] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_dataset(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def recall_at_k(retrieved: List[str], relevant: List[str], k: int) -> float:
    if not relevant:
        return 0.0
    top_k = set(retrieved[:k])
    return len(top_k & set(relevant)) / len(relevant)


def precision_at_k(retrieved: List[str], relevant: List[str], k: int) -> float:
    top_k = retrieved[:k]
    if not top_k:
        return 0.0
    return len(set(top_k) & set(relevant)) / len(top_k)


def reciprocal_rank(retrieved: List[str], relevant: List[str]) -> float:
    relevant_set = set(relevant)
    for i, doc_id in enumerate(retrieved, 1):
        if doc_id in relevant_set:
            return 1.0 / i
    return 0.0


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

def ingest_documents(base_url: str, documents: List[dict]) -> List[str]:
    """Upload eval docs to embedding-service. Returns list of assigned IDs."""
    payload = {
        "documents": [
            {"text": doc["text"], "metadata": doc["metadata"]}
            for doc in documents
        ]
    }
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(f"{base_url}/v1/upload", json=payload)
        resp.raise_for_status()
        data = resp.json()
    doc_ids = data.get("ids", [])
    print(f"  ✓ Ingested {len(doc_ids)} documents")
    return doc_ids


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search(base_url: str, query: str, top_k: int = 10, top_n: Optional[int] = 5) -> dict:
    """Call /v1/search and return raw response + latency."""
    payload = {"query": query, "top_k": top_k, "top_n": top_n}
    with httpx.Client(timeout=60.0) as client:
        t0 = time.perf_counter()
        resp = client.post(f"{base_url}/v1/search", json=payload)
        latency = (time.perf_counter() - t0) * 1000
        resp.raise_for_status()
    return {"data": resp.json(), "latency_ms": latency}


# ---------------------------------------------------------------------------
# Evaluate
# ---------------------------------------------------------------------------

def build_file_path_to_eval_id(documents: List[dict]) -> Dict[str, str]:
    """Map file_path → eval doc id for matching retrieved results."""
    mapping = {}
    for doc in documents:
        fp = doc["metadata"]["file_path"]
        mapping[fp] = doc["id"]
    return mapping


def evaluate(base_url: str, dataset: dict) -> dict:
    documents = dataset["documents"]
    queries = dataset["queries"]
    fp_to_id = build_file_path_to_eval_id(documents)

    results: List[QueryResult] = []

    for qi, q in enumerate(queries, 1):
        qr = QueryResult(
            query_id=q["id"],
            query=q["query"],
            category=q.get("category", ""),
            relevant_doc_ids=q["relevant_doc_ids"],
        )

        # --- With reranking (default) ---
        res = search(base_url, q["query"], top_k=10, top_n=5)
        docs = res["data"].get("documents", [])
        qr.latency_ms = res["latency_ms"]

        for d in docs:
            meta = d.get("metadata", {})
            fp = meta.get("file_path", "")
            eval_id = fp_to_id.get(fp, d.get("id", ""))
            qr.retrieved_doc_ids.append(eval_id)
            qr.retrieved_file_paths.append(fp)
            qr.similarity_scores.append(d.get("similarity_score", 0.0) or 0.0)
            qr.reranking_scores.append(d.get("reranking_score", 0.0) or 0.0)

        for k in K_VALUES:
            qr.recall_at_k[k] = recall_at_k(qr.retrieved_doc_ids, qr.relevant_doc_ids, k)
            qr.precision_at_k[k] = precision_at_k(qr.retrieved_doc_ids, qr.relevant_doc_ids, k)
        qr.reciprocal_rank = reciprocal_rank(qr.retrieved_doc_ids, qr.relevant_doc_ids)

        # --- Without reranking ---
        res_nr = search(base_url, q["query"], top_k=10, top_n=None)
        docs_nr = res_nr["data"].get("documents", [])
        qr.latency_no_rerank_ms = res_nr["latency_ms"]

        for d in docs_nr:
            meta = d.get("metadata", {})
            fp = meta.get("file_path", "")
            eval_id = fp_to_id.get(fp, d.get("id", ""))
            qr.retrieved_no_rerank_ids.append(eval_id)

        for k in K_VALUES:
            qr.recall_no_rerank_at_k[k] = recall_at_k(
                qr.retrieved_no_rerank_ids, qr.relevant_doc_ids, k
            )

        results.append(qr)
        status = "HIT" if qr.reciprocal_rank > 0 else "MISS"
        print(f"  [{qi}/{len(queries)}] {status}  RR={qr.reciprocal_rank:.2f}  "
              f"R@5={qr.recall_at_k.get(5,0):.2f}  {qr.latency_ms:.0f}ms  \"{q['query'][:50]}\"")

    # --- Aggregate ---
    summary = EvalSummary(total_queries=len(results))
    for k in K_VALUES:
        summary.avg_recall_at_k[k] = sum(r.recall_at_k.get(k, 0) for r in results) / len(results)
        summary.avg_precision_at_k[k] = sum(r.precision_at_k.get(k, 0) for r in results) / len(results)
        summary.avg_recall_no_rerank_at_k[k] = sum(
            r.recall_no_rerank_at_k.get(k, 0) for r in results
        ) / len(results)
        summary.rerank_recall_delta[k] = summary.avg_recall_at_k[k] - summary.avg_recall_no_rerank_at_k[k]

    summary.mrr = sum(r.reciprocal_rank for r in results) / len(results)
    summary.avg_latency_ms = sum(r.latency_ms for r in results) / len(results)
    summary.avg_latency_no_rerank_ms = sum(r.latency_no_rerank_ms for r in results) / len(results)

    return {
        "summary": asdict(summary),
        "per_query": [asdict(r) for r in results],
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_summary(summary: dict):
    s = summary["summary"]
    print("\n" + "=" * 60)
    print("  EMBEDDING SERVICE — RETRIEVAL EVALUATION REPORT")
    print("=" * 60)
    print(f"  Total queries:      {s['total_queries']}")
    print(f"  MRR:                {s['mrr']:.4f}")
    print(f"  Avg latency:        {s['avg_latency_ms']:.1f} ms (with rerank)")
    print(f"  Avg latency:        {s['avg_latency_no_rerank_ms']:.1f} ms (no rerank)")
    print()

    header = "  {:>10s}".format("Metric")
    for k in K_VALUES:
        header += f"  @{k:>2d}"
    print(header)
    print("  " + "-" * (10 + 6 * len(K_VALUES)))

    row_r = "  {:>10s}".format("Recall")
    for k in K_VALUES:
        row_r += f"  {s['avg_recall_at_k'].get(str(k), 0):.2f}"
    print(row_r)

    row_p = "  {:>10s}".format("Precision")
    for k in K_VALUES:
        row_p += f"  {s['avg_precision_at_k'].get(str(k), 0):.2f}"
    print(row_p)

    row_nr = "  {:>10s}".format("Recall(NR)")
    for k in K_VALUES:
        row_nr += f"  {s['avg_recall_no_rerank_at_k'].get(str(k), 0):.2f}"
    print(row_nr)

    row_d = "  {:>10s}".format("Δ Rerank")
    for k in K_VALUES:
        row_d += f"  {s['rerank_recall_delta'].get(str(k), 0):+.2f}"
    print(row_d)

    print("=" * 60)


def save_report(report: dict, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "eval_retrieval_results.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n  📄 Full report saved to: {path}")


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def cleanup_eval_docs(base_url: str, doc_ids: List[str]):
    """Best-effort delete of eval documents after eval."""
    deleted = 0
    with httpx.Client(timeout=30.0) as client:
        for doc_id in doc_ids:
            try:
                resp = client.delete(f"{base_url}/v1/delete/{doc_id}")
                if resp.status_code == 200:
                    deleted += 1
            except Exception:
                pass
    print(f"  🧹 Cleaned up {deleted}/{len(doc_ids)} eval documents")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="AINGO Embedding Retrieval Eval")
    parser.add_argument("--url", default="http://localhost:8003", help="Embedding service base URL")
    parser.add_argument("--dataset", default=EVAL_DATASET_PATH, help="Path to eval dataset JSON")
    parser.add_argument("--no-cleanup", action="store_true", help="Keep eval docs after eval")
    args = parser.parse_args()

    print(f"\n🔬 AINGO Retrieval Eval")
    print(f"   Target: {args.url}")
    print(f"   Dataset: {args.dataset}\n")

    dataset = load_dataset(args.dataset)

    # Step 1: Ingest
    print("📥 Ingesting eval documents...")
    doc_ids = ingest_documents(args.url, dataset["documents"])

    # Map eval doc IDs to ingested Qdrant IDs for cleanup
    # (We can't easily map back, so we just track the returned IDs)

    # Step 2: Evaluate
    print("\n🔍 Running retrieval evaluation...")
    report = evaluate(args.url, dataset)

    # Step 3: Report
    print_summary(report)
    save_report(report, REPORT_DIR)

    # Step 4: Cleanup
    if not args.no_cleanup:
        print("\n🧹 Cleaning up eval documents...")
        cleanup_eval_docs(args.url, doc_ids)

    print("\n✅ Evaluation complete!\n")


if __name__ == "__main__":
    main()
