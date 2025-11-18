from ingestion.summarizer import Summarizer


class Chunker:
    def __init__(self):
        self.summarizer = Summarizer()

    def chunk(self, full_page_text: str):
        pass
