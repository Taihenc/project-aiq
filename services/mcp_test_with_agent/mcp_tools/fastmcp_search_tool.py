# /Users/t.chawin.leardswai/Documents/AiQ/AINGO/services/embedding-service/agent_test/mcp_tools/fastmcp_search_tool.py
import asyncio
import httpx
from crewai.tools import BaseTool
from pydantic import Field
from mcp import ClientSession
from mcp.client.sse import sse_client
from typing import Type, Optional
from pydantic import BaseModel

class SearchInput(BaseModel):
    query: str = Field(..., description="The search query text.")
    top_k: int = Field(10, description="Number of results from semantic search.")

class MCPSearchTool(BaseTool):
    name: str = "search_documents"
    description: str = "Search for similar documents using semantic search through the MCP service."
    args_schema: Type[BaseModel] = SearchInput
    mcp_base_url: str = Field(default="http://localhost:8003/mcp")

    def _run(self, query: str, top_k: int = 10) -> str:
        """Run the search tool synchronously."""
        print(f"MCPSearchTool: Searching for '{query}' directly through MCP object")
        import asyncio
        try:
            # If we're already in a loop (like CrewAI might be), we can't use asyncio.run
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # This is tricky in a sync _run, but CrewAI supports async tools
                # However, for simplicity let's try a direct await if we're in a thread
                return asyncio.run_coroutine_threadsafe(self._run_async(query, top_k), loop).result()
            else:
                return asyncio.run(self._run_async(query, top_k))
        except RuntimeError:
            return asyncio.run(self._run_async(query, top_k))

    async def _run_async(self, query: str, top_k: int = 10) -> str:
        """Run the search tool asynchronously using the direct MCP object."""
        try:
            # Import mcp directly to bypass network issues in the same codebase
            from app.mcp.tools import mcp
            from app.services.embedding.embedding_service import embedding_service
            from app.services.qdrant.qdrant_service import qdrant_service
            
            # Ensure services are initialized
            if not embedding_service.model:
                print("MCPSearchTool: Loading embedding model...")
                embedding_service.load_model()
            
            # Qdrant might need connection
            try:
                qdrant_service.get_collections()
            except Exception:
                print("MCPSearchTool: Connecting to Qdrant...")
                qdrant_service.connect()
            
            # get_tools() returns a dict of tool_name: tool_object
            tools_dict = await mcp.get_tools()
            if self.name in tools_dict:
                tool = tools_dict[self.name]
                print(f"MCPSearchTool: Invoking {self.name} with query='{query}'")
                # Wrap arguments in search_request as expected by the tool definition
                result = await tool.run({"search_request": {"query": query, "top_k": top_k}})
                
                # Handle FastMCP ToolResult or other return types
                final_result = ""
                if hasattr(result, 'content'):
                    # It's a ToolResult object
                    for content in result.content:
                        if hasattr(content, 'text'):
                            final_result += content.text + "\n"
                        else:
                            final_result += str(content) + "\n"
                else:
                    final_result = str(result)
                
                print(f"MCPSearchTool: Result: {final_result[:100]}...")
                return final_result.strip()
            else:
                return f"Error: Tool '{self.name}' not found in MCP registry."
        except Exception as e:
            import traceback
            error_msg = f"Error calling MCP tool directly: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            return error_msg
