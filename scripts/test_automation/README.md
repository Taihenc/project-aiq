# AINGO Automated Testing Suite
This folder (`scripts/test_automation`) was created to securely isolate testing runs to prevent the AI from cross-contaminating answers between different PDF files. It seamlessly interacts with your live Data Ingestion API (`:8002`) and Embedding Database (`:8003`), allowing it to dynamically wipe the Qdrant database, ingest the relevant context chunking, and run evaluations over the network entirely autonomously.

## 🛠 Preparation
Before running tests, ensure you map which PDF belongs to which Golden Test JSON set.


1. Create a folder named `test-file` inside `scripts/` if it doesn't already exist (`scripts/test-file/`).
2. Drop your target `.pdf` files into the `scripts/test-file/` directory.
3. Open `test_config.py`.
3. Locate the JSON filename that corresponds to your PDF, and replace `"[INSERT_PDF_NAME].pdf"` with the exact filename of your PDF.

## 🚀 Scenario 1: Isolated Vector Tests (Recommended)
This runs a 1-to-1 exact evaluation. It wipes the database, isolates a specific PDF, uploads it, and then only grades the AI on the questions related to that PDF.

**Command:**
```bash
uv run --with requests --with python-dotenv --with ragas --with deepeval --with langfuse --with pandas --with datasets --with openai --with langchain-openai --with langchain-huggingface --with sentence-transformers scripts/test_automation/test_isolated.py
```

## 🌍 Scenario 2: Combined Stress Tests (Hallucination Check)
This runs an all-at-once evaluation. It wipes the database, pushes all known PDFs from the config map into the vector context window simultaneously, and fires every JSON question at the AI to see if it hallucinates or struggles to find the source.

**Command:**
```bash
uv run --with requests --with python-dotenv --with ragas --with deepeval --with langfuse --with pandas --with datasets --with openai --with langchain-openai --with langchain-huggingface --with sentence-transformers scripts/test_automation/test_combined.py
```

## Troubleshooting
- **PDF Skips/Aborts:** If a script skips a test, ensure `test_config.py` does not say `"[INSERT_PDF_NAME]"` and double check the PDF actually sits in `scripts/test-file/`.
- **Database Refusal:** Ensure your backend services (`pnpm run dev:embedding-service` and `pnpm run dev:search-flow`) are actively running in separate terminals before kicking off tests!
