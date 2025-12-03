import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import tailwindcss from "@tailwindcss/vite";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  return manifest;
}

// Get target browser from environment variable
const targetBrowser = process.env.TARGET_BROWSER || "chrome";
const adbDevice = process.env.ADB_DEVICE;
if (targetBrowser.includes("android") && !adbDevice) {
  throw new Error("android target requires `ADB_DEVICE=` from `adb devices`");
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    tailwindcss(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "src/manifest.json"],
      browser: targetBrowser,
      webExtConfig: {
        firefoxApk: "org.mozilla.fenix",
        adbDevice,
        chromiumBinary: "chromium",
        firefox: "firefox-devedition",
        // @ts-ignore
        target: targetBrowser,
        // target: ["chromium", "firefox-desktop", "firefox-android"],
        startUrl: targetBrowser.includes("firefox")
          ? "about:debugging#/runtime/this-firefox"
          : "about:extensions",
      },
      additionalInputs: ["src/content.js", "src/perms.js"],
    }),
  ],
  build: {
    minify: false,
    outDir: `dist-${targetBrowser}`, // Use different output directories
  },
});
