<p align="center">
  <img src="public/icon-128.png" width="80" height="80" alt="页面抓取 Logo">
</p>

<h1 align="center">页面抓取</h1>

<p align="center">
  <strong>一键提取任意网页正文，本地转换为纯净 Markdown</strong>
</p>

<p align="center">
  Chrome 扩展 · Manifest V3 · 完全离线 · 零外部依赖
</p>

---

## ✨ 功能特点

- 🔗 **一键抓取** — 点击按钮即可将当前网页转换为干净的 Markdown 文件
- 🔒 **完全离线** — 所有提取和转换在浏览器本地完成，无需联网，不依赖任何外部 API
- 🔐 **支持登录页面** — 你已登录的页面（如 X/Twitter、微信公众号）可以直接抓取完整内容
- 📄 **直接下载** — 自动保存为 `.md` 文件，无需手动复制粘贴
- ⚡ **极速** — 本地 DOM 提取，毫秒级完成

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
| [Lucide React](https://lucide.dev) | 图标库 |

## ⚙️ 工作原理

```
用户点击「抓取 Markdown」
        ↓
  Popup 发送消息给 Content Script
        ↓
  Content Script 克隆当前页面 DOM
        ↓
  Readability 智能提取正文（去除导航/广告/侧边栏）
        ↓
  Turndown 将 HTML 转为 Markdown
        ↓
  Background 接收文本 → 触发 chrome.downloads
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
    ├── background.js    # 后台脚本（文件下载）
    ├── content.js       # 内容脚本（Readability + Turndown 提取）
    └── content.css      # Toast 样式
```

## 📝 License

MIT

---

<p align="center">
  Made with ❤️ · Powered by <a href="https://github.com/mozilla/readability">Readability</a> & <a href="https://github.com/mixmark-io/turndown">Turndown</a>
</p>
