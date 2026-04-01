<p align="center">
  <img src="public/icon-128.png" width="80" height="80" alt="页面抓取 Logo">
</p>

<h1 align="center">页面抓取</h1>

<p align="center">
  <strong>一键提取任意网页正文，优先本地，必要时云端补全为 Markdown</strong>
</p>

<p align="center">
  Chrome 扩展 · Manifest V3 · 本地优先 · 自动云端兜底
</p>

---

## ✨ 功能特点

- 🔗 **一键抓取** — 点击按钮即可将当前网页转换为干净的 Markdown 文件
- 🧠 **本地优先** — 优先在浏览器本地提取正文，能本地拿到的内容不走云端
- ☁️ **自动云端补全** — 复杂页面、本地提取失败时自动切换 Jina 云端抓取，提高命中率
- 🔐 **登录态页面尽量本地抓** — 当前页若已渲染出正文，会优先使用本地结果；不再承诺所有登录页都能完整本地提取
- 📄 **直接下载** — 自动保存为 `.md` 文件，无需手动复制粘贴
- ⚡ **极速** — 本地命中时毫秒级完成，复杂页面自动补全不需要二次操作

## 🚀 安装使用

### 从源码构建

```bash
git clone https://github.com/YuChiHuaCheng/md-grabber.git
cd md-grabber
npm install
npm run build
```

### 加载扩展

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启右上角 **「开发者模式」**
3. 点击 **「加载已解压的扩展程序」**
4. 选择项目中的 `dist/` 文件夹

### 使用方式

1. 打开任意网页
2. 点击工具栏中的 **页面抓取** 图标
3. 点击 **「抓取 Markdown」**
4. 等待抓取完成，自动弹出保存对话框

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Vite](https://vite.dev) | 构建工具 |
| [React](https://react.dev) | 弹出窗口 UI |
| [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) | Chrome 扩展打包 |
| [@mozilla/readability](https://github.com/mozilla/readability) | 正文提取（Firefox 阅读模式同款引擎） |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown 转换 |
| [turndown-plugin-gfm](https://github.com/domchristie/turndown-plugin-gfm) | GFM 扩展（表格/任务列表/删除线） |
| [Jina Reader](https://r.jina.ai/) | 云端兜底抓取 |
| [Lucide React](https://lucide.dev) | 图标库 |

## ⚙️ 工作原理

```
用户点击「抓取 Markdown」
        ↓
  Popup 发送消息给 Content Script
        ↓
  Content Script 优先做本地提取
        ↓
  本地结果可用 → 直接下载
        ↓
  本地结果不可用 → 请求 Jina 云端补全
        ↓
  Background 统一整理 Markdown → 触发 chrome.downloads
        ↓
  用户保存 .md 文件 ✅
```

## 📁 项目结构

```
md-grabber/
├── manifest.js          # Chrome MV3 清单
├── vite.config.js       # Vite 构建配置
├── index.html           # 弹出窗口入口
├── public/
│   ├── icon-16.png      # 工具栏图标
│   ├── icon-48.png      # 扩展管理页图标
│   └── icon-128.png     # 商店图标
└── src/
    ├── main.jsx         # React 挂载点
    ├── App.jsx          # 弹出窗口组件
    ├── App.css          # 弹出窗口样式
    ├── index.css        # 全局样式
    ├── background.js    # 后台脚本（云端兜底 + 文件下载）
    ├── content.js       # 内容脚本（本地提取 + 自动兜底）
    └── content.css      # Toast 样式
```

## 📝 License

MIT

---

<p align="center">
  Made with ❤️ · Powered by <a href="https://github.com/mozilla/readability">Readability</a> & <a href="https://github.com/mixmark-io/turndown">Turndown</a>
</p>
