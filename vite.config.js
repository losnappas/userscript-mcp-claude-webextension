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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    tailwindcss(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "src/manifest.json"],
      browser: targetBrowser,
      // useDynamicUrlWebAccessibleResources: false,
      webExtConfig: {
        chromiumBinary: "chromium",
        firefox: "firefox-devedition",
        target: ["chromium", "firefox-android", "firefox-desktop"],
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
