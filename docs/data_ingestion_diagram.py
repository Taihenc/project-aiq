import os
from diagrams import Diagram, Cluster, Edge
from diagrams.programming.framework import FastAPI
from diagrams.onprem.queue import Rabbitmq
from diagrams.generic.storage import Storage as GenStorage
from diagrams.gcp.analytics import Dataflow
from diagrams.aws.ml import Sagemaker
from diagrams.programming.language import Python

def generate_ingestion_diagram():
    output_filename = "docs/data_ingestion_overview"
    
    graph_attr = {
        "fontsize": "24",
        "fontname": "Helvetica-Bold",
        "pad": "0.8",
        "rankdir": "LR",
        "nodesep": "1.0",
        "ranksep": "1.5",
        "splines": "spline",
        "bgcolor": "#F4F7F6"
    }
    
    node_attr = {
        "fontsize": "14",
        "fontname": "Helvetica-Bold",
    }

    # Ensure output is generated in the correct relative path
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    with Diagram("Data Ingestion Pipeline Architecture", show=False, filename=output_filename, outformat="png", graph_attr=graph_attr, node_attr=node_attr):
        
        with Cluster("1. Entrypoints", graph_attr={"bgcolor": "#E1F5FE", "margin": "40"}):
            api = FastAPI("Ingestion API\n(HTTP POST)")
            mq = Rabbitmq("Event Consumer\n(RabbitMQ)")
            
        with Cluster("2. ETL Engine (Pipeline)", graph_attr={"bgcolor": "#E8F5E9", "margin": "40"}):
            extractor = Dataflow("Universal Extractor\n(Docling)")
            
            chunker = Python("Hierarchy Chunker\n(chunker.py)")
            context_b = Python("Context Builder\n(context_builder.py)")
            
            uploader = Python("Uploader\n(upload.py)")

            extractor >> Edge(label="Raw Extracted Text", color="#0288D1", fontcolor="#0288D1") >> chunker
            chunker >> Edge(label="List[Text Chunks]", color="#7B1FA2", fontcolor="#7B1FA2") >> context_b
            context_b >> Edge(label="List[Context Records]\n(Chunk + Metadata/File Paths)", color="#E64A19", fontcolor="#E64A19") >> uploader
            
        with Cluster("3. Storage & Downstream", graph_attr={"bgcolor": "#FFF3E0", "margin": "40"}):
            embedding = Sagemaker("Embedding API\n(HTTP POST /embed)")
            db = GenStorage("Metadata DB\n(Qdrant / SQLite)")

        api >> Edge(label="Raw File") >> extractor
        mq >> Edge(label="Raw File") >> extractor
        
        uploader >> Edge(label="Send to Embedding Service", color="red", style="bold") >> embedding
        embedding >> Edge(label="Persist State") >> db

if __name__ == "__main__":
    generate_ingestion_diagram()
