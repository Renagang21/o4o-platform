# O4O Platform Troubleshooting Guide

## 🔍 Common Issues and Solutions

### 1. White Screen / Blank Page

**Symptoms:**
- Application loads but shows blank white screen
- No error messages visible

**Solutions:**
1. Check browser console for errors (F12)
2. Verify API server is running:
   ```bash
   curl http://localhost:4000/api/health
   ```
3. Check CORS configuration in API server
4. Ensure environment variables are set:
   ```bash
   cd apps/ecommerce
   cp .env.example .env
   # Edit .env with correct values
   ```

### 2. Authentication Issues

**Symptoms:**
- Cannot login
- "Unauthorized" errors
- Session expires immediately

**Solutions:**
1. Check cookie domain settings:
   ```bash
   # In API server .env
   COOKIE_DOMAIN=localhost  # for development
   ```
2. Verify JWT secrets match:
   ```bash
   # All apps must use same JWT_SECRET
   ```
3. Clear browser cookies and try again
4. Check Redis connection for session storage

### 3. Database Connection Errors

**Error: "password authentication failed"**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
PGPASSWORD='your_password' psql -h localhost -U postgres -d o4o_platform

# If password is numeric, ensure it's quoted in .env
DB_PASSWORD="12345678"  # Not DB_PASSWORD=12345678
```

**Error: "relation does not exist"**
```bash
# Run migrations
cd apps/api-server
npm run migration:run
```

### 4. Build Failures

**Error: "Cannot find module '@o4o/types'"**
```bash
# Build packages first
npm run build:packages

# Then build apps
npm run build:apps
```

**Error: "Module not found"**
```bash
# Clean install
npm run clean
npm install
npm run build
```

### 5. Port Already in Use

**Error: "EADDRINUSE: address already in use"**
```bash
# Find process using port
lsof -i :4000  # or 3000, 3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=4001 npm run dev
```

### 6. TypeScript Errors

**Multiple TypeScript errors on build**
```bash
# Check TypeScript version consistency
npm ls typescript

# Fix version conflicts
npm dedupe

# Run type check
npm run type-check
```

### 7. Redis Connection Issues

**Error: "Redis connection refused"**
```bash
# Check Redis is running
redis-cli ping

# Start Redis
sudo systemctl start redis

# Check Redis config
redis-cli CONFIG GET bind
```

### 8. Email Not Sending

**Check SMTP settings:**
```bash
# In .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Not regular password
```

**For Gmail:**
1. Enable 2FA
2. Generate App Password
3. Use App Password in SMTP_PASS

### 9. Performance Issues

**Slow API responses:**
1. Check database indexes
2. Enable query logging:
   ```typescript
   // In connection.ts
   logging: true,
   ```
3. Use Redis caching
4. Check N+1 query problems

**High memory usage:**
```bash
# Check PM2 memory
pm2 monit

# Restart with memory limit
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### 10. Deployment Issues

**GitHub Actions failing:**
1. Check secrets are set correctly
2. Verify SSH keys have no passphrase
3. Check server disk space
4. Review workflow logs

**PM2 not starting:**
```bash
# Check PM2 logs
pm2 logs api-server

# Check ecosystem.config.js paths
pm2 show api-server

# Restart
pm2 delete all
pm2 start ecosystem.config.js
```

## 🛠️ Debugging Commands

### Check System Status
```bash
# Run health check
./scripts/health-check.sh

# Check all services
pm2 status

# View logs
pm2 logs --lines 100

# Monitor resources
pm2 monit
```

### Database Debugging
```bash
# Connect to database
psql -U postgres -d o4o_platform

# Check tables
\dt

# Check specific table
\d users

# Run query
SELECT COUNT(*) FROM users;
```

### API Debugging
```bash
# Test endpoints
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check with verbose output
curl -v http://localhost:4000/api/health
```

### Frontend Debugging
```bash
# Check bundle size
cd apps/ecommerce
npm run build:analyze

# Run with source maps
npm run dev -- --sourcemap

# Check for React errors
# Add to main.tsx:
window.addEventListener('error', console.error);
window.addEventListener('unhandledrejection', console.error);
```

## 📞 Getting Help

1. **Check logs first:**
   - Browser console
   - PM2 logs
   - Server logs

2. **Search existing issues:**
   - GitHub Issues
   - Stack Overflow

3. **Create detailed bug report:**
   - Environment details
   - Steps to reproduce
   - Error messages
   - Screenshots

4. **Emergency contacts:**
   - Dev Team Slack: #o4o-platform
   - On-call: +82-10-XXXX-XXXX