#!/usr/bin/env bash
# ==============================================================================
# KYAnonymous Production Deployment Script for Android Termux
# ==============================================================================
# Usage: bash scripts/deploy.sh
# Ensures migration failures immediately halt deployment ('set -euo pipefail')
# ==============================================================================

set -euo pipefail

echo ""
echo "=========================================================="
echo "  KYAnonymous — Starting Production Deployment Pipeline"
echo "=========================================================="
echo ""

# Ensure we are in project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "==> Project Directory: $PROJECT_ROOT"

# 1. Check PHP binary
if ! command -v php &>/dev/null; then
    echo "ERROR: PHP is not installed or not in PATH." >&2
    exit 1
fi
echo "==> Using PHP version: $(php -r 'echo PHP_VERSION;')"

# 2. Check Composer
if ! command -v composer &>/dev/null; then
    echo "ERROR: Composer is not installed or not in PATH." >&2
    exit 1
fi

# 3. Pull latest commits from GitHub main branch
echo ""
echo "==> [1/6] Pulling latest code from origin/main..."
git fetch origin main
git pull --ff-only origin main

# 4. Install production dependencies
echo ""
echo "==> [2/6] Installing Composer production dependencies..."
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

# 5. Execute safe migrations
# CRITICAL: Any migration failure will stop the script immediately due to 'set -e'
echo ""
echo "==> [3/6] Running database migrations safely..."
php artisan migrate --force

# 6. Optimize and cache application configuration
echo ""
echo "==> [4/6] Caching configuration, routes, and views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 7. Check SQLite database status
echo ""
echo "==> [5/6] Verifying database schema status..."
php artisan migrate:status

# 8. Ensure directory permissions on Termux / Linux
echo ""
echo "==> [6/6] Ensuring storage permissions..."
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  ✓ Deployment completed successfully without errors!   "
echo "=========================================================="
echo ""
