// Content script running in world: MAIN on claude.ai
// This means we're running in the page's JavaScript context, not the extension context
// We can access Claude's React components but NOT extension APIs

import { LocalMCPConnection } from "./mcp/local-mcp-connection";
import { log } from "./utils";

// Local MCP server configuration
const MCP_SERVER_CONFIG = {
  name: "User Script MCP",
  description:
    "MCP for managing user scripts in the associated browser window.",
};

// Auto-connect to MCP server when page loads
function initializeMCPServer() {
  log("[MCP Client] Initializing auto-connection to MCP server");

  const channel = new MessageChannel();
  const port1 = channel.port1;
  const port2 = channel.port2;

  const handler = (message) => {
    log("[MCP Client] Sending to port1:", message);
    port1.postMessage(message);
  };

  const connection = new LocalMCPConnection(MCP_SERVER_CONFIG.name, handler);

  port1.onmessage = (event) => {
    log("[MCP Client] Received message from port1:", event, event.data?.id);
    connection.sendRequest(event.data);
  };

  port1.start();

  setTimeout(() => {
    window.postMessage(
      {
        source: "main-content",
        type: "mcp-server-connected",
        serverName: MCP_SERVER_CONFIG.name,
        uuid: crypto.randomUUID(),
      },
      "*",
      [port2],
    );
  }, 1000);
}

const observer = new MutationObserver((mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const targetNode = document.querySelector(
        '[data-testid="chat-input-grid-container"]',
      );
      if (targetNode) {
        initializeMCPServer();
        observer.disconnect();
        break;
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
