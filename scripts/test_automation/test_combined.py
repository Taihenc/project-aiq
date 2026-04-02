import os
import json
import requests
import time

import test_config
from evaluator_engine import evaluate_test_cases

def test_combined_pipeline():
    print("==================================================")
    print(" 🌍 Starting COMBINED STRESS TEST AI Evaluation")
    print("==================================================")

    pdf_files_to_upload = set()
    all_test_entries = []

    # 1. Gather all local files
    for json_filename, pdf_filename in test_config.TEST_MAPPING.items():
        if test_config.TARGET_TEST_FILES and json_filename not in test_config.TARGET_TEST_FILES and pdf_filename not in test_config.TARGET_TEST_FILES:
            continue
            
        json_path = os.path.join(test_config.GOLDEN_DIR, json_filename)
        pdf_path = os.path.join(test_config.PDF_DIR, pdf_filename)

        if os.path.exists(pdf_path) and os.path.exists(json_path):
            pdf_files_to_upload.add(pdf_path)

            try:
                with open(json_path, "r") as f:
                    data = json.load(f)
                    raw_items = data.get("entries", []) if isinstance(data, dict) else data
                    
                    if test_config.MAX_QUESTIONS_PER_TEST:
                        raw_items = raw_items[:test_config.MAX_QUESTIONS_PER_TEST]
                        
                    for item in raw_items:
                        if "question" in item and ("answer" in item or "expected_answer" in item):
                            all_test_entries.append({
                                "question": item["question"],
                                "expected_answer": item.get("answer") or item.get("expected_answer"),
                                "expected_tool_calls": item.get("expected_tool_calls") or ["search_documents"]
                            })
            except Exception as e:
                print(f"Skipping {json_filename} due to parse error: {e}")

    if not pdf_files_to_upload:
        print("❌ No matching local PDFs found. Aborting.")
        return

    # 2. Upload all documents to the vector DB
    print("\n📦 STEP 1/2: Preparing Vector Database...")
    for pdf_path in pdf_files_to_upload:
        pdf_filename = os.path.basename(pdf_path)

        # Delete old vectors to avoid duplicates
        try:
            requests.delete(f"{test_config.EMBEDDING_URL}/v1/documents/delete_by_file", params={"file_name": pdf_filename}, timeout=30)
        except Exception: 
            pass

        print(f"  📤 Uploading {pdf_filename} to Data Ingestion Service...")
        try:
            with open(pdf_path, "rb") as f:
                upload_resp = requests.post(
                    f"{test_config.INGESTION_URL}/upload", 
                    files={"file": (pdf_filename, f, "application/pdf")},
                    timeout=300
                )
            if upload_resp.status_code == 200:
                print("     ✅ Upload and Embedding complete!")
            else:
                print(f"     ❌ Upload failed: {upload_resp.status_code}")
        except Exception as e:
            print(f"     ❌ Upload error: {e}")

    time.sleep(5) # Let Qdrant stabilize

    # 3. Test the combined dataset
    print("\n🤖 STEP 2/2: Stress Testing the AI...")
    session_id = f"CombinedTest: {len(pdf_files_to_upload)} Documents"
    evaluate_test_cases(all_test_entries, session_name=session_id)

    print("\n==================================================")
    print(" 🎉 COMBINED EVALUATION PIPELINE COMPLETE")
    print("==================================================")

if __name__ == "__main__":
    test_combined_pipeline()
