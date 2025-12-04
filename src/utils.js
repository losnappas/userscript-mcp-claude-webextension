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

/** @param args {browser.Tabs.CreateCreatePropertiesType} */
export const openTab = async (args) => {
  const _args = { ...args };

  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create#browser_compatibility
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1817806
  const isAndroid = await isFirefoxForAndroid;
  if (isAndroid) {
    delete _args.openerTabId;
  }

  const tab = await browser.tabs.create(_args);
  if (args.openerTabId) {
    await browser.storage.session.set({ [String(tab.id)]: args.openerTabId });
  }
  return tab;
};

/** @returns {Promise<number>} */
export const getTabOpenerId = async (id) => {
  let openerId;
  const isAndroid = await isFirefoxForAndroid;
  if (!isAndroid) {
    const { openerTabId } = await browser.tabs.get(id);
    openerId = openerTabId;
  } else {
    try {
      const ret = await browser.storage.session.get(String(id));
      if (!ret[id]) {
        // bail into catch
        throw new Error();
      }
      openerId = ret[id];
      // Check if origin tab still exists
      // @ts-ignore
      await browser.tabs.get(openerId);
    } catch (error) {
      openerId = null;
    }
  }
  if (!openerId) {
    await browser.storage.session.remove(String(id)).catch(() => {});
    throw new Error("No originating tab found for this Claude session");
  }
  return Number(openerId);
};
