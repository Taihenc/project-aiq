# Data Ingestion Service Architecture

This document provides a detailed breakdown of the Data Ingestion ETL Pipeline within the AINGO monorepo. The ingestion pipeline is explicitly responsible for picking up raw documents, orchestrating intelligent extraction and text chunking, and transmitting the structured chunks to the global Embedding API.

---

## 1. Pipeline Entrypoints

Files can enter the Data Ingestion pipeline through two separate access protocols:
- **Ingestion API (FastAPI)**: Typical synchronous REST events via HTTP POST.
- **Event Consumer (RabbitMQ)**: Asynchronous task execution emitted whenever the File Storage service catches a new successful upload inside the MinIO object store.

---

## 2. Core ETL Engine 

The heart of the pipeline rests completely within the `IngestionWorker` (`services/data-ingestion/workers/ingestion_worker.py`). All legacy fragmented extractors and explicit modality routing have been retired and collapsed into a fully streamlined flow:

### A. Universal Extractor (Docling)
*   **Input:** The raw file binary (PDF, DOCX, Image, Excel).
*   **Action:** Intelligently parses the entire document structure, applying OCR and layout detection to extract human-readable text comprehensively.
*   **Output:** **Raw Extracted Text** string encompassing the entire document.

### B. Hierarchy Chunker (`chunker.py`)
*   **Input:** The massive Raw Extracted Text block.
*   **Action:** Splits the endless wall of text into smaller, contextually separated paragraphs and sections while prioritizing structural hierarchies (heading groups, lists).
*   **Output:** **`List[Text Chunks]`** — discrete, un-identified text snippets.

### C. Context Builder (`context_builder.py`)
*   **Input:** `List[Text Chunks]`
*   **Action:** Attaches crucial metadata back to the anonymous chunks. This guarantees that every snippet remembers its source `file_path`, document ID seed, exact page number, and original file name.
*   **Output:** **`List[Context Records]`** — robust JSON objects.

### D. Uploader (`upload.py`)
*   **Input:** `List[Context Records]`
*   **Action:** Bundles everything into an explicit application payload format and initiates an HTTP POST request.
*   **Output:** **Sends to Embedding Service** — directly dispatching the processed data across the internal boundary.

---

## 3. Storage & Downstream Handling

To ensure appropriate microservice bounds, the Data Ingestion service **does not permanently store** vector data or file metadata arrays natively on disk. It completely delegates storage responsibilities to the **Embedding API**.

- **Embedding API**: Acts as the reception boundary via `HTTP POST /embed`. It receives the chunks, runs them through standard vectorization (via SageMaker models, or local HuggingFace embeddings).
- **Metadata DB (Qdrant & SQLite/Postgres)**: After vectorization, the Embedding API securely synchronizes and persists the exact vectors alongside the metadata permanently into the target metadata and vector graph storage mechanisms.

---

_This markdown overview structurally matches the data layer visually diagrammed inside `docs/data_ingestion_diagram.py` and natively rendered at `docs/data_ingestion_overview.png`._
