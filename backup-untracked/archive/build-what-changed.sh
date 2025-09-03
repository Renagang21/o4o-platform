#!/bin/bash

# Simplified smart build - builds only what changed
# Perfect for after git pull or when you modified specific services

set -e

echo "🎯 Building only what changed..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get changed files
if [ "$1" == "pull" ]; then
    # After git pull - check what changed in the pull
    BEFORE=$(git reflog | grep "pull" | head -1 | awk '{print $1}' | cut -d':' -f1)
    if [ -z "$BEFORE" ]; then
        echo "No recent pull found"
        exit 1
    fi
    CHANGED=$(git diff --name-only ${BEFORE}^ ${BEFORE})
else
    # Check uncommitted changes and staged changes
    CHANGED=$(cat <(git diff --name-only) <(git diff --cached --name-only) | sort -u)
fi

if [ -z "$CHANGED" ]; then
    echo -e "${GREEN}✅ No changes detected${NC}"
    exit 0
fi

echo "Found changes in:"
echo "$CHANGED" | sed 's/^/  - /'
echo ""

# Determine what to build
PACKAGES_TO_BUILD=""
APPS_TO_BUILD=""

# Check packages
if echo "$CHANGED" | grep -q "^packages/types/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD types"; fi
if echo "$CHANGED" | grep -q "^packages/utils/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD utils"; fi
if echo "$CHANGED" | grep -q "^packages/ui/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD ui"; fi
if echo "$CHANGED" | grep -q "^packages/auth-client/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD auth-client"; fi
if echo "$CHANGED" | grep -q "^packages/auth-context/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD auth-context"; fi
if echo "$CHANGED" | grep -q "^packages/crowdfunding-types/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD crowdfunding-types"; fi
if echo "$CHANGED" | grep -q "^packages/forum-types/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD forum-types"; fi
if echo "$CHANGED" | grep -q "^packages/shortcodes/"; then PACKAGES_TO_BUILD="$PACKAGES_TO_BUILD shortcodes"; fi

# Check apps
if echo "$CHANGED" | grep -q "^apps/api-server/"; then APPS_TO_BUILD="$APPS_TO_BUILD api-server"; fi
if echo "$CHANGED" | grep -q "^apps/main-site/"; then APPS_TO_BUILD="$APPS_TO_BUILD main-site"; fi
if echo "$CHANGED" | grep -q "^apps/admin-dashboard/"; then APPS_TO_BUILD="$APPS_TO_BUILD admin-dashboard"; fi
if echo "$CHANGED" | grep -q "^apps/ecommerce/"; then APPS_TO_BUILD="$APPS_TO_BUILD ecommerce"; fi
if echo "$CHANGED" | grep -q "^apps/crowdfunding/"; then APPS_TO_BUILD="$APPS_TO_BUILD crowdfunding"; fi
if echo "$CHANGED" | grep -q "^apps/forum/"; then APPS_TO_BUILD="$APPS_TO_BUILD forum"; fi
if echo "$CHANGED" | grep -q "^apps/digital-signage/"; then APPS_TO_BUILD="$APPS_TO_BUILD digital-signage"; fi

# If core packages changed, need to rebuild all apps
if [[ "$PACKAGES_TO_BUILD" == *"types"* ]] || [[ "$PACKAGES_TO_BUILD" == *"utils"* ]]; then
    echo -e "${YELLOW}⚠️  Core packages changed. Need to rebuild all apps.${NC}"
    APPS_TO_BUILD="api-server main-site admin-dashboard ecommerce"
fi

# Build packages first (in order)
if [ -n "$PACKAGES_TO_BUILD" ]; then
    echo -e "${BLUE}📦 Building packages: $PACKAGES_TO_BUILD${NC}"
    
    # Build in dependency order
    for pkg in types utils ui auth-client auth-context crowdfunding-types forum-types shortcodes; do
        if [[ " $PACKAGES_TO_BUILD " =~ " $pkg " ]]; then
            echo "  Building $pkg..."
            pnpm run build --workspace=@o4o/$pkg
            echo -e "${GREEN}  ✅ $pkg built${NC}"
        fi
    done
fi

# Build apps
if [ -n "$APPS_TO_BUILD" ]; then
    echo -e "${BLUE}🚀 Building apps: $APPS_TO_BUILD${NC}"
    
    for app in $APPS_TO_BUILD; do
        echo "  Building $app..."
        pnpm run build --workspace=@o4o/$app
        echo -e "${GREEN}  ✅ $app built${NC}"
    done
fi

if [ -z "$PACKAGES_TO_BUILD" ] && [ -z "$APPS_TO_BUILD" ]; then
    echo -e "${GREEN}✅ No TypeScript/React files changed. No build needed.${NC}"
else
    echo ""
    echo -e "${GREEN}✅ Build complete!${NC}"
    [ -n "$PACKAGES_TO_BUILD" ] && echo "  Built packages: $PACKAGES_TO_BUILD"
    [ -n "$APPS_TO_BUILD" ] && echo "  Built apps: $APPS_TO_BUILD"
fi