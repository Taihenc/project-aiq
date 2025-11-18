from datetime import datetime, timezone
import hashlib


def sha1_bytes(b: bytes) -> str:
    """Convert bytes to SHA1 hex digest."""
    return hashlib.sha1(b).hexdigest()


def clean_text(text: str) -> str:
    """Normalize whitespace; preserve single spaces only."""
    return " ".join(text.split()).strip()


def utc_now_iso() -> str:
    """ISO 8601 timestamp with trailing Z (UTC)."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
