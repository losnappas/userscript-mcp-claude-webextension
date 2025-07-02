import browser from "webextension-polyfill";

document.querySelector("form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const granted = await browser.permissions.request({
      permissions: ["userScripts"],
    });
    if (granted) {
      document.body.innerHTML =
        "<p>Permission granted. You may close this page and try again.</p>";
    } else {
      throw new Error("Not granted.");
    }
  } catch (e) {
    document.body.append(`${e} `);
    document.body.append(
      "Permission denied. The extension needs this permission in order to function.",
    );
  }
};
