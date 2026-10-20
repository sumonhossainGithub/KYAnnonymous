#!/usr/bin/env bash
# ==============================================================================
# KYAnonymous Ghost AI V2 — llama.cpp Android ARM64 Startup Script
# ==============================================================================
# Designed for Android Termux on ~4 GB RAM device with Qwen3 4B Q4_K_M
# Official ARM64 prebuilt binary with LD_LIBRARY_PATH dynamic linking.
# ==============================================================================

set -euo pipefail

# Verified paths on Android device (can be overridden via environment)
LLAMA_DIR="${LLAMA_DIR:-$HOME/ai/prebuilt/llama-b11748}"
MODEL_PATH="${MODEL_PATH:-$HOME/ai/models/Qwen3-4B-Q4_K_M.gguf}"
HOST="127.0.0.1"
PORT="8081"

echo "=========================================================="
echo "  Starting llama.cpp Server for Ghost AI V2 (ARM64)"
echo "=========================================================="
echo "  Binary Directory : $LLAMA_DIR"
echo "  Model Path       : $MODEL_PATH"
echo "  Bind Address     : $HOST:$PORT"
echo "=========================================================="

# 1. Verify model file exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "ERROR: Model file not found at: $MODEL_PATH" >&2
    echo "Please download or link Qwen3 4B Q4_K_M GGUF to $MODEL_PATH or set MODEL_PATH environment variable." >&2
    exit 1
fi

# 2. Verify llama-server executable exists
if [ ! -f "$LLAMA_DIR/llama-server" ]; then
    echo "ERROR: llama-server executable not found at: $LLAMA_DIR/llama-server" >&2
    echo "Please set LLAMA_DIR to the directory containing llama-server and shared libraries." >&2
    exit 1
fi

# 3. Check if port is already in use
if command -v lsof &>/dev/null && lsof -i ":$PORT" &>/dev/null; then
    echo "WARNING: Port $PORT is already in use. Checking if it's already responding..."
    if curl -s "http://$HOST:$PORT/health" &>/dev/null; then
        echo "llama-server is already running and healthy on $HOST:$PORT."
        exit 0
    else
        echo "Port $PORT is bound by another process. Please free port $PORT before starting." >&2
        exit 1
    fi
fi

# 4. Export LD_LIBRARY_PATH for official prebuilt Android ARM64 shared libraries
# Essential: libllama.so, libggml.so, libggml-cpu.so reside in $LLAMA_DIR
export LD_LIBRARY_PATH="$LLAMA_DIR:${LD_LIBRARY_PATH:-}"

echo "==> LD_LIBRARY_PATH set to: $LD_LIBRARY_PATH"

# 5. Dynamically verify supported server flags via --help
SERVER_HELP=$("$LLAMA_DIR/llama-server" --help 2>&1 || true)

OPTIONAL_FLAGS=()

# Check for Jinja chat templating support (required for Qwen3 enable_thinking template kwargs)
if echo "$SERVER_HELP" | grep -q -- "--jinja"; then
    OPTIONAL_FLAGS+=("--jinja")
    echo "    - Jinja chat templating : enabled (--jinja)"
fi

# Check for Flash Attention flag support
if echo "$SERVER_HELP" | grep -q -- "-fa"; then
    OPTIONAL_FLAGS+=("-fa" "off")
    echo "    - Flash attention       : off (-fa off)"
fi

# Check for --no-repack flag support
if echo "$SERVER_HELP" | grep -q -- "--no-repack"; then
    OPTIONAL_FLAGS+=("--no-repack")
    echo "    - Weight repacking      : disabled (--no-repack)"
fi

echo "==> Launching llama-server with conservative mobile RAM flags..."
echo "    - Context size: 512 (prevents OOM on 4 GB RAM; do NOT use 2048)"
echo "    - Parallel slots: 1 (strictly single concurrency)"
echo "    - Threads: 4"
echo "    - Batch size: 128"

# 6. Execute llama-server with verified conservative flags
exec "$LLAMA_DIR/llama-server" \
    -m "$MODEL_PATH" \
    --host "$HOST" \
    --port "$PORT" \
    -c 512 \
    -np 1 \
    -t 4 \
    -b 128 \
    -ub 128 \
    "${OPTIONAL_FLAGS[@]}"
