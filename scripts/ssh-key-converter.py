#!/usr/bin/env python3
"""
SSH Key Format Converter
Handles various SSH key formats and converts them for GitHub Actions compatibility
"""

import sys
import os
import base64
import re
from pathlib import Path

def detect_key_format(key_content):
    """Detect the format of the SSH key"""
    if "BEGIN RSA PRIVATE KEY" in key_content:
        return "rsa"
    elif "BEGIN PRIVATE KEY" in key_content:
        return "pkcs8"
    elif "BEGIN OPENSSH PRIVATE KEY" in key_content:
        return "openssh"
    elif "BEGIN EC PRIVATE KEY" in key_content:
        return "ec"
    else:
        # Check if it's base64 encoded
        try:
            decoded = base64.b64decode(key_content)
            decoded_str = decoded.decode('utf-8', errors='ignore')
            if "BEGIN" in decoded_str:
                return "base64"
        except:
            pass
        return "unknown"

def fix_line_endings(key_content):
    """Fix common line ending issues"""
    # Replace literal \n with actual newlines
    key_content = key_content.replace('\\n', '\n')
    # Remove carriage returns
    key_content = key_content.replace('\r', '')
    # Ensure proper spacing around headers
    key_content = re.sub(r'(-----BEGIN [A-Z ]+-----)', r'\n\1\n', key_content)
    key_content = re.sub(r'(-----END [A-Z ]+-----)', r'\n\1\n', key_content)
    # Remove extra blank lines
    key_content = re.sub(r'\n{3,}', '\n\n', key_content)
    return key_content.strip()

def decode_if_base64(key_content):
    """Decode if the key is base64 encoded"""
    try:
        # Remove whitespace
        cleaned = key_content.strip().replace(' ', '').replace('\n', '')
        decoded = base64.b64decode(cleaned)
        decoded_str = decoded.decode('utf-8')
        if "BEGIN" in decoded_str:
            return decoded_str
    except:
        pass
    return key_content

def save_key(key_content, output_path):
    """Save the key with proper permissions"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write key
    output_path.write_text(key_content)
    
    # Set permissions to 600
    os.chmod(output_path, 0o600)
    
    print(f"✅ Key saved to {output_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python ssh-key-converter.py <key_content_or_file>")
        sys.exit(1)
    
    key_input = sys.argv[1]
    
    # Read key content
    if os.path.exists(key_input):
        with open(key_input, 'r') as f:
            key_content = f.read()
    else:
        key_content = key_input
    
    print("🔍 Analyzing SSH key...")
    
    # Try to decode if base64
    original_content = key_content
    key_content = decode_if_base64(key_content)
    if key_content != original_content:
        print("✅ Successfully decoded from base64")
    
    # Fix line endings
    key_content = fix_line_endings(key_content)
    
    # Detect format
    key_format = detect_key_format(key_content)
    print(f"📋 Detected format: {key_format}")
    
    # Save the processed key
    output_path = os.path.expanduser("~/.ssh/id_rsa")
    save_key(key_content, output_path)
    
    # Print key info
    lines = key_content.split('\n')
    print(f"📊 Key info:")
    print(f"   First line: {lines[0] if lines else 'empty'}")
    print(f"   Last line: {lines[-1] if lines else 'empty'}")
    print(f"   Total lines: {len(lines)}")
    
    # Create SSH config
    ssh_config = """Host *
    StrictHostKeyChecking no
    UserKnownHostsFile=/dev/null
    IdentityFile ~/.ssh/id_rsa
    IdentitiesOnly yes
    PreferredAuthentications publickey
    PubkeyAuthentication yes
    PasswordAuthentication no
    ConnectTimeout 10
    ServerAliveInterval 60
    TCPKeepAlive yes
    PubkeyAcceptedKeyTypes *
    HostKeyAlgorithms *
    KexAlgorithms *
    Ciphers *
    MACs *
"""
    
    config_path = os.path.expanduser("~/.ssh/config")
    Path(config_path).parent.mkdir(parents=True, exist_ok=True)
    Path(config_path).write_text(ssh_config)
    os.chmod(config_path, 0o600)
    print("✅ SSH config created")
    
    print("✅ SSH key setup completed")

if __name__ == "__main__":
    main()