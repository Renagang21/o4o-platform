# GitHub Actions Required Secrets Configuration

This document lists all the secrets that need to be configured in GitHub repository settings for workflows to function properly.

## Required Secrets

### 🚀 Deployment Secrets

#### API Server Deployment
- `APISERVER_SSH_KEY` - SSH private key for API server access
- `APISERVER_HOST` - API server hostname/IP address
- `APISERVER_USER` - SSH username for API server (optional, defaults to 'ubuntu')

#### Admin Dashboard Deployment
- `WEB_SSH_PRIVATE_KEY` - SSH private key for web server access
- `WEB_SERVER_HOST` - Web server hostname/IP address
- `WEB_SERVER_USER` - SSH username for web server (optional, defaults to 'ubuntu')

#### Main Site Deployment
- Uses same secrets as Admin Dashboard:
  - `WEB_SSH_PRIVATE_KEY`
  - `WEB_SERVER_HOST`
  - `WEB_SERVER_USER`

### 🔐 API Server Environment Secrets
These are used to create the production .env file:

- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database username
- `DB_PASS` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `CORS_ORIGIN` - Allowed CORS origins
- `AWS_ACCESS_KEY_ID` - AWS access key (if using S3)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (if using S3)
- `AWS_REGION` - AWS region (if using S3)
- `AWS_S3_BUCKET` - S3 bucket name (if using S3)
- `REDIS_HOST` - Redis host (optional)
- `REDIS_PORT` - Redis port (optional, default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `HEALTH_CHECK_KEY` - Secret key for health check authentication

### 📊 Monitoring Secrets
- `APISERVER_HOST` - API server hostname for health checks
- `APISERVER_USER` - SSH username for health checks
- `APISERVER_SSH_KEY` - SSH key for health check access

## How to Configure

1. Go to your GitHub repository
2. Navigate to `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Add each secret with the appropriate value

## Security Best Practices

1. **SSH Keys**: Generate dedicated SSH keys for GitHub Actions
   ```bash
   ssh-keygen -t ed25519 -C "github-actions@your-repo" -f github_actions_key
   ```

2. **Database Credentials**: Use read-only credentials where possible

3. **JWT Secrets**: Generate strong random secrets
   ```bash
   openssl rand -base64 32
   ```

4. **Regular Rotation**: Rotate secrets periodically

5. **Minimal Permissions**: Grant only necessary permissions to service accounts

## Environment-Specific Configuration

Consider using GitHub Environments for better secret management:

1. Create environments: `production`, `staging`
2. Configure environment-specific secrets
3. Add protection rules for production deployments

## Troubleshooting

If workflows fail due to missing secrets:

1. Check the Actions logs for specific error messages
2. Verify secret names match exactly (case-sensitive)
3. Ensure secrets have values (empty secrets will fail)
4. Check if the workflow has permission to access secrets

## Optional Enhancements

Consider adding these optional secrets for enhanced functionality:

- `SLACK_WEBHOOK_URL` - For deployment notifications
- `SENTRY_DSN` - For error tracking
- `DATADOG_API_KEY` - For monitoring
- `GITHUB_PAT` - Personal Access Token for advanced operations

---

**Note**: Never commit actual secret values to the repository. This file only documents what secrets are needed.