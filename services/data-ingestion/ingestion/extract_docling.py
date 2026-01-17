# docling.py
from docling.document_converter import *
from docling.datamodel.pipeline_options import *
from docling.datamodel.base_models import *
from docling_core.types.doc import *
from docling.pipeline.vlm_pipeline import VlmPipeline
# from chunker import Chunker
# from context_builder import ContextBuilder
from docling.datamodel.accelerator_options import AcceleratorOptions, AcceleratorDevice
from pathlib import Path
from pprint import pprint
class DoclingExtractor:
    def __init__(self):
        # CSV, WebVTT: default
        # Configuration for BOTH converters
        self.supported_extensions = {
            ".pdf", ".docx", ".xlsx", ".pptx",  # Office & PDF
            ".md", ".adoc",                     # Markdown & AsciiDoc
            ".html", ".xhtml", ".csv", ".vtt",  # Web & Data
            ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp" # Images
        }
        accel_options = AcceleratorOptions(num_threads=8, device=AcceleratorDevice.AUTO)
        # --- 1. SHARED VISION PROMPT ---
        # Set the prompt on the model object first
        smolvlm_picture_description.prompt = (
            "explain this image in 5 sentences. Be precise and accurate"
        )    
        # --- 2. BUILD FAST CONVERTER (Vision OFF) ---
        pdf_opts_fast = PdfPipelineOptions(do_ocr=True, do_table_structure=True, do_picture_description=False)
        pdf_opts_fast.accelerator_options = accel_options
        # Ensure table matching is on to keep structure
        pdf_opts_fast.table_structure_options.do_cell_matching = True
        
        other_opts_fast = ConvertPipelineOptions(do_picture_description=False)
        
        self.fast_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_opts_fast),
                InputFormat.DOCX: WordFormatOption(pipeline_options=other_opts_fast),
                InputFormat.PPTX: PowerpointFormatOption(pipeline_options=other_opts_fast),
                InputFormat.XLSX: ExcelFormatOption(pipeline_options=other_opts_fast),
                InputFormat.IMAGE: ImageFormatOption(
                    pipeline_options=VlmPipelineOptions(do_picture_description=False), 
                    pipeline_cls=VlmPipeline
                )
            }
        )

        # --- 3. BUILD SMART CONVERTER (Vision ON) ---
        pdf_opts_smart = PdfPipelineOptions(do_ocr=True, do_table_structure=True, do_picture_description=True)
        pdf_opts_smart.accelerator_options = accel_options
        pdf_opts_smart.picture_description_options = smolvlm_picture_description
        # Critical: Re-apply table structure settings so Pass 2 doesn't lose Pass 1's structure
        pdf_opts_smart.table_structure_options.do_cell_matching = True
        
        other_opts_smart = ConvertPipelineOptions(do_picture_description=True)
        other_opts_smart.picture_description_options = smolvlm_picture_description
        
        self.smart_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_opts_smart),
                InputFormat.DOCX: WordFormatOption(pipeline_options=other_opts_smart),
                InputFormat.PPTX: PowerpointFormatOption(pipeline_options=other_opts_smart),
                InputFormat.XLSX: ExcelFormatOption(pipeline_options=other_opts_smart),
                InputFormat.IMAGE: ImageFormatOption(
                    pipeline_options=VlmPipelineOptions(
                        do_picture_description=True, 
                        picture_description_options=smolvlm_picture_description
                    ),
                    pipeline_cls=VlmPipeline
                )
            }
        )
    def convert(self, file_path: str, export: str = "raw"):
        file_path = Path(file_path)
        if file_path.suffix.lower() not in self.supported_extensions:
            raise ValueError(f"Can't format: Unsupported file extension '{file_path.suffix}'")
        if not file_path.exists():
            raise FileNotFoundError(file_path)

        # To handle images as PDFs (for better table/text extraction), we convert only if it's an image
        source = str(file_path)
        # PASS 1: Try with Fast Converter
        result = self.fast_converter.convert(source).document
        
        # PASS 2: If pictures detected, rerun with Smart Converter
        if len(result.pictures) > 0:
            pprint("detect image")
            result = self.smart_converter.convert(source).document

        # ---- choose output format (Original logic kept) ----
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
    source = "services/data-ingestion/ingestion/ex1.xlsx"
    result = extractor.convert(source)
    # pprint(extractor.convert(source,'dict'))
    # a = Chunker().chunk(result)
    # builder = ContextBuilder() 
    # b = builder.build(a,source)
    # pprint(b,width=120)
    # for i in result:
    #      pprint(i)
    # pprint(result,width=120)
