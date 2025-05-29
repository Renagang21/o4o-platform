# Task Manager Configuration Guide

## Overview
This guide provides comprehensive instructions for configuring and using task managers in development environments. The focus is on configuring PM2, a popular Node.js process manager, but principles apply to other task managers as well.

## Basic PM2 Configuration

### Installation
```bash
# Global installation
npm install -g pm2

# Project installation
npm install pm2 --save-dev
```

### Configuration File
Create a configuration file in your project root (e.g., `pm2.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: "api-service",
      script: "./src/index.js",
      instances: 2,
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 80
      }
    }
  ]
};
```

### Common Commands
```bash
# Start application with configuration
pm2 start pm2.config.js

# Start with specific environment
pm2 start pm2.config.js --env production

# List running processes
pm2 list

# Display logs
pm2 logs [app-name]

# Monitor processes
pm2 monit

# Restart application
pm2 restart [app-name]

# Stop application
pm2 stop [app-name]

# Delete from PM2
pm2 delete [app-name]
```

## Advanced Configuration

### Load Balancing
```javascript
module.exports = {
  apps: [
    {
      name: "load-balanced-app",
      script: "./app.js",
      instances: "max", // Use all available CPUs
      exec_mode: "cluster",
      instance_var: "INSTANCE_ID"
    }
  ]
};
```

### Auto-restart on File Changes
```javascript
module.exports = {
  apps: [
    {
      name: "auto-restart-app",
      script: "./app.js",
      watch: true,
      ignore_watch: ["node_modules", "logs", ".git"],
      watch_options: {
        followSymlinks: false
      }
    }
  ]
};
```

### Log Configuration
```javascript
module.exports = {
  apps: [
    {
      name: "logging-app",
      script: "./app.js",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      merge_logs: true,
      log_type: "json"
    }
  ]
};
```

### Cron Jobs
```javascript
module.exports = {
  apps: [
    {
      name: "cron-job",
      script: "./cron-task.js",
      cron_restart: "0 0 * * *", // Restart at midnight
      autorestart: false
    }
  ]
};
```

## Integration with CI/CD

### Deployment Script Example
```bash
#!/bin/bash
# deployment.sh

# Pull latest changes
git pull origin main

# Install dependencies
npm install --production

# Restart application
pm2 restart pm2.config.js --env production

# Save PM2 process list
pm2 save
```

### GitHub Actions Integration
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: SSH and Deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/project
            ./deployment.sh
```

## Monitoring and Metrics

### PM2 Monitoring Setup
```bash
# Install PM2 monitoring module
pm2 install pm2-server-monit

# Enable web dashboard
pm2 install pm2-webshell
```

### Integration with External Monitoring
```javascript
module.exports = {
  apps: [
    {
      name: "monitored-app",
      script: "./app.js",
      // New Relic integration
      env: {
        NEW_RELIC_APP_NAME: "My Application",
        NEW_RELIC_LICENSE_KEY: "license_key_here",
        NEW_RELIC_LOG_LEVEL: "info"
      }
    }
  ]
};
```

## Best Practices

1. **Use Environment-Specific Configs**:
   - Separate development, staging, and production configs
   - Use environment variables for sensitive information

2. **Graceful Shutdown**:
   - Handle SIGINT and SIGTERM signals in your application
   - Close database connections properly before exiting

3. **Memory Management**:
   - Set appropriate memory limits with `max_memory_restart`
   - Monitor memory usage trends with `pm2 monit`

4. **Log Rotation**:
   - Use `pm2-logrotate` module to prevent log files from growing too large
   - Configure retention policies for log files

5. **Clustering Considerations**:
   - Ensure your application is stateless when using clustering
   - Use Redis or similar for session storage in clustered environments

## Troubleshooting

### Common Issues

1. **Application crashes after deploy**:
   - Check error logs: `pm2 logs [app-name] --err --lines 100`
   - Verify environment variables are set correctly
   - Ensure all dependencies are installed

2. **Memory leaks**:
   - Check memory usage trends: `pm2 monit`
   - Use `--node-args="--inspect"` to enable debugging
   - Consider heap snapshots with Chrome DevTools

3. **High CPU usage**:
   - Identify bottlenecks with profiling: `pm2 start app.js --node-args="--prof"`
   - Check if clustering is distributing load properly
   - Optimize database queries and I/O operations

## Reference

- [PM2 Official Documentation](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 GitHub Repository](https://github.com/Unitech/pm2) 