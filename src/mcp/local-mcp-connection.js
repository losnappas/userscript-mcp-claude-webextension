import { log } from "../utils";
import { UserScriptMCP } from "./UserScriptMCP";

/**
 * Local MCP Connection
 *
 * This class provides the same interface as MCPConnection but uses
 * a local MCP server implementation instead of connecting to a remote server.
 */
export class LocalMCPConnection {
  constructor(name, handler) {
    this.server = new UserScriptMCP(name);
    this.messageHandler = handler;
  }

  /**
   * Send a request to the local MCP server
   */
  async sendRequest(request) {
    log(`[Local MCP Connection] Sending request:`, request);

    try {
      const response = await this.server.handleMessage(request);

      // Handle notifications (they don't have responses)
      if (response === null) {
        log(`[Local MCP Connection] Notification sent successfully`);
        return { result: { success: true } };
      }

      log(`[Local MCP Connection] Received response:`, response);

      // If there's a message handler and this is a response, also send it there
      if (this.messageHandler && response) {
        // Simulate async delivery like a real MCP server would
        setTimeout(() => {
          this.messageHandler(response);
        }, 0);
      }

      return response;
    } catch (error) {
      console.error(`[Local MCP Connection] Request failed:`, error);
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
        },
      };
    }
  }
}
