"""
RAG Agent Evaluation Script (RAGAS + DeepEval) - v24
===================================================
1. Dynamic Objectives: Reads specific goals from ground_truth_dataset.json.
2. Targeted Task Completion: Metric now focuses on the specific case objective.
3. Full Context Logs: context_chunks, chunk_sample, and trace_id.
4. Correctness & NaN fix: Final table cleanup and concurrency management.

Usage:
  uv run scripts/evaluate_agent.py
"""

import os
import json
import time
import requests
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# RAGAS
try:
    from ragas.metrics import faithfulness, answer_correctness, context_precision, context_recall
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.run_config import RunConfig
except ImportError:
    from ragas.metrics.collections import faithfulness, answer_correctness, context_precision, context_recall
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.run_config import RunConfig

# DeepEval
from deepeval.metrics import ToolCorrectnessMetric, TaskCompletionMetric
from deepeval.test_case import LLMTestCase, ToolCall
from deepeval.models.base_model import DeepEvalBaseLLM

# Load environment
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOTENV_PATH = os.path.join(SCRIPT_DIR, "..", "services", "search-flow", ".env")
load_dotenv(dotenv_path=DOTENV_PATH)

# Config
SEARCH_FLOW_URL = os.getenv("SEARCH_FLOW_URL", "http://localhost:8000")
EMBEDDING_URL   = os.getenv("EMBEDDING_URL",   "http://localhost:8003")
INPUT_FILE = os.path.join(SCRIPT_DIR, "ground_truth_dataset.json")

# Azure Config
AZURE_API_KEY      = os.getenv("AZURE_API_KEY")
AZURE_API_BASE     = os.getenv("AZURE_API_BASE")
AZURE_API_VERSION  = os.getenv("AZURE_API_VERSION")
AZURE_DEPLOYMENT   = os.getenv("AZURE_MODEL_NAME", "azure/gpt-4o-mini").replace("azure/", "")
AZURE_EMBEDDING    = os.getenv("AZURE_EMBEDDING_NAME", "text-embedding-3-small")

# Langfuse API Config
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_BASE_URL   = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")

class AzureEvalModel(DeepEvalBaseLLM):
    def __init__(self, model_name=AZURE_DEPLOYMENT):
        self.model_name = model_name
    def load_model(self):
        from openai import AzureOpenAI
        return AzureOpenAI(api_key=AZURE_API_KEY, api_version=AZURE_API_VERSION, azure_endpoint=AZURE_API_BASE)
    def generate(self, prompt: str) -> str:
        client = self.load_model()
        response = client.chat.completions.create(model=self.model_name, messages=[{"role": "user", "content": prompt}], temperature=0)
        return response.choices[0].message.content
    async def a_generate(self, prompt: str) -> str: return self.generate(prompt)
    def get_model_name(self): return f"Azure {self.model_name}"

def run_query(question: str) -> dict:
    resp = requests.post(f"{SEARCH_FLOW_URL}/api/v1/completions", json={"query": question, "mode": "search"}, timeout=120)
    resp.raise_for_status()
    return resp.json().get("data", {})

def fetch_structured_chunks(citations: list) -> list:
    if not citations: return []
    files_payload = []
    for cite in citations:
        pages_dict = {}
        for chunk in cite.get("chunks", []):
            pg = chunk.get("page_number", 0)
            if pg not in pages_dict: pages_dict[pg] = []
            pages_dict[pg].append({"chunk_number": chunk["chunk_number"]})
        files_payload.append({
            "file_path": cite["file_path"],
            "pages": [{"page_number": p, "chunks": chunks} for p, chunks in pages_dict.items()]
        })
    try:
        resp = requests.post(f"{EMBEDDING_URL}/v1/structured-file-reference", json={"files": files_payload}, timeout=60)
        resp.raise_for_status()
        return resp.json().get("files", [])
    except Exception: return citations

def fetch_trace_tools(query: str):
    time.sleep(14) 
    try:
        resp = requests.get(f"{LANGFUSE_BASE_URL}/api/public/traces?limit=30", auth=(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY), timeout=30)
        traces = resp.json().get("data", [])
        trace_id = next((t["id"] for t in traces if query[:25] in str(t.get("input", ""))), None)
        if not trace_id: return [], "Trace ID not found."
        
        obs_resp = requests.get(f"{LANGFUSE_BASE_URL}/api/public/observations?traceId={trace_id}&limit=100", auth=(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY), timeout=30)
        obs_list = obs_resp.json().get("data", [])
        detected = []
        possible_tools = ["search_documents", "lookup_documents"]
        for o in obs_list:
            name = str(o.get("name") or "").lower()
            metadata = str(o.get("metadata") or "").lower()
            for t in possible_tools:
                if t in name or f"proxy_{t}" in name or t in metadata: detected.append(t)
        return list(set(detected)), trace_id
    except Exception as e: return [], f"Error: {e}"

def calculate_ragas_metrics(rows):
    from datasets import Dataset
    from ragas import evaluate
    from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
    
    llm = AzureChatOpenAI(azure_deployment=AZURE_DEPLOYMENT, openai_api_version=AZURE_API_VERSION, azure_endpoint=AZURE_API_BASE, api_key=AZURE_API_KEY)
    emb = AzureOpenAIEmbeddings(azure_deployment=AZURE_EMBEDDING, openai_api_version=AZURE_API_VERSION, azure_endpoint=AZURE_API_BASE, api_key=AZURE_API_KEY)
    
    rag_data = []
    print(f"\n📈 [RAGAS] Calculating Final Metrics (Prec/Recall/Correctness)...")
    for r in rows:
        ctx_list = [c["content"] for f in r.get("citations", []) for p in f.get("pages", []) for c in p.get("chunks", []) if "content" in c]
        rag_data.append({
            "question": r["question"],
            "answer": r["answer"] or "No answer.",
            "contexts": ctx_list if ctx_list else ["No context found."],
            "ground_truth": r["ground_truth"]
        })
    
    ds = Dataset.from_list(rag_data)
    config = RunConfig(max_workers=1, timeout=240) # Sequential to avoid 404/NaN
    
    try:
        res = evaluate(
            ds, 
            metrics=[faithfulness, answer_correctness, context_precision, context_recall], 
            llm=LangchainLLMWrapper(llm), 
            embeddings=LangchainEmbeddingsWrapper(emb),
            run_config=config
        )
        return res.to_pandas()
    except Exception as e:
        print(f"   ⚠️  RAGAS Error: {e}")
        return pd.DataFrame(rag_data)

def main():
    if not os.path.exists(INPUT_FILE): return
    with open(INPUT_FILE, "r") as f: gt_data = json.load(f)
    results = []
    print(f"\n🚀 Agent Evaluation v24 (Precise Objective Mode)...")
    eval_model = AzureEvalModel()

    for i, entry in enumerate(gt_data["entries"]):
        q = entry["question"]
        obj = entry.get("objective", "Execute the task precisely.")
        print(f"\n[Case {i+1}] {q}")
        try:
            # 1. Pipeline
            flow = run_query(q)
            ans = flow.get("response", "")
            citations = fetch_structured_chunks(flow.get("citations") or [])
            
            # 2. Trace
            tools, tid = fetch_trace_tools(q)
            ctx = [c["content"] for f in citations for p in f.get("pages", []) for c in p.get("chunks", []) if "content" in c]

            # Detailed Logs with Dynamic Objective
            print(f"    - tools_called:    {tools}")
            print(f"    - expected_tools:  {entry['expected_tool_calls']}")
            print(f"    - context_chunks:  Found {len(ctx)} units.")
            if ctx:
                print(f"    - chunk_sample:    {ctx[0][:100].replace(chr(10), ' ')}...")
            print(f"    - trace_id:        {tid}")
            print(f"    - task_objectives: {obj}")

            # 3. DeepEval
            # We explicitly pass the objective as part of the input for TaskCompletionMetric
            test_case = LLMTestCase(
                input=f"Question: {q}\nSpecific Objective: {obj}", 
                actual_output=ans or "No answer.", 
                expected_output=entry["expected_answer"],
                retrieval_context=ctx if ctx else ["No context."],
                tools_called=[ToolCall(name=t) for t in tools],
                expected_tools=[ToolCall(name=t) for t in entry["expected_tool_calls"]]
            )
            
            task_m = TaskCompletionMetric(threshold=0.5, model=eval_model)
            task_m.measure(test_case)
            tool_m = ToolCorrectnessMetric(threshold=0.5, model=eval_model, available_tools=[ToolCall(name="search_documents"), ToolCall(name="lookup_documents")])
            tool_m.measure(test_case)
            
            print(f"    ✅ SCORE: Task={task_m.score or 0.0:.2f}, Tool={tool_m.score or 0.0:.2f}")

            results.append({
                "question": q, "answer": ans, "ground_truth": entry["expected_answer"], 
                "citations": citations, "task_completion": task_m.score or 0.0, "tool_correctness": tool_m.score or 0.0
            })
        except Exception as e:
            print(f"   ❌ Case {i+1} Failed: {e}")

    # 4. Final Scorecard
    rdf = calculate_ragas_metrics(results)
    rdf = rdf.replace([np.nan, np.inf, -np.inf], 0.0)

    print("\n" + "="*112)
    print(f"{'#':<3} | {'Question':<30} | {'Task':<5} | {'Tool':<5} | {'Faith':<5} | {'Corr':<5} | {'Prec':<5} | {'Recal':<5}")
    print("-" * 112)
    for i, res in enumerate(results):
        r_row = rdf.iloc[i] if i < len(rdf) else {}
        print(f"{i+1:<3} | {res['question'][:27]+'...':<30} | {res['task_completion']:<5.2f} | {res['tool_correctness']:<5.2f} | {r_row.get('faithfulness',0.0):<5.2f} | {r_row.get('answer_correctness',0.0):<5.2f} | {r_row.get('context_precision',0.0):<5.2f} | {r_row.get('context_recall',0.0):<5.2f}")
    print("="*112)

if __name__ == "__main__": main()
