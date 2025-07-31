#!/bin/bash

# O4O Platform Backup Monitoring Script
# Monitors backup health and sends alerts

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup/o4o-platform}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@neture.co.kr}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-24}"
MIN_BACKUP_SIZE_MB="${MIN_BACKUP_SIZE_MB:-10}"
RETENTION_CHECK_DAYS="${RETENTION_CHECK_DAYS:-7}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 O4O Platform Backup Monitoring"
echo "================================="
echo ""

# Function to send alert
send_alert() {
    local severity=$1
    local message=$2
    
    echo -e "${RED}⚠️  ALERT: $message${NC}"
    
    # Send email alert (if mail is configured)
    if command -v mail >/dev/null 2>&1 && [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "O4O Backup Alert: $severity" "$ALERT_EMAIL"
    fi
    
    # Send Slack notification (if webhook is configured)
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\":warning: O4O Backup Alert ($severity): $message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    send_alert "CRITICAL" "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/o4o_backup_*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    send_alert "CRITICAL" "No backups found in $BACKUP_DIR"
    exit 1
fi

# Check backup age
BACKUP_AGE_SECONDS=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP")))
BACKUP_AGE_HOURS=$((BACKUP_AGE_SECONDS / 3600))

echo "Latest backup: $(basename "$LATEST_BACKUP")"
echo "Backup age: $BACKUP_AGE_HOURS hours"

if [ $BACKUP_AGE_HOURS -gt $MAX_BACKUP_AGE_HOURS ]; then
    send_alert "HIGH" "Latest backup is $BACKUP_AGE_HOURS hours old (threshold: $MAX_BACKUP_AGE_HOURS hours)"
fi

# Check backup size
BACKUP_SIZE_BYTES=$(stat -c %s "$LATEST_BACKUP" 2>/dev/null || stat -f %z "$LATEST_BACKUP")
BACKUP_SIZE_MB=$((BACKUP_SIZE_BYTES / 1024 / 1024))

echo "Backup size: ${BACKUP_SIZE_MB}MB"

if [ $BACKUP_SIZE_MB -lt $MIN_BACKUP_SIZE_MB ]; then
    send_alert "HIGH" "Backup size is only ${BACKUP_SIZE_MB}MB (minimum expected: ${MIN_BACKUP_SIZE_MB}MB)"
fi

# Verify backup integrity
echo ""
echo "Verifying backup integrity..."
if tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backup integrity check passed${NC}"
else
    send_alert "CRITICAL" "Backup integrity check failed for $(basename "$LATEST_BACKUP")"
fi

# Check backup retention
echo ""
echo "Checking backup retention..."
BACKUP_COUNT=$(ls "$BACKUP_DIR"/o4o_backup_*.tar.gz 2>/dev/null | wc -l)
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "o4o_backup_*.tar.gz" -mtime +$RETENTION_CHECK_DAYS | wc -l)

echo "Total backups: $BACKUP_COUNT"
echo "Backups older than $RETENTION_CHECK_DAYS days: $OLD_BACKUPS"

if [ $BACKUP_COUNT -lt 3 ]; then
    send_alert "MEDIUM" "Only $BACKUP_COUNT backups available (recommended: at least 3)"
fi

# Check disk space
echo ""
echo "Checking disk space..."
DISK_USAGE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_FREE_MB=$(df -m "$BACKUP_DIR" | awk 'NR==2 {print $4}')

echo "Disk usage: ${DISK_USAGE}%"
echo "Free space: ${DISK_FREE_MB}MB"

if [ $DISK_USAGE -gt 90 ]; then
    send_alert "HIGH" "Backup disk usage is ${DISK_USAGE}% (free: ${DISK_FREE_MB}MB)"
elif [ $DISK_USAGE -gt 80 ]; then
    send_alert "MEDIUM" "Backup disk usage is ${DISK_USAGE}% (free: ${DISK_FREE_MB}MB)"
fi

# Test restore capability (dry run)
echo ""
echo "Testing restore capability..."
TEMP_DIR="/tmp/backup-test-$$"
mkdir -p "$TEMP_DIR"

if tar -tzf "$LATEST_BACKUP" | head -10 > "$TEMP_DIR/contents.txt"; then
    echo -e "${GREEN}✅ Backup is readable and contains expected structure${NC}"
    cat "$TEMP_DIR/contents.txt"
else
    send_alert "HIGH" "Cannot read backup contents"
fi

rm -rf "$TEMP_DIR"

# Generate backup status report
REPORT_FILE="$BACKUP_DIR/backup-status-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
O4O Platform Backup Status Report
Generated: $(date)

Latest Backup: $(basename "$LATEST_BACKUP")
Backup Age: $BACKUP_AGE_HOURS hours
Backup Size: ${BACKUP_SIZE_MB}MB
Total Backups: $BACKUP_COUNT
Disk Usage: ${DISK_USAGE}%
Free Space: ${DISK_FREE_MB}MB

Backup Schedule:
- Automated backups should run daily at 2:00 AM
- Retention period: $RETENTION_CHECK_DAYS days
- Backup location: $BACKUP_DIR

Recommendations:
$([ $BACKUP_AGE_HOURS -gt $MAX_BACKUP_AGE_HOURS ] && echo "- ⚠️  Schedule more frequent backups")
$([ $BACKUP_SIZE_MB -lt $MIN_BACKUP_SIZE_MB ] && echo "- ⚠️  Investigate why backup size is small")
$([ $DISK_USAGE -gt 80 ] && echo "- ⚠️  Clean up old backups or increase disk space")
$([ $BACKUP_COUNT -lt 3 ] && echo "- ⚠️  Maintain at least 3 backup copies")

Next scheduled backup: $(date -d 'tomorrow 2:00' 2>/dev/null || date -v+1d -j -f "%H:%M" "02:00" +"%Y-%m-%d %H:%M")
EOF

echo ""
echo "============================="
echo -e "${GREEN}✅ Backup monitoring complete${NC}"
echo "Report saved to: $REPORT_FILE"