from ingestion.file_reader import FileReader

reader = FileReader()
results = reader.read("/Users/t.puran.prasertthai/Documents/GitHub/AINGO/services/data-ingestion/ingestion/somat.pdf")  # ← replace with your PDF file path

print(f"\nExtracted {len(results)} elements.\n")
for r in results:  # just print first few
    print(r)