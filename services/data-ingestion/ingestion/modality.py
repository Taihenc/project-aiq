from pathlib import Path
import shutil
from unstructured.partition.pdf import partition_pdf
from ingestion.storage import StorageManager
import base64

class ModalityClassifier:
    def __init__(self):
        self.storage = StorageManager(base_dir="ingestion/image_store")

    def process_pdf(self, file_path: Path):
        """
        Use Unstructured to parse PDF into elements (text, image, table).
        Return list of structured objects to send to Extractor.
        """
        file_path = Path(file_path)
        output_dir = self.storage.base_dir
        output_dir.mkdir(exist_ok=True)

        elements = partition_pdf(
            filename=str(file_path),
            extract_image_block_types=["Image"],
            image_output_dir_path=str(output_dir.resolve()),
            extract_image_block_to_base64=True,
            # strategy="hi_res",
            # hi_res_model_name="yolox"
        )

        # --- FIX: Move stray images from "figures" to image_store ---
        figures_dir = Path("figures")
        if figures_dir.exists():
            for img_file in figures_dir.glob("*"):
                target_path = output_dir / img_file.name
                shutil.move(str(img_file), str(target_path))
                print(f"[Fix] Moved {img_file.name} → {target_path}")
            try:
                figures_dir.rmdir()
            except OSError:
                pass  # ignore if folder not empty

        results = []
        doc_title = file_path.stem
        for idx, element in enumerate(elements, start=1):
            md = element.metadata
            obj = {
                "doc_title": doc_title,
                "element_number": idx,
                "page": getattr(md, "page_number", None),
                "type": getattr(element, "category", "Unknown"),
                "text": getattr(element, "text", "") or "",
                "image_path": None,
                "img_base64": getattr(md, "image_base64", None),
                "parent_id": getattr(md, "parent_id", None),
                "element_id": getattr(md, "element_id", None) or getattr(element, "id", None),
                "table_summary": getattr(md, "text_as_html", None),
            }

            # --- Handle image saving or encoding ---
            if element.category == "Image":
                # Case 1: Saved path provided by Unstructured
                if getattr(md, "image_path", None):
                    old_path = Path(md.image_path)

                    # If moved, look in the new output directory
                    if not old_path.exists():
                        candidate = output_dir / old_path.name
                        if candidate.exists():
                            old_path = candidate

                    obj["image_path"] = str(old_path.resolve())

                    # Encode to base64 if not already present
                    if not obj["img_base64"] and old_path.exists():
                        with open(old_path, "rb") as f:
                            obj["img_base64"] = base64.b64encode(f.read()).decode("utf-8")

                # Case 2: Image data in memory
                elif getattr(element, "data", None):
                    filename = f"{file_path.stem}_page{md.page_number}_img{idx}.png"
                    path = self.storage.save_image(element.data, filename)
                    obj["image_path"] = path
                    if not obj["img_base64"]:
                        obj["img_base64"] = base64.b64encode(element.data).decode("utf-8")

                else:
                    obj["image_path"] = "Image detected but no data extracted."

            results.append(obj)

        print(f"[ModalityClassifier] Extracted {len(results)} elements from {file_path.name}")
        return results
