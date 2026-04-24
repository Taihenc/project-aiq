import os
import json
import requests
import time

import test_config
from evaluator_engine import evaluate_test_cases

def test_isolated_pipeline():
    print("==================================================")
    print(" 🧪 Starting ISOLATED AI Evaluation Pipeline")
    print("==================================================")

    for json_filename, pdf_filename in test_config.TEST_MAPPING.items():
        if test_config.TARGET_TEST_FILES and json_filename not in test_config.TARGET_TEST_FILES and pdf_filename not in test_config.TARGET_TEST_FILES:
            continue
            
        json_path = os.path.join(test_config.GOLDEN_DIR, json_filename)
        pdf_path = os.path.join(test_config.PDF_DIR, pdf_filename)

        print(f"\n\n▶️ PREPARING TEST CASE: {json_filename}")

        if not os.path.exists(json_path):
            print(f"  ❌ Skipping: JSON Questions file not found at {json_path}")
            continue
            
        if not os.path.exists(pdf_path):
            print(f"  ❌ Skipping: Correlated PDF not found at {pdf_path}")
            continue

        # 1. Load Questions
        try:
            with open(json_path, "r") as f:
                json_data = json.load(f)
        except Exception as e:
            print(f"  ❌ Failed to parse JSON: {e}")
            continue

        entries = []
        raw_items = json_data.get("entries", []) if isinstance(json_data, dict) else json_data
        
        if test_config.MAX_QUESTIONS_PER_TEST:
            raw_items = raw_items[:test_config.MAX_QUESTIONS_PER_TEST]
            
        for item in raw_items:
            if "question" in item and ("answer" in item or "expected_answer" in item):
                entries.append({
                    "question": item["question"],
                    "expected_answer": item.get("answer") or item.get("expected_answer"),
                    "expected_tool_calls": item.get("expected_tool_calls") or ["search_documents"]
                })
        
        if not entries:
            print("  ❌ Skipping: No valid questions found in JSON.")
            continue

        # 2. Reset Vector Database for this specific file
        print(f"  🧹 Wiping old context for {pdf_filename} from Embedding Service...")
        try:
            del_resp = requests.delete(
                f"{test_config.EMBEDDING_URL}/v1/documents/delete_by_file", 
                params={"file_name": pdf_filename},
                timeout=30
            )
            if del_resp.status_code == 200:
                print("     ✅ Deletion successful.")
            else:
                print(f"     ⚠️ Warning: Deletion returned {del_resp.status_code} - {del_resp.text}")
        except Exception as e:
            print(f"     ⚠️ Failed to connect to embedding service for deletion: {e}")

        # 3. Upload File to Data Ingestion
        print(f"  📤 Uploading {pdf_filename} to Data Ingestion Service (This may take a moment)...")
        try:
            with open(pdf_path, "rb") as f:
                upload_resp = requests.post(
                    f"{test_config.INGESTION_URL}/upload", 
                    files={"file": (pdf_filename, f, "application/pdf")},
                    timeout=300 # Wait up to 5 minutes for chunking to finish
                )
            if upload_resp.status_code == 200:
                print("     ✅ Upload and Embedding complete!")
            else:
                print(f"     ❌ Upload failed: {upload_resp.status_code} - {upload_resp.text}")
                continue
        except requests.exceptions.Timeout:
            print("     ❌ Upload timed out after 5 minutes.")
            continue
        except Exception as e:
            print(f"     ❌ Upload error: {e}")
            continue

        # Give Qdrant a tiny moment to flush indexes
        time.sleep(3)

        # 4. Run Evaluation
        session_id = f"IsolatedTest: {pdf_filename}"
        evaluate_test_cases(entries, session_name=session_id)

    print("\n==================================================")
    print(" 🎉 ISOLATED EVALUATION PIPELINE COMPLETE")
    print("==================================================")

if __name__ == "__main__":
    test_isolated_pipeline()
