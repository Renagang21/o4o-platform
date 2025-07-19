# SSH Infrastructure Documentation

## 🔐 Current SSH Architecture

### Server Infrastructure
Based on the deployment workflows analysis, the O4O platform uses a two-server architecture:

#### 1. API Server
- **Purpose**: Hosts the Node.js/Express API backend
- **Domain**: api.neture.co.kr
- **GitHub Secret for Host**: `APISERVER_HOST`
- **GitHub Secret for SSH Key**: `APISERVER_SSH_KEY`
- **SSH User**: ubuntu
- **Deploy Path**: /home/ubuntu/o4o-platform
- **Services**: API server (PM2 process: o4o-api-server)

#### 2. Web Server
- **Purpose**: Hosts both admin dashboard and main site (static files)
- **Domains**: 
  - admin.neture.co.kr (Admin Dashboard)
  - neture.co.kr (Main Site)
- **GitHub Secret for Host**: `WEB_SERVER_HOST`
- **GitHub Secret for SSH Key**: `WEB_SSH_PRIVATE_KEY`
- **SSH User**: ubuntu
- **Deploy Path**: /home/ubuntu/o4o-platform
- **Static Files Paths**:
  - Admin: /var/www/admin.neture.co.kr/
  - Main: /var/www/neture.co.kr/
- **Services**: Static file serving via PM2 + serve

### Current SSH Key Mapping

```
┌─────────────────────────┬──────────────────────┬─────────────────────────┐
│ GitHub Workflow         │ SSH Key Secret       │ Server Host Secret      │
├─────────────────────────┼──────────────────────┼─────────────────────────┤
│ deploy-api-server.yml   │ APISERVER_SSH_KEY    │ APISERVER_HOST         │
│ deploy-admin-dashboard  │ WEB_SSH_PRIVATE_KEY  │ WEB_SERVER_HOST        │
│ deploy-main-site.yml    │ WEB_SSH_PRIVATE_KEY  │ WEB_SERVER_HOST        │
└─────────────────────────┴──────────────────────┴─────────────────────────┘
```

## 🚨 Identified Issues and Patterns

### 1. Naming Inconsistency
- API server uses `APISERVER_SSH_KEY` (no PRIVATE in name)
- Web server uses `WEB_SSH_PRIVATE_KEY` (includes PRIVATE)
- This inconsistency can cause confusion

### 2. Key Sharing Pattern
- Admin dashboard and main site share the same SSH key (`WEB_SSH_PRIVATE_KEY`)
- This is acceptable since they deploy to the same server
- API server has its own dedicated key

### 3. Missing Documentation
- No clear documentation about which IP addresses map to which servers
- Server names (o4o-apiserver, o4o-webserver) mentioned in context but not in workflows

## 🛠️ Troubleshooting SSH Permission Denied Errors

### Common Causes
1. **Wrong SSH Key in GitHub Secrets**
   - The private key in GitHub Secrets doesn't match the public key on the server

2. **Key Format Issues**
   - Missing or extra line breaks in the private key
   - Key not starting with `-----BEGIN RSA PRIVATE KEY-----`
   - Key not ending with `-----END RSA PRIVATE KEY-----`

3. **Server Configuration Issues**
   - Wrong permissions on `~/.ssh/authorized_keys` (should be 600)
   - Wrong permissions on `~/.ssh/` directory (should be 700)
   - SELinux or AppArmor blocking SSH access

### How to Fix SSH Issues

#### Step 1: Generate New SSH Keys on Each Server

**On API Server:**
```bash
# SSH into the API server
ssh ubuntu@<API_SERVER_IP>

# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions-api@o4o-platform" -f ~/.ssh/github_actions_key

# Add public key to authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Display private key to copy to GitHub Secrets
cat ~/.ssh/github_actions_key
```

**On Web Server:**
```bash
# SSH into the Web server
ssh ubuntu@<WEB_SERVER_IP>

# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions-web@o4o-platform" -f ~/.ssh/github_actions_key

# Add public key to authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Display private key to copy to GitHub Secrets
cat ~/.ssh/github_actions_key
```

#### Step 2: Update GitHub Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Update the following secrets with the new private keys:
   - `APISERVER_SSH_KEY`: Copy the entire output from API server's `cat ~/.ssh/github_actions_key`
   - `WEB_SSH_PRIVATE_KEY`: Copy the entire output from Web server's `cat ~/.ssh/github_actions_key`

**Important**: Include the ENTIRE key including:
```
-----BEGIN RSA PRIVATE KEY-----
[key content]
-----END RSA PRIVATE KEY-----
```

#### Step 3: Verify Server Hosts
Also verify these secrets contain the correct server addresses:
- `APISERVER_HOST`: Should contain the API server's IP or hostname
- `WEB_SERVER_HOST`: Should contain the Web server's IP or hostname

## 📋 Recommended SSH Strategy

### Option 1: Unified Key Naming (Recommended)
Standardize all SSH key secret names:
- Rename `APISERVER_SSH_KEY` to `API_SSH_PRIVATE_KEY`
- Keep `WEB_SSH_PRIVATE_KEY` as is
- This creates consistency: `{SERVICE}_SSH_PRIVATE_KEY`

### Option 2: Separate Keys for Each Service
Create individual keys for each service:
- `API_SSH_PRIVATE_KEY` for API server
- `ADMIN_SSH_PRIVATE_KEY` for admin dashboard
- `MAIN_SSH_PRIVATE_KEY` for main site

**Pros**: Better security isolation
**Cons**: More keys to manage, admin and main deploy to same server anyway

### Option 3: Single Key per Server (Current Approach)
Keep the current approach but with better naming:
- One key for API server
- One key for Web server (shared by admin and main)

**This is the most practical approach and is already in use.**

## 🔧 GitHub Secrets Checklist

Required secrets for successful deployments:

### API Server Deployment
- [ ] `APISERVER_SSH_KEY` - SSH private key for API server
- [ ] `APISERVER_HOST` - API server hostname/IP
- [ ] `DB_HOST` - Database host
- [ ] `DB_PORT` - Database port
- [ ] `DB_USERNAME` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `DB_NAME` - Database name
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `JWT_EXPIRES_IN` - JWT expiration time
- [ ] `CORS_ORIGIN` - Allowed CORS origins
- [ ] `LOG_LEVEL` - Logging level
- [ ] `HEALTH_CHECK_KEY` - Health check authentication key

### Web Server Deployments (Admin & Main)
- [ ] `WEB_SSH_PRIVATE_KEY` - SSH private key for web server
- [ ] `WEB_SERVER_HOST` - Web server hostname/IP

## 🚀 Testing SSH Connections

To test if SSH keys are working correctly:

```bash
# Test API server connection
ssh -i <path-to-api-private-key> ubuntu@<API_SERVER_HOST> "echo 'API Server SSH OK'"

# Test Web server connection
ssh -i <path-to-web-private-key> ubuntu@<WEB_SERVER_HOST> "echo 'Web Server SSH OK'"
```

## 📝 Maintenance Notes

1. **Key Rotation**: Rotate SSH keys every 6-12 months for security
2. **Backup Keys**: Keep encrypted backups of private keys in a secure location
3. **Access Logs**: Regularly review SSH access logs on servers
4. **Documentation**: Update this document when infrastructure changes

## 🎯 Summary

The O4O platform uses a two-server architecture with SSH-based deployments:
- **API Server**: Dedicated server for the backend API
- **Web Server**: Shared server for admin dashboard and main site

Each server has its own SSH key stored in GitHub Secrets, and deployments are automated through GitHub Actions workflows. The current setup is functional but could benefit from naming consistency improvements.