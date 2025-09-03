#!/bin/bash

# Safe build script that prevents hanging and memory issues
# Builds packages and apps sequentially with memory optimization

set -e

echo "🔨 Starting safe build process..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Memory optimization
export NODE_OPTIONS="--max-old-space-size=2048"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to build with timeout and retry
build_with_retry() {
    local workspace=$1
    local name=$2
    local max_attempts=2
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Building $name (attempt $attempt/$max_attempts)..."
        
        # Use timeout to prevent hanging (5 minutes max per build)
        if timeout 300 pnpm run build --workspace=$workspace 2>&1; then
            print_status "$name built successfully"
            return 0
        else
            print_warning "$name build failed on attempt $attempt"
            
            # Clear Node.js cache between attempts
            rm -rf node_modules/.cache 2>/dev/null || true
            
            # Small delay before retry
            sleep 2
            
            attempt=$((attempt + 1))
        fi
    done
    
    print_error "Failed to build $name after $max_attempts attempts"
    return 1
}

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
find . -type d -name "dist" -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
print_status "Previous builds cleaned"

# Step 2: Build packages sequentially (required order)
echo ""
echo "📦 Building packages..."

packages=(
    "@o4o/types:types"
    "@o4o/utils:utils"
    "@o4o/ui:ui"
    "@o4o/auth-client:auth-client"
    "@o4o/auth-context:auth-context"
    "@o4o/crowdfunding-types:crowdfunding-types"
    "@o4o/forum-types:forum-types"
    "@o4o/shortcodes:shortcodes"
)

for package in "${packages[@]}"; do
    IFS=':' read -r workspace name <<< "$package"
    build_with_retry "$workspace" "$name" || {
        print_error "Package build failed. Stopping."
        exit 1
    }
done

print_status "All packages built successfully"

# Step 3: Build applications sequentially
echo ""
echo "🚀 Building applications..."

# Ask user which apps to build
if [ "$1" == "all" ]; then
    apps=(
        "@o4o/api-server:API Server"
        "@o4o/main-site:Main Site"
        "@o4o/admin-dashboard:Admin Dashboard"
        "@o4o/ecommerce:E-commerce"
    )
elif [ "$1" == "web" ]; then
    apps=(
        "@o4o/main-site:Main Site"
        "@o4o/admin-dashboard:Admin Dashboard"
        "@o4o/ecommerce:E-commerce"
    )
elif [ "$1" == "api" ]; then
    apps=(
        "@o4o/api-server:API Server"
    )
else
    echo "Usage: ./scripts/build-safe.sh [all|web|api]"
    echo "  all - Build all applications"
    echo "  web - Build only web applications"
    echo "  api - Build only API server"
    exit 1
fi

failed_apps=()

for app in "${apps[@]}"; do
    IFS=':' read -r workspace name <<< "$app"
    
    # Give each app build more memory
    export NODE_OPTIONS="--max-old-space-size=3072"
    
    if build_with_retry "$workspace" "$name"; then
        # Reduce memory after successful build
        export NODE_OPTIONS="--max-old-space-size=2048"
    else
        failed_apps+=("$name")
        # Continue with other apps even if one fails
    fi
done

# Step 4: Summary
echo ""
echo "═══════════════════════════════════════"
echo "            BUILD SUMMARY              "
echo "═══════════════════════════════════════"

if [ ${#failed_apps[@]} -eq 0 ]; then
    print_status "All builds completed successfully! 🎉"
else
    print_warning "Some builds failed:"
    for app in "${failed_apps[@]}"; do
        echo "  ❌ $app"
    done
    echo ""
    echo "To retry failed builds individually:"
    echo "  pnpm run build --workspace=@o4o/[app-name]"
fi

echo ""
echo "Memory usage:"
free -h

# Cleanup
unset NODE_OPTIONS