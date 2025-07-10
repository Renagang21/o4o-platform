#!/bin/bash

# Memory Cleanup Script for Auto-Recovery
# This script performs various memory cleanup operations

echo "🧹 Starting memory cleanup process..."

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if running as root (some operations require it)
if [[ $EUID -eq 0 ]]; then
    SUDO=""
    log "Running as root"
else
    SUDO="sudo"
    log "Running as regular user (will use sudo where needed)"
fi

# Clean package manager caches
log "Cleaning package manager caches..."
if command -v apt &> /dev/null; then
    $SUDO apt-get clean 2>/dev/null || true
    $SUDO apt-get autoclean 2>/dev/null || true
fi

if command -v yum &> /dev/null; then
    $SUDO yum clean all 2>/dev/null || true
fi

# Clean system caches
log "Cleaning system caches..."
if [ -d "/var/cache" ]; then
    $SUDO find /var/cache -type f -name "*.cache" -mtime +7 -delete 2>/dev/null || true
fi

# Clear thumbnail caches
log "Clearing thumbnail caches..."
if [ -d "$HOME/.cache/thumbnails" ]; then
    rm -rf "$HOME/.cache/thumbnails"/* 2>/dev/null || true
fi

# Clear browser caches (common locations)
log "Clearing browser caches..."
if [ -d "$HOME/.cache/google-chrome" ]; then
    rm -rf "$HOME/.cache/google-chrome"/* 2>/dev/null || true
fi

if [ -d "$HOME/.cache/mozilla" ]; then
    rm -rf "$HOME/.cache/mozilla"/* 2>/dev/null || true
fi

# Clear temporary files
log "Clearing temporary files..."
find /tmp -type f -atime +7 -delete 2>/dev/null || true
find /var/tmp -type f -atime +7 -delete 2>/dev/null || true

# Clear old log files
log "Clearing old log files..."
find /var/log -type f -name "*.log" -mtime +30 -delete 2>/dev/null || true
find /var/log -type f -name "*.log.*.gz" -mtime +30 -delete 2>/dev/null || true

# Clear user cache directories
log "Clearing user cache directories..."
if [ -d "$HOME/.cache" ]; then
    find "$HOME/.cache" -type f -atime +7 -delete 2>/dev/null || true
fi

# Clear Node.js related caches
log "Clearing Node.js caches..."
if command -v npm &> /dev/null; then
    npm cache clean --force 2>/dev/null || true
fi

if command -v yarn &> /dev/null; then
    yarn cache clean 2>/dev/null || true
fi

# Clear Docker caches if available
log "Clearing Docker caches..."
if command -v docker &> /dev/null; then
    docker system prune -f 2>/dev/null || true
fi

# Force garbage collection for current process
log "Triggering garbage collection..."
if command -v node &> /dev/null; then
    node -e "if (global.gc) { global.gc(); console.log('Garbage collection triggered'); }" 2>/dev/null || true
fi

# Clear memory caches (requires root)
log "Clearing memory caches..."
if [[ $EUID -eq 0 ]]; then
    sync
    echo 1 > /proc/sys/vm/drop_caches 2>/dev/null || true
    echo 2 > /proc/sys/vm/drop_caches 2>/dev/null || true
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    log "Memory caches cleared (drop_caches)"
else
    log "Skipping memory cache clearing (requires root)"
fi

# Report memory usage
log "Checking memory usage after cleanup..."
if command -v free &> /dev/null; then
    free -h
fi

# Calculate memory usage percentage
if [ -f /proc/meminfo ]; then
    TOTAL_MEM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    FREE_MEM=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    USED_MEM=$((TOTAL_MEM - FREE_MEM))
    USAGE_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))
    
    log "Memory usage: ${USAGE_PERCENT}% (${USED_MEM}KB used of ${TOTAL_MEM}KB total)"
    
    # Return success if memory usage is below 80%
    if [ $USAGE_PERCENT -lt 80 ]; then
        log "✅ Memory cleanup successful - usage below 80%"
        exit 0
    elif [ $USAGE_PERCENT -lt 90 ]; then
        log "⚠️ Memory cleanup partial - usage still elevated but improved"
        exit 0
    else
        log "❌ Memory cleanup insufficient - usage still critical"
        exit 1
    fi
else
    log "✅ Memory cleanup completed"
    exit 0
fi