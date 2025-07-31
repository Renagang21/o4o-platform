#!/bin/bash
# Debug SSH key issues in CI environment

echo "🔍 SSH Key Debugging Script"
echo "=========================="

# Check if SSH key is provided
if [ -z "$1" ]; then
  echo "❌ Error: No SSH key provided"
  echo "Usage: bash debug-ssh-key.sh \"\$SSH_KEY_CONTENT\""
  exit 1
fi

SSH_KEY="$1"
TEMP_KEY="/tmp/test_key_$$"

# Write key to temporary file
echo "$SSH_KEY" | tr -d '\r' > "$TEMP_KEY"
chmod 600 "$TEMP_KEY"

echo "📋 Key Information:"
echo "==================="

# Check key format
echo -n "1. Key format check: "
if head -n 1 "$TEMP_KEY" | grep -q "BEGIN.*PRIVATE KEY"; then
  echo "✅ Valid private key header found"
  KEY_TYPE=$(head -n 1 "$TEMP_KEY" | sed 's/-----BEGIN \(.*\) PRIVATE KEY-----/\1/')
  echo "   Key type: $KEY_TYPE"
else
  echo "❌ Invalid key format - missing private key header"
  echo "   First line: $(head -n 1 "$TEMP_KEY")"
fi

# Check key ending
echo -n "2. Key ending check: "
if tail -n 1 "$TEMP_KEY" | grep -q "END.*PRIVATE KEY"; then
  echo "✅ Valid private key footer found"
else
  echo "❌ Invalid key format - missing private key footer"
  echo "   Last line: $(tail -n 1 "$TEMP_KEY")"
fi

# Count lines
echo "3. Key structure:"
TOTAL_LINES=$(wc -l < "$TEMP_KEY")
echo "   Total lines: $TOTAL_LINES"

# Try to parse key
echo -n "4. SSH key validation: "
if ssh-keygen -l -f "$TEMP_KEY" >/dev/null 2>&1; then
  echo "✅ Valid SSH key"
  ssh-keygen -l -f "$TEMP_KEY" 2>&1
else
  echo "❌ Invalid SSH key"
  ERROR_MSG=$(ssh-keygen -l -f "$TEMP_KEY" 2>&1)
  echo "   Error: $ERROR_MSG"
fi

# Check for common issues
echo ""
echo "5. Common issues check:"

# Check for Windows line endings
if file "$TEMP_KEY" | grep -q "CRLF"; then
  echo "   ⚠️  Windows line endings detected (CRLF)"
else
  echo "   ✅ Unix line endings (LF)"
fi

# Check for base64 encoding issues
if grep -q " " "$TEMP_KEY"; then
  echo "   ⚠️  Spaces found in key (possible base64 encoding issue)"
else
  echo "   ✅ No spaces in key content"
fi

# Check if key is encrypted
if grep -q "ENCRYPTED" "$TEMP_KEY"; then
  echo "   ⚠️  Key appears to be encrypted (passphrase required)"
else
  echo "   ✅ Key is not encrypted"
fi

# Clean up
rm -f "$TEMP_KEY"

echo ""
echo "=========================="
echo "📌 Recommendations:"
echo "- Ensure the SSH key is in PEM format"
echo "- Remove any passphrase from the key"
echo "- Use Unix line endings (LF, not CRLF)"
echo "- Store the complete key including BEGIN and END lines"