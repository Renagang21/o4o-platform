#!/bin/bash

# O4O Platform Backup Script
# This script backs up the database and important files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup/o4o-platform}"
DB_NAME="${DB_NAME:-o4o_platform}"
DB_USER="${DB_USERNAME:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 O4O Platform Backup Script"
echo "============================="
echo "Timestamp: $TIMESTAMP"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR/db"
mkdir -p "$BACKUP_DIR/files"
mkdir -p "$BACKUP_DIR/logs"

# Function to log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/logs/backup_$TIMESTAMP.log"
}

# Database backup
log "Starting database backup..."
if PGPASSWORD=$DB_PASSWORD pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_DIR/db/o4o_db_$TIMESTAMP.sql"; then
    log "✅ Database backup completed"
    
    # Compress the backup
    gzip "$BACKUP_DIR/db/o4o_db_$TIMESTAMP.sql"
    log "✅ Database backup compressed"
else
    log "❌ Database backup failed"
    exit 1
fi

# Files backup (uploads, configs, etc.)
log "Starting files backup..."
DIRS_TO_BACKUP=(
    "apps/api-server/.env"
    "apps/api-server/uploads"
    "apps/*/dist"
    "packages/*/dist"
)

for dir in "${DIRS_TO_BACKUP[@]}"; do
    if [ -e "$dir" ]; then
        tar -czf "$BACKUP_DIR/files/$(basename $dir)_$TIMESTAMP.tar.gz" "$dir" 2>/dev/null || true
        log "✅ Backed up: $dir"
    fi
done

# Create master backup archive
log "Creating master backup archive..."
cd "$BACKUP_DIR"
tar -czf "o4o_backup_$TIMESTAMP.tar.gz" \
    "db/o4o_db_$TIMESTAMP.sql.gz" \
    "files/*_$TIMESTAMP.tar.gz" \
    "logs/backup_$TIMESTAMP.log"

# Clean up individual files
rm -f "db/o4o_db_$TIMESTAMP.sql.gz"
rm -f "files/*_$TIMESTAMP.tar.gz"

log "✅ Master backup created: o4o_backup_$TIMESTAMP.tar.gz"

# Cleanup old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "o4o_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
log "✅ Cleanup completed"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/o4o_backup_$TIMESTAMP.tar.gz" | cut -f1)
log "📦 Backup size: $BACKUP_SIZE"

# Verify backup
log "Verifying backup integrity..."
if tar -tzf "$BACKUP_DIR/o4o_backup_$TIMESTAMP.tar.gz" > /dev/null 2>&1; then
    log "✅ Backup verification passed"
else
    log "❌ Backup verification failed"
    exit 1
fi

echo ""
echo "============================="
echo -e "${GREEN}✅ Backup completed successfully${NC}"
echo "Location: $BACKUP_DIR/o4o_backup_$TIMESTAMP.tar.gz"
echo "Size: $BACKUP_SIZE"

# Optional: Upload to S3 or other cloud storage
# aws s3 cp "$BACKUP_DIR/o4o_backup_$TIMESTAMP.tar.gz" "s3://your-bucket/backups/"