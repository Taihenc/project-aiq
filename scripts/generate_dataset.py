"""
Ground Truth Dataset Generator (v2.2)
====================================
1. Runs each question through search-flow /completions.
2. Fetches structured per-chunk text from embedding-service.
3. Uses Azure OpenAI (from .env) to generate a "Draft Ground Truth".
4. Adds "expected_tool_calls" based on query intent.
5. Saves everything to JSON for final human verification.

Usage:
  uv run --with requests --with python-dotenv scripts/generate_dataset.py
"""

import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOTENV_PATH = os.path.join(SCRIPT_DIR, "..", "services", "search-flow", ".env")
load_dotenv(dotenv_path=DOTENV_PATH)

OUTPUT_FILE = os.path.join(SCRIPT_DIR, "ground_truth_dataset.json")

# ── Config ──────────────────────────────────────────────────────────────────
SEARCH_FLOW_URL = os.getenv("SEARCH_FLOW_URL", "http://localhost:8000")
EMBEDDING_URL   = os.getenv("EMBEDDING_URL",   "http://localhost:8003")

# Azure Config for Drafting
AZURE_API_KEY      = os.getenv("AZURE_API_KEY")
AZURE_API_BASE     = os.getenv("AZURE_API_BASE")
AZURE_API_VERSION  = os.getenv("AZURE_API_VERSION")
AZURE_MODEL_NAME   = os.getenv("AZURE_MODEL_NAME", "azure/gpt-4o-mini").replace("azure/", "")

# ── Your questions ──────────────────────────────────────────────────────────
QUESTIONS = [
    {
        "q": "what is life span of sandbox environment?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "สภาพแวดล้อมแบบ Sandbox (Sandbox environment) มีอายุการใช้งานนานเท่าใด?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "เทคนิคอย่างไรเกี่ยวกับการจัดการ Session Inactivity และรหัสผ่าน (Passwords) เพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาตมีอะไรบ้าง?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "การพัฒนา microservice ที่ใช้ใน group มีข้อกำหนดสำคัญอะไรบ้าง หากไม่ได้ใช้ API Gateway?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "มาตราฐานการการเก็บรักษา Audit Logs มีอะไรบ้าง?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "เข้าถึง server แบบ Cloud Portal และการเข้าถึงแบบ Remote (เช่น RDP/SSH) แตกต่างกันอย่างไรบ้าง?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "การจัดการ Key โดยเฉพาะระบบที่เกี่ยวข้องกับ PCI DSS เมื่อเกี่ยวข้องกับกฎอะไรบ้าง?",
        "expected_tools": ["search_documents"]
    },
    {
        "q": "ในกรณีที่เกิดเหตุเกี่ยวกับความปลอดภัยของผู้ให้บริการ Cloud ต้องรายงานต่อใครกับ scbx group?",
        "expected_tools": ["search_documents"]
    },
]

# ─────────────────────────────────────────────────────────────────────────────

def call_completions(question: str) -> dict:
    resp = requests.post(
        f"{SEARCH_FLOW_URL}/api/v1/completions",
        json={"query": question, "mode": "search"},
        timeout=120,
    )
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
        resp = requests.post(
            f"{EMBEDDING_URL}/v1/structured-file-reference",
            json={"files": files_payload},
            timeout=60
        )
        resp.raise_for_status()
        return resp.json().get("files", [])
    except Exception as e:
        print(f"  ⚠ Failed to fetch structured chunks: {e}")
        return []

def generate_draft_ground_truth(question: str, chunks: list) -> str:
    if not AZURE_API_KEY:
        return "[Error: Missing AZURE_API_KEY in .env]"
    if not chunks:
        return "[Error: No chunks retrieved to draft answer]"

    context = ""
    for file in chunks:
        for page in file.get("pages", []):
            for chunk in page.get("chunks", []):
                context += f"Source: {file['file_path']} (Page {page['page_number']})\nContent: {chunk['content']}\n\n"

    prompt = f"""You are a Ground Truth generator for a RAG system evaluation.
Based ONLY on the provided chunks below, generate the PERFECT, factual, and concise answer to the question.
If the chunks do not contain the answer, say "Information not found in retrieved chunks."

QUESTION: {question}

RETRIEVED CHUNKS:
{context}

PERFECT ANSWER:"""

    try:
        url = f"{AZURE_API_BASE}/openai/deployments/{AZURE_MODEL_NAME}/chat/completions?api-version={AZURE_API_VERSION}"
        headers = {"api-key": AZURE_API_KEY, "Content-Type": "application/json"}
        payload = {
            "messages": [
                {"role": "system", "content": "You provide factual ground-truth answers based on provided context."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[Drafting Error: {e}]"

def main():
    if not os.path.exists(DOTENV_PATH):
        print(f"⚠  Warning: .env file not found at {DOTENV_PATH}")

    dataset = []
    print(f"\n🚀 Processing {len(QUESTIONS)} questions...\n")

    for idx, item in enumerate(QUESTIONS, start=1):
        question = item["q"]
        expected_tools = item["expected_tools"]
        print(f"⏳ [{idx}/{len(QUESTIONS)}] {question}")
        try:
            flow = call_completions(question)
            answer = flow.get("response", "")
            citations = flow.get("citations") or []
            
            # Fetch ALL chunk content
            enriched_files = fetch_structured_chunks(citations)
            
            # Generate Draft Answer
            print("   ✍️ Drafting expected answer using Azure OpenAI...")
            draft = generate_draft_ground_truth(question, enriched_files)
            
            dataset.append({
                "id": idx,
                "question": question,
                "agent_answer": answer,
                "expected_answer": draft,
                "expected_tool_calls": expected_tools,
                "citations": enriched_files,
                "notes": ""
            })

        except Exception as e:
            print(f"  ❌ Error: {e}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"generated_at": datetime.now().isoformat(), "entries": dataset}, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Done! Dataset saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
