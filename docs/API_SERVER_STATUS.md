# API Server Status & Documentation

## 🚀 Recent Updates

### Date: 2025-01-24

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

### 5. Commission System
- **Email Notifications**: 
  - Commission calculation notifications for vendors
  - Settlement request emails with payment details
- **Auto-approval Logic**:
  - Vendor commissions auto-approved if < 1M KRW and vendor is active after 7 days
  - Supplier settlements auto-approved if < 5M KRW, supplier is active, rating >= 4.5 after 14 days
- **Payment Reminders**: Automated reminders for pending commissions and settlements
- **Interim Reports**: Weekly commission statistics generation

### 6. Shipping Tracking System
- **Entity**: `ShippingTracking` with comprehensive tracking fields
- **Carriers Supported**: CJ Logistics, Korea Post, Hanjin, Lotte, Logen, DHL, FedEx, UPS
- **Features**:
  - Real-time tracking status updates
  - Tracking history with location and timestamps
  - Return shipment processing
  - Delivery statistics and analytics
  - Carrier-specific tracking URLs
  - Batch updates from carrier APIs
- **API Endpoints**:
  - `/api/shipping/track/:trackingNumber` - Public tracking lookup
  - `/api/shipping/tracking` - Create/update tracking (protected)
  - `/api/shipping/statistics` - Delivery analytics

### 7. Tax & Discount Calculation System
- **Pricing Service**: Comprehensive pricing engine with:
  - Role-based pricing (retail, wholesale, affiliate)
  - Quantity-based bulk discounts
  - Coupon system integration
  - Seasonal discount campaigns (Korean shopping seasons)
  - International tax rates (KR VAT 10%, US Sales Tax, JP GST, CN VAT)
  - Shipping cost calculation (domestic and international)
- **Features**:
  - Cart total calculation with multiple products
  - Combined shipping optimization
  - Tax-inclusive pricing
  - Discount stacking rules
  - Korean Won (KRW) currency formatting
- **API Endpoints**:
  - `/api/pricing/calculate` - Single product pricing
  - `/api/pricing/cart-total` - Multi-item cart calculation
  - `/api/pricing/tax-rate` - Get tax rates by country
  - `/api/pricing/shipping` - Calculate shipping costs
  - `/api/pricing/breakdown` - Detailed pricing breakdown

### 8. Product Enhancements
- **Price Fields**: 
  - Multiple pricing tiers (retail, wholesale, affiliate, sale)
  - Cost tracking and compare-at pricing
- **Inventory Management**:
  - Stock quantity tracking
  - Low stock threshold alerts
  - Manage stock toggle
  - Automatic out-of-stock status

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

-- shipping_trackings
- id (UUID)
- orderId (FK → orders)
- carrier (enum)
- trackingNumber
- status (enum)
- estimatedDeliveryDate
- actualDeliveryDate
- recipientName
- recipientSignature
- deliveryNotes
- trackingHistory (JSONB)
- shippingAddress (JSONB)
- shippingCost
- weight
- dimensions (JSONB)
- returnTrackingNumber
- failureReason
- metadata (JSONB)
- createdAt
- updatedAt
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
- [x] Commission notification emails ✅
- [x] Auto-approval business logic ✅
- [x] OAuth flow implementation ✅

### Medium Priority
- [x] Product price/inventory fields ✅
- [x] Shipping tracking system ✅
- [x] Tax/discount calculations ✅

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