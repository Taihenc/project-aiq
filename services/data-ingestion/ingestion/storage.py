# ingestion/storage.py
from pathlib import Path
import io
import base64
from typing import Optional

class StorageManager:
    def __init__(self, base_dir: str = "ingestion/image_store", backend: str = "local"):
        """
        backend: "local" (default) or "bucket"
        For now, local saving; in future, add bucket clients (S3, GCS, OSS)
        """
        self.backend = backend
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # -------------------- PUBLIC API -------------------- #
    def save_image(self, img_bytes: bytes, filename: str) -> str:
        """
        Save image to the active backend and return the accessible path or URL.
        """
        if self.backend == "local":
            return self._save_local(img_bytes, filename)
        elif self.backend == "bucket":
            return self._save_bucket(img_bytes, filename)
        else:
            raise ValueError(f"Unknown backend: {self.backend}")

    def to_base64(self, img_bytes: bytes) -> str:
        return base64.b64encode(img_bytes).decode("utf-8")

    # -------------------- LOCAL STORAGE -------------------- #
    def _save_local(self, img_bytes: bytes, filename: str) -> str:
        path = self.base_dir / filename
        with open(path, "wb") as f:
            f.write(img_bytes)
        print(f"[StorageManager] Saved locally: {path}")
        return str(path)

    # -------------------- CLOUD STORAGE (Placeholder) -------------------- #
    def _save_bucket(self, img_bytes: bytes, filename: str) -> str:
        """
        Future: upload to cloud bucket (S3, OSS, etc.)
        Example:
            s3_client.put_object(Bucket="your-bucket", Key=filename, Body=img_bytes)
        """
        # For now, emulate URL
        fake_url = f"https://bucket.example.com/{filename}"
        print(f"[StorageManager] (Simulated) Uploaded to bucket: {fake_url}")
        return fake_url
