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
        self.image_extensions = {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
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
                # InputFormat.IMAGE: ImageFormatOption(
                #     pipeline_options=PdfPipelineOptions( # or pdf
                #         do_picture_description=True,
                #         generate_page_images = True,
                #         do_ocr = False,
                #     )
                # )
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
                InputFormat.XLSX: ExcelFormatOption(pipeline_options=other_opts_smart)
                # InputFormat.IMAGE: ImageFormatOption(
                #     pipeline_options=PdfPipelineOptions( # or pdf
                #         do_picture_description=True,
                #         generate_page_images = False,
                #         do_ocr = True,
                #     )
                # )
            }
        )

    def _mock_external_model(self, base64_string):
        import requests
        import json
        url = "http://localhost:1234/v1/chat/completions"
        headers = {
            "Content-Type": "application/json"
        }
        # 2. Construct the Payload (OpenAI Vision Format)
        # Note: We must add the data URI header back because LM Studio expects it.
        # We assume jpeg/png; generic 'image/jpeg' usually works for most vision models.
        payload = {
            "model": "local-model", # The name doesn't matter for LM Studio usually
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": (
                                "explain the picture be clear and precise"
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_string}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.7,
            "max_tokens": -1,
            "stream": False
        }

        print("Sending to LM Studio...")
        try:
            # 3. Send POST Request
            response = requests.post(url, headers=headers, data=json.dumps(payload))
            
            # 4. Handle Response
            if response.status_code == 200:
                result_json = response.json()
                # Extract the text content
                content = result_json['choices'][0]['message']['content']
                return f"**[IMAGE CONTENT]**: {content}"
            else:
                return f"LM Studio Error {response.status_code}: {response.text}"
                
        except Exception as e:
            return f"Connection Error: {e}. Is LM Studio running?"
    
    def convert(self, file_path: str, export: str = "raw"):
        file_path = Path(file_path)
        if file_path.suffix.lower() not in self.supported_extensions:
            raise ValueError(f"Can't format: Unsupported file extension '{file_path.suffix}'")
        if not file_path.exists():
            raise FileNotFoundError(file_path)

        # To handle images as PDFs (for better table/text extraction), we convert only if it's an image
        source = str(file_path)
        is_image = file_path.suffix.lower() in self.image_extensions
        is_csv = (file_path.suffix.lower() == ".csv")
        is_xlsx = (file_path.suffix.lower() == ".xlsx")
        # PASS 1: Try with Fast Converter
        result = self.fast_converter.convert(source).document
        if is_image:
            try:
                # 1. Get Dictionary to access URI
                n = result.export_to_dict()
                
                # 2. Get Base64 using your specific path
                # Note: We use '1' because Docling pages are 1-indexed strings in the dict
                base64_str = n['pages']['1']['image']['uri'].split(",")[1]
                
                # 3. Get String from External Model
                external_text = self._mock_external_model(base64_str)
                
                # 4. Update the document with ONLY this result (and stop processing)
                result.add_text(
                    label=DocItemLabel.TEXT,
                    text = external_text
                )  
            except KeyError as e:
                print(f"Error extracting base64: {e}")
            except Exception as e:
                print(f"Error in external model processing: {e}")

        # PASS 2: If pictures detected, rerun with Smart Converter
        if (len(result.pictures) > 0 and (not (is_image))):
            pprint("detect image")
            result = self.smart_converter.convert(source).document
        # for csv
        if (is_csv):
            clean_md = result.export_to_markdown()
            result.body.children = []  
            result.tables = []
            result.texts = []
            result.add_text(
                label=DocItemLabel.TEXT, 
                text=clean_md
            )
        if is_xlsx:
            # --- PHASE 1: COLLECT MARKDOWN PER PAGE ---
            page_contents = []
            
            # Get all page numbers
            all_pages = sorted(result.pages.keys(), key=lambda x: int(x)) if result.pages else []
            
            for page_key in all_pages:
                page_no = int(page_key)
                
                # 1. SIMPLE EXPORT: Get markdown for just this page
                # (Assumes your Docling version supports the page_no argument)
                try:
                    page_md = result.export_to_markdown(
                        page_no=page_no,
                        image_placeholder = ""
                    )
                except TypeError:
                    # Fallback if argument isn't supported: Export whole doc (risky) or skip
                    # forcing a specific filter if the API differs. 
                    # But per your request, we use the direct call:
                    print(f"Warning: export_to_markdown might not support page_no on this version.")
                    page_md = "" 

                if page_md:
                    page_contents.append({
                        "page_no": page_no,
                        "text": page_md
                    })

            # --- PHASE 2: WIPE THE DOCUMENT ---
            # --- PHASE 2: WIPE (Initialize Clean Lists) ---
            # We explicitly set them to empty lists to avoid any "Index out of range"
            result.body.children = []
            result.texts = []
            result.tables = []
            result.pictures = []
            result.groups = []  # Explicitly reset groups too

            # --- PHASE 3: PUSH NEW CONTENT (With Dynamic Indexing) ---
            
            # Pointer to Body (The root parent)
            body_ref = RefItem(cref="#/body")

            for content in page_contents:
                # SKIP EMPTY PAGES to avoid cluttering indices
                if not content["text"].strip():
                    continue

                # 1. CALCULATE INDICES DYNAMICALLY
                # This ensures the ref matches exactly where we are about to append
                text_idx = len(result.texts)
                group_idx = len(result.groups)
                
                text_ref_str = f"#/texts/{text_idx}"
                group_ref_str = f"#/groups/{group_idx}"
                
                # 2. CREATE POINTERS
                text_ref_pointer = RefItem(cref=text_ref_str)
                group_ref_pointer = RefItem(cref=group_ref_str)

                # 3. CREATE TEXT ITEM
                text_item = TextItem(
                    self_ref=text_ref_str,
                    parent=group_ref_pointer, # Parent is the Group (Section)
                    orig=content["text"],
                    label=DocItemLabel.TEXT,
                    text=content["text"],
                    content_layer="body",
                    prov=[ProvenanceItem(
                        page_no=content["page_no"],
                        bbox=BoundingBox(l=0, t=0, r=0, b=0, coord_origin=CoordOrigin.BOTTOMLEFT),
                        charspan=(0, 0)
                    )]
                )

                # 4. CREATE GROUP ITEM (SECTION)
                # Label MUST be SECTION (Paragraph causes validation error)
                group_item = GroupItem(
                    self_ref=group_ref_str,
                    parent=body_ref,          # Parent is Body
                    label=GroupLabel.SECTION, 
                    children=[text_ref_pointer], 
                    content_layer="body"
                )

                # 5. INJECT INTO STORAGE (Order matters!)
                result.texts.append(text_item)
                result.groups.append(group_item)
                
                # 6. LINK TO BODY
                result.body.children.append(group_ref_pointer)
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

# # --------------------------------------------------------
# # Example usage
# # --------------------------------------------------------
# if __name__ == "__main__":
#     extractor = DoclingExtractor()
#     source = "services/data-ingestion/ingestion/Books.xlsx"
#     result = extractor.convert(source)
#     # pprint(result,width=120)
#     pprint(extractor.convert(source,'dict'))
#     # n = extractor.convert(source,'markdown')
#     # n = n['pages']['1']['image']['uri'].split(",")[1]
#     # pprint(n)
#     # a = Chunker().chunk(result)
#     # builder = ContextBuilder() 
#     # b = builder.build(a,source)
#     # pprint(a)
#     # pprint(b,width=120)
#     # for i in result:
#     #      pprint(i)
