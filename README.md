<p align="center">
  <img src="public/icon-128.png" width="80" height="80" alt="页面抓取 Logo">
</p>

<h1 align="center">页面抓取</h1>

<p align="center">
  <strong>一键抓取任意网页的纯净 Markdown 内容</strong>
</p>

<p align="center">
  Chrome 扩展 · Manifest V3 · 基于 Jina Reader API
</p>

---

## ✨ 功能特点

- 🔗 **一键抓取** — 点击按钮即可将当前网页转换为干净的 Markdown 文件
- 🔐 **穿透登录墙** — 通过 [Jina Reader API](https://jina.ai/reader/) 抓取，即使需要登录的页面（如 X/Twitter）也能获取内容
- 📄 **直接下载** — 自动保存为 `.md` 文件，无需手动复制粘贴
- ⚡ **轻量快速** — 无需 PDF 渲染引擎，极简架构，秒级完成

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
| [Jina Reader API](https://jina.ai/reader/) | 网页内容提取 |
| [Lucide React](https://lucide.dev) | 图标库 |

## 📁 项目结构

```
jina-md-grabber/
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
    ├── background.js    # 后台脚本（Jina 请求 + 下载）
    ├── content.js       # 内容脚本（Toast 通知）
    └── content.css      # Toast 样式
```

## ⚙️ 工作原理

```
用户点击「抓取 Markdown」
        ↓
  Popup 发送消息给 Background
        ↓
  Background 调用 https://r.jina.ai/{当前页面URL}
        ↓
  Jina 返回纯净 Markdown 文本
        ↓
  转换为 Blob → 触发 chrome.downloads
        ↓
  用户保存 .md 文件 ✅
```

## 📝 License

MIT

---

<p align="center">
  Made with ❤️ using <a href="https://jina.ai/reader/">Jina Reader API</a>
</p>
