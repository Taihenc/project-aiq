# docking.py
from docling.document_converter import *
from docling.datamodel.pipeline_options import *
from docling.datamodel.base_models import *
from docling_core.types.doc import *
from docling.datamodel.accelerator_options import AcceleratorOptions, AcceleratorDevice
from pathlib import Path
from pprint import pprint

class DoclingExtractor:
    """
    Light wrapper around Docling — no extra features, just your original config.
    """

    def __init__(self):
        pdf_pipeline_options = PdfPipelineOptions()
        pdf_pipeline_options.do_ocr = True
        pdf_pipeline_options.do_table_structure = True
        pdf_pipeline_options.allow_external_plugins = True
        pdf_pipeline_options.do_picture_description = False
        table_options = TableStructureOptions()
        table_options.do_cell_matching = True
        pdf_pipeline_options.table_structure_options = table_options
        pdf_pipeline_options.picture_description_options = (
            granite_picture_description  # <-- the model choice
        )
        pdf_pipeline_options.picture_description_options.prompt = (
            "Describe the image in three sentences. Be consise and accurate."
        )
        pdf_pipeline_options.accelerator_options = AcceleratorOptions(
            num_threads=8,               # or 8 if your CPU is 8-core
            device=AcceleratorDevice.AUTO
        )
        pdf_format = PdfFormatOption(
            pipeline_options=pdf_pipeline_options
        )

        other_pipeline_options = ConvertPipelineOptions()
        other_pipeline_options.allow_external_plugins = True
        other_pipeline_options.do_picture_description = False
        other_pipeline_options.picture_description_options = (
            granite_picture_description
        )
        other_pipeline_options.picture_description_options.prompt = (
            "Describe the image in three sentences. Be consise and accurate."
        )
        word_format = WordFormatOption(
            pipeline_options=other_pipeline_options
        )
        pptx_format = PowerpointFormatOption(
            pipeline_options=other_pipeline_options
        )
        # ------------------------------
        # 2. Create converter
        # ------------------------------
        self.converter = DocumentConverter(
            format_options={
                InputFormat.PDF: pdf_format,
                InputFormat.DOCX: word_format,
                InputFormat.PPTX: pptx_format,
            }
        )
    def post_process_tables(self, result):
        """
        Add HTML summary for each table using export_to_html().

        Injects:
            table.meta.description = DescriptionMetaField(text=<HTML>)
        """
        doc = result.document
        if not hasattr(doc, "tables"):
            return result  # No tables detected

        for table in doc.tables:
            try:
                html = table.export_to_html(doc=doc)

                # Ensure meta exists
                if table.meta is None:
                    table.meta = FloatingMeta()

                # Add custom HTML description
                table.meta.description = DescriptionMetaField(text=html)

            except Exception as e:
                print(f"[DoclingExtractor] Failed to annotate table: {e}")

        return result

    # --------------------------------------------------------
    # Conversion wrapper
    # --------------------------------------------------------
    def convert(self, file_path: str):
        """Convert file and run table post-processing."""
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(file_path)

        result = self.converter.convert(str(file_path))
        # result = self.post_process_tables(result)
        return result


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
