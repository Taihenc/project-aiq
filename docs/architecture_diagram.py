import os
from diagrams import Diagram, Cluster, Edge
from diagrams.custom import Custom
from diagrams.saas.chat import Teams
from diagrams.programming.framework import React
from diagrams.aws.integration import Eventbridge
from diagrams.programming.language import Nodejs
from diagrams.gcp.storage import Storage as GCPStorage
from diagrams.generic.storage import Storage as GenStorage
from diagrams.onprem.queue import Rabbitmq
from diagrams.gcp.analytics import Dataflow
from diagrams.programming.framework import FastAPI
from diagrams.aws.ml import Sagemaker

def generate_architecture_diagram():
    output_filename = "docs/aingo_solution_overview"
    
    graph_attr = {
        "fontsize": "36",
        "fontname": "Helvetica-Bold",
        "pad": "1.0",
        "rankdir": "LR",
        "nodesep": "1.2",
        "ranksep": "2.2",
        "splines": "spline",
        "bgcolor": "#F4F7F6"
    }
    
    node_attr = {
        "fontsize": "15",
        "fontname": "Helvetica-Bold",
    }

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    custom_icon_path = os.path.join(base_dir, "apps", "web", "public", "images", "backgrounds", "ai-profile.png")
    custom_qdrant_path = os.path.join(base_dir, "docs", "qdrant-brandmark-red.png")

    with Diagram("AiQ Architecture", show=False, filename=output_filename, outformat="png", graph_attr=graph_attr, node_attr=node_attr):
        
        with Cluster("1. Interfaces & Sources", graph_attr={"bgcolor": "#E1F5FE", "color": "#0288D1", "penwidth": "3", "margin": "75"}):
            sharepoint = Teams("SharePoint\n(Origin Docs)")
            frontend = Custom("AiQ Web\n(Next.js UI)", custom_icon_path)
            
        with Cluster("2. Gateways & Receivers\n[Azure Container Apps]", graph_attr={"bgcolor": "#F3E5F5", "color": "#8E24AA", "penwidth": "3", "margin": "75"}):
            gateway = Nodejs("API Gateway\n(NestJS)")
            webhook = Eventbridge("Webhooks\n(Sync Event)")
            
        with Cluster("3. Storage & Event Bus\n[Azure Container Apps]", graph_attr={"bgcolor": "#FFF3E0", "color": "#F57C00", "penwidth": "3", "margin": "75"}):
            file_storage = GCPStorage("File Storage\n(MinIO Hub)")
            minio = GenStorage("Internal MinIO\n(Raw Storage)")
            file_storage >> Edge(label="Persist", color="black", style="dashed", fontname="Helvetica-Bold") >> minio
            
            mq = Rabbitmq("RabbitMQ\n(Async Queue)")
            
        with Cluster("4. Data Processing\n[Azure Container Apps]", graph_attr={"bgcolor": "#E8F5E9", "color": "#388E3C", "penwidth": "3", "margin": "75"}):
            ai_engine = FastAPI("AI Engine\n(CrewAI)")
            ingestion = Dataflow("Data Ingestion\n(ETL Pipeline)")
            
        with Cluster("5. Vector Space\n[Azure Container Apps]", graph_attr={"bgcolor": "#FFEBEE", "color": "#D32F2F", "penwidth": "3", "margin": "75"}):
            embedding = Sagemaker("Embedding Service\n(Vectorization)")
            vectordb = Custom("Qdrant\n(Vector DB)", custom_qdrant_path)
            embedding >> Edge(label="Store / Query", color="black", style="dashed", dir="both", fontname="Helvetica-Bold") >> vectordb

        base_edge = {"fontname": "Helvetica-Bold", "fontsize": "14"}

        frontend >> Edge(label="REST / WS", color="blue", dir="both", **base_edge) >> gateway
        gateway >> Edge(label="Upload File", color="blue", **base_edge) >> file_storage
        gateway >> Edge(label="Chat / Query", color="purple", dir="both", **base_edge) >> ai_engine
        
        sharepoint >> Edge(label="Push Event", color="darkgreen", **base_edge) >> webhook
        webhook >> Edge(label="Trigger Sync", color="darkgreen", **base_edge) >> file_storage
        
        file_storage >> Edge(label="Publish 'ready'", color="orange", **base_edge) >> mq
        mq >> Edge(label="Consume Task", color="orange", **base_edge) >> ingestion
        
        ingestion >> Edge(label="Send Chunks", color="red", **base_edge) >> embedding
        ai_engine >> Edge(label="Semantic Search", color="purple", dir="both", **base_edge) >> embedding

if __name__ == "__main__":
    generate_architecture_diagram()
