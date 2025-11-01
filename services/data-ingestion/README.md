## Project Structure

```
data-ingestion/             # 📥 Ingestion pipeline (documents → vectors)
├── __init__.py
├── main.py                 # FastAPI entrypoint (upload / trigger ingestion)
├── ingestion/
│   ├── __init__.py
│   ├── file_reader.py      # read file, detect mime type and split into pages
│   ├── modality.py         # detect content types in each page (text/image/table)
│   ├── extractor.py        # extract content from modality.content by modality.type
│   ├── context_builder.py  # combine all modalities in a page into single text
│   ├── chunker.py          # recursive text chunking and summarize each chunk
│   ├── indexer.py          # create vector embeddings and save metadata to database for each chunk
│   └── storage.py          # save artifacts to MinIO/S3
├── workers/                # background task runner (RQ/Celery)
│   ├── ingestion_worker.py # main worker that runs ingestion pipeline
│   └── __init__.py
├── db/                    # owns write access to metadata DB
│   ├── __init__.py
│   ├── database.py         # database connection and session management
│   ├── document.py         # document model and operations
│   ├── page.py            # page model and operations
│   └── job.py             # ingestion job model and operations
├── embedding/             # client adapter (local or HTTP)
│   ├── __init__.py
│   └── client.py          # client for calling embedding service
└── config.py             # configuration settings and environment variables
```

---

## Ingestion Flow

The ingestion pipeline processes documents through the following stages:

1. **File Reading**: `file_reader.read(file_path)` - Reads file, detects MIME type, and splits into pages
2. **For each page**:
   - **Modality Detection**: `modality.detect(page, mime_type)` - Detects content types in the page (text/image/table)
   - **For each modality**:
     - **Content Extraction**: `extractor.extract(modality.content, modality.type)` - Extracts content from the modality (text/OCR/image caption/table parsing)
   - **Context Building**: `context_builder.build(page_contents)` - Combines all modality contents in a page into a single text
   - **Chunking**: `chunker.chunk(full_page_text)` - Recursively chunks the text and summarizes each chunk
   - **For each chunk**:
     - **Indexing**: `indexer.index(chunk)` - Creates vector embeddings and saves metadata to database

---

```mermaid
   flowchart LR
    %% ====== FILE INPUT ======
    F[📄 File] --> FR[📂 File Reader]
    FR --> CL[🔍 Classify Component]

    %% ====== EXTRACTOR GROUP ======
    subgraph EX[🧠 Extractor]
        direction TB
        V1[Vision]
        O1[OCR]
        O2[OCR / Vision]
        T1[Text Extraction]
        T2[Table Extraction]
    end

    %% ====== CLASSIFY CONNECTIONS ======
    CL -->|Image| V1
    CL -->|Scan| O1
    CL -->|Presentation| O2
    CL -->|Embedded Text| T1
    CL -->|Table| T2

    %% ====== CONTEXT BUILDER ======
    V1 --> CB[🧱 Context Builder]
    O1 --> CB
    O2 --> CB
    T1 --> CB
    T2 --> CB

    %% ====== CHUNKER, SUMMARIZER, EMBEDING ======
    subgraph PROCESS[ ]
        direction TB
        SU[🤖 Summarizer]
        CH[✂️ Chunker]

    end

    CB --> PROCESS
    CH --> SU
    PROCESS --> EM[🗄️ Embedding Service]
```

---

### Document Upload Flow

```mermaid
sequenceDiagram
    autonumber

    %% ==========================
    box Client Layer
        participant User as 🧑‍💻 User (Frontend)
    end

    box API Layer
        participant API as 🌐 Ingestion API (FastAPI)
    end

    box Ingestion Pipeline
        participant Reader as 📂 File Reader
        participant Modality as 🔍 Modality Detector
        participant Extractor as 🧠 Extractor
        participant Context as 🧱 Context Builder
        participant Chunker as ✂️ Chunker
        participant Indexer as 🗂️ Indexer
    end

    box Embedding Service
        participant Embed as 🤖 Embedding Generator
        participant DB as 🗄️ Vector DB
    end
    %% ==========================


    %% ======= FILE UPLOAD =======
    User->>API: POST /ingest {file, metadata}
    API->>Reader: read(file_path)

    %% ======= FILE READING & MODALITY DETECTION =======
    Reader->>Modality: detect(page, mime_type)
    Modality-->>Reader: modalities[]

    %% ======= CONTENT EXTRACTION =======
    Reader->>Extractor: extract(content, modality.type)
    Extractor-->>Reader: extracted_content[]

    %% ======= CONTEXT BUILDING =======
    Reader->>Context: build(page_contents)
    Context-->>Reader: combined_page_text

    %% ======= CHUNKING & SUMMARIZATION =======
    Reader->>Chunker: chunk(full_page_text)
    Chunker-->>Reader: summarized_chunks[]

    %% ======= INDEXING & EMBEDDING =======
    Reader->>Indexer: index(summarized_chunks)
    Indexer->>Embed: POST /embed {summarized_chunks}
    Embed-->>Indexer: embeddings[]
    Indexer->>DB: store(chunks, embeddings, metadata)
    DB-->>Indexer: ok

    %% ======= RESPONSE =======
    Indexer-->>API: Success {document_id, chunks_count}
    API-->>User: ✅ Upload & Ingestion Complete
```