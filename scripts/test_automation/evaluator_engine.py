import os
import sys
import json
import pandas as pd
import numpy as np
from deepeval.metrics import TaskCompletionMetric
from deepeval.test_case import LLMTestCase, ToolCall

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Append parent directory to import the legacy evaluate_agent cleanly
sys.path.append(os.path.abspath(os.path.join(SCRIPT_DIR, "..")))

import evaluate_agent

def evaluate_test_cases(test_entries: list, session_name: str):
    """
    Executes the AINGO RAG evaluation over a structured list of test cases,
    pushing metrics to Langfuse under the specified session_name/version.
    """
    if not test_entries:
        print(f"\n⚠️ [{session_name}] No entries to evaluate.")
        return

    print(f"\n🚀 Starting Evaluation: {session_name} ({len(test_entries)} Items)...")
    eval_model = evaluate_agent.AzureEvalModel()
    results = []

    for i, entry in enumerate(test_entries):
        q = entry["question"]
        print(f"\n[Case {i+1}] {q}")
        try:
            # 1. Pipeline
            flow, start_time_iso = evaluate_agent.run_query(q)
            ans = flow.get("response", "")
            citations = evaluate_agent.fetch_structured_chunks(flow.get("citations") or [])
            tools, tid, timeline = evaluate_agent.fetch_trace_tools(q, start_time_iso)

            # Sort chunks
            all_chunks = []
            for f in citations:
                for p in f.get("pages", []):
                    for c in p.get("chunks", []):
                        if "content" in c:
                            all_chunks.append({
                                "content": c["content"],
                                "score": c.get("score", 0.0) or 0.0
                            })
            all_chunks.sort(key=lambda x: x["score"], reverse=True)
            ctx = [c["content"] for c in all_chunks]

            # Detailed Logs
            tool_names = [t["name"] for t in tools] if tools and isinstance(tools[0], dict) else tools

            print(f"    - tools_called:    {tool_names}")
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
                print(f"    - chunk_sample:    ({top['score']:.4f}) {top['content'][:100].replace(chr(10), ' ')}...")
            print(f"    - trace_id:        {tid}")

            # 2. DeepEval
            rich_tool_calls = [
                ToolCall(name=t["name"], input_parameters=t.get("input_args", {}), output=t.get("output", "")) 
                for t in tools
            ] if tools and isinstance(tools[0], dict) else [ToolCall(name=t) for t in tools]

            test_case = LLMTestCase(
                input=q, actual_output=ans or "No answer.", expected_output=entry["expected_answer"],
                retrieval_context=ctx if ctx else ["No context."],
                tools_called=rich_tool_calls,
                expected_tools=[ToolCall(name=t) for t in entry["expected_tool_calls"]]
            )

            task_m = TaskCompletionMetric(threshold=0.5, model=eval_model)
            task_m.measure(test_case)

            # Tool Score
            set_a = set(tool_names)
            set_e = set(entry["expected_tool_calls"])
            if not set_a and not set_e: tool_score = 1.00
            elif not set_e or not set_a: tool_score = 0.00
            else: tool_score = len(set_a.intersection(set_e)) / len(set_a.union(set_e))

            print(f"    ✅ SCORE: Task={task_m.score or 0.0:.2f}, Tool={tool_score:.2f}")

            results.append({
                "index": i + 1,
                "question": q, "answer": ans, "ground_truth": entry["expected_answer"],
                "citations": citations, "task_completion": task_m.score or 0.0,
                "tool_correctness": tool_score, "trace_id": tid
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"   ❌ Case {i+1} Failed: {e}")

    # 3. Scorecard
    if not results: return
    rdf = evaluate_agent.calculate_ragas_metrics(results)

    def fmt(val):
        if pd.isna(val) or val is None or val == "": return "xxx"
        try:
            float_val = float(val)
            if np.isnan(float_val) or np.isinf(float_val): return "xxx"
            return f"{float_val:.2f}"
        except: return "xxx"

    git_version = evaluate_agent.get_git_commit_hash()
    print(f"\n🏷️  Pushing tracked evaluation scores to Langfuse under version tag: {git_version} (Session: {session_name})")
    print("="*95)
    print(f"{'#':<3} | {'Question':<30} | {'Task':<5} | {'Tool':<5} | {'Faith':<5} | {'Fact':<5}")
    print("-" * 95)
    
    for i, res in enumerate(results):
        r_row = rdf.iloc[i].to_dict() if i < len(rdf) else {}
        res["faithfulness"] = r_row.get('faithfulness')
        res["factual_correctness"] = r_row.get('answer_correctness')
        
        tid = res.get("trace_id")
        # Ensure we do not send scores to an invalid or "Ghost" trace ID
        if evaluate_agent.lf and tid and tid not in ["None", "Trace Not Found"]:
            # Extract pure PDF name from session to use as a global Langfuse tag
            pdf_tag = session_name.split(": ")[-1].replace(" ", "_") if ": " in session_name else "Combined-Test"
            try:
                import requests
                # Send tags directly via REST API since SDK updates might get overwritten by async flushes
                req = requests.post(f"{evaluate_agent.LANGFUSE_BASE_URL}/api/public/traces", 
                                    auth=(evaluate_agent.LANGFUSE_PUBLIC_KEY, evaluate_agent.LANGFUSE_SECRET_KEY),
                                    json={"id": tid, "tags": [pdf_tag, f"v-{git_version}"]},
                                    timeout=10)
            except Exception as e:
                print(f"Error tagging trace: {e}")

            for m_name, m_key in [("Task Completion", "task_completion"), ("Tool Correctness", "tool_correctness"), ("Faithfulness", "faithfulness"), ("Factual Correctness", "factual_correctness")]:
                m_val = res.get(m_key)
                if not (pd.isna(m_val) or m_val is None or m_val == "" or m_val == "xxx"):
                    try:
                        evaluate_agent.lf.create_score(
                            trace_id=tid, name=m_name, value=float(m_val), 
                            comment=f"Version: {git_version} | Session: {session_name}"
                        )
                    except Exception as e:
                        print(f"Langfuse error for score {m_name}: {e}")
                    
        idx_display = res.get("index", i + 1)
        print(f"{idx_display:<3} | {res['question'][:30]:<30} | {fmt(res.get('task_completion')):<5} | {fmt(res.get('tool_correctness')):<5} | "
              f"{fmt(res.get('faithfulness')):<5} | {fmt(res.get('factual_correctness')):<5}")
    print("="*95)
    if evaluate_agent.lf:
        evaluate_agent.lf.flush()
