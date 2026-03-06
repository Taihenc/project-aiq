"""
AINGO vs RAGFlow — Comparison Eval

Runs the same queries against RAGFlow API and outputs metrics
in the same format as eval_retrieval.py for benchmark_report.py consumption.

Prerequisites:
    docker compose -f docker-compose.yml -f docker-compose.ragflow.yml up -d
    # Then create a dataset + upload eval docs in RAGFlow UI (http://localhost:9380)
    # Or use this script's --ingest flag to auto-create via API.

Usage:
    cd services/search-flow
    uv run python tests/eval_ragflow.py --dataset-id <YOUR_RAGFLOW_DATASET_ID>

Output:
    tests/reports/eval_ragflow_results.json
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

EVAL_DATASET_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "embedding-service", "tests", "eval_dataset.json"
)
REPORT_DIR = os.path.join(os.path.dirname(__file__), "reports")
K_VALUES = [1, 3, 5, 10]


# ---------------------------------------------------------------------------
# Data classes (same schema as eval_retrieval for consistency)
# ---------------------------------------------------------------------------

@dataclass
class QueryResult:
    query_id: str
    query: str
    category: str
    relevant_doc_ids: List[str]
    retrieved_doc_ids: List[str] = field(default_factory=list)
    similarity_scores: List[float] = field(default_factory=list)
    latency_ms: float = 0.0
    recall_at_k: Dict[int, float] = field(default_factory=dict)
    precision_at_k: Dict[int, float] = field(default_factory=dict)
    reciprocal_rank: float = 0.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_dataset(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def recall_at_k(retrieved: List[str], relevant: List[str], k: int) -> float:
    if not relevant:
        return 0.0
    return len(set(retrieved[:k]) & set(relevant)) / len(relevant)


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
# RAGFlow API calls
# ---------------------------------------------------------------------------

def ragflow_search(base_url: str, dataset_id: str, query: str, top_k: int = 10) -> dict:
    """Call RAGFlow retrieval API."""
    payload = {
        "question": query,
        "dataset_ids": [dataset_id],
        "top_k": top_k,
    }
    with httpx.Client(timeout=60.0) as client:
        t0 = time.perf_counter()
        resp = client.post(f"{base_url}/api/v1/retrieval", json=payload)
        latency = (time.perf_counter() - t0) * 1000
        resp.raise_for_status()
    return {"data": resp.json(), "latency_ms": latency}


def ragflow_ingest(base_url: str, dataset_id: str, documents: List[dict]):
    """Upload documents to RAGFlow dataset."""
    for doc in documents:
        payload = {
            "name": doc["metadata"]["file"],
            "dataset_id": dataset_id,
            "content": doc["text"],
        }
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(f"{base_url}/api/v1/documents", json=payload)
            if resp.status_code not in (200, 201):
                print(f"  ⚠ Failed to ingest {doc['metadata']['file']}: {resp.text}")
            else:
                print(f"  ✓ Ingested {doc['metadata']['file']}")


# ---------------------------------------------------------------------------
# Evaluate
# ---------------------------------------------------------------------------

def build_file_to_eval_id(documents: List[dict]) -> Dict[str, str]:
    mapping = {}
    for doc in documents:
        mapping[doc["metadata"]["file"]] = doc["id"]
        mapping[doc["metadata"]["file_path"]] = doc["id"]
    return mapping


def evaluate(base_url: str, dataset_id: str, dataset: dict) -> dict:
    documents = dataset["documents"]
    queries = dataset["queries"]
    file_to_id = build_file_to_eval_id(documents)

    results: List[QueryResult] = []

    for qi, q in enumerate(queries, 1):
        qr = QueryResult(
            query_id=q["id"],
            query=q["query"],
            category=q.get("category", ""),
            relevant_doc_ids=q["relevant_doc_ids"],
        )

        try:
            res = ragflow_search(base_url, dataset_id, q["query"])
            chunks = res["data"].get("data", {}).get("chunks", [])
            qr.latency_ms = res["latency_ms"]

            for c in chunks:
                doc_name = c.get("document_keyword", c.get("doc_name", ""))
                eval_id = file_to_id.get(doc_name, doc_name)
                qr.retrieved_doc_ids.append(eval_id)
                qr.similarity_scores.append(c.get("similarity", 0.0))

            for k in K_VALUES:
                qr.recall_at_k[k] = recall_at_k(qr.retrieved_doc_ids, qr.relevant_doc_ids, k)
                qr.precision_at_k[k] = precision_at_k(qr.retrieved_doc_ids, qr.relevant_doc_ids, k)
            qr.reciprocal_rank = reciprocal_rank(qr.retrieved_doc_ids, qr.relevant_doc_ids)

            status = "HIT" if qr.reciprocal_rank > 0 else "MISS"
            print(f"  [{qi}/{len(queries)}] {status}  RR={qr.reciprocal_rank:.2f}  "
                  f"R@5={qr.recall_at_k.get(5,0):.2f}  {qr.latency_ms:.0f}ms")

        except Exception as e:
            print(f"  [{qi}/{len(queries)}] ERROR: {e}")

        results.append(qr)

    # Aggregate
    summary = {
        "total_queries": len(results),
        "mrr": sum(r.reciprocal_rank for r in results) / len(results),
        "avg_latency_ms": sum(r.latency_ms for r in results) / len(results),
        "avg_recall_at_k": {},
        "avg_precision_at_k": {},
    }
    for k in K_VALUES:
        summary["avg_recall_at_k"][k] = sum(r.recall_at_k.get(k, 0) for r in results) / len(results)
        summary["avg_precision_at_k"][k] = sum(r.precision_at_k.get(k, 0) for r in results) / len(results)

    return {"summary": summary, "per_query": [asdict(r) for r in results]}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="RAGFlow Comparison Eval")
    parser.add_argument("--url", default="http://localhost:9382", help="RAGFlow API URL")
    parser.add_argument("--dataset-id", required=True, help="RAGFlow dataset ID")
    parser.add_argument("--dataset", default=EVAL_DATASET_PATH, help="Eval dataset JSON path")
    parser.add_argument("--ingest", action="store_true", help="Ingest eval docs into RAGFlow first")
    args = parser.parse_args()

    print(f"\n🔬 RAGFlow Comparison Eval")
    print(f"   Target: {args.url}")
    print(f"   Dataset ID: {args.dataset_id}\n")

    dataset = load_dataset(args.dataset)

    if args.ingest:
        print("📥 Ingesting docs into RAGFlow...")
        ragflow_ingest(args.url, args.dataset_id, dataset["documents"])

    print("\n🔍 Running RAGFlow retrieval eval...")
    report = evaluate(args.url, args.dataset_id, dataset)

    s = report["summary"]
    print(f"\n  MRR: {s['mrr']:.4f}  |  Avg Latency: {s['avg_latency_ms']:.0f}ms")

    os.makedirs(REPORT_DIR, exist_ok=True)
    path = os.path.join(REPORT_DIR, "eval_ragflow_results.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n  📄 Report saved to: {path}")
    print("  Run benchmark_report.py to see AINGO vs RAGFlow comparison.\n")


if __name__ == "__main__":
    main()
