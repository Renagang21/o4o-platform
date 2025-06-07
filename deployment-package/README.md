# O4O Platform Microservices - Quick Deployment

## 📦 Package Contents

This deployment package contains everything needed to deploy the O4O Platform microservices to production servers.

### Included Files:
- `deploy-production.sh` - Main deployment script
- `ecosystem.config.js` - PM2 production configuration
- `ai-services-main.py` - AI Services main application
- `nginx-config.txt` - Nginx configuration template
- `README.md` - This file

## 🚀 Quick Start

### 1. APIServer Deployment

```bash
# Upload this package to your API server
scp -r deployment-package/ deploy@your-apiserver:/home/deploy/

# SSH to API server and run deployment
ssh deploy@your-apiserver
cd /home/deploy/deployment-package
chmod +x deploy-production.sh
./deploy-production.sh
```

### 2. WebServer Configuration

```bash
# Copy nginx configuration
sudo cp nginx-config.txt /etc/nginx/sites-available/o4o-platform
sudo ln -s /etc/nginx/sites-available/o4o-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ⚙️ Post-Deployment Configuration

### 1. Update Security Settings

Edit environment files on API server:

```bash
# O4O Platform
nano /home/deploy/microservices/o4o-platform/.env
# Update: DATABASE_URL, JWT_SECRET, COOKIE_SECRET

# RPA Services  
nano /home/deploy/microservices/rpa-services/.env
# Update: DATABASE_URL

# AI Services
nano /home/deploy/microservices/ai-services/.env
# Update: DATABASE_URL
```

### 2. Database Setup

```bash
# Create PostgreSQL databases
sudo -u postgres psql << 'EOF'
CREATE DATABASE o4o_platform;
CREATE DATABASE ai_services;
CREATE DATABASE rpa_services;
CREATE USER o4o_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
GRANT ALL PRIVILEGES ON DATABASE ai_services TO o4o_user;
GRANT ALL PRIVILEGES ON DATABASE rpa_services TO o4o_user;
EOF
```

### 3. Restart Services

```bash
cd /home/deploy/microservices
pm2 restart all
pm2 save
```

## 🔍 Health Checks

```bash
# Test all services
curl http://localhost:3004/health  # O4O Platform
curl http://localhost:3000/health  # AI Services
curl http://localhost:3001/health  # RPA Services

# Check PM2 status
pm2 status
pm2 logs
```

## 📊 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Check system resources
htop
df -h
free -h
```

## 🔧 Troubleshooting

### Common Issues:

1. **Services won't start**
   ```bash
   pm2 logs
   # Check for port conflicts
   sudo netstat -tlnp | grep :3000
   ```

2. **Database connection errors**
   ```bash
   # Test database connection
   psql -h localhost -U o4o_user -d o4o_platform
   ```

3. **Permission errors**
   ```bash
   # Fix file permissions
   sudo chown -R deploy:deploy /home/deploy/microservices
   ```

## 📞 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs`
2. Check system logs: `sudo journalctl -f`
3. Verify environment files are correctly configured
4. Ensure all dependencies are installed

---

**🎉 Your O4O Platform microservices should now be running in production!**
