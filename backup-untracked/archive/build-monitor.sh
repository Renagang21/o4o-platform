#!/bin/bash

# Build monitoring script that shows progress and prevents hanging
# Runs builds with real-time monitoring and automatic recovery

set -e

echo "🔍 Build Monitor - Safe build with progress tracking"

# Check if required tools are installed
if ! command -v pv &> /dev/null; then
    echo "Installing pv for progress monitoring..."
    sudo apt-get update && sudo apt-get install -y pv 2>/dev/null || echo "pv not available, continuing without progress bars"
fi

# Function to monitor build with spinner
build_with_monitor() {
    local cmd=$1
    local name=$2
    local pid
    local spin='-\|/'
    local i=0
    
    echo -n "Building $name "
    
    # Start build in background
    $cmd > /tmp/build_${name}.log 2>&1 &
    pid=$!
    
    # Monitor build with spinner
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) %4 ))
        printf "\r Building $name ${spin:$i:1}"
        sleep 0.5
        
        # Check if build is hanging (no log activity for 60 seconds)
        if [ -f /tmp/build_${name}.log ]; then
            if [ "$(($(date +%s) - $(stat -c %Y /tmp/build_${name}.log)))" -gt 60 ]; then
                echo ""
                echo "⚠️  Build appears to be hanging. Killing process..."
                kill -9 $pid 2>/dev/null || true
                return 1
            fi
        fi
    done
    
    # Check exit status
    wait $pid
    local status=$?
    
    if [ $status -eq 0 ]; then
        printf "\r✅ $name built successfully\n"
    else
        printf "\r❌ $name build failed\n"
        echo "Last 10 lines of log:"
        tail -10 /tmp/build_${name}.log
    fi
    
    return $status
}

# Memory monitoring in background
monitor_memory() {
    while true; do
        sleep 10
        mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
        if [ $mem_usage -gt 90 ]; then
            echo "⚠️  Memory usage critical: ${mem_usage}%"
            echo "Consider stopping other applications or using build-safe.sh instead"
        fi
    done
}

# Start memory monitor in background
monitor_memory &
MONITOR_PID=$!

# Cleanup function
cleanup() {
    kill $MONITOR_PID 2>/dev/null || true
    rm -f /tmp/build_*.log
}

trap cleanup EXIT

# Main build process
echo "Starting monitored build process..."
echo "Memory before build:"
free -h
echo ""

# Build packages
packages=(
    "types"
    "utils"
    "ui"
    "auth-client"
    "auth-context"
    "crowdfunding-types"
    "forum-types"
    "shortcodes"
)

echo "📦 Building packages..."
for pkg in "${packages[@]}"; do
    build_with_monitor "pnpm run build --workspace=@o4o/$pkg" "$pkg" || {
        echo "Failed to build $pkg. Continue? (y/n)"
        read -r response
        if [ "$response" != "y" ]; then
            exit 1
        fi
    }
done

# Build applications if requested
if [ "$1" == "full" ]; then
    echo ""
    echo "🚀 Building applications..."
    
    apps=(
        "api-server"
        "main-site"
        "admin-dashboard"
        "ecommerce"
    )
    
    for app in "${apps[@]}"; do
        # Increase memory for app builds
        export NODE_OPTIONS="--max-old-space-size=3072"
        build_with_monitor "pnpm run build --workspace=@o4o/$app" "$app" || {
            echo "Failed to build $app. Continue? (y/n)"
            read -r response
            if [ "$response" != "y" ]; then
                exit 1
            fi
        }
        unset NODE_OPTIONS
    done
fi

echo ""
echo "✅ Build monitoring complete"
echo "Memory after build:"
free -h