# ingestion/file_reader.py
from pathlib import Path

class FileReader:
    def __init__(self):
        pass

    def detect_file_type(self, file_path: str) -> str:
        """
        Detect the file type (e.g., PDF, PPTX, DOCX, etc.)
        """
        file_path = Path(file_path)
        return file_path.suffix.lower().strip(".")

    def read(self, file_path: str) -> dict:
        """
        Return basic info (path, type) — does NOT process the content.
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_type = self.detect_file_type(file_path)
        return {
            "path": str(file_path.resolve()),
            "file_type": file_type,
            "file_name": file_path.name,
        }
