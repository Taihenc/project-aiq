import mimetypes
from pathlib import Path

def detect_mime(file_path: str) -> str:
    """
    Detect the mime type of a file using mimetypes library.
    Returns 'application/octet-stream' if detection fails.
    """
    mime, _ = mimetypes.guess_type(file_path)
    return mime or "application/octet-stream"

class FileReader:
    def __init__(self):
        # Docling-supported formats (common ones)
        self.supported_formats = {
            "pdf", "pptx", "docx", "xlsx",
            "html", "htm", "txt", "md",
            "png", "jpg", "jpeg"
        }

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

        # ---- NEW: Validate Docling-supported formats ----
        if file_type not in self.supported_formats:
            raise ValueError(
                f"Unsupported file type '{file_type}'. "
                f"Docling can only process: {sorted(self.supported_formats)}"
            )

        return {
            "path": str(file_path.resolve()),
            "file_type": file_type,
            "file_name": file_path.name,
        }
