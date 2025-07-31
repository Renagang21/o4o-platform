#!/bin/bash

# O4O Platform Health Check Script
# This script checks the health of all services

set -e

echo "🏥 O4O Platform Health Check"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3001}"

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    local endpoint=$3
    
    printf "Checking %-20s" "$name..."
    
    if curl -s -f -o /dev/null "$url$endpoint"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check database
check_database() {
    printf "Checking %-20s" "Database..."
    
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    printf "Checking %-20s" "Redis..."
    
    if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    printf "Checking %-20s" "Disk Space..."
    
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}✓ OK ($usage% used)${NC}"
        return 0
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠ WARNING ($usage% used)${NC}"
        return 0
    else
        echo -e "${RED}✗ CRITICAL ($usage% used)${NC}"
        return 1
    fi
}

# Function to check memory
check_memory() {
    printf "Checking %-20s" "Memory..."
    
    local total=$(free -m | awk 'NR==2{print $2}')
    local used=$(free -m | awk 'NR==2{print $3}')
    local usage=$((used * 100 / total))
    
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}✓ OK ($usage% used)${NC}"
        return 0
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠ WARNING ($usage% used)${NC}"
        return 0
    else
        echo -e "${RED}✗ CRITICAL ($usage% used)${NC}"
        return 1
    fi
}

# Run checks
echo "🔍 Service Health Checks"
echo "------------------------"
check_service "API Server" "$API_URL" "/api/health"
check_service "Main Website" "$WEB_URL" "/"
check_service "Admin Dashboard" "$ADMIN_URL" "/"

echo ""
echo "💾 Infrastructure Checks"
echo "------------------------"
check_database
check_redis
check_disk_space
check_memory

echo ""

# Check PM2 processes
echo "📊 PM2 Process Status"
echo "------------------------"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 not installed"
fi

echo ""
echo "============================="

# Summary
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational${NC}"
    exit 0
else
    echo -e "${RED}❌ Some systems need attention${NC}"
    exit 1
fi