#!/usr/bin/env bash
set -euo pipefail

MARKITDOWN_SPEC="${MARKITDOWN_SPEC:-git+https://github.com/microsoft/markitdown.git@63cbbd9de6afa01ee3b97127e4945c5706a29472#subdirectory=packages/markitdown}"

usage() {
  cat <<'USAGE'
Usage:
  ./convert.sh <input> [output.md]

Examples:
  ./convert.sh ./demo.pdf
  ./convert.sh "https://example.com/article"
  ./convert.sh ./demo.docx ./out/demo.md

Notes:
  - input can be a local file path or http/https URL.
  - if output is omitted, a .md file is generated automatically.
USAGE
}

require_uv() {
  if command -v uv >/dev/null 2>&1; then
    command -v uv
    return
  fi

  if [ -x "$HOME/.local/bin/uv" ]; then
    echo "$HOME/.local/bin/uv"
    return
  fi

  echo "[1/2] uv not found, installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | UV_NO_MODIFY_PATH=1 sh

  if [ -x "$HOME/.local/bin/uv" ]; then
    echo "$HOME/.local/bin/uv"
    return
  fi

  echo "Error: uv install failed. Please install uv manually: https://docs.astral.sh/uv/" >&2
  exit 1
}

slugify_url() {
  local url="$1"
  local name
  name="$(echo "$url" | sed -E 's#^[A-Za-z]+://##; s#[/?#:&=]+#-#g; s/^-+//; s/-+$//; s/-+/-/g')"
  name="${name:0:80}"
  if [ -z "$name" ]; then
    name="page"
  fi
  echo "$name.md"
}

default_output_for_file() {
  local input="$1"
  local dir
  local base
  local stem

  if [ -e "$input" ]; then
    dir="$(cd "$(dirname "$input")" && pwd)"
  else
    dir="$(pwd)"
  fi

  base="$(basename "$input")"
  stem="${base%.*}"
  if [ -z "$stem" ] || [ "$stem" = "$base" ]; then
    stem="$base"
  fi
  echo "$dir/$stem.md"
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage
  exit 1
fi

INPUT="$1"
OUTPUT="${2:-}"

if [ -z "$OUTPUT" ]; then
  if [[ "$INPUT" =~ ^https?:// ]]; then
    OUTPUT="$(pwd)/$(slugify_url "$INPUT")"
  else
    OUTPUT="$(default_output_for_file "$INPUT")"
  fi
fi

mkdir -p "$(dirname "$OUTPUT")"

UV_BIN="$(require_uv)"

echo "[2/2] Converting to markdown..."
if [[ "$INPUT" =~ ^https?:// ]]; then
  # Fetch URL content with curl (system certs) to avoid SSL issues from isolated runtimes.
  curl -LfsS "$INPUT" | "$UV_BIN" tool run --from "$MARKITDOWN_SPEC" markitdown -x html -o "$OUTPUT"
else
  "$UV_BIN" tool run --from "$MARKITDOWN_SPEC" markitdown "$INPUT" -o "$OUTPUT"
fi

echo "Done: $OUTPUT"
