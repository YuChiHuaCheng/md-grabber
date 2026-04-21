# md-grabber (Local Minimal Tool)

一个本地 Markdown 转换工具，支持：
- 点击网页使用（推荐）
- 命令行使用

底层基于 [Microsoft MarkItDown](https://github.com/microsoft/markitdown)。

## 功能

- 本地文件转 Markdown（如 PDF / DOCX / PPTX / XLSX / HTML 等）
- URL 页面转 Markdown
- 浏览器直接下载 `.md`
- 首次运行自动准备 `uv` 与 MarkItDown 依赖

## 项目文件

- `web_app.py`：本地网页服务（上传文件 / 输入 URL）
- `启动网页.command`：macOS 双击启动入口
- `convert.sh`：命令行入口

## 快速开始（点击使用）

1. 进入项目目录
2. 双击 `启动网页.command`
3. 浏览器打开本地页面后，选择文件或粘贴 URL
4. 点击按钮，自动下载 `.md`

说明：
- 服务默认监听 `127.0.0.1:8765`，端口占用时会自动换可用端口。
- 停止服务：关闭终端窗口或按 `Ctrl + C`。

## 命令行用法（可选）

```bash
./convert.sh <input> [output.md]
```

示例：

```bash
# 本地文件 -> 同目录 markdown
./convert.sh ./demo.pdf

# URL -> 当前目录 markdown
./convert.sh "https://example.com/article"

# 指定输出路径
./convert.sh ./demo.docx ./out/demo.md
```

## 可选配置

可通过环境变量固定/切换 MarkItDown 版本：

```bash
MARKITDOWN_SPEC='git+https://github.com/microsoft/markitdown.git@<commit>#subdirectory=packages/markitdown' ./convert.sh ./demo.pdf
```

## 常见问题

- **双击 `.command` 没反应**
  - 在 macOS “系统设置 -> 隐私与安全性”中允许执行，或右键打开一次。
- **首次转换较慢**
  - 首次需要下载 Python 运行时与依赖，后续会明显更快。
