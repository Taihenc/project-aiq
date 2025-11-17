# test.py
from ingestion.file_reader import FileReader
from ingestion.modality import ModalityClassifier

reader = FileReader()
info = reader.read("/Users/t.puran.prasertthai/Documents/GitHub/AINGO/services/data-ingestion/ingestion/somat.pdf")

print(f"[FileReader] Detected file type: {info['file_type']}")

if info["file_type"] == "pdf":
    modality = ModalityClassifier()
    results = modality.process_pdf(info["path"])
    print(f"\nExtracted {len(results)} elements.\n")
    print(results)
else:
    print(f"Unsupported file type: {info['file_type']}")
