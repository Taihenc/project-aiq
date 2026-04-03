from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.routes.route_crud import router as route_crud
from app.routes.route_tools import router as route_tools
from app.services.embedding.embedding_service import embedding_service
from app.services.qdrant.qdrant_service import qdrant_service
from app.services.reranking.reranking_service import reranking_service
from app.mcp.tools import mcp
import asyncio

# Conditional SSL Bypass for corporate proxy (only when VERIFY_SSL=false)
if not settings.verify_ssl:
    import requests
    import ssl
    from requests.adapters import HTTPAdapter
    from urllib3.poolmanager import PoolManager

    class NoVerifyAdapter(HTTPAdapter):
        def init_poolmanager(self, connections, maxsize, block=False):
            self.poolmanager = PoolManager(
                num_pools=connections,
                maxsize=maxsize,
                block=block,
                cert_reqs=ssl.CERT_NONE
            )

    # Monkeypatch requests to skip verification globally
    _original_session = requests.Session
    class NoVerifySession(requests.Session):
        def __init__(self):
            super().__init__()
            self.verify = False
            self.mount("https://", NoVerifyAdapter())
            self.mount("http://", NoVerifyAdapter())

    requests.Session = NoVerifySession
    requests.get = lambda url, **kwargs: _original_session().get(url, verify=False, **kwargs)
    requests.post = lambda url, **kwargs: _original_session().post(url, verify=False, **kwargs)
    requests.head = lambda url, **kwargs: _original_session().head(url, verify=False, **kwargs)



@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    
    try:
        embedding_service.load_model()
    except Exception as e:
        print(f"Warning: Failed to load embedding model: {e}")

    try:
        qdrant_service.connect()
    except Exception as e:
        print(f"Warning: Failed to connect to Qdrant: {e}")

    try:
        reranking_service.load_model()
    except Exception as e:
        print(f"Warning: Failed to load reranking model: {e}")
    print("Application ready!")
    
    yield
    
    print("Shutting down...")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Embedding service with Qdrant and BGE-M3",
    lifespan=lifespan
)

app.include_router(route_crud, prefix="/v1", tags=["CRUD"])
app.include_router(route_tools, prefix="/v1", tags=["tools"])
# Mount MCP at /mcp subpath
mcp_app = mcp.http_app(transport="sse")
app.mount("/v1/mcp", mcp_app)

# # Add this debug code
# print("MCP app routes:")
# for route in mcp_app.routes:
#     print(f"  {route.path}")

# # Also print all FastAPI routes
# print("\nAll app routes:")
# for route in app.routes:
#     print(f"  {route.path}")

@app.get("/")
async def root():
    return {"message": "Embedding Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "embedding-service"}
