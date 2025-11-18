from ingestion.storage import StorageManager


class Extractor:
    def __init__(self):
        self.storage = StorageManager()

    def extract(self, content, type: str):
        pass
