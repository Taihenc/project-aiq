from ingestion import (
    file_reader,
    modality,
    context_builder,
    chunker,
    indexer,
)

from ingestion.extractor import (
    extractor
)


class IngestionWorker:
    def __init__(self):
        self.file_reader = file_reader.FileReader()
        self.modality = modality.Modality()
        self.extractor = extractor.Extractor()
        self.context_builder = context_builder.ContextBuilder()
        self.chunker = chunker.Chunker()
        self.indexer = indexer.Indexer()

    def ingest(self, file_path: str):
        file_info = self.file_reader.read(file_path)
        for page in file_info.pages:
            modalities = self.modality.detect(page, file_info.mime_type)
            page_contents = []
            for modality in modalities:
                content = self.extractor.extract(modality.content, modality.type)
                page_contents.append(content)
            full_page_text = self.context_builder.build(page_contents)
            summarized_chunks = self.chunker.chunk(
                full_page_text
            )  # Recursive chunking + summarize each chunk
            self.indexer.index(summarized_chunks)
