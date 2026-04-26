# test.py
from file_reader import FileReader
from extract_docling import DoclingExtractor
from pprint import pprint
def main():
    path = "pdf/title.pdf"   # pdf, pptx, docx, html, txt, png, jpg, etc.

    reader = FileReader()

    try:
        info = reader.read(path)
        print(f"[FileReader] Detected file type: {info['file_type']}")
    except Exception as e:
        print(f"[ERROR] {e}")
        return

    extractor = DoclingExtractor()
    result = extractor.convert(info["path"])

    data = result.document.export_to_dict()
    # print(f"\nExtracted {len(data.get('elements', []))} elements.\n")
    pprint(data,width=120)

if __name__ == "__main__":
    main()
