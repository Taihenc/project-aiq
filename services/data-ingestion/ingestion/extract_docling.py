# docking.py
from docling.document_converter import *
from docling.datamodel.pipeline_options import *
from docling.datamodel.base_models import *
from docling.chunking import HybridChunker
from docling_core.types.doc import *
from chunker import *
from docling.datamodel.accelerator_options import AcceleratorOptions, AcceleratorDevice
from pathlib import Path
from pprint import pprint

class DoclingExtractor:

    def __init__(self):
        pdf_pipeline_options = PdfPipelineOptions()
        pdf_pipeline_options.do_ocr = True
        pdf_pipeline_options.do_table_structure = True
        pdf_pipeline_options.allow_external_plugins = True
        pdf_pipeline_options.do_picture_description = False # AI VISION ON/OFF
        table_options = TableStructureOptions()
        table_options.do_cell_matching = True
        pdf_pipeline_options.table_structure_options = table_options
        pdf_pipeline_options.picture_description_options = (
            smolvlm_picture_description  # <-- the model choice
        )
        pdf_pipeline_options.picture_description_options.prompt = (
            "give description in 5 words"
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
        # doc = result.document
        # if not hasattr(doc, "tables"):
        #     return result  # No tables detected

        # for table in doc.tables:
        #     try:
        #         html = table.export_to_html(doc=doc)

        #         # Ensure meta exists
        #         if table.meta is None:
        #             table.meta = FloatingMeta()

        #         # Add custom HTML description
        #         table.meta.description = DescriptionMetaField(text=html)

        #     except Exception as e:
        #         print(f"[DoclingExtractor] Failed to annotate table: {e}")

        return result
        # for context builder dont need to build its own table builder 
    # --------------------------------------------------------
    # Conversion wrapper
    # --------------------------------------------------------
    def convert(self, file_path: str,export: str = "raw"):
        """Convert file and run table post-processing."""
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(file_path)

        result = self.converter.convert(str(file_path))
        result = self.post_process_tables(result).document
            # ---- choose output format ----
        if export == "raw":
            return result
        elif export == "dict":
            return result.export_to_dict()
        elif export == "markdown":
            return result.export_to_markdown()
        elif export == "html":
            return result.export_to_html()
        elif export == 'items':
            return result.iterate_items()
        elif export == "text":
            return result.export_to_text()
        elif export == "element_tree":
            return result.export_to_element_tree()
        elif export == "doctags":
            return result.export_to_doctags()
        else:
            raise ValueError(f"Unsupported export format: {export}")


# --------------------------------------------------------
# Example usage
# --------------------------------------------------------
if __name__ == "__main__":
    extractor = DoclingExtractor()

    source = "/Users/t.puran.prasertthai/Documents/GitHub/AINGO/services/data-ingestion/ingestion/somat.pdf"
    result = extractor.convert(source,'dict')
    # a = Chunker().chunk(result)
    pprint(result,width=120)
    # for i in result:
    #      pprint(i)
    # pprint(result,width=120)
