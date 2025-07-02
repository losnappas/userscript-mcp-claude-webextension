// Background script for MCP cross-tab execution
// Handles browser action clicks and message passing between tabs

import browser from "webextension-polyfill";
import { tools } from "./mcp/user-script-tools";
import { loadScripts } from "./userScripts";

const requestUserScriptsPermission = async () => {
  const contains = await browser.permissions.contains({
    permissions: ["userScripts"],
  });
  if (!contains) {
    await browser.tabs.create({
      url: "popup.html",
    });
  }
  return contains;
};

// Handle browser action click
browser.action.onClicked.addListener(async (tab) => {
  try {
    const hadPerm = await requestUserScriptsPermission();
    if (!hadPerm) {
      return;
    }
    // Create new Claude.ai tab
    const claudeTab = await browser.tabs.create({
      url: "https://claude.ai",
      active: true,
      openerTabId: tab.id,
    });

    console.log("Created tab", claudeTab);

    // Wait the tab, shows up as about:blank before load which is missing host permissions.
    const inject = async () => {
      try {
        await browser.scripting.executeScript({
          target: {
            tabId: claudeTab.id,
          },
          files: ["src/content.js"],
        });
        console.log("Executed script into tab", claudeTab);
      } catch (e) {
        setTimeout(inject, 300);
      }
    };
    inject();
  } catch (error) {
    console.error("[Background] Error creating Claude tab:", error);
  }
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(
    "[Background] Received message:",
    message,
    "from tab:",
    sender.tab?.id,
  );

  // @ts-ignore
  const t = message.type;
  if (!t) {
    sendResponse({ success: false, error: "no `type` on message" });
    return;
  }
  if (!tools[t]) {
    sendResponse({ success: false, error: `No such tool: ${t}` });
    return;
  }

  tools[t]?.receiver(message, sender)?.then(success, error).then(sendResponse);
  return true;
});

function error(error) {
  return {
    success: false,
    error,
  };
}

function success(data) {
  return {
    success: true,
    data,
  };
}

browser.runtime.onStartup.addListener(loadScripts);
