# MCP Search Service

This is a Model Context Protocol (MCP) server that provides a search tool for the AINGO embedding service.


## Usage

To use this MCP server with **Claude Desktop**, add the following to your configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aingo-search": {
      "url": "http://localhost:8004/sse/"
    }
  }
}
```

### Prerequisites

1.  **Embedding Service**: Must be running on port `8003`.
    ```bash
    pnpm start:embedding-service
    ```
2.  **MCP Server**: Must be running on port `8004`.
    ```bash
    pnpm dev:mcp-server
    ```
3.  **Restart Claude Desktop**: After updating the config, restart the app to load the new tool.

### Testing Locally

You can run the server manually to test (it will wait for JSON-RPC input via stdin):
```bash
uv run src/server.py
```
