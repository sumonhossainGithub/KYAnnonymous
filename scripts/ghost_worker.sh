#!/usr/bin/env bash
# ==============================================================================
# KYAnonymous Ghost AI V2 — Persistent Singleton Worker for Android Termux
# ==============================================================================
# Usage: bash scripts/ghost_worker.sh
# Ensures only a SINGLE persistent worker runs to protect Android ARM64 (~4 GB RAM)
# Stays resident in memory (no --stop-when-empty) to eliminate Laravel reboot churn.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/storage/framework/ghost_worker.pid"
LOCK_FILE="$PROJECT_ROOT/storage/framework/ghost_worker.lock"

cd "$PROJECT_ROOT"

# 1. Singleton Verification: Ensure only one supervisor instance runs
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ghost AI Worker is already running with PID: $OLD_PID"
        exit 0
    fi
fi

# Save supervisor PID
echo "$$" > "$PID_FILE"

# Track child worker PID for clean shutdown
CHILD_PID=""

# Cleanup handler on exit or termination signals
cleanup() {
    echo ""
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Shutting down Ghost AI Worker supervisor (PID: $$)..."
    if [ -n "$CHILD_PID" ] && kill -0 "$CHILD_PID" 2>/dev/null; then
        kill -TERM "$CHILD_PID" 2>/dev/null || true
        wait "$CHILD_PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE" "$LOCK_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup completed."
}
trap cleanup EXIT INT TERM

echo "=========================================================="
echo "  KYAnonymous Ghost AI Persistent Worker Started"
echo "  Supervisor PID : $$"
echo "  Queues         : ghost-commands (priority), ghost-auto"
echo "  Concurrency    : Strict Single-Thread (1)"
echo "  Polling Sleep  : 3 seconds when queue is empty"
echo "  Process Timeout: 420 seconds (7 mins)"
echo "=========================================================="

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Launching persistent queue:work daemon..."

    # Run queue:work as a persistent daemon (NO --stop-when-empty)
    # --queue: strictly isolated to AI queues (commands take priority)
    # --sleep=3: wait 3s before polling SQLite when no jobs are present
    # --tries=1: never infinite-retry slow failed AI jobs
    # --timeout=420: worker process timeout (Hierarchy: 360s HTTP < 400s Job < 420s Worker < 480s retry_after < 550s Lock)
    # --rest=2: rest CPU 2s between finished jobs to protect mobile thermals
    # --max-jobs=50: recycle PHP worker after 50 jobs to release memory
    # --memory=128: restart worker if PHP memory exceeds 128 MB
    php artisan queue:work database \
        --queue=ghost-commands,ghost-auto \
        --sleep=3 \
        --tries=1 \
        --timeout=420 \
        --rest=2 \
        --max-jobs=50 \
        --memory=128 &
    
    CHILD_PID=$!
    wait "$CHILD_PID" || true
    CHILD_PID=""

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Queue worker process recycled cleanly. Restarting daemon in 2s..."
    sleep 2
done
