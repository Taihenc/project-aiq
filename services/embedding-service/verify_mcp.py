import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app.main import app
    from fastapi.routing import Mount
    
    print("Application imported successfully.")
    
    # Check for mounted MCP
    mcp_routes = [r for r in app.routes if isinstance(r, Mount)]
    print(f"Mounted routes: {[r.path for r in mcp_routes]}")
    
    # Basic check if one of them is likely the MCP mount
    # FastMCP mounts are usually not easily identifiable by name unless we check paths
    # But usually mcp.mount(app) adds routes directly or mounts a sub-app.
    # Let's check all routes
    sse_route = [r for r in app.routes if getattr(r, 'path', '') == '/mcp']
    if sse_route:
        print("Found /mcp route!")
    else:
        print("Did not find /mcp route")
        
except Exception as e:
    print(f"Failed to load app: {e}")
    sys.exit(1)
