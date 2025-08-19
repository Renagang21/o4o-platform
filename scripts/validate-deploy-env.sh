#!/bin/bash

# API Server Deployment Environment Validation Script
# Validates that all required environment variables and configurations are present

set -e

echo "🔍 Validating deployment environment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation errors
ERRORS=0

# Function to check if environment variable exists
check_env_var() {
    local var_name=$1
    local is_secret=${2:-false}
    
    if [ -z "${!var_name}" ]; then
        echo -e "${RED}❌ Missing required environment variable: $var_name${NC}"
        ERRORS=$((ERRORS + 1))
    else
        if [ "$is_secret" = true ]; then
            echo -e "${GREEN}✓ $var_name is set (hidden)${NC}"
        else
            echo -e "${GREEN}✓ $var_name = ${!var_name}${NC}"
        fi
    fi
}

# Function to check if file exists
check_file() {
    local file_path=$1
    
    if [ ! -f "$file_path" ]; then
        echo -e "${YELLOW}⚠ Warning: File not found: $file_path${NC}"
    else
        echo -e "${GREEN}✓ File exists: $file_path${NC}"
    fi
}

echo ""
echo "📋 Checking required environment variables..."
echo "----------------------------------------"

# Core deployment variables
check_env_var "NODE_ENV"
check_env_var "SERVER_TYPE"

# SSH/Deployment credentials (if needed)
if [ -n "$SSH_HOST" ]; then
    check_env_var "SSH_HOST"
    check_env_var "SSH_USER"
    check_env_var "SSH_KEY" true
fi

# Database configuration
check_env_var "DB_HOST"
check_env_var "DB_PORT"
check_env_var "DB_USERNAME"
check_env_var "DB_PASSWORD" true
check_env_var "DB_NAME"

# JWT Secrets
check_env_var "JWT_SECRET" true

# JWT_REFRESH_SECRET - Optional, falls back to JWT_SECRET if not set
if [ -z "$JWT_REFRESH_SECRET" ]; then
    if [ -n "$JWT_SECRET" ]; then
        export JWT_REFRESH_SECRET="$JWT_SECRET"
        echo -e "${YELLOW}⚠ JWT_REFRESH_SECRET not set, using JWT_SECRET as fallback${NC}"
    else
        echo -e "${RED}❌ Missing required environment variable: JWT_REFRESH_SECRET (and JWT_SECRET is also missing)${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${GREEN}✓ JWT_REFRESH_SECRET is set (hidden)${NC}"
fi

# Port configuration
check_env_var "PORT"

echo ""
echo "📋 Checking project structure..."
echo "----------------------------------------"

# Check critical directories
if [ ! -d "apps/api-server" ]; then
    echo -e "${RED}❌ apps/api-server directory not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ apps/api-server directory exists${NC}"
fi

if [ ! -d "packages" ]; then
    echo -e "${RED}❌ packages directory not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ packages directory exists${NC}"
fi

# Check important configuration files
check_file "package.json"
check_file "tsconfig.json"
check_file "apps/api-server/package.json"
check_file "apps/api-server/tsconfig.json"

# Check PM2 configuration if deploying with PM2
if [ "$SERVER_TYPE" = "apiserver" ] || [ "$SERVER_TYPE" = "production" ]; then
    check_file "ecosystem.config.apiserver.cjs"
fi

echo ""
echo "📋 Checking Node.js environment..."
echo "----------------------------------------"

# Check Node version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"
    
    # Check if it's the expected version (22.x)
    if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
        echo -e "${YELLOW}⚠ Warning: Expected Node.js v22.x, got $NODE_VERSION${NC}"
    fi
else
    echo -e "${RED}❌ Node.js not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm version: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "----------------------------------------"

# Final validation result
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All validation checks passed!${NC}"
    echo "Ready for deployment."
    exit 0
else
    echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
    echo "Please fix the issues above before deploying."
    exit 1
fi