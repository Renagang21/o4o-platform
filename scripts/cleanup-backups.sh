#!/bin/bash
# Backup cleanup script for deployment
# Keeps only the most recent 5 backups for each site

BACKUP_DIRS="/var/www"
MAX_BACKUPS=5

echo "🧹 Starting backup cleanup..."

# Function to clean backups for a specific pattern
cleanup_backups() {
    local pattern=$1
    local count=$(ls -dt ${BACKUP_DIRS}/${pattern}.backup.* 2>/dev/null | wc -l)
    
    if [ $count -gt $MAX_BACKUPS ]; then
        echo "📁 Found $count backups for $pattern"
        local to_delete=$(($count - $MAX_BACKUPS))
        echo "🗑️  Deleting $to_delete old backups..."
        
        ls -dt ${BACKUP_DIRS}/${pattern}.backup.* 2>/dev/null | \
            tail -n +$((MAX_BACKUPS + 1)) | \
            xargs -r sudo rm -rf
        
        echo "✅ Cleaned up $pattern backups"
    else
        echo "✅ $pattern has $count backups (no cleanup needed)"
    fi
}

# Clean backups for each site
cleanup_backups "neture.co.kr"
cleanup_backups "admin.neture.co.kr"
cleanup_backups "api.neture.co.kr"

# Show remaining backups
echo ""
echo "📊 Remaining backups:"
ls -lht ${BACKUP_DIRS}/*.backup.* 2>/dev/null | head -15 || echo "No backups found"

echo ""
echo "✨ Backup cleanup completed!"