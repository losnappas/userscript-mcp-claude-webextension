import { createResponseWatcher } from "./stream-monitor";
import { submitToolResult } from "./auto-submit";
import { log } from "./utils";
import browser from "webextension-polyfill";

async function executeTool(name, args) {
  log("[Content] Executing tool:", name, args);

  const response = await browser.runtime.sendMessage({
    type: name,
    ...args,
  });

  if (response?.success === false) {
    throw new Error(response.error || "Tool execution failed");
  }

  const data = response?.data !== undefined ? response.data : response;
  return typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function initialize() {
  log("[Content] Initializing response watcher");

  const watcher = createResponseWatcher(async (toolCall) => {
    log("[Content] Tool call detected:", toolCall.name);
    try {
      const result = await executeTool(toolCall.name, toolCall.input);
      await submitToolResult(toolCall, result);
    } catch (error) {
      log("[Content] Tool execution error:", error);
      await submitToolResult(toolCall, "Error: " + error.message);
    }
  });

  watcher.start();
}

const observer = new MutationObserver(() => {
  run();
});

observer.observe(document.body, { childList: true, subtree: true });

function run() {
  const chatInput = document.querySelector('[data-testid="chat-input"]');
  console.log("found chatInput", chatInput);
  if (chatInput) {
    initialize();
    observer.disconnect();
  }
}
run();
