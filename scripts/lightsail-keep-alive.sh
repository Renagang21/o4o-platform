#!/bin/bash

# AWS Lightsail Keep-Alive & Health Monitor Script
# Prevents instance from becoming unresponsive due to idle timeout or resource issues

set -e

# Configuration
LOG_FILE="/var/log/lightsail-monitor.log"
HEALTH_CHECK_URL="http://localhost/health"
API_HEALTH_URL="http://localhost:4000/api/health"
ADMIN_HEALTH_URL="http://localhost:3001"
MAIN_SITE_URL="http://localhost:3000"
CHECK_INTERVAL=60  # seconds
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check system resources
check_system_resources() {
    # Check CPU burst capacity (for Lightsail)
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
    
    log_message "System Resources - CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%"
    
    # Warning if resources are high
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        log_message "⚠️ WARNING: High CPU usage detected: ${CPU_USAGE}%"
    fi
    
    if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
        log_message "⚠️ WARNING: High memory usage detected: ${MEMORY_USAGE}%"
        # Check swap space
        SWAP_INFO=$(free -h | grep Swap)
        if [[ "$SWAP_INFO" == *"0B"* ]]; then
            log_message "❌ CRITICAL: No swap space configured! This can cause system crashes."
        fi
    fi
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if curl -f -s -m 5 "$health_url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $service_name is healthy"
            return 0
        fi
        retry_count=$((retry_count + 1))
        sleep 2
    done
    
    log_message "❌ $service_name health check failed after $MAX_RETRIES attempts"
    return 1
}

# Function to restart nginx if needed
restart_nginx_if_needed() {
    if ! systemctl is-active --quiet nginx; then
        log_message "Nginx is not running. Attempting to restart..."
        sudo systemctl restart nginx
        sleep 5
        if systemctl is-active --quiet nginx; then
            log_message "✓ Nginx restarted successfully"
        else
            log_message "❌ Failed to restart nginx"
            return 1
        fi
    fi
}

# Function to restart PM2 apps if needed
restart_pm2_if_needed() {
    # Check if PM2 is running
    if ! pm2 status > /dev/null 2>&1; then
        log_message "PM2 is not responding. Attempting to restart..."
        pm2 resurrect
        sleep 5
    fi
    
    # Check API server
    if ! pm2 describe api-server > /dev/null 2>&1; then
        log_message "API server not found in PM2. Starting..."
        cd /home/ubuntu/o4o-platform/apps/api-server
        pm2 start ecosystem.config.js --only api-server
    fi
}

# Function to perform keep-alive requests
perform_keepalive() {
    # Send keep-alive requests to prevent idle timeout
    curl -s -o /dev/null "$MAIN_SITE_URL" &
    curl -s -o /dev/null "$ADMIN_HEALTH_URL" &
    curl -s -o /dev/null "$API_HEALTH_URL" &
    wait
}

# Function to check and create swap if needed
ensure_swap_exists() {
    SWAP_SIZE=$(free | grep Swap | awk '{print $2}')
    if [ "$SWAP_SIZE" -eq 0 ]; then
        log_message "Creating 2GB swap file..."
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        log_message "✓ Swap file created successfully"
    fi
}

# Main monitoring loop
main() {
    log_message "========================================="
    log_message "Starting Lightsail Keep-Alive Monitor"
    log_message "========================================="
    
    # Ensure swap exists (critical for Lightsail)
    ensure_swap_exists
    
    while true; do
        log_message "--- Health Check Started ---"
        
        # Check system resources
        check_system_resources
        
        # Check and restart services if needed
        restart_nginx_if_needed
        restart_pm2_if_needed
        
        # Perform health checks
        HEALTH_STATUS=0
        
        if ! check_service_health "Nginx" "$HEALTH_CHECK_URL"; then
            HEALTH_STATUS=1
        fi
        
        if ! check_service_health "API Server" "$API_HEALTH_URL"; then
            HEALTH_STATUS=1
        fi
        
        # Perform keep-alive requests
        perform_keepalive
        log_message "✓ Keep-alive requests sent"
        
        if [ $HEALTH_STATUS -eq 0 ]; then
            log_message "✓ All services healthy"
        else
            log_message "⚠️ Some services need attention"
        fi
        
        log_message "--- Health Check Complete ---"
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Handle script termination
trap 'log_message "Monitor stopped"; exit 0' SIGINT SIGTERM

# Run as daemon if requested
if [ "$1" == "--daemon" ]; then
    log_message "Starting in daemon mode..."
    nohup "$0" > /dev/null 2>&1 &
    echo $! > /var/run/lightsail-monitor.pid
    echo "Monitor started with PID: $!"
else
    main
fi