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
          // `tree` is a list (Array / NodeList) of DOM elements.
          // This mutates `tree` in-place and returns it.
          const shortenDomTree = (tree, maxLength = 30_000) => {
            const toArray = (nodes) => Array.from(nodes || []);

            const getTreeLength = (nodes) =>
              toArray(nodes).reduce(
                (sum, node) => sum + node.outerHTML.length,
                0,
              );

            const methods = [
              // 1. Remove whole noisy elements (script, style, svg, etc.)
              (nodes) => {
                const selectorsToRemove = [
                  "script",
                  "style",
                  "template",
                  "svg",
                  "link",
                ];

                toArray(nodes).forEach((root) => {
                  root
                    .querySelectorAll(selectorsToRemove.join(","))
                    .forEach((el) => el.remove());
                });
              },

              // 2. Strip most attributes, keep only a whitelist
              (nodes) => {
                const keepAttrs = new Set([
                  "href",
                  "alt",
                  "title",
                  "id",
                  "name",
                  "type",
                  "role",
                  "aria-label",
                  "for",
                  "checked",
                  "selected",
                  "disabled",
                  "autocomplete",
                  "contenteditable",
                  "action",
                  "method",
                ]);

                const walk = (node) => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    // Remove all non-whitelisted attributes
                    toArray(node.attributes).forEach((attr) => {
                      if (!keepAttrs.has(attr.name)) {
                        node.removeAttribute(attr.name);
                      }
                    });
                  }
                  toArray(node.childNodes).forEach(walk);
                };

                toArray(nodes).forEach(walk);
              },

              // 3. Remove comments
              (nodes) => {
                const walk = (node) => {
                  toArray(node.childNodes).forEach((child) => {
                    if (child.nodeType === Node.COMMENT_NODE) {
                      child.remove();
                    } else {
                      walk(child);
                    }
                  });
                };
                toArray(nodes).forEach(walk);
              },

              // 4. Truncate long text nodes
              (nodes) => {
                const maxTextLength = 200; // per text node

                const walk = (node) => {
                  toArray(node.childNodes).forEach((child) => {
                    if (child.nodeType === Node.TEXT_NODE) {
                      if (child.textContent.length > maxTextLength) {
                        child.textContent =
                          child.textContent.slice(0, maxTextLength) + "…";
                      }
                    } else {
                      walk(child);
                    }
                  });
                };
                toArray(nodes).forEach(walk);
              },

              // 5. Remove text content entirely from some noisy elements
              (nodes) => {
                const stripTextSelectors = ["pre", "code", "textarea"];

                toArray(nodes).forEach((root) => {
                  root
                    .querySelectorAll(stripTextSelectors.join(","))
                    .forEach((el) => {
                      el.textContent = "";
                    });
                });
              },

              // 6. Remove deepest nodes first (prune size-heavy leaves)
              (nodes) => {
                const allElements = [];
                const walk = (node, depth = 0) => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    allElements.push({ node, depth });
                    toArray(node.children).forEach((child) =>
                      walk(child, depth + 1),
                    );
                  }
                };
                toArray(nodes).forEach((root) => walk(root));

                // Sort by depth descending (deepest first), then by HTML length
                allElements.sort(
                  (a, b) =>
                    b.depth - a.depth ||
                    b.node.outerHTML.length - a.node.outerHTML.length,
                );

                // Remove a portion of deepest nodes
                const toRemoveCount = Math.floor(allElements.length * 0.2); // 20%
                for (let i = 0; i < toRemoveCount; i++) {
                  const { node } = allElements[i];
                  if (node.parentNode) node.remove();
                }
              },
            ];

            let length = getTreeLength(tree);

            for (const method of methods) {
              if (length <= maxLength) break;
              method(tree);
              length = getTreeLength(tree);
            }

            return tree;
          };

          const nodes = document.querySelectorAll(target);
          const out = shortenDomTree(
            Array.from(nodes).map((n) => n.cloneNode(true)),
          );
          return out.map((o) => o.outerHTML).join("\n\n");
        },
        args: [target],
      });

      return html;
    },
    tool: {
      name: "getDomTree",
      description:
        "Get the current DOM tree of the relevant tab. Output may be shortened to fit the context window.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "A querySelectorAll to use. Defaults to `html`.",
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
      return response;
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
