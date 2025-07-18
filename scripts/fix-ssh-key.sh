#!/bin/bash

# SSH Key Fix Script - Converts keys to GitHub Actions compatible format

set -e

echo "🔧 SSH Key Fix Script for GitHub Actions"
echo "========================================"

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_ssh_key>"
    echo "Example: $0 ~/.ssh/id_rsa"
    exit 1
fi

KEY_FILE="$1"
OUTPUT_FILE="${KEY_FILE}_github_actions"

if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Error: Key file not found: $KEY_FILE"
    exit 1
fi

echo "📋 Analyzing key: $KEY_FILE"

# Create backup
cp "$KEY_FILE" "${KEY_FILE}.backup"
echo "✅ Backup created: ${KEY_FILE}.backup"

# Check current format
FIRST_LINE=$(head -n 1 "$KEY_FILE")
echo "Current format: $FIRST_LINE"

# Create working copy
cp "$KEY_FILE" "$OUTPUT_FILE"

# Fix line endings
echo "🔧 Fixing line endings..."
sed -i 's/\r$//' "$OUTPUT_FILE"

# Check and convert format
if echo "$FIRST_LINE" | grep -q "BEGIN OPENSSH PRIVATE KEY"; then
    echo "⚠️  OpenSSH format detected. Converting to PEM..."
    
    # Method 1: Try direct conversion
    if ssh-keygen -p -m PEM -f "$OUTPUT_FILE" -N "" 2>/dev/null; then
        echo "✅ Successfully converted to PEM format"
    else
        echo "❌ Direct conversion failed"
        
        # Method 2: Try using openssl
        echo "Attempting alternative conversion..."
        if openssl rsa -in "$KEY_FILE" -out "${OUTPUT_FILE}.tmp" 2>/dev/null; then
            mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
            echo "✅ Successfully converted using OpenSSL"
        else
            echo "❌ Alternative conversion failed"
            echo "The key may be encrypted or in an unsupported format"
            exit 1
        fi
    fi
    
elif echo "$FIRST_LINE" | grep -q "BEGIN PRIVATE KEY"; then
    echo "⚠️  PKCS#8 format detected. Converting to RSA PEM..."
    
    if openssl rsa -in "$KEY_FILE" -out "${OUTPUT_FILE}.tmp" 2>/dev/null; then
        mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
        echo "✅ Successfully converted to RSA PEM format"
    else
        echo "❌ Conversion failed. The key may be encrypted."
        exit 1
    fi
    
elif echo "$FIRST_LINE" | grep -q "BEGIN RSA PRIVATE KEY"; then
    echo "✅ Already in RSA PEM format"
    
else
    echo "❌ Unknown key format"
    exit 1
fi

# Validate the output key
echo ""
echo "🔍 Validating converted key..."
if ssh-keygen -l -f "$OUTPUT_FILE" >/dev/null 2>&1; then
    echo "✅ Key validation successful"
    ssh-keygen -l -f "$OUTPUT_FILE"
else
    echo "❌ Key validation failed"
    exit 1
fi

# Check for passphrase
echo ""
echo "🔍 Checking for passphrase..."
if grep -q "ENCRYPTED" "$OUTPUT_FILE"; then
    echo "⚠️  Key appears to be encrypted. Removing passphrase..."
    ssh-keygen -p -m PEM -f "$OUTPUT_FILE" -N ""
    echo "✅ Passphrase removed"
else
    echo "✅ No passphrase detected"
fi

# Final validation
echo ""
echo "📋 Final key information:"
echo "Format: $(head -n 1 "$OUTPUT_FILE")"
echo "Lines: $(wc -l < "$OUTPUT_FILE")"
echo "Size: $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE") bytes"

echo ""
echo "✅ Key has been fixed and saved to: $OUTPUT_FILE"
echo ""
echo "📌 Next steps:"
echo "1. Test the key locally:"
echo "   ssh -i $OUTPUT_FILE user@your-server"
echo ""
echo "2. Copy the key content for GitHub Secret:"
echo "   cat $OUTPUT_FILE | pbcopy  # macOS"
echo "   cat $OUTPUT_FILE | xclip  # Linux"
echo ""
echo "3. Add to GitHub Secrets as API_SSH_KEY or WEB_SSH_KEY"
echo ""
echo "⚠️  Remember: Include the ENTIRE key content including headers!"