#!/bin/bash

# SSH Key Format Validation Script
# Purpose: Validate SSH key formats for GitHub Actions
# Created: 2025-08-18

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Validating SSH Key Formats..."

# Function to validate SSH key format
validate_ssh_key() {
    local key_name="$1"
    local key_content="$2"
    
    echo "Checking ${key_name} format..."
    
    # Check if key is empty
    if [ -z "$key_content" ]; then
        echo -e "${RED}❌ ${key_name} is empty or not set${NC}"
        return 1
    fi
    
    # Check for proper SSH key format
    if echo "$key_content" | grep -q "^-----BEGIN.*PRIVATE KEY-----"; then
        echo -e "${GREEN}✅ ${key_name} has valid private key header${NC}"
        
        # Check for proper ending
        if echo "$key_content" | grep -q "-----END.*PRIVATE KEY-----$"; then
            echo -e "${GREEN}✅ ${key_name} has valid private key footer${NC}"
        else
            echo -e "${RED}❌ ${key_name} is missing proper private key footer${NC}"
            return 1
        fi
        
        # Count lines to ensure it's not truncated
        local line_count=$(echo "$key_content" | wc -l)
        echo "  Key has ${line_count} lines"
        
        if [ "$line_count" -lt 10 ]; then
            echo -e "${YELLOW}⚠️  ${key_name} seems too short (${line_count} lines)${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ ${key_name} does not have valid SSH private key format${NC}"
        echo "  Expected format: -----BEGIN [RSA/OPENSSH] PRIVATE KEY-----"
        return 1
    fi
}

# Main validation
main() {
    local has_error=false
    
    # Validate API_SSH_KEY
    if [ ! -z "${API_SSH_KEY}" ]; then
        if ! validate_ssh_key "API_SSH_KEY" "${API_SSH_KEY}"; then
            has_error=true
        fi
    else
        echo -e "${YELLOW}⚠️  API_SSH_KEY environment variable not found${NC}"
    fi
    
    # Validate WEB_SSH_KEY if exists
    if [ ! -z "${WEB_SSH_KEY}" ]; then
        if ! validate_ssh_key "WEB_SSH_KEY" "${WEB_SSH_KEY}"; then
            has_error=true
        fi
    else
        echo -e "${YELLOW}⚠️  WEB_SSH_KEY environment variable not found${NC}"
    fi
    
    echo ""
    if [ "$has_error" = true ]; then
        echo -e "${RED}❌ SSH Key validation failed${NC}"
        echo ""
        echo "Troubleshooting tips:"
        echo "1. Ensure the SSH key is properly formatted with Unix line endings (LF, not CRLF)"
        echo "2. Check that the entire key is included (header, content, and footer)"
        echo "3. Verify the key was correctly added to GitHub Secrets"
        echo "4. For RSA keys: starts with '-----BEGIN RSA PRIVATE KEY-----'"
        echo "5. For OpenSSH keys: starts with '-----BEGIN OPENSSH PRIVATE KEY-----'"
        exit 1
    else
        echo -e "${GREEN}✅ All SSH keys validated successfully${NC}"
        exit 0
    fi
}

# Run validation
main "$@"