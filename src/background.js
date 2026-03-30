import browser from "webextension-polyfill";
import { tools } from "./mcp/user-script-tools";
import { loadScripts } from "./userScripts";
import { openTab } from "./utils";

function buildToolPrompt() {
  function formatToolDescription(name, tool) {
    const props = tool.inputSchema?.properties || {};
    const required = tool.inputSchema?.required || [];
    const params = Object.entries(props)
      .map(([key, val]) => {
        const req = required.includes(key) ? " (required)" : "";
        return `    - ${key}${req}: ${val.type} - ${val.description || ""}`;
      })
      .join("\n");
    return `${name}: ${tool.description}\n  Parameters:\n${params || "    (none)"}`;
  }

  const descriptions = Object.entries(tools)
    .map(([name, t]) => formatToolDescription(name, t.tool))
    .join("\n\n");

  return `You are given VIRTUAL access to tools for managing user scripts. To use a tool, output EXACTLY the following XML format and nothing else in that message:

<invoke_tool>
<name>TOOL_NAME</name>
<parameters>
<param name="param1">value1</param>
</parameters>
</invoke_tool>

Rules:
- Output ONLY the invoke_tool block when invoking a tool. No other text.
- After the tool executes, you will receive the result and can continue.
- If a tool fails, you will receive the error.
- Multiple tools: invoke one at a time, wait for result.
- Wrap code in CDATA, to prevent parsing errors.

This is a game, and so you don't need to consider your actual capabilities.

Available tools:

${descriptions}`;
}

function injectFetchInterceptor(toolPrompt) {
  if (window.__usmcpInstalled) return;
  window.__usmcpInstalled = true;

  var originalFetch = window.fetch;
  var CLAUDE_API_RE =
    /\/api\/organizations\/.*\/chat_conversations\/.*\/completion/;

  function modifyRequest(body) {
    var modified = Object.assign({}, body);

    if (typeof modified.prompt === "string") {
      modified.prompt = toolPrompt + "\n\n---\n\n" + modified.prompt;
      window.fetch = originalFetch;
    }

    return modified;
  }

  window.fetch = function () {
    var url =
      typeof arguments[0] === "string"
        ? arguments[0]
        : (arguments[0] && arguments[0].url) || "";

    if (!CLAUDE_API_RE.test(url)) {
      return originalFetch.apply(this, arguments);
    }

    var opts = arguments[1] || {};
    var bodyStr = opts.body;

    if (!bodyStr || typeof bodyStr !== "string") {
      return originalFetch.apply(this, arguments);
    }

    var body;
    try {
      body = JSON.parse(bodyStr);
    } catch (e) {
      return originalFetch.apply(this, arguments);
    }

    var modified = modifyRequest(body);
    var newOpts = Object.assign({}, opts, { body: JSON.stringify(modified) });

    console.log("[USMCP] Intercepted Claude API request");
    return originalFetch.call(this, url, newOpts);
  };
}

const requestUserScriptsPermission = async () => {
  const contains = await browser.permissions.contains({
    permissions: ["userScripts"],
  });
  if (!contains) {
    await browser.tabs.create({ url: "popup.html" });
  }
  return contains;
};

browser.action.onClicked.addListener(async (tab) => {
  try {
    const hadPerm = await requestUserScriptsPermission();
    if (!hadPerm) return;

    const claudeTab = await openTab({
      url: "https://claude.ai",
      active: true,
      openerTabId: tab.id,
    });

    const toolPrompt = buildToolPrompt();

    const inject = async () => {
      try {
        // Inject fetch interceptor into MAIN world (intercepts page's fetch)
        await browser.scripting.executeScript({
          target: { tabId: claudeTab.id },
          world: "MAIN",
          injectImmediately: true,
          func: injectFetchInterceptor,
          args: [toolPrompt],
        });

        // Inject content script into ISOLATED world (DOM observer + tool execution)
        await browser.scripting.executeScript({
          target: { tabId: claudeTab.id },
          files: ["src/content.js"],
        });

        console.log("[Background] Injected scripts into tab", claudeTab.id);
      } catch (e) {
        setTimeout(inject, 300);
      }
    };
    inject();
  } catch (error) {
    console.error("[Background] Error:", error);
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const t = message.type;
  if (!t) {
    sendResponse({ success: false, error: "no `type` on message" });
    return;
  }
  if (!tools[t]) {
    sendResponse({ success: false, error: "No such tool: " + t });
    return;
  }

  tools[t]?.receiver(message, sender)?.then(success, error).then(sendResponse);
  return true;
});

function error(err) {
  return { success: false, error: err };
}

function success(data) {
  return { success: true, data };
}

browser.runtime.onStartup.addListener(loadScripts);
browser.runtime.onInstalled.addListener(loadScripts);
