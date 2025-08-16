#!/bin/bash

# Smart build system that detects changes and builds only affected apps
# Can also force full build when needed

set -e

echo "🧠 Smart Build System - Building only what's changed"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if package needs rebuild
package_needs_rebuild() {
    local package_name=$1
    local package_path="packages/$package_name"
    
    # Check if dist folder exists
    if [ ! -d "$package_path/dist" ]; then
        return 0  # needs rebuild
    fi
    
    # Check if source files are newer than dist
    local newest_src=$(find "$package_path/src" -type f -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
    local newest_dist=$(find "$package_path/dist" -type f 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
    
    if [ -z "$newest_dist" ]; then
        return 0  # needs rebuild
    fi
    
    if [ -n "$newest_src" ] && [ "$newest_src" -nt "$newest_dist" ]; then
        return 0  # needs rebuild
    fi
    
    return 1  # no rebuild needed
}

# Function to detect changed files since last commit or between commits
detect_changes() {
    local base_ref=${1:-HEAD~1}
    local target_ref=${2:-HEAD}
    
    # Get list of changed files
    if [ "$base_ref" == "WORKING" ]; then
        # Check uncommitted changes
        git diff --name-only
        git diff --cached --name-only
    else
        # Check changes between commits
        git diff --name-only "$base_ref" "$target_ref"
    fi
}

# Function to determine which apps need building based on changes
determine_build_targets() {
    local changed_files="$1"
    local -a packages_to_build=()
    local -a apps_to_build=()
    
    # Check each changed file
    while IFS= read -r file; do
        if [[ "$file" == packages/* ]]; then
            # Package changed
            local package_name=$(echo "$file" | cut -d'/' -f2)
            if [[ ! " ${packages_to_build[@]} " =~ " ${package_name} " ]]; then
                packages_to_build+=("$package_name")
            fi
        elif [[ "$file" == apps/* ]]; then
            # App changed
            local app_name=$(echo "$file" | cut -d'/' -f2)
            if [[ ! " ${apps_to_build[@]} " =~ " ${app_name} " ]]; then
                apps_to_build+=("$app_name")
            fi
        fi
    done <<< "$changed_files"
    
    echo "PACKAGES:${packages_to_build[*]}"
    echo "APPS:${apps_to_build[*]}"
}

# Function to build specific packages
build_packages() {
    local packages="$1"
    
    if [ -z "$packages" ]; then
        print_info "No packages need rebuilding"
        return 0
    fi
    
    # Build order for packages (dependencies first)
    local build_order=("types" "utils" "ui" "auth-client" "auth-context" "crowdfunding-types" "forum-types" "shortcodes")
    
    for package in "${build_order[@]}"; do
        if [[ " $packages " =~ " $package " ]]; then
            print_info "Building package: $package"
            npm run build --workspace=@o4o/$package || {
                print_error "Failed to build $package"
                return 1
            }
            print_status "$package built successfully"
        fi
    done
}

# Function to build specific apps
build_apps() {
    local apps="$1"
    
    if [ -z "$apps" ]; then
        print_info "No apps need rebuilding"
        return 0
    fi
    
    for app in $apps; do
        print_info "Building app: $app"
        npm run build --workspace=@o4o/$app || {
            print_error "Failed to build $app"
            return 1
        }
        print_status "$app built successfully"
    done
}

# Main script
main() {
    local mode=${1:-auto}
    local base_ref=${2:-HEAD~1}
    
    echo ""
    
    case "$mode" in
        "auto")
            print_info "Auto mode: Detecting changes since last commit"
            
            # Detect changes
            local changed_files=$(detect_changes "$base_ref")
            
            if [ -z "$changed_files" ]; then
                print_status "No changes detected. Nothing to build."
                exit 0
            fi
            
            echo "Changed files:"
            echo "$changed_files" | sed 's/^/  - /'
            echo ""
            
            # Determine what needs building
            local build_info=$(determine_build_targets "$changed_files")
            local packages_to_build=$(echo "$build_info" | grep "^PACKAGES:" | cut -d':' -f2)
            local apps_to_build=$(echo "$build_info" | grep "^APPS:" | cut -d':' -f2)
            
            # Check if any package dependency affects all apps
            if [[ " $packages_to_build " =~ " types " ]] || [[ " $packages_to_build " =~ " utils " ]]; then
                print_warning "Core packages changed. Recommending full rebuild."
                echo "Continue with partial build? (y/n) [n]"
                read -r response
                if [ "$response" != "y" ]; then
                    print_info "Switching to full build..."
                    exec "$0" "full"
                fi
            fi
            
            # Build only what's needed
            if [ -n "$packages_to_build" ]; then
                echo "📦 Packages to build: $packages_to_build"
                build_packages "$packages_to_build"
            fi
            
            if [ -n "$apps_to_build" ]; then
                echo "🚀 Apps to build: $apps_to_build"
                build_apps "$apps_to_build"
            fi
            ;;
            
        "sync")
            print_info "Sync mode: Building based on recent pull"
            
            # Get the commit before pull
            local before_pull=$(git reflog | grep "pull" | head -1 | awk '{print $1}')
            
            if [ -z "$before_pull" ]; then
                print_warning "No recent pull found. Using last commit."
                before_pull="HEAD~1"
            fi
            
            # Run auto mode with the before-pull commit
            exec "$0" "auto" "$before_pull"
            ;;
            
        "full")
            print_info "Full build mode: Building everything"
            
            # Build all packages
            echo "📦 Building all packages..."
            npm run build:packages || {
                print_error "Package build failed"
                exit 1
            }
            
            # Build all apps
            echo "🚀 Building all apps..."
            npm run build:apps || {
                print_error "App build failed"
                exit 1
            }
            
            print_status "Full build completed successfully!"
            ;;
            
        "check")
            print_info "Check mode: Showing what would be built"
            
            # Detect changes
            local changed_files=$(detect_changes "$base_ref")
            
            if [ -z "$changed_files" ]; then
                print_status "No changes detected."
                exit 0
            fi
            
            echo "Changed files:"
            echo "$changed_files" | sed 's/^/  - /'
            echo ""
            
            # Determine what needs building
            local build_info=$(determine_build_targets "$changed_files")
            local packages_to_build=$(echo "$build_info" | grep "^PACKAGES:" | cut -d':' -f2)
            local apps_to_build=$(echo "$build_info" | grep "^APPS:" | cut -d':' -f2)
            
            echo "Would build:"
            [ -n "$packages_to_build" ] && echo "  Packages: $packages_to_build"
            [ -n "$apps_to_build" ] && echo "  Apps: $apps_to_build"
            ;;
            
        "clean")
            print_info "Clean build mode: Removing all dist folders and rebuilding"
            
            # Clean all dist folders
            rm -rf apps/*/dist packages/*/dist
            print_status "Cleaned all dist folders"
            
            # Run full build
            exec "$0" "full"
            ;;
            
        *)
            echo "Usage: $0 [mode] [base_ref]"
            echo ""
            echo "Modes:"
            echo "  auto    - Detect changes and build only affected parts (default)"
            echo "  sync    - Build changes from last git pull"
            echo "  full    - Build everything"
            echo "  check   - Show what would be built without building"
            echo "  clean   - Clean all dist folders and rebuild everything"
            echo ""
            echo "Examples:"
            echo "  $0              # Auto-detect and build changes since last commit"
            echo "  $0 auto HEAD~3  # Build changes from last 3 commits"
            echo "  $0 sync         # Build changes from last git pull"
            echo "  $0 full         # Force full build"
            echo "  $0 check        # Preview what would be built"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

print_status "Smart build completed!"
echo ""
echo "📊 Build summary:"
echo "  Mode: $1"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"