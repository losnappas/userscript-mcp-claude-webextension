import { LocalMCPServer } from "./local-mcp-server";
import { tools } from "./user-script-tools";

/**
 * Local MCP Server Implementation
 *
 * This class implements a local MCP server that runs entirely in the browser
 * and provides tools and functions that can be called by Claude.
 */

export class UserScriptMCP extends LocalMCPServer {
  constructor(name = "User Script MCP Server") {
    super(name);
  }

  /**
   * Initialize built-in tools that are available by default
   */
  initializeBuiltinTools() {
    for (const [key, val] of Object.entries(tools)) {
      this.tools.set(key, {
        func: val.sender,
        tool: val.tool,
      });
    }
  }
}
