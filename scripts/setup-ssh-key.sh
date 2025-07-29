#!/bin/bash

# SSH Key Setup Script for GitHub Actions
# This script properly sets up SSH keys with format conversion support

set -e

SSH_KEY="$1"
SSH_HOST="$2"

if [ -z "$SSH_KEY" ] || [ -z "$SSH_HOST" ]; then
    echo "❌ Error: Missing required parameters"
    echo "Usage: $0 <ssh_key_content> <ssh_host>"
    exit 1
fi

echo "🔍 Setting up SSH key..."

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Save the SSH key with proper formatting
echo "$SSH_KEY" > ~/.ssh/id_rsa.tmp

# Fix common SSH key issues
# 1. Remove Windows line endings
# 2. Ensure proper line breaks (convert literal \n to actual newlines)
# 3. Remove any extra whitespace
cat ~/.ssh/id_rsa.tmp | sed 's/\r$//' | sed 's/\\n/\n/g' > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
rm ~/.ssh/id_rsa.tmp

# Debug key info
echo "SSH key file info:"
ls -la ~/.ssh/id_rsa
echo "First line: $(head -n 1 ~/.ssh/id_rsa)"
echo "Last line: $(tail -n 1 ~/.ssh/id_rsa)"
echo "Total lines: $(wc -l < ~/.ssh/id_rsa)"

# Check key format and convert if needed
KEY_FORMAT="unknown"
if grep -q "BEGIN RSA PRIVATE KEY" ~/.ssh/id_rsa; then
  KEY_FORMAT="rsa"
  echo "✅ Key is in RSA format"
elif grep -q "BEGIN PRIVATE KEY" ~/.ssh/id_rsa; then
  KEY_FORMAT="pkcs8"
  echo "⚠️  Key is in PKCS#8 format, converting to RSA..."
  # Convert PKCS#8 to RSA format
  openssl rsa -in ~/.ssh/id_rsa -out ~/.ssh/id_rsa.converted 2>/dev/null || true
  if [ -f ~/.ssh/id_rsa.converted ]; then
    mv ~/.ssh/id_rsa.converted ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    echo "✅ Successfully converted to RSA format"
  fi
elif grep -q "BEGIN OPENSSH PRIVATE KEY" ~/.ssh/id_rsa; then
  KEY_FORMAT="openssh"
  echo "⚠️  Key is in OpenSSH format, converting to RSA..."
  # Create a temporary copy for conversion
  cp ~/.ssh/id_rsa ~/.ssh/id_rsa.bak
  # Convert OpenSSH to RSA format
  ssh-keygen -p -m PEM -f ~/.ssh/id_rsa -N "" 2>/dev/null || {
    echo "⚠️  Direct conversion failed, trying alternative method..."
    # Alternative: Extract public key and regenerate
    ssh-keygen -y -f ~/.ssh/id_rsa.bak > ~/.ssh/id_rsa.pub 2>/dev/null || true
    if [ -f ~/.ssh/id_rsa.pub ]; then
      echo "⚠️  Could extract public key but cannot convert private key format"
      echo "    The SSH key may still work with ssh-agent"
    fi
    # Restore original key
    mv ~/.ssh/id_rsa.bak ~/.ssh/id_rsa
  }
  rm -f ~/.ssh/id_rsa.bak
fi

# Validate the key
echo "Validating SSH key..."
if ssh-keygen -l -f ~/.ssh/id_rsa >/dev/null 2>&1; then
  echo "✅ SSH key validation successful"
  ssh-keygen -l -f ~/.ssh/id_rsa
else
  echo "⚠️  SSH key validation failed with ssh-keygen"
  echo "Error details:"
  ssh-keygen -l -f ~/.ssh/id_rsa 2>&1 || true
  
  # Try to use the key anyway with ssh-agent
  echo "Attempting to use key with ssh-agent..."
  eval "$(ssh-agent -s)"
  if ssh-add ~/.ssh/id_rsa 2>/dev/null; then
    echo "✅ Key added to ssh-agent successfully"
    # Export SSH_AUTH_SOCK for subsequent commands
    echo "SSH_AUTH_SOCK=$SSH_AUTH_SOCK" >> $GITHUB_ENV
    echo "SSH_AGENT_PID=$SSH_AGENT_PID" >> $GITHUB_ENV
  else
    echo "❌ Failed to add key to ssh-agent"
    echo "SSH key requirements:"
    echo "1. Must be in PEM format (begins with -----BEGIN RSA PRIVATE KEY-----)"
    echo "2. Must have no passphrase"
    echo "3. Must use Unix line endings (LF)"
    echo "4. Must be complete including header and footer"
    exit 1
  fi
fi

# Setup SSH config for better compatibility
cat > ~/.ssh/config << 'EOF'
Host *
  StrictHostKeyChecking no
  UserKnownHostsFile=/dev/null
  IdentityFile ~/.ssh/id_rsa
  IdentitiesOnly yes
  PubkeyAcceptedKeyTypes +ssh-rsa
  HostKeyAlgorithms +ssh-rsa
  PubkeyAcceptedAlgorithms +ssh-rsa
EOF
chmod 600 ~/.ssh/config

# Add host to known hosts
if [ -n "$SSH_HOST" ]; then
  ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
fi

echo "✅ SSH setup completed successfully"

# Test SSH connection if host is provided
if [ -n "$SSH_HOST" ] && [ -n "$3" ]; then
  SSH_USER="$3"
  echo "Testing SSH connection to $SSH_USER@$SSH_HOST..."
  if ssh -o ConnectTimeout=10 "$SSH_USER@$SSH_HOST" "echo '✅ SSH connection test successful'" 2>/dev/null; then
    echo "✅ SSH connection verified"
  else
    echo "⚠️  SSH connection test failed, but key setup completed"
  fi
fi