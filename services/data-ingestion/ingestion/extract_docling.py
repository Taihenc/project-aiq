# docking.py
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat
from docling.datamodel.accelerator_options import AcceleratorOptions, AcceleratorDevice
from pathlib import Path
from pprint import pprint

class DoclingExtractor:
    """
    Light wrapper around Docling — no extra features, just your original config.
    """

    def __init__(self):
        pipeline = PdfPipelineOptions()
        pipeline.do_ocr = True
        pipeline.do_table_structure = True
        pipeline.do_picture_description = False
        pipeline.allow_external_plugins = True

        pipeline.accelerator_options = AcceleratorOptions(
            num_threads=8,
            device=AcceleratorDevice.AUTO
        )

        self.converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline)
            }
        )

    def convert(self, file_path: str):
        """Convert file and return Docling result."""
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(file_path)

        return self.converter.convert(str(file_path))


# --------------------------------------------------------
# Example usage 
# --------------------------------------------------------
if __name__ == "__main__":
    extractor = DoclingExtractor()

    source = "pdf/somat.pdf"
    result = extractor.convert(source)

    data = result.document.export_to_dict()
    # md = result.document.export_to_element_tree()
    # md = result.document.export_to_text()
    # md = result.document.export_to_dict()
    # md = result.document.export_to_doctags()
    # md = result.document.export_to_markdown()
    # md = result.document.export_to_html()
    pprint(data,width=120)
