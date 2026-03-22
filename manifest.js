import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: "页面抓取",
  version: "1.0.0",
  description: "一键抓取任意网页的纯净 Markdown 内容，支持登录墙页面。Grab clean Markdown from any web page via Jina Reader API.",
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
