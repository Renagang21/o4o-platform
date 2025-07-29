#!/bin/bash

# O4O Platform Restore Script
# This script restores the database and files from backup

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup/o4o-platform}"
DB_NAME="${DB_NAME:-o4o_platform}"
DB_USER="${DB_USERNAME:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
RESTORE_DIR="${RESTORE_DIR:-/restore/o4o-platform}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔄 O4O Platform Restore Script"
echo "============================="
echo ""

# Function to log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$RESTORE_DIR/logs/restore_$(date +%Y%m%d_%H%M%S).log"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide backup file path${NC}"
    echo "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found in $BACKUP_DIR"
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR/extracted"
mkdir -p "$RESTORE_DIR/logs"

log "Starting restore from: $BACKUP_FILE"

# Extract backup
log "Extracting backup archive..."
cd "$RESTORE_DIR/extracted"
tar -xzf "$BACKUP_FILE" || {
    log "❌ Failed to extract backup"
    exit 1
}
log "✅ Backup extracted successfully"

# Safety check - confirm restore
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will restore the database and files${NC}"
echo -e "${YELLOW}   Current data will be overwritten!${NC}"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log "❌ Restore cancelled by user"
    exit 1
fi

# Stop services (if running)
log "Stopping services..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop api-server || true
    log "✅ API server stopped"
fi

# Restore database
log "Starting database restore..."
DB_BACKUP=$(find . -name "o4o_db_*.sql.gz" | head -1)

if [ -z "$DB_BACKUP" ]; then
    log "❌ Database backup not found in archive"
    exit 1
fi

# Decompress database backup
gunzip -c "$DB_BACKUP" > temp_restore.sql

# Create new database (drop if exists)
log "Preparing database..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME}_restore;" || true
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME}_restore;"

# Restore to temporary database
log "Restoring database..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "${DB_NAME}_restore" -f temp_restore.sql || {
    log "❌ Database restore failed"
    rm -f temp_restore.sql
    exit 1
}

# If restore successful, swap databases
log "Swapping databases..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" <<EOF
ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;
ALTER DATABASE ${DB_NAME}_restore RENAME TO $DB_NAME;
EOF

log "✅ Database restored successfully"
rm -f temp_restore.sql

# Restore files
log "Restoring files..."
FILES_DIR="files"

if [ -d "$FILES_DIR" ]; then
    # Restore environment files
    ENV_BACKUP=$(find "$FILES_DIR" -name ".env_*.tar.gz" | head -1)
    if [ -n "$ENV_BACKUP" ]; then
        tar -xzf "$ENV_BACKUP" -C / 2>/dev/null || true
        log "✅ Environment files restored"
    fi

    # Restore uploads
    UPLOADS_BACKUP=$(find "$FILES_DIR" -name "uploads_*.tar.gz" | head -1)
    if [ -n "$UPLOADS_BACKUP" ]; then
        tar -xzf "$UPLOADS_BACKUP" -C / 2>/dev/null || true
        log "✅ Upload files restored"
    fi

    # Restore dist directories
    for dist_backup in $(find "$FILES_DIR" -name "dist_*.tar.gz"); do
        tar -xzf "$dist_backup" -C / 2>/dev/null || true
    done
    log "✅ Distribution files restored"
else
    log "⚠️  No files directory found in backup"
fi

# Restart services
log "Restarting services..."
cd /home/ubuntu/o4o-platform/apps/api-server
npm install
npm run build
pm2 start ecosystem.config.js
log "✅ Services restarted"

# Verify restoration
log "Verifying restoration..."
sleep 5

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health)
if [ "$API_HEALTH" = "200" ]; then
    log "✅ API server is healthy"
else
    log "❌ API server health check failed (HTTP $API_HEALTH)"
fi

# Clean up old database
echo ""
read -p "Delete old database backup? (yes/no): " delete_old
if [ "$delete_old" = "yes" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME}_old;"
    log "✅ Old database deleted"
fi

# Clean up extraction directory
rm -rf "$RESTORE_DIR/extracted"

echo ""
echo "============================="
echo -e "${GREEN}✅ Restore completed successfully${NC}"
echo ""
echo "Next steps:"
echo "1. Verify application functionality"
echo "2. Check all services are running correctly"
echo "3. Monitor logs for any issues"
echo ""
echo "Rollback command (if needed):"
echo "  PGPASSWORD=\$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -c \"ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_failed; ALTER DATABASE ${DB_NAME}_old RENAME TO $DB_NAME;\""