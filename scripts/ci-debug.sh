#!/bin/bash

# CI/CD Debugging and Setup Script
# Usage: ./ci-debug.sh [setup|validate|test]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ACTION=${1:-validate}

print_status() {
    echo -e "${GREEN}[CI/CD]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Setup CI environment
setup_ci() {
    print_status "Setting up CI/CD environment..."
    
    # Check Node.js version
    print_info "Node.js version: $(node --version)"
    print_info "npm version: $(npm --version)"
    
    # Setup SSH for deployment
    if [[ -n "$SSH_PRIVATE_KEY" ]]; then
        print_status "Setting up SSH key..."
        mkdir -p ~/.ssh
        echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa
        
        # Add known hosts
        ssh-keyscan -H 43.202.242.215 >> ~/.ssh/known_hosts 2>/dev/null
        ssh-keyscan -H 13.125.144.8 >> ~/.ssh/known_hosts 2>/dev/null
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install --legacy-peer-deps
    
    # Build packages
    print_status "Building packages..."
    npm run build:packages
    
    print_status "CI environment setup completed!"
}

# Validate deployment environment
validate_deploy() {
    print_status "Validating deployment environment..."
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "SSH_PRIVATE_KEY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    # Test SSH connections
    print_status "Testing SSH connections..."
    
    # Test API server connection
    if ssh -o BatchMode=yes -o ConnectTimeout=5 ubuntu@43.202.242.215 echo "API server SSH OK" 2>/dev/null; then
        print_status "✓ API server SSH connection successful"
    else
        print_error "✗ API server SSH connection failed"
    fi
    
    # Test web server connection
    if ssh -o BatchMode=yes -o ConnectTimeout=5 ubuntu@13.125.144.8 echo "Web server SSH OK" 2>/dev/null; then
        print_status "✓ Web server SSH connection successful"
    else
        print_error "✗ Web server SSH connection failed"
    fi
    
    # Check build artifacts
    print_status "Checking build artifacts..."
    
    if [[ -d "apps/api-server/dist" ]]; then
        print_status "✓ API server build exists"
    else
        print_warning "✗ API server build missing"
    fi
    
    if [[ -d "apps/main-site/dist" ]]; then
        print_status "✓ Main site build exists"
    else
        print_warning "✗ Main site build missing"
    fi
    
    if [[ -d "apps/admin-dashboard/dist" ]]; then
        print_status "✓ Admin dashboard build exists"
    else
        print_warning "✗ Admin dashboard build missing"
    fi
    
    print_status "Validation completed!"
}

# Test CI build
test_ci() {
    print_status "Testing CI/CD build process..."
    
    # Clean
    print_status "Cleaning previous builds..."
    rm -rf apps/*/dist packages/*/dist
    
    # Install
    print_status "Installing dependencies..."
    npm install --legacy-peer-deps
    
    # Build packages
    print_status "Building packages..."
    npm run build:packages
    
    # Run tests
    print_status "Running tests..."
    npm test || print_warning "Tests failed but continuing..."
    
    # Type check
    print_status "Running type checks..."
    npm run type-check || print_warning "Type check failed but continuing..."
    
    # Build applications
    print_status "Building applications..."
    npm run build:apps
    
    # Validate builds
    print_status "Validating build outputs..."
    local build_dirs=(
        "apps/api-server/dist"
        "apps/main-site/dist"
        "apps/admin-dashboard/dist"
    )
    
    local failed=0
    for dir in "${build_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            print_status "✓ $dir exists"
        else
            print_error "✗ $dir missing"
            failed=$((failed + 1))
        fi
    done
    
    if [[ $failed -eq 0 ]]; then
        print_status "All builds successful!"
    else
        print_error "$failed build(s) failed"
        exit 1
    fi
}

# Main execution
case "$ACTION" in
    setup)
        setup_ci
        ;;
    validate)
        validate_deploy
        ;;
    test)
        test_ci
        ;;
    *)
        print_error "Invalid action: $ACTION"
        echo "Usage: $0 [setup|validate|test]"
        exit 1
        ;;
esac