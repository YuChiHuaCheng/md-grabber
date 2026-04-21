#!/usr/bin/env python3
import cgi
import json
import os
import subprocess
import tempfile
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PREFERRED_PORT = 8765
BASE_DIR = Path(__file__).resolve().parent
CONVERT_SCRIPT = BASE_DIR / "convert.sh"

HTML_PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Markdown 本地转换器</title>
  <style>
    :root {
      --bg: #f6f4ee;
      --panel: #fffdf8;
      --ink: #1f2937;
      --muted: #6b7280;
      --line: #e7e1d6;
      --accent: #14532d;
      --accent-2: #3f6212;
      --error: #991b1b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at top right, #fef3c7, transparent 35%), var(--bg);
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(860px, 100%);
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0,0,0,.08);
      padding: 26px;
    }
    h1 { margin: 0; font-size: 28px; }
    .hint { color: var(--muted); margin: 8px 0 18px; }
    .grid {
      display: grid;
      gap: 14px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 860px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .panel h2 { margin: 0 0 8px; font-size: 18px; }
    label { display: block; margin-bottom: 8px; color: var(--muted); }
    input[type="url"], input[type="file"], button {
      width: 100%;
      font-size: 15px;
      border-radius: 10px;
    }
    input[type="url"], input[type="file"] {
      border: 1px solid var(--line);
      padding: 10px;
      background: #fff;
    }
    button {
      border: none;
      padding: 11px 12px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      cursor: pointer;
      margin-top: 10px;
    }
    button[disabled] { opacity: 0.55; cursor: not-allowed; }
    #status {
      margin-top: 14px;
      border-radius: 10px;
      padding: 10px 12px;
      background: #ecfccb;
      color: #365314;
      display: none;
      white-space: pre-wrap;
    }
    #status.error { background: #fee2e2; color: var(--error); }
    .footer {
      margin-top: 14px;
      color: var(--muted);
      font-size: 13px;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Markdown 本地转换器</h1>
    <p class="hint">点一点就能用：上传文件或粘贴 URL，自动下载 Markdown。</p>

    <div class="grid">
      <section class="panel">
        <h2>本地文件</h2>
        <label for="fileInput">支持 PDF / DOCX / PPTX / XLSX / HTML 等</label>
        <input id="fileInput" type="file" />
        <button id="fileBtn">转换并下载</button>
      </section>

      <section class="panel">
        <h2>网页 URL</h2>
        <label for="urlInput">输入以 http:// 或 https:// 开头的网址</label>
        <input id="urlInput" type="url" placeholder="https://example.com/article" />
        <button id="urlBtn">抓取并下载</button>
      </section>
    </div>

    <div id="status"></div>
    <p class="footer">本地工具目录：<span class="mono">""" + str(BASE_DIR) + """</span></p>
  </main>

<script>
  const statusEl = document.getElementById('status');
  const fileInput = document.getElementById('fileInput');
  const fileBtn = document.getElementById('fileBtn');
  const urlInput = document.getElementById('urlInput');
  const urlBtn = document.getElementById('urlBtn');

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
    statusEl.classList.toggle('error', isError);
  }

  function setLoading(loading) {
    fileBtn.disabled = loading;
    urlBtn.disabled = loading;
    if (loading) {
      fileBtn.textContent = '处理中...';
      urlBtn.textContent = '处理中...';
    } else {
      fileBtn.textContent = '转换并下载';
      urlBtn.textContent = '抓取并下载';
    }
  }

  function downloadMarkdown(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  fileBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus('请先选择一个文件。', true);
      return;
    }

    const form = new FormData();
    form.append('file', file);

    try {
      setLoading(true);
      setStatus('正在转换本地文件，请稍候...');
      const res = await fetch('/api/convert-file', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '转换失败');
      downloadMarkdown(data.filename, data.markdown);
      setStatus(`已完成：${data.filename}`);
    } catch (err) {
      setStatus(`失败：${err.message}`, true);
    } finally {
      setLoading(false);
    }
  });

  urlBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus('请先输入 URL。', true);
      return;
    }

    try {
      setLoading(true);
      setStatus('正在抓取 URL 并转换，请稍候...');
      const res = await fetch('/api/convert-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '转换失败');
      downloadMarkdown(data.filename, data.markdown);
      setStatus(`已完成：${data.filename}`);
    } catch (err) {
      setStatus(`失败：${err.message}`, true);
    } finally {
      setLoading(false);
    }
  });
</script>
</body>
</html>
"""


def json_response(handler: BaseHTTPRequestHandler, code: int, payload: dict):
  body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
  handler.send_response(code)
  handler.send_header("Content-Type", "application/json; charset=utf-8")
  handler.send_header("Content-Length", str(len(body)))
  handler.end_headers()
  handler.wfile.write(body)


def guess_output_name(source_name: str) -> str:
  base = os.path.basename(source_name).strip()
  if not base:
    return "converted.md"
  stem, _ = os.path.splitext(base)
  stem = stem or "converted"
  return f"{stem}.md"


def guess_output_name_for_url(url: str) -> str:
  parsed = urlparse(url)
  host = (parsed.netloc or "page").replace(":", "-")
  path = parsed.path.strip("/").replace("/", "-")
  parts = [host]
  if path:
    parts.append(path)
  name = "-".join(parts)
  name = "-".join(name.split())
  name = "".join(ch if ch.isalnum() or ch in "-_." else "-" for ch in name)
  while "--" in name:
    name = name.replace("--", "-")
  name = name.strip("-._")
  if not name:
    name = "page"
  return f"{name[:80]}.md"


def run_convert(source: str, output_md: str):
  if not CONVERT_SCRIPT.exists():
    raise RuntimeError(f"convert.sh 不存在: {CONVERT_SCRIPT}")

  cmd = ["bash", str(CONVERT_SCRIPT), source, output_md]
  completed = subprocess.run(
    cmd,
    cwd=str(BASE_DIR),
    capture_output=True,
    text=True,
  )

  if completed.returncode != 0:
    stderr = (completed.stderr or "").strip()
    stdout = (completed.stdout or "").strip()
    detail = stderr or stdout or "unknown error"
    raise RuntimeError(detail)


class Handler(BaseHTTPRequestHandler):
  def do_GET(self):
    if self.path in ("/", "/index.html"):
      body = HTML_PAGE.encode("utf-8")
      self.send_response(HTTPStatus.OK)
      self.send_header("Content-Type", "text/html; charset=utf-8")
      self.send_header("Content-Length", str(len(body)))
      self.end_headers()
      self.wfile.write(body)
      return

    json_response(self, HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not Found"})

  def do_POST(self):
    if self.path == "/api/convert-file":
      self.handle_convert_file()
      return
    if self.path == "/api/convert-url":
      self.handle_convert_url()
      return

    json_response(self, HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not Found"})

  def handle_convert_file(self):
    content_type = self.headers.get("Content-Type", "")
    if "multipart/form-data" not in content_type:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "error": "请使用文件上传。"})
      return

    form = cgi.FieldStorage(
      fp=self.rfile,
      headers=self.headers,
      environ={
        "REQUEST_METHOD": "POST",
        "CONTENT_TYPE": content_type,
      },
    )

    if "file" not in form:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "error": "缺少 file 字段。"})
      return

    file_item = form["file"]
    if not getattr(file_item, "filename", ""):
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "error": "请选择文件。"})
      return

    original_name = os.path.basename(file_item.filename)
    suffix = os.path.splitext(original_name)[1]

    temp_input_path = None
    temp_output_path = None
    try:
      with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=str(BASE_DIR)) as temp_in:
        data = file_item.file.read()
        temp_in.write(data)
        temp_input_path = temp_in.name

      with tempfile.NamedTemporaryFile(delete=False, suffix=".md", dir=str(BASE_DIR)) as temp_out:
        temp_output_path = temp_out.name

      run_convert(temp_input_path, temp_output_path)

      with open(temp_output_path, "r", encoding="utf-8", errors="replace") as f:
        markdown = f.read()

      json_response(
        self,
        HTTPStatus.OK,
        {
          "ok": True,
          "filename": guess_output_name(original_name),
          "markdown": markdown,
        },
      )
    except Exception as exc:
      json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})
    finally:
      if temp_input_path and os.path.exists(temp_input_path):
        os.remove(temp_input_path)
      if temp_output_path and os.path.exists(temp_output_path):
        os.remove(temp_output_path)

  def handle_convert_url(self):
    content_length = int(self.headers.get("Content-Length", "0") or "0")
    raw = self.rfile.read(content_length) if content_length > 0 else b"{}"

    try:
      payload = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "error": "请求体必须是 JSON。"})
      return

    url = (payload.get("url") or "").strip()
    if not url:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "error": "URL 不能为空。"})
      return

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "error": "仅支持 http/https URL。"})
      return

    temp_output_path = None
    try:
      with tempfile.NamedTemporaryFile(delete=False, suffix=".md", dir=str(BASE_DIR)) as temp_out:
        temp_output_path = temp_out.name

      run_convert(url, temp_output_path)

      with open(temp_output_path, "r", encoding="utf-8", errors="replace") as f:
        markdown = f.read()

      json_response(
        self,
        HTTPStatus.OK,
        {
          "ok": True,
          "filename": guess_output_name_for_url(url),
          "markdown": markdown,
        },
      )
    except Exception as exc:
      json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})
    finally:
      if temp_output_path and os.path.exists(temp_output_path):
        os.remove(temp_output_path)

  def log_message(self, format, *args):
    # Keep terminal output concise.
    return


def run_server():
  if not CONVERT_SCRIPT.exists():
    raise FileNotFoundError(f"未找到 {CONVERT_SCRIPT}")

  port = PREFERRED_PORT
  server = None
  while server is None:
    try:
      server = ThreadingHTTPServer((HOST, port), Handler)
    except OSError:
      if port == 0:
        raise
      port = 0

  actual_port = server.server_address[1]
  url = f"http://{HOST}:{actual_port}"

  print("Markdown 本地转换器已启动")
  print(f"打开地址: {url}")
  print("按 Ctrl+C 可停止服务")

  try:
    webbrowser.open(url, new=1)
  except Exception:
    pass

  server.serve_forever()


if __name__ == "__main__":
  run_server()
