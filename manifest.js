import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: "页面抓取",
  version: "1.0.0",
  description: "一键提取任意网页正文并转换为纯净 Markdown，完全本地运行，无需联网。Extract clean Markdown from any web page, fully offline.",
  icons: {
    "16": "public/icon-16.png",
    "48": "public/icon-48.png",
    "128": "public/icon-128.png"
  },
  action: {
    default_popup: "index.html",
    default_icon: {
      "16": "public/icon-16.png",
      "48": "public/icon-48.png",
      "128": "public/icon-128.png"
    }
  },
  background: {
    service_worker: "src/background.js",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.js"]
    }
  ],
  permissions: [
    "activeTab",
    "downloads",
    "scripting"
  ],
  host_permissions: [
    "<all_urls>"
  ]
})
