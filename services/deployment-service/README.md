# Deployment Service

Multi-Instance Deployment Manager for O4O Platform

## Overview

This service automates the deployment of new O4O Platform instances to AWS Lightsail (or other cloud providers).

## Features

- **Automated Server Provisioning**: Creates and configures Lightsail instances
- **Repo Bootstrap**: Clones and builds the O4O Platform
- **Nginx Configuration**: Sets up reverse proxy with SSL
- **AppStore Integration**: Automatically installs selected apps
- **CMS Initialization**: Creates default pages and content

## Directory Structure

```
deployment-service/
├── config.ts                 # Configuration management
├── deploy.ts                 # Main deployment orchestration
├── template/                 # Configuration templates
│   ├── nginx.conf.template
│   ├── ecosystem.config.js.template
│   └── .env.template
├── scripts/                  # Setup scripts
│   ├── setup-node.sh
│   ├── setup-nginx.sh
│   └── setup-ssl.sh
└── README.md
```

## Usage

### From API Server

The deployment service is integrated with the API server and can be triggered via REST API:

```bash
POST /api/deployment/create
{
  "domain": "example.com",
  "apps": ["commerce", "customer", "forum"],
  "region": "ap-northeast-2",
  "instanceType": "nano_3_0"
}
```

### Direct Usage (for testing)

```typescript
import { deployInstance } from './deploy';

const result = await deployInstance({
  domain: 'test-site.com',
  apps: ['commerce', 'admin'],
  region: 'ap-northeast-2',
  instanceType: 'nano_3_0',
});

console.log(result);
```

## Configuration

Edit `config.ts` to customize:

- AWS region
- Lightsail blueprint and bundle
- GitHub repository and branch
- SSH key settings

## Templates

### Nginx Template

The `nginx.conf.template` includes:
- HTTP to HTTPS redirect
- Reverse proxy to API server
- Static file serving
- Security headers
- Gzip compression

### PM2 Template

The `ecosystem.config.js.template` configures:
- Process management
- Environment variables
- Logging
- Auto-restart

### Environment Template

The `.env.template` includes placeholders for:
- Database credentials
- JWT secrets
- Email settings
- API keys

## Scripts

### setup-node.sh

Installs:
- Node.js 20.x (LTS)
- pnpm
- PM2
- Configures PM2 startup

### setup-nginx.sh

- Installs Nginx
- Creates web root
- Sets up basic configuration
- Enables service

### setup-ssl.sh

- Installs certbot
- Obtains SSL certificate from Let's Encrypt
- Configures auto-renewal

## Implementation Phases

### Phase C: Server Provisioning ✅
- Lightsail instance creation
- Network configuration
- SSH key setup

### Phase D: Repo Bootstrap ✅
- Node.js/pnpm installation
- Repository cloning
- Build process
- PM2 configuration

### Phase E: App Installation (TODO)
- AppStore integration
- Manifest processing
- Database initialization

### Phase F: CMS Initialization (TODO)
- Default page creation
- Menu setup
- Widget configuration

## Requirements

- AWS account with Lightsail access
- Domain registered (for SSL)
- SSH access configured

## Security Notes

- All secrets should be generated uniquely per instance
- SSL certificates are automatically renewed
- Environment variables are never committed to git
- Use strong passwords for database connections

## Troubleshooting

Check logs at:
- `/home/ubuntu/logs/api-error.log`
- `/home/ubuntu/logs/api-out.log`
- `/var/log/nginx/error.log`

## License

Proprietary - O4O Platform
