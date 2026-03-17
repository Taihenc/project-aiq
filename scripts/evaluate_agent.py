"""
RAG Agent Evaluation Script (RAGAS + DeepEval) - v27
===================================================
1. Strict Logging Format: Reverted to the manual template requested by the user.
2. Fixed Objective: Every case uses 'Answer the question precisely...'.
3. No 'Reason' output: Clean logging only.
4. Deep Scavenger + Sequential RAGAS: Ensures tool accuracy and no NaN results.

Layout:
  - tools_called
  - expected_tools
  - context_chunks
  - chunk_sample
  - trace_id
  - task_objectives
  - SCORE (Task/Tool)

Usage:
  uv run --with requests --with python-dotenv --with ragas --with deepeval --with langfuse --with pandas --with datasets --with openai --with langchain-openai --with langchain-huggingface --with sentence-transformers scripts/evaluate_agent.py
"""

import os
import json
import time
import requests
import pandas as pd
import numpy as np
import warnings

# Suppress noisy deprecation warnings from RAGAS/Langchain
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*LangchainLLMWrapper.*")
warnings.filterwarnings("ignore", message=".*LangchainEmbeddingsWrapper.*")
from dotenv import load_dotenv

# RAGAS
try:
    from ragas.metrics import faithfulness, context_precision, context_recall, AnswerCorrectness
    # Pure Factual Correctness (Semantic Weight = 0.0)
    factual_correctness = AnswerCorrectness(weights=[0.0, 1.0])
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.run_config import RunConfig
except ImportError:
    from ragas.metrics.collections import faithfulness, context_precision, context_recall, AnswerCorrectness
    factual_correctness = AnswerCorrectness(weights=[0.0, 1.0])
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.run_config import RunConfig

# DeepEval
from deepeval.metrics import TaskCompletionMetric
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

# Langfuse Config
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
            # Preserve score if it exists
            pages_dict[pg].append({
                "chunk_number": chunk["chunk_number"],
                "score": chunk.get("score")
            })
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
    """Fetch tool calls with full input/output details from Langfuse trace.
    Returns: (tool_calls: list[dict], trace_id: str)
    Each tool_call dict has: {name, input_args, output}
    """
    time.sleep(15)
    try:
        resp = requests.get(f"{LANGFUSE_BASE_URL}/api/public/traces?limit=30", auth=(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY), timeout=30)
        traces = resp.json().get("data", [])
        trace_id = next((t["id"] for t in traces if query[:25] in str(t.get("input", ""))), None)
        if not trace_id: return [], "Trace Not Found"

        obs_resp = requests.get(f"{LANGFUSE_BASE_URL}/api/public/observations?traceId={trace_id}&limit=100", auth=(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY), timeout=30)
        obs_list = obs_resp.json().get("data", [])

        possible_tools = ["search_documents", "lookup_documents"]
        seen_names = set()
        tool_calls = []
        
        # Sort observations by start time to get the execution ones, not just wrappers
        obs_list.sort(key=lambda x: x.get("startTime", ""))

        for o in obs_list:
            obs_name = str(o.get("name") or "").lower()
            metadata = o.get("metadata") or {}
            for t in possible_tools:
                if (t in obs_name or f"proxy_{t}" in obs_name or t in str(metadata).lower()) and t not in seen_names:
                    # Extract input: Check 'input' field first, then 'metadata'
                    input_data = o.get("input")
                    if not input_data or input_data == {}:
                        input_data = metadata.get("input") or metadata.get("args") or metadata
                    
                    if isinstance(input_data, str):
                        try: input_args = json.loads(input_data)
                        except: input_args = {"query": input_data}
                    elif isinstance(input_data, dict):
                        input_args = input_data
                    else:
                        input_args = {"raw": str(input_data)}
                    
                    # Flatten or simplify input_args if it's deeply nested
                    if "query" not in input_args and isinstance(input_args.get("input"), dict):
                        input_args = input_args["input"]

                    # Extract output: Check 'output' field, then 'metadata'
                    output_data = o.get("output")
                    if not output_data or output_data == "":
                        output_data = metadata.get("output") or metadata.get("result") or ""
                    
                    output_str = json.dumps(output_data) if isinstance(output_data, (dict, list)) else str(output_data)
                    
                    if input_args and input_args != {}:
                        tool_calls.append({"name": t, "input_args": input_args, "output": output_str[:500]})
                        seen_names.add(t)

        # 3. Create a Timeline Summary for 'trace_content'
        timeline = []
        for idx, o in enumerate(obs_list, 1):
            name = o.get("name", "Unknown")
            typ = o.get("type", "EVENT")
            # Convert ISO time to a simpler format if available
            start = str(o.get("startTime", ""))[-13:-5] if o.get("startTime") else "??"
            timeline.append(f"        {idx}. [{start}] {typ:10} | {name}")
        
        timeline_summary = "\n".join(timeline) if timeline else "        (No execution steps recorded)"

        return tool_calls, trace_id, timeline_summary
    except Exception as e: return [], f"Error: {e}", "        (Error fetching timeline)"

def calculate_ragas_metrics(rows):
    from datasets import Dataset
    from ragas import evaluate
    from langchain_openai import AzureChatOpenAI
    from langchain_huggingface import HuggingFaceEmbeddings
    
    llm = AzureChatOpenAI(azure_deployment=AZURE_DEPLOYMENT, openai_api_version=AZURE_API_VERSION, azure_endpoint=AZURE_API_BASE, api_key=AZURE_API_KEY)
    emb = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    
    rag_data = []
    print(f"\n📈 [RAGAS] Evaluating Context Quality (max_workers=1)...")
    for r in rows:
        ctx_list = [c["content"] for f in r.get("citations", []) for p in f.get("pages", []) for c in p.get("chunks", []) if "content" in c]
        rag_data.append({
            "question": r["question"],
            "answer": r["answer"] or "No answer.",
            "contexts": ctx_list if ctx_list else ["No context found."],
            "ground_truth": r["ground_truth"]
        })
    
    ds = Dataset.from_list(rag_data)
    config = RunConfig(max_workers=1, timeout=180)
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            res = evaluate(ds, metrics=[faithfulness, factual_correctness, context_precision, context_recall], llm=LangchainLLMWrapper(llm), embeddings=LangchainEmbeddingsWrapper(emb), run_config=config)
            return res.to_pandas()
        except Exception: 
            import traceback
            traceback.print_exc()
            return pd.DataFrame([{"faithfulness": "xxx", "factual_correctness": "xxx", "context_precision": "xxx", "context_recall": "xxx"}] * len(rows))

def main():
    if not os.path.exists(INPUT_FILE): return
    with open(INPUT_FILE, "r") as f: gt_data = json.load(f)
    results = []
    print(f"\n🚀 Agent Evaluation v27 (Clean Summary Mode)...")
    eval_model = AzureEvalModel()

    for i, entry in enumerate(gt_data["entries"][:1]):
        q = entry["question"]
        print(f"\n[Case {i+1}] {q}")
        try:
            # 1. Pipeline
            flow = run_query(q)
            ans = flow.get("response", "")
            citations = fetch_structured_chunks(flow.get("citations") or [])
            tools, tid, timeline = fetch_trace_tools(q)

            # Extract chunks with scores and sort by relevance
            all_chunks = []
            for f in citations:
                for p in f.get("pages", []):
                    for c in p.get("chunks", []):
                        if "content" in c:
                            all_chunks.append({
                                "content": c["content"],
                                "score": c.get("score") if c.get("score") is not None else 0.0
                            })
            
            # Sort by score DESC
            all_chunks.sort(key=lambda x: x["score"], reverse=True)
            ctx = [c["content"] for c in all_chunks]

            # Detailed Logs - Strict Match to user requested layout
            tool_names = [t["name"] for t in tools] if tools and isinstance(tools[0], dict) else tools
            print(f"    - tools_called:    {tool_names}")
            # Print trace details for each tool call
            if tools and isinstance(tools[0], dict):
                for tc in tools:
                    args_str = json.dumps(tc.get("input_args", {}), ensure_ascii=False)[:120]
                    out_str  = tc.get("output", "")[:120].replace("\n", " ")
                    print(f"      └─ [{tc['name']}] input:  {args_str}")
                    print(f"         [{tc['name']}] output: {out_str}...")
            print(f"    - expected_tools:  {entry['expected_tool_calls']}")
            print(f"    - trace_content:\n{timeline}")
            print(f"    - context_chunks:  Found {len(ctx)} units.")
            if all_chunks:
                top = all_chunks[0]
                score_val = top.get("score") if top.get("score") is not None else 0.0
                print(f"    - chunk_sample:    ({score_val:.4f}) {top['content'][:100].replace(chr(10), ' ')}...")
            print(f"    - trace_id:        {tid}")
            print(f"    - task_objectives: Answer the question precisely based on internal documents.")

            # Build rich ToolCall objects from Langfuse trace details
            rich_tool_calls = [
                ToolCall(
                    name=t["name"],
                    input_parameters=t.get("input_args", {}),
                    output=t.get("output", "")
                ) for t in tools
            ] if tools and isinstance(tools[0], dict) else [ToolCall(name=t) for t in tools]

            # 2. DeepEval — TaskCompletionMetric now sees full agent trajectory
            test_case = LLMTestCase(
                input=q, actual_output=ans or "No answer.", expected_output=entry["expected_answer"],
                retrieval_context=ctx if ctx else ["No context."],
                tools_called=rich_tool_calls,
                expected_tools=[ToolCall(name=t) for t in entry["expected_tool_calls"]]
            )

            task_m = TaskCompletionMetric(threshold=0.5, model=eval_model)
            task_m.measure(test_case)

            task_m = TaskCompletionMetric(threshold=0.5, model=eval_model)
            task_m.measure(test_case)

            # Code-based Tool Scoring (Jaccard Similarity)
            set_a = set(tool_names)
            set_e = set(entry["expected_tool_calls"])
            if not set_a and not set_e:
                tool_score = 1.00
            elif not set_e or not set_a:
                tool_score = 0.00
            else:
                tool_score = len(set_a.intersection(set_e)) / len(set_a.union(set_e))

            print(f"    ✅ SCORE: Task={task_m.score or 0.0:.2f}, Tool={tool_score:.2f}")

            results.append({
                "question": q, "answer": ans, "ground_truth": entry["expected_answer"],
                "citations": citations, "task_completion": task_m.score or 0.0, "tool_correctness": tool_score
            })
        except Exception as e:
            print(f"   ❌ Case {i+1} Failed: {e}")

    # 3. Final scorecard
    rdf = calculate_ragas_metrics(results)

    def fmt(val):
        if pd.isna(val) or val is None or val == "": return "xxx"
        try:
            float_val = float(val)
            if np.isnan(float_val) or np.isinf(float_val): return "xxx"
            return f"{float_val:.2f}"
        except:
            return "xxx"

    print("\n" + "="*120)
    print(f"{'#':<3} | {'Question':<30} | {'Task':<5} | {'Tool':<5} | {'Faith':<5} | {'Fact':<5} | {'Cont_P':<6} | {'Cont_R':<6}")
    print("-" * 105)
    for i, res in enumerate(results):
        r_row = rdf.iloc[i].to_dict() if i < len(rdf) else {}
        res["faithfulness"] = r_row.get('faithfulness')
        res["factual_correctness"] = r_row.get('factual_correctness')
        res["context_precision"] = r_row.get('context_precision')
        res["context_recall"] = r_row.get('context_recall')
        print(f"{i+1:<3} | {res['question'][:30]:<30} | {fmt(res.get('task_completion')):<5} | {fmt(res.get('tool_correctness')):<5} | "
              f"{fmt(res.get('faithfulness')):<5} | {fmt(res.get('factual_correctness')):<5} | "
              f"{fmt(res.get('context_precision')):<6} | {fmt(res.get('context_recall')):<6}")
    print("="*120)

if __name__ == "__main__": main()
