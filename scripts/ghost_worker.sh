#!/usr/bin/env bash
# ==============================================================================
# KYAnonymous Ghost AI V2 Background Worker for Android Termux
# ==============================================================================
# Usage: bash scripts/ghost_worker.sh
# Ensures only a SINGLE worker runs to protect Android ARM64 memory (~4 GB RAM)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/storage/framework/ghost_worker.pid"

cd "$PROJECT_ROOT"

# Check if worker is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Ghost AI Worker is already running with PID: $OLD_PID"
        exit 0
    fi
fi

# Save current PID
echo "$$" > "$PID_FILE"

# Clean up PID file on exit
trap 'rm -f "$PID_FILE"' EXIT INT TERM

echo ""
echo "=========================================================="
echo "  KYAnonymous Ghost AI Worker Started"
echo "  PID: $$"
echo "  Queues: ghost-commands (priority), ghost-auto"
echo "  Concurrency: Strict Single-Thread (1)"
echo "=========================================================="
echo ""

while true; do
    # Run queue worker with safety timeouts tailored for ~0.1 tok/s inference
    # --tries=1: never infinite-retry failed AI queries
    # --timeout=410: allows 400s job timeout to finish or handle timeout cleanly
    # --rest=2: allow CPU to cool between jobs
    # --max-jobs=25: restart worker periodically to prevent PHP memory leaks
    php artisan queue:work database \
        --queue=ghost-commands,ghost-auto \
        --tries=1 \
        --timeout=410 \
        --rest=2 \
        --max-jobs=25 \
        --stop-when-empty || true

    sleep 3
done
