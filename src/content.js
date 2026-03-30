import { createResponseWatcher } from "./stream-monitor";
import { submitToolResult } from "./auto-submit";
import { log } from "./utils";
import { displayOnlyTools } from "./mcp/user-script-tools";
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

function showCheckmark() {
  const retryButtons = document.querySelectorAll(
    '[data-testid="action-bar-retry"]',
  );
  const lastBtn = retryButtons[retryButtons.length - 1];
  if (!lastBtn) return;

  const wrapper = lastBtn.closest(".flex.items-center");
  if (!wrapper) return;

  const checkmark = document.createElement("span");
  checkmark.textContent = "✓";
  checkmark.style.cssText =
    "color: #22c55e; font-size: 1.25rem; font-weight: bold; margin-left: 8px; animation: usmcp-fadeout 2s forwards;";

  wrapper.parentElement.insertBefore(checkmark, wrapper.nextSibling);
}

function initialize() {
  log("[Content] Initializing response watcher");

  const watcher = createResponseWatcher(async (toolCall) => {
    log("[Content] Tool call detected:", toolCall.name);
    try {
      const result = await executeTool(toolCall.name, toolCall.input);
      if (displayOnlyTools.has(toolCall.name)) {
        showCheckmark();
      } else {
        await submitToolResult(toolCall, result);
      }
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
