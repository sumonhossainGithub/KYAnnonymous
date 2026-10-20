#!/usr/bin/env bash
# ==============================================================================
# KYAnonymous SQLite WAL Online Backup & Verification Script
# ==============================================================================
# Usage: bash scripts/backup_db.sh [backup_destination_dir]
# Safely backs up SQLite in WAL mode using SQLite's Online Backup / VACUUM INTO.
# Prevents torn pages and verifies backup integrity using 'PRAGMA integrity_check'.
# Supports both sqlite3 CLI and native PHP PDO fallback.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

DB_PATH="${PROJECT_ROOT}/database/database.sqlite"
BACKUP_DIR="${1:-${PROJECT_ROOT}/database/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/database_backup_${TIMESTAMP}.sqlite"

echo "=========================================================="
echo "  KYAnonymous — SQLite WAL Online Atomic Backup"
echo "=========================================================="
echo "  Source Database : $DB_PATH"
echo "  Backup Directory: $BACKUP_DIR"
echo "  Target Snapshot : $BACKUP_FILE"
echo "=========================================================="

# 1. Verify source database exists
if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Source database not found at: $DB_PATH" >&2
    exit 1
fi

# 2. Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# 3. Perform atomic online backup
echo ""
echo "==> [1/3] Executing atomic SQLite online backup..."

if command -v sqlite3 &>/dev/null; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
elif command -v php &>/dev/null; then
    echo "    (Using PHP PDO SQLite VACUUM INTO engine...)"
    php -r "
        \$pdo = new PDO('sqlite:${DB_PATH}');
        \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        \$pdo->exec('VACUUM INTO \"${BACKUP_FILE}\";');
    "
else
    echo "ERROR: Neither sqlite3 CLI nor php was found in PATH." >&2
    exit 1
fi

# 4. Verify the backup file exists and has size > 0
if [ ! -s "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file was created empty or missing: $BACKUP_FILE" >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# 5. Run PRAGMA integrity_check on the backup snapshot
echo ""
echo "==> [2/3] Verifying backup database integrity..."

if command -v sqlite3 &>/dev/null; then
    INTEGRITY_RESULT=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;")
else
    INTEGRITY_RESULT=$(php -r "
        \$pdo = new PDO('sqlite:${BACKUP_FILE}');
        echo \$pdo->query('PRAGMA integrity_check;')->fetchColumn();
    ")
fi

if [ "$INTEGRITY_RESULT" != "ok" ]; then
    echo "ERROR: Backup integrity check FAILED: $INTEGRITY_RESULT" >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi
echo "    ✓ SQLite integrity check passed: ok"

# 6. Verify critical table schemas and record counts
echo ""
echo "==> [3/3] Inspecting backed-up record counts..."

if command -v sqlite3 &>/dev/null; then
    USER_COUNT=$(sqlite3 "$BACKUP_FILE" "SELECT count(*) FROM users;")
    MSG_COUNT=$(sqlite3 "$BACKUP_FILE" "SELECT count(*) FROM chat_messages;")
    SETTINGS_COUNT=$(sqlite3 "$BACKUP_FILE" "SELECT count(*) FROM app_settings;")
else
    USER_COUNT=$(php -r "\$pdo=new PDO('sqlite:${BACKUP_FILE}'); echo \$pdo->query('SELECT count(*) FROM users;')->fetchColumn();")
    MSG_COUNT=$(php -r "\$pdo=new PDO('sqlite:${BACKUP_FILE}'); echo \$pdo->query('SELECT count(*) FROM chat_messages;')->fetchColumn();")
    SETTINGS_COUNT=$(php -r "\$pdo=new PDO('sqlite:${BACKUP_FILE}'); echo \$pdo->query('SELECT count(*) FROM app_settings;')->fetchColumn();")
fi

echo "    - Users count        : $USER_COUNT"
echo "    - Chat messages count: $MSG_COUNT"
echo "    - App settings count : $SETTINGS_COUNT"

echo ""
echo "=========================================================="
echo "  ✓ Online WAL backup completed and verified successfully!"
echo "  File: $BACKUP_FILE"
echo "=========================================================="
