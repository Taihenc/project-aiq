## Project Structure

```
data-ingestion/             # 📥 ingestion pipeline (documents → vectors)
├── __init__.py
├── main.py                 # FastAPI entrypoint (upload / trigger ingestion)
├── ingestion/
│   ├── __init__.py
│   ├── file_reader.py      # detect mime type, split pages
│   ├── modality.py         # text/image/table detection
│   ├── extractor.py        # text/OCR/image caption/table extraction
│   ├── context_builder.py 
│   ├── summary.py          # build metadata dict
│   ├── indexer.py          # push vector + metadata to DBs
│   └── storage.py          # save artifacts to MinIO/S3
├── workers/                # background task runner (RQ/Celery)
│   ├── ingestion_worker.py
│   └── __init__.py
├── db/                    # owns write access to metadata DB
│   ├── __init__.py
│   ├── database.py
│   ├── document.py
│   ├── page.py
│   └── job.py
├── embedding/             # client adapter (local or HTTP)
│   ├── __init__.py
│   └── client.py
└── config.py
```