import browser from "webextension-polyfill";

export const loadScripts = async () => {
  const scripts = await browser.storage.local.get();
  /** @type {browser.UserScripts.RegisteredUserScript[]} */
  const reregister = [];
  for (const [key, val] of Object.entries(scripts)) {
    if (key.startsWith("script_")) {
      // @ts-expect-error -- `unknown`
      reregister.push(val);
    }
  }
  console.log("loading user scripts", reregister);
  return browser.userScripts.register(reregister);
};

export const registerScript = async (script) => {
  // Does need `await`, types off. At least on Firefox.
  await browser.userScripts.register([script]);
  return browser.storage.local.set({ [`script_${script.id}`]: script });
};

export const unregisterScripts = async (scriptIds) => {
  // Does need `await`, types off. At least on Firefox.
  await browser.userScripts.unregister({
    ids: scriptIds,
  });
  const keys = scriptIds.map((id) => `script_${id}`);
  return browser.storage.local.remove(keys);
};
