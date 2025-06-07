        root /var/www/o4o-platform;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxies to APIServer
    location /api/ {
        proxy_pass http://YOUR_APISERVER_IP:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Socket.io
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # AI Services Proxy
    location /ai/ {
        proxy_pass http://YOUR_APISERVER_IP:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # RPA Services Proxy
    location /rpa/ {
        proxy_pass http://YOUR_APISERVER_IP:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### WebServer Setup Commands
```bash
# Install Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Setup SSL certificate
sudo certbot --nginx -d your-domain.com

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Test configuration
sudo nginx -t
sudo systemctl reload nginx
```

## Database Setup

### PostgreSQL Installation and Configuration
```bash
# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Create databases and user
sudo -u postgres psql << EOF
CREATE DATABASE o4o_platform;
CREATE DATABASE ai_services;
CREATE DATABASE rpa_services;

CREATE USER o4o_user WITH PASSWORD 'SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
GRANT ALL PRIVILEGES ON DATABASE ai_services TO o4o_user;
GRANT ALL PRIVILEGES ON DATABASE rpa_services TO o4o_user;

-- Enable required extensions
\c o4o_platform;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c ai_services;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c rpa_services;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
EOF

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Uncomment and modify: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 127.0.0.1/32 md5

sudo systemctl restart postgresql
```

## Monitoring and Maintenance

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Log viewing
pm2 logs
pm2 logs o4o-platform
pm2 logs ai-services --lines 100

# Process management
pm2 restart all
pm2 reload all
pm2 stop all
pm2 delete all
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt-get install -y htop iotop netstat-nat

# Check resource usage
htop
df -h
free -h

# Check network connections
sudo netstat -tlnp | grep :300
```

### Backup Scripts
```bash
#!/bin/bash
# backup-databases.sh

BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup databases
pg_dump -h localhost -U o4o_user o4o_platform > $BACKUP_DIR/o4o_platform_$DATE.sql
pg_dump -h localhost -U o4o_user ai_services > $BACKUP_DIR/ai_services_$DATE.sql
pg_dump -h localhost -U o4o_user rpa_services > $BACKUP_DIR/rpa_services_$DATE.sql

# Compress old backups
find $BACKUP_DIR -name "*.sql" -type f -mtime +7 -exec gzip {} \;

# Remove old compressed backups (older than 30 days)
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +30 -delete

echo "✅ Database backup completed: $DATE"
```

## Security Configuration

### Firewall Setup
```bash
# Install and configure UFW
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS (WebServer only)
sudo ufw allow 80
sudo ufw allow 443

# Allow API ports (APIServer only, restrict to WebServer IP)
sudo ufw allow from WEBSERVER_IP to any port 3000
sudo ufw allow from WEBSERVER_IP to any port 3001  
sudo ufw allow from WEBSERVER_IP to any port 3004

# Allow PostgreSQL (if database is separate server)
sudo ufw allow from APISERVER_IP to any port 5432
```

### Environment Variables Security
```bash
# Secure environment files
sudo chown deploy:deploy /home/deploy/microservices/*/.env
sudo chmod 600 /home/deploy/microservices/*/.env

# Never commit .env files to git
echo "*.env" >> /home/deploy/microservices/.gitignore
```

## Deployment Checklist

### Pre-deployment
- [ ] Server access confirmed (SSH keys)
- [ ] Domain DNS configured
- [ ] SSL certificate ready
- [ ] Database credentials secured
- [ ] Environment variables configured

### Deployment Steps
- [ ] Install system dependencies
- [ ] Clone/upload application code
- [ ] Install application dependencies
- [ ] Build applications
- [ ] Configure environment files
- [ ] Setup database
- [ ] Configure PM2 ecosystem
- [ ] Start services
- [ ] Configure Nginx
- [ ] Test all endpoints

### Post-deployment
- [ ] Verify all services running
- [ ] Test API endpoints
- [ ] Check logs for errors
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Document access credentials

## Testing Endpoints

### Health Checks
```bash
# Test all services
curl https://your-domain.com/health
curl https://your-domain.com/api/health
curl https://your-domain.com/ai/health  
curl https://your-domain.com/rpa/health

# Test specific functionality
curl -X POST https://your-domain.com/ai/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "test", "preferences": ["electronics"]}'
```

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install -y apache2-utils

# Basic load test
ab -n 1000 -c 10 https://your-domain.com/api/health
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Check `sudo netstat -tlnp | grep :3000`
2. **Permission errors**: Verify file ownership and permissions
3. **Memory issues**: Check `free -h` and PM2 logs
4. **Database connections**: Test with `psql -h localhost -U o4o_user -d o4o_platform`

### Log Locations
- **PM2 logs**: `/home/deploy/.pm2/logs/`
- **Nginx logs**: `/var/log/nginx/`
- **PostgreSQL logs**: `/var/log/postgresql/`
- **System logs**: `/var/log/syslog`

---

## 🚀 Quick Start Commands

```bash
# 1. Download and run deployment script
wget https://raw.githubusercontent.com/renagang21/renagang21/master/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh

# 2. Manual deployment (if wget fails)
git clone https://github.com/renagang21/renagang21.git /home/deploy/microservices
cd /home/deploy/microservices
# Follow manual setup steps above

# 3. Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "🎉 Microservices platform deployed successfully!"
```
