# API Server Status & Documentation

## 🚀 Recent Updates

### Date: 2024-01-24

## ✅ Completed Features

### 1. Authentication System
- **JWT Refresh Token**: Secure token rotation mechanism
- **Login Tracking**: Failed attempt monitoring with account locking
- **Session Management**: Token blacklist and revocation system
- **Security Features**:
  - Account locks after 5 failed attempts in 15 minutes
  - Progressive lock duration (15min → 30min → 1hr)
  - IP-based tracking for security auditing

### 2. Email Notification System
- **User Management Emails**:
  - Account approval notifications
  - Account rejection with reasons
  - Account suspension alerts
  - Account reactivation confirmations
- **Templates**: Responsive HTML emails with Korean localization

### 3. Menu System
- **Database**: `menu_locations` table with default locations
- **Endpoints**:
  - `/api/v1/menus/locations` - Get all menu locations
  - `/api/v1/menus/{id}` - Get menu by ID (supports numeric IDs)
- **Default Locations**:
  - primary - Main navigation
  - footer - Footer menu
  - mobile - Mobile navigation
  - sidebar - Sidebar menu
  - social - Social media links
  - top-bar - Top bar menu

### 4. Public Endpoints
- `/api/public/permalink-settings` - WordPress-compatible permalink configuration
- `/api/public/cpt/types` - Custom post types (no auth required)

## 📦 Database Schema Updates

### New Tables
```sql
-- refresh_tokens
- id (UUID)
- token (unique)
- userId (FK → users)
- expiresAt
- deviceId
- userAgent
- ipAddress
- revoked
- revokedAt
- revokedReason

-- login_attempts
- id (UUID)
- email
- ipAddress
- userAgent
- successful
- failureReason
- deviceId
- location
- attemptedAt

-- menu_locations
- id (UUID)
- key (unique)
- name
- description
- is_active
- order_num
- metadata (JSONB)
- created_at
- updated_at
```

## 🔧 Local Development Setup

### Quick Setup Script
```bash
# Run the sync script
./scripts/sync-local.sh
```

### Manual Setup
```bash
# 1. Pull latest code
git pull origin main

# 2. Setup database
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db < scripts/db-setup.sql

# 3. Build and run
cd apps/api-server
npm install
npm run build
pm2 restart o4o-api-local
```

## 🌍 Environment Variables

### Required
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=o4o_platform

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email (Optional)
EMAIL_SERVICE_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📊 API Health Checks

- `/health` - Basic health check
- `/api/health` - Detailed health status
- `/api/auth/health` - Auth service status
- `/api/ecommerce/health` - Ecommerce service status

## 🔐 Security Features

### Rate Limiting
- Standard endpoints: 100 requests/15min
- Public endpoints: 1000 requests/15min
- Settings endpoints: 2000 requests/15min
- SSO check: 500 requests/15min

### CORS Configuration
Allowed origins:
- https://admin.neture.co.kr
- https://neture.co.kr
- https://shop.neture.co.kr
- https://forum.neture.co.kr
- All localhost ports (development)

## 📝 TODO

### High Priority
- [ ] Commission notification emails
- [ ] Auto-approval business logic
- [ ] OAuth flow implementation

### Medium Priority
- [ ] Product price/inventory fields
- [ ] Shipping tracking system
- [ ] Tax/discount calculations

### Low Priority
- [ ] HTML export functionality
- [ ] Comment system
- [ ] Share tracking

## 🚀 Deployment

### Production
```bash
# Auto-deployed via GitHub Actions on push to main
```

### Local PM2
```bash
pm2 start o4o-api-local
pm2 logs o4o-api-local
pm2 restart o4o-api-local
pm2 stop o4o-api-local
```

## 📚 API Documentation

Swagger UI available at: `http://localhost:4000/api-docs`

## 🐛 Known Issues

1. Email service requires SMTP configuration
2. Some vendor/supplier endpoints need implementation
3. WebSocket session sync is experimental

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/Renagang21/o4o-platform/issues
- Email: support@neture.co.kr