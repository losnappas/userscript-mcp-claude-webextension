import { log } from "../utils";

/**
 * Abstract class.
 * You need to handle initializeBuiltinTools.
 * @abstract
 */
export class LocalMCPServer {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.initialized = false;
    this.clientInfo = null;
    this.requestId = 0;

    // Initialize built-in tools
    this.initializeBuiltinTools();

    log(`[Local MCP Server] Initialized: ${this.name}`);
  }

  initializeBuiltinTools() {
    throw new Error("Subclass responsibility");
  }

  /**
   * Handle MCP protocol messages
   */
  async handleMessage(message) {
    log(`[Local MCP Server] Handling message:`, message);

    try {
      if (message.method === "initialize") {
        return this.handleInitialize(message);
      } else if (message.method === "tools/list") {
        return this.handleListTools(message);
      } else if (message.method === "tools/call") {
        return this.handleCallTool(message);
      } else if (message.method === "resources/list") {
        return this.handleListResources(message);
      } else if (message.method === "resources/read") {
        return this.handleReadResource(message);
      } else if (message.method?.startsWith("notifications/")) {
        return this.handleNotification(message);
      } else {
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`,
          },
        };
      }
    } catch (error) {
      console.error(`[Local MCP Server] Error handling message:`, error);
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
        },
      };
    }
  }

  /**
   * Handle initialize request
   */
  handleInitialize(message) {
    this.clientInfo = message.params?.clientInfo;
    this.initialized = true;

    log(
      `[Local MCP Server] Handling initialize with client:`,
      this.clientInfo,
      message,
    );

    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: true,
          },
          prompts: {
            // listChanged: true,
          },
          resources: {
            // listChanged: true,
          },
        },
        serverInfo: {
          name: this.name,
          version: "1.0.0",
        },
      },
    };
  }

  /**
   * Handle notifications (like initialized)
   */
  handleNotification(message) {
    log(`[Local MCP Server] Received notification:`, message.method);
    // Notifications don't require responses
    return null;
  }

  /**
   * Handle tools/list request
   */
  handleListTools(message) {
    const tools = Array.from(this.tools.values()).map((v) => v.tool);

    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools: tools,
      },
    };
  }

  /**
   * Handle tools/call request
   */
  async handleCallTool(message) {
    const { name, arguments: args } = message.params;

    if (!this.tools.has(name)) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32602,
          message: `Tool not found: ${name}`,
        },
      };
    }

    try {
      const result = await this.executeTool(name, args);

      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: `Tool execution failed: ${error.message}`,
        },
      };
    }
  }

  /**
   * Execute a tool with given arguments
   */
  async executeTool(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`No such tool: ${name}`);
    }
    return tool.func(args);
  }

  /**
   * Handle resources/list request
   */
  handleListResources(message) {
    const resources = Array.from(this.resources.values());

    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        resources: resources,
      },
    };
  }

  /**
   * Handle resources/read request
   */
  async handleReadResource(message) {
    const { uri } = message.params;

    // Implementation depends on what resources you want to provide
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        contents: [
          {
            uri: uri,
            mimeType: "text/plain",
            text: "Resource content would go here",
          },
        ],
      },
    };
  }
}
