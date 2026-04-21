# markitdown-local-tool

一个最小可用的本地转换工具（独立目录，不改你原来的项目），支持点击使用。

它会用 [Microsoft MarkItDown](https://github.com/microsoft/markitdown) 把本地文件或 URL 转成 `.md`。

## 目录

- `convert.sh`：命令行入口脚本
- `web_app.py`：本地网页服务
- `启动网页.command`：双击启动网页版（推荐）

## 点击使用（推荐）

1. 打开目录：`/Users/dylanzeng/Desktop/agent-projects/markitdown-local-tool`
2. 双击 `启动网页.command`
3. 浏览器会自动打开网页
4. 在页面里选择文件或粘贴 URL，然后点击按钮即可下载 `.md`

如果首次打开遇到 macOS 权限提示，请在“系统设置 -> 隐私与安全性”里允许执行。

## 用法

如果你还是想用命令行，也支持：

```bash
./convert.sh <输入> [输出文件]
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

## 说明

- 首次运行会自动安装 `uv`（如果系统没有），然后拉取并运行 MarkItDown。
- 首次转换会比较慢（需要下载 Python 运行时和依赖）；后续会快很多。
- 不会修改你之前的扩展项目目录：
  - `/Users/dylanzeng/Desktop/agent-projects/jina-md-grabber`

## 可选：固定 MarkItDown 版本

脚本默认固定到一个已验证可用的 commit（避免每次追踪最新导致不稳定）。
如果你想改版本，可以临时覆盖环境变量：

```bash
MARKITDOWN_SPEC='git+https://github.com/microsoft/markitdown.git@<commit>#subdirectory=packages/markitdown' ./convert.sh ./demo.pdf
```
