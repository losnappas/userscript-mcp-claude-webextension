import browser from "webextension-polyfill";
import { registerScript, unregisterScripts } from "../userScripts";
import { getTabOpenerId } from "../utils";

/**
 * @type {Record<string, { sender: (args: any) => any; receiver: (message: any, sender: browser.Runtime.MessageSender) => Promise<any>; tool: any }>}
 */
export const tools = {
  getDomTree: {
    sender: (args) =>
      browser.runtime.sendMessage({
        ...args,
        type: "getDomTree",
      }),
    receiver: async (message, sender) => {
      const { target = "html" } = message;
      const html = await executeScriptInPage({
        message,
        sender,
        func: (target) => {
          /** @type {HTMLElement} */
          // @ts-ignore
          const node = document.querySelector(target).cloneNode(true);
          const selectorsToRemove = [
            "script",
            "style",
            "template",
            // These have a lot of text?
            "svg",
            // A lot of noise, although might be useful in some cases.
            "link",
          ];
          node
            .querySelectorAll(selectorsToRemove.join(","))
            .forEach((el) => el.remove());
          const clean = node.outerHTML;
          return clean;
        },
        args: [target],
      });

      return html;
    },
    tool: {
      name: "getDomTree",
      description:
        "Get the current DOM tree of the relevant tab. You many use this to get intel about the tab the user is currently wanting to script on. Some tags, like script, style, and link tags, will be removed.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "A querySelector to use. Defaults to `html`.",
          },
        },
        required: [],
      },
    },
  },

  removeUserScripts: {
    sender: (args) =>
      browser.runtime.sendMessage({
        ...args,
        type: "removeUserScripts",
      }),
    receiver: async (message, sender) => {
      return unregisterScripts(message.ids);
    },
    tool: {
      name: "removeUserScripts",
      description: "Remove user scripts.",
      inputSchema: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: {
              type: "string",
            },
            description: "IDs of user scripts to remove.",
          },
        },
        required: ["ids"],
      },
    },
  },

  registerUserScript: {
    sender: (args) =>
      browser.runtime.sendMessage({
        ...args,
        type: "registerUserScript",
      }),
    receiver: async (message, sender) => {
      const { id, code, runAt = "document_idle" } = message;
      try {
        await unregisterScripts([id]);
      } catch (e) {}

      const url = await executeScriptInPage({
        message,
        sender,
        func: () => window.location.href,
        args: [],
      });

      if (!url || typeof url !== "string") {
        throw new Error(`Unexpected url: ${url}`);
      }
      // broaden the url to match a good glob
      const u = `*://${new URL(url).host}/*`;

      await registerScript({
        id: id,
        matches: [u],
        js: [{ code }],
        runAt: runAt,
      });

      return id;
    },
    tool: {
      name: "registerUserScript",
      description:
        "Register a user script. You can pass an existing script, and it will be updated. After use, always emphasize to the user, that a page reload is required to see changes. Generally speaking, if the user is asking for a specific feature and does not mention an old script, you can skip checking for an existing script. If the user is asking to 'make a script', this is what they mean.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "An ID for this script. Existing to overwrite, or new.",
          },
          code: {
            type: "string",
            description: "JavaScript code to execute",
          },
          runAt: {
            type: "string",
            description:
              "Defaults to 'document_idle', which should be favored.",
          },
        },
        required: ["id", "code"],
      },
    },
  },

  getUserScript: {
    sender: async (args) => {
      const response = await browser.runtime.sendMessage({
        ...args,
        type: "getUserScript",
      });
      // @ts-ignore
      if (!response?.length) {
        return `No such script id: ${args.id} - ${response}`;
      }
      return response[0];
    },
    receiver: async (message) => {
      const response = await browser.userScripts.getScripts({
        ids: [message.id],
      });
      if (!response.length) {
        throw new Error(`No such script id: ${message.id}`);
      }
      return response[0];
    },
    tool: {
      name: "getUserScript",
      description:
        "Get user script with this id. Includes its code and other metadata.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the user script",
          },
        },
        required: ["id"],
      },
    },
  },

  listUserScripts: {
    sender: (args) =>
      browser.runtime.sendMessage({
        ...args,
        type: "listUserScripts",
      }),
    receiver: async () => {
      const response = await browser.userScripts.getScripts();
      return response.map((s) => ({ id: s.id, matches: s.matches }));
    },
    tool: {
      name: "listUserScripts",
      description:
        "List all the user scripts available. Returns a list of IDs with `matches` clauses. You can then call `getUserScript` with the IDs of interest.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
};

async function executeScriptInPage({ message, sender, func, args }) {
  const claudeTabId = sender.tab?.id;
  if (!claudeTabId) {
    throw new Error("Missing claude tab id");
  }
  const openerTabId = await getTabOpenerId(claudeTabId);

  const html = await browser.scripting.executeScript({
    target: { tabId: openerTabId },
    func: func,
    args: args,
  });
  const first = html[0];
  if (!first) {
    throw new Error("Something went wrong during script injection: no result");
  }
  if (first.error) {
    // @ts-ignore
    throw new Error(first.error);
  }
  return html[0].result;
}
