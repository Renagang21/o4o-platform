# SSH Key Setup Guide for GitHub Actions

## Common SSH Key Errors and Solutions

### Error: "error in libcrypto"
This error typically occurs when the SSH key format is incompatible with the OpenSSH version used in GitHub Actions.

## SSH Key Format Requirements

1. **Format**: Must be in PEM format (not OpenSSH format)
2. **Header**: Should start with `-----BEGIN RSA PRIVATE KEY-----`
3. **Footer**: Should end with `-----END RSA PRIVATE KEY-----`
4. **Line Endings**: Must use Unix line endings (LF), not Windows (CRLF)
5. **Passphrase**: Must NOT have a passphrase

## Generating a Compatible SSH Key

### Option 1: Generate New RSA Key (Recommended)
```bash
# Generate RSA key in PEM format
ssh-keygen -t rsa -b 4096 -m PEM -f ~/.ssh/github_actions_key -N ""

# View the private key
cat ~/.ssh/github_actions_key
```

### Option 2: Convert Existing Key to PEM Format

#### From OpenSSH format:
```bash
# Check current format
head -n 1 ~/.ssh/id_rsa

# If it shows "-----BEGIN OPENSSH PRIVATE KEY-----", convert it:
cp ~/.ssh/id_rsa ~/.ssh/id_rsa.backup
ssh-keygen -p -m PEM -f ~/.ssh/id_rsa -N ""
```

#### From PKCS#8 format:
```bash
# If it shows "-----BEGIN PRIVATE KEY-----", convert it:
openssl rsa -in ~/.ssh/id_rsa -out ~/.ssh/id_rsa_pem
mv ~/.ssh/id_rsa_pem ~/.ssh/id_rsa
```

## Adding SSH Key to GitHub Secrets

1. Copy the entire private key content:
   ```bash
   cat ~/.ssh/github_actions_key
   ```

2. In GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `API_SSH_KEY` (or `WEB_SSH_KEY`)
   - Value: Paste the ENTIRE key including headers

3. **IMPORTANT**: Ensure no extra spaces or line breaks are added

## Verifying SSH Key Format

Use the debug script to verify your key:
```bash
bash scripts/debug-ssh-key.sh "$(cat ~/.ssh/github_actions_key)"
```

## Updated Workflow Configuration

The workflows have been updated to handle various SSH key formats automatically:

1. **Automatic Format Detection**: Detects RSA, PKCS#8, and OpenSSH formats
2. **Format Conversion**: Attempts to convert incompatible formats
3. **Fallback to SSH Agent**: Uses ssh-agent if direct key usage fails
4. **Enhanced Compatibility**: Adds SSH config for better compatibility

## Troubleshooting Steps

1. **Check Key Format**:
   ```bash
   # Should show RSA format
   head -n 1 your_key_file
   ```

2. **Remove Passphrase**:
   ```bash
   ssh-keygen -p -m PEM -f your_key_file -N ""
   ```

3. **Fix Line Endings**:
   ```bash
   # Convert CRLF to LF
   dos2unix your_key_file
   # Or using sed
   sed -i 's/\r$//' your_key_file
   ```

4. **Validate Key**:
   ```bash
   ssh-keygen -l -f your_key_file
   ```

## GitHub Actions Workflow Changes

The workflows now include:

1. **Enhanced SSH Setup**: Handles multiple key formats
2. **Automatic Conversion**: Converts keys to compatible format
3. **SSH Agent Fallback**: Uses ssh-agent when direct key fails
4. **Better Error Messages**: Clear guidance on fixing issues

## Security Best Practices

1. **Use Dedicated Keys**: Create separate keys for GitHub Actions
2. **Limit Key Permissions**: Use restricted SSH keys with specific command access
3. **Rotate Keys Regularly**: Update keys every 3-6 months
4. **Monitor Access**: Check server logs for unauthorized access attempts

## Example: Creating GitHub Actions SSH Key

```bash
# 1. Generate new key specifically for GitHub Actions
ssh-keygen -t rsa -b 4096 -m PEM -f ~/.ssh/github_actions_deploy -N "" \
  -C "github-actions-deploy@your-repo"

# 2. Add public key to server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-server

# 3. Test connection
ssh -i ~/.ssh/github_actions_deploy user@your-server "echo 'Connection successful'"

# 4. Copy private key for GitHub Secret
cat ~/.ssh/github_actions_deploy
```

## Quick Fix Checklist

- [ ] Key starts with `-----BEGIN RSA PRIVATE KEY-----`
- [ ] Key ends with `-----END RSA PRIVATE KEY-----`
- [ ] No passphrase on the key
- [ ] Unix line endings (LF)
- [ ] Key works locally: `ssh -i key_file user@host`
- [ ] Public key added to server's `~/.ssh/authorized_keys`
- [ ] GitHub Secret contains complete key including headers