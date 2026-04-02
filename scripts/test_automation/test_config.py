import os

# Disconnect DeepEval/RAGAS auto-telemetry as early as possible before any library imports 
# to prevent empty ghost traces from flooding Langfuse.
os.environ.pop("LANGFUSE_PUBLIC_KEY", None)
os.environ.pop("LANGFUSE_SECRET_KEY", None)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GOLDEN_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "golden-test-set"))
PDF_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "test-file"))

# Service Endpoints
INGESTION_URL = os.getenv("INGESTION_URL", "http://localhost:8002")
EMBEDDING_URL = os.getenv("EMBEDDING_URL", "http://localhost:8003")

# Set to None to run all questions, or set a number for speed (e.g., 2)
MAX_QUESTIONS_PER_TEST = 2  

# ONLY files in this list will be executed. Set to None to run EVERYTHING in TEST_MAPPING.
# Example: TARGET_TEST_FILES = ["Endpoint-and-Device-Security-Standard_v1.0 1.json"]
TARGET_TEST_FILES = ["ground_truth_dataset.json", "Endpoint-and-Device-Security-Standard_v1.0 1.json"]

# Map your test JSON files to the actual PDF files
TEST_MAPPING = {
    "ground_truth_dataset.json": "SCBX-Group_Cloud-Security-Standard_v1.0 1.pdf",
    "Endpoint-and-Device-Security-Standard_v1.0 1.json": "SCBX-Group_Endpoint-and-Device-Security-Standard_v1.0.pdf",
    "IT-Third-Party-Risk-Management-Standard_v1.0 1.json": "SCBX-Group_IT-Third-Party-Risk-Management-Standard_v1.0.pdf",
    "Identity-and-Access-Management-Standard_v1.0 1.json": "SCBX-Group_Identity-and-Access-Management-Standard_v1.0.pdf",
    "Logging-and-Auditing-Standard_v1.0 1.json": "SCBX-Group_Logging-and-Auditing-Standard_v1.0.pdf",
    "Network-Security-Standard_v1.0 1 1.json": "SCBX-Group_Network-Security-Standard_v1.0.pdf",
    "Network-Security-Standard_v1.0 2.json": "SCBX-Group_Network-Security-Standard_v1.0.pdf",
    "Secure-Application-Development-Standard_v1.0 1.json": "SCBX-Group_Secure-Application-Development-Standard_v1.0.pdf",
    "Security-Remediation-and-Patch-Management-Standard_v1.0 1 1.json": "SCBX-Group_Security-Remediation-and-Patch-Management-Standard_v1.0.pdf",
    "Security-Remediation-and-Patch-Management-Standard_v1.0 2.json": "SCBX-Group_Security-Remediation-and-Patch-Management-Standard_v1.0.pdf",
    "Technology-Risk-Management-Standard_v1.0 1 1.json": "SCBX-Group_Technology-Risk-Management-Standard_v1.0.pdf",
    "Technology-Risk-Management-Standard_v1.0 2.json": "SCBX-Group_Technology-Risk-Management-Standard_v1.0.pdf"
}