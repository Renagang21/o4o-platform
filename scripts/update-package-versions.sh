#!/bin/bash

# O4O Platform Package Version Update Script
# Updates all package.json files to align with the package inventory

set -e

echo "🔄 Updating package versions across O4O Platform..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Root directory
ROOT_DIR="/home/user/o4o-platform"
cd "$ROOT_DIR"

echo -e "${YELLOW}📦 Updating package.json files...${NC}"

# Function to update package.json using jq
update_package_json() {
    local file=$1
    local package=$2
    local version=$3
    local type=$4  # dependencies or devDependencies
    
    if [ -f "$file" ]; then
        # Check if package exists in the file
        if grep -q "\"$package\":" "$file"; then
            # Update the version
            jq ".$type.\"$package\" = \"$version\"" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            echo -e "${GREEN}✓ Updated $package to $version in $file${NC}"
        fi
    fi
}

# Update engines in all package.json files
update_engines() {
    local file=$1
    if [ -f "$file" ]; then
        jq '.engines.node = ">=22.18.0" | .engines.pnpm = ">=10.15.1" | del(.engines.npm)' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        echo -e "${GREEN}✓ Updated engines in $file${NC}"
    fi
}

echo -e "${YELLOW}1. Updating root package.json...${NC}"
update_engines "package.json"

echo -e "${YELLOW}2. Updating API Server packages...${NC}"
API_PKG="apps/api-server/package.json"
update_engines "$API_PKG"

# API Server production dependencies
update_package_json "$API_PKG" "bcryptjs" "2.4.3" "dependencies"
update_package_json "$API_PKG" "jsonwebtoken" "9.0.2" "dependencies"
update_package_json "$API_PKG" "multer" "2.0.2" "dependencies"
update_package_json "$API_PKG" "node-cron" "4.3.3" "dependencies"
update_package_json "$API_PKG" "nodemailer" "7.0.5" "dependencies"
update_package_json "$API_PKG" "sharp" "0.34.3" "dependencies"
update_package_json "$API_PKG" "uuid" "9.0.1" "dependencies"
update_package_json "$API_PKG" "reflect-metadata" "^0.1.14" "dependencies"

echo -e "${YELLOW}3. Updating Admin Dashboard packages...${NC}"
ADMIN_PKG="apps/admin-dashboard/package.json"
update_engines "$ADMIN_PKG"

# Admin Dashboard dependencies
update_package_json "$ADMIN_PKG" "uuid" "9.0.1" "dependencies"
update_package_json "$ADMIN_PKG" "react" "18.3.1" "dependencies"
update_package_json "$ADMIN_PKG" "react-dom" "18.3.1" "dependencies"

echo -e "${YELLOW}4. Updating Main Site packages...${NC}"
MAIN_PKG="apps/main-site/package.json"
update_engines "$MAIN_PKG"

echo -e "${YELLOW}5. Updating other app packages...${NC}"
for app_dir in apps/*/; do
    if [ -d "$app_dir" ] && [ -f "$app_dir/package.json" ]; then
        app_name=$(basename "$app_dir")
        if [[ "$app_name" != "api-server" && "$app_name" != "admin-dashboard" && "$app_name" != "main-site" ]]; then
            echo -e "${YELLOW}   Updating $app_name...${NC}"
            update_engines "$app_dir/package.json"
        fi
    fi
done

echo -e "${YELLOW}6. Updating workspace packages...${NC}"
for pkg_dir in packages/*/; do
    if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/package.json" ]; then
        pkg_name=$(basename "$pkg_dir")
        echo -e "${YELLOW}   Updating $pkg_name...${NC}"
        update_engines "$pkg_dir/package.json"
    fi
done

echo -e "${GREEN}✅ Package version updates complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'pnpm install' to update lock file"
echo "2. Run 'pnpm run type-check' to verify TypeScript"
echo "3. Run 'pnpm run test' to verify tests"
echo "4. Commit the changes"

# Create a summary of changes
echo ""
echo -e "${YELLOW}📋 Summary of changes:${NC}"
echo "- Updated Node.js engine to >=22.18.0"
echo "- Updated pnpm engine to >=10.15.1"
echo "- Removed npm engine references"
echo "- Aligned package versions with inventory"
echo ""

exit 0