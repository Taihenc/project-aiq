# ingestion/file_reader.py
from pathlib import Path
from ingestion.modality import ModalityClassifier

class FileReader:
    def read(self, file_path: str):
        """
        Detect file type and send to ModalityClassifier for processing.
        Currently only supports PDF.
        """
        file_path = Path(file_path)
        file_type = file_path.suffix.lower()

        if file_type == ".pdf":
            print(f"[FileReader] Reading PDF file: {file_path.name}")
            modality = ModalityClassifier()
            return modality.process_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")