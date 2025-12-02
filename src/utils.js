import browser from "webextension-polyfill";

export const log = (...args) => {
  console.log("MCP", ...args);
};

const isFirefoxForAndroid = (async () => {
  try {
    const info = await browser.runtime.getPlatformInfo();
    return info.os === "android";
  } catch (e) {
    return false;
  }
})();

/** @type {{[k: string]: number}} */
let androidOpenerTabCache = {};

/** @param args {browser.Tabs.CreateCreatePropertiesType} */
export const openTab = async (args) => {
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create#browser_compatibility
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1817806
  const isAndroid = await isFirefoxForAndroid;
  const openerTabId = isAndroid ? undefined : args.openerTabId;
  const tab = await browser.tabs.create({
    ...args,
    openerTabId,
  });
  if (args.openerTabId) {
    androidOpenerTabCache[tab.id] = args.openerTabId;
  }
  return tab;
};

export const getTabOpenerId = async (id) => {
  let openerId = androidOpenerTabCache[id];
  const isAndroid = await isFirefoxForAndroid;
  if (!isAndroid) {
    const { openerTabId } = await browser.tabs.get(id);
    openerId = openerTabId;
  } else {
    try {
      // Check if origin tab still exists
      await browser.tabs.get(openerId);
    } catch (error) {
      openerId = null;
    }
  }
  if (!openerId) {
    delete androidOpenerTabCache[id];
    throw new Error("No originating tab found for this Claude session");
  }
  return openerId;
};
