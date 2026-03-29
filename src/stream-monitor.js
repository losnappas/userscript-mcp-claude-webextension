import { log } from "./utils";

const INVOKE_TOOL_REGEX_GLOBAL =
  /<invoke_tool>\s*<name>([^<]+)<\/name>\s*<parameters>\s*([\s\S]*?)\s*<\/parameters>\s*<\/invoke_tool>/g;

const CODE_BLOCK_REGEX = /```(?:xml|tool)?\s*\n?([\s\S]*?)```/g;

function extractToolInvocations(text) {
  const invocations = [];

  let match;
  INVOKE_TOOL_REGEX_GLOBAL.lastIndex = 0;
  while ((match = INVOKE_TOOL_REGEX_GLOBAL.exec(text)) !== null) {
    const name = match[1].trim();
    const paramsStr = match[2].trim();
    try {
      const params = JSON.parse(paramsStr);
      invocations.push({ name, input: params });
    } catch (e) {
      log("[ResponseWatcher] Failed to parse tool params:", paramsStr, e);
    }
  }

  if (invocations.length === 0) {
    CODE_BLOCK_REGEX.lastIndex = 0;
    while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
      const codeContent = match[1];
      INVOKE_TOOL_REGEX_GLOBAL.lastIndex = 0;
      let codeMatch;
      while (
        (codeMatch = INVOKE_TOOL_REGEX_GLOBAL.exec(codeContent)) !== null
      ) {
        const name = codeMatch[1].trim();
        const paramsStr = codeMatch[2].trim();
        try {
          const params = JSON.parse(paramsStr);
          invocations.push({ name, input: params });
        } catch (e) {
          log(
            "[ResponseWatcher] Failed to parse tool params in code block:",
            paramsStr,
            e,
          );
        }
      }
    }
  }

  return invocations;
}

function getMessageText(element) {
  return element.innerText || element.textContent || "";
}

function waitForStreamingComplete(element, callback) {
  const maxTries = 1000;
  let tryNumber = 0;
  const timer = setInterval(() => {
    tryNumber++;
    if (element.dataset.isStreaming === "false") {
      clearInterval(timer);
      callback(getMessageText(element));
    } else if (tryNumber > maxTries) {
      clearInterval(timer);
      callback();
    }
  }, 50);
}

export function createResponseWatcher(onToolCall) {
  function checkMessage(element) {
    if (element.dataset.usmProcessed) {
      return;
    }
    element.dataset.usmProcessed = "1";

    waitForStreamingComplete(element, (text) => {
      const invocations = extractToolInvocations(text);
      for (const inv of invocations) {
        log("[ResponseWatcher] Detected tool invocation:", inv.name, inv.input);
        onToolCall(inv);
      }
    });
  }

  const observer = new MutationObserver((mutations) => {
    const messages = document.querySelectorAll("[data-is-streaming]");
    if (messages.length > 0) {
      checkMessage(messages[messages.length - 1]);
    }
  });

  function start() {
    const chatContainer = document.querySelector("[data-autoscroll-container]");

    if (chatContainer) {
      observer.observe(chatContainer, { childList: true, subtree: true });
      log("[ResponseWatcher] Observing chat container");
    } else {
      log("[ResponseWatcher] no chat container found");
      setTimeout(start, 500);
    }
  }

  function stop() {
    observer.disconnect();
  }

  return { start, stop };
}
