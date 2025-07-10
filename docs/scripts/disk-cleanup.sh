#!/bin/bash

# Disk Cleanup Script for Auto-Recovery
# This script performs disk space cleanup operations

echo "💾 Starting disk cleanup process..."

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to get disk usage percentage
get_disk_usage() {
    df / | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Check initial disk usage
INITIAL_USAGE=$(get_disk_usage)
log "Initial disk usage: ${INITIAL_USAGE}%"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    SUDO=""
    log "Running as root"
else
    SUDO="sudo"
    log "Running as regular user (will use sudo where needed)"
fi

# Clean temporary files
log "Cleaning temporary files..."
find /tmp -type f -atime +1 -delete 2>/dev/null || true
find /var/tmp -type f -atime +1 -delete 2>/dev/null || true

# Clean old log files
log "Cleaning old log files..."
find /var/log -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
find /var/log -type f -name "*.log.*.gz" -mtime +7 -delete 2>/dev/null || true
find /var/log -type f -name "*.log.[0-9]*" -mtime +7 -delete 2>/dev/null || true

# Clean journal logs if systemd is available
if command -v journalctl &> /dev/null; then
    log "Cleaning systemd journal logs..."
    $SUDO journalctl --vacuum-time=7d 2>/dev/null || true
    $SUDO journalctl --vacuum-size=100M 2>/dev/null || true
fi

# Clean package manager caches
log "Cleaning package manager caches..."
if command -v apt &> /dev/null; then
    $SUDO apt-get clean 2>/dev/null || true
    $SUDO apt-get autoclean 2>/dev/null || true
    $SUDO apt-get autoremove -y 2>/dev/null || true
fi

if command -v yum &> /dev/null; then
    $SUDO yum clean all 2>/dev/null || true
fi

if command -v dnf &> /dev/null; then
    $SUDO dnf clean all 2>/dev/null || true
fi

# Clean user caches
log "Cleaning user caches..."
if [ -d "$HOME/.cache" ]; then
    find "$HOME/.cache" -type f -atime +7 -delete 2>/dev/null || true
fi

# Clean browser caches
log "Cleaning browser caches..."
if [ -d "$HOME/.cache/google-chrome" ]; then
    find "$HOME/.cache/google-chrome" -type f -atime +3 -delete 2>/dev/null || true
fi

if [ -d "$HOME/.cache/mozilla" ]; then
    find "$HOME/.cache/mozilla" -type f -atime +3 -delete 2>/dev/null || true
fi

# Clean thumbnail caches
if [ -d "$HOME/.cache/thumbnails" ]; then
    log "Cleaning thumbnail caches..."
    find "$HOME/.cache/thumbnails" -type f -atime +7 -delete 2>/dev/null || true
fi

# Clean Node.js related files
log "Cleaning Node.js related files..."
if command -v npm &> /dev/null; then
    npm cache clean --force 2>/dev/null || true
fi

if command -v yarn &> /dev/null; then
    yarn cache clean 2>/dev/null || true
fi

# Clean project-specific temporary files
if [ -d "./node_modules/.cache" ]; then
    log "Cleaning project cache..."
    rm -rf ./node_modules/.cache/* 2>/dev/null || true
fi

if [ -d "./logs" ]; then
    log "Cleaning project logs..."
    find ./logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
fi

if [ -d "./temp" ]; then
    log "Cleaning project temp files..."
    find ./temp -type f -atime +1 -delete 2>/dev/null || true
fi

# Clean backup files
log "Cleaning backup files..."
find / -name "*.bak" -type f -atime +30 -delete 2>/dev/null || true
find / -name "*.backup" -type f -atime +30 -delete 2>/dev/null || true
find / -name "*~" -type f -atime +7 -delete 2>/dev/null || true

# Clean core dumps
log "Cleaning core dumps..."
find / -name "core" -type f -atime +7 -delete 2>/dev/null || true
find / -name "core.*" -type f -atime +7 -delete 2>/dev/null || true

# Clean crash dumps
if [ -d "/var/crash" ]; then
    log "Cleaning crash dumps..."
    $SUDO find /var/crash -type f -atime +7 -delete 2>/dev/null || true
fi

# Clean Docker if available
if command -v docker &> /dev/null; then
    log "Cleaning Docker resources..."
    docker system prune -f 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    docker container prune -f 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
fi

# Clean snap packages if available
if command -v snap &> /dev/null; then
    log "Cleaning snap caches..."
    $SUDO snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
        $SUDO snap remove "$snapname" --revision="$revision" 2>/dev/null || true
    done
fi

# Empty trash
if [ -d "$HOME/.local/share/Trash" ]; then
    log "Emptying trash..."
    rm -rf "$HOME/.local/share/Trash"/* 2>/dev/null || true
fi

# Check final disk usage
FINAL_USAGE=$(get_disk_usage)
SAVED_SPACE=$((INITIAL_USAGE - FINAL_USAGE))

log "Disk cleanup completed"
log "Initial usage: ${INITIAL_USAGE}%"
log "Final usage: ${FINAL_USAGE}%"
log "Space saved: ${SAVED_SPACE}%"

# Display disk usage
df -h /

# Return appropriate exit code based on final usage
if [ "$FINAL_USAGE" -lt 85 ]; then
    log "✅ Disk cleanup successful - usage below 85%"
    exit 0
elif [ "$FINAL_USAGE" -lt 95 ]; then
    log "⚠️ Disk cleanup partial - usage still elevated but improved"
    exit 0
else
    log "❌ Disk cleanup insufficient - usage still critical"
    exit 1
fi