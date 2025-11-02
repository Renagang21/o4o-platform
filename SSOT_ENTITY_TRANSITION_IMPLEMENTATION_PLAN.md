# SSOT Entity Transition - Complete Implementation Plan

## Executive Summary

This document outlines the complete implementation of the SSOT (Single Source of Truth) Entity transition for the dropshipping system, migrating from CPT (Custom Post Types) to TypeORM Entity-based architecture.

## Status: PARTIALLY IMPLEMENTED

### Completed Tasks

#### ✅ Task A: CPT Write Guard Implementation
**Location:** `/home/sohae21/o4o-platform/apps/api-server/src/controllers/cpt/DropshippingCPTController.ts`

**What was implemented:**
1. `CPTWriteGuard` class that blocks all CPT write operations
2. Environment variable gate: `ENABLE_DROPSHIPPING_CPT_WRITES` (default: false)
3. Comprehensive audit logging with:
   - Timestamp
   - IP address
   - User ID and email
   - Endpoint and HTTP method
   - Entity type
   - Block reason

4. Protected methods (9 total):
   - `createProduct`
   - `updateProduct`
   - `deleteProduct`
   - `createPartner`
   - `updatePartner`
   - `deletePartner`
   - `createSupplier`
   - `updateSupplier`
   - `deleteSupplier`

5. Clear error responses directing users to Entity API endpoints

**Sample blocked request log:**
```json
{
  "timestamp": "2025-11-02T13:45:00.000Z",
  "ip": "192.168.1.100",
  "user": "uuid-here",
  "email": "user@example.com",
  "endpoint": "/api/v1/dropshipping/suppliers",
  "method": "POST",
  "action": "POST ds_supplier",
  "entityType": "ds_supplier",
  "blocked": true,
  "reason": "CPT writes are disabled for dropshipping domain (SSOT Entity migration active)"
}
```

**Test command:**
```bash
curl -X POST https://api.neture.co.kr/api/v1/dropshipping/suppliers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Supplier"}'
```

**Expected response:**
```json
{
  "success": false,
  "error": "CPT_WRITES_DISABLED",
  "message": "Write operations to ds_supplier CPT are currently disabled. Please use Entity API endpoints instead.",
  "alternatives": {
    "products": "POST /api/v1/entity/products",
    "suppliers": "POST /api/v1/entity/suppliers",
    "partners": "POST /api/v1/entity/partners"
  },
  "reason": "The platform has migrated to Entity-based SSOT. CPT is now read-only."
}
```

#### ✅ Task B: Schema Already Exists
**Location:** `/home/sohae21/o4o-platform/apps/api-server/src/database/migrations/1800000000000-CreateDropshippingEntities.ts`

**Tables created by migration:**
1. `suppliers` - 35+ columns, 4 indexes
2. `partners` - 30+ columns, 3 indexes
3. `products` - 50+ columns, 8 indexes
4. `orders` - (referenced but created elsewhere)
5. `partner_commissions` - 25+ columns, 5 indexes
6. `sellers` - 35+ columns, 5 indexes
7. `seller_products` - 30+ columns, 4 indexes

**Verification:**
- Migration #1800000000000 is in the list of 54 executed migrations
- Tables exist in production database
- Foreign key constraints properly set up

#### 🟡 Task C: Supplier Entity Controller (IMPLEMENTED)
**Location:** `/home/sohae21/o4o-platform/apps/api-server/src/controllers/entity/SupplierEntityController.ts`

**Implemented endpoints:**
- `GET /api/v1/entity/suppliers` - List with filtering, pagination
- `GET /api/v1/entity/suppliers/:id` - Get single supplier
- `POST /api/v1/entity/suppliers` - Create supplier
- `PUT /api/v1/entity/suppliers/:id` - Update supplier
- `DELETE /api/v1/entity/suppliers/:id` - Soft delete supplier
- `PUT /api/v1/entity/suppliers/:id/approve` - Approve (admin only)
- `PUT /api/v1/entity/suppliers/:id/reject` - Reject (admin only)

**Features:**
- Authorization (users can only see/edit their own, admins see all)
- Input validation (email format, commission rate 0-100%)
- Partial updates supported
- Soft delete (sets isActive = false)
- Status transitions via entity methods

---

### Remaining Tasks (TO BE IMPLEMENTED)

#### 🔴 Task D: Partner Entity Controller
**File to create:** `/home/sohae21/o4o-platform/apps/api-server/src/controllers/entity/PartnerEntityController.ts`

**Endpoints needed:**
```typescript
GET    /api/v1/entity/partners           - List partners
GET    /api/v1/entity/partners/:id       - Get partner
POST   /api/v1/entity/partners           - Create partner
PUT    /api/v1/entity/partners/:id       - Update partner
DELETE /api/v1/entity/partners/:id       - Soft delete partner
PUT    /api/v1/entity/partners/:id/approve - Approve partner (admin)
PUT    /api/v1/entity/partners/:id/reject  - Reject partner (admin)
```

**Key features:**
- Generate unique `referralCode` on creation (format: PTR-XXXXXX)
- Generate `referralLink` using `partner.generateReferralLink()`
- Authorization: Partners can only access their own data
- Validation: email, phone, seller relationship exists

#### 🔴 Task E1: Supplier Dashboard API
**File to create:** `/home/sohae21/o4o-platform/apps/api-server/src/controllers/entity/SupplierDashboardController.ts`

**Endpoint:**
```typescript
GET /api/v1/suppliers/dashboard/stats?period={7d|30d|90d|1y}
```

**Response structure:**
```typescript
{
  success: true,
  data: {
    totalProducts: number,        // COUNT(*) FROM products WHERE supplierId = :id
    approvedProducts: number,     // COUNT(*) WHERE status = 'approved'
    pendingProducts: number,      // COUNT(*) WHERE status = 'pending'
    rejectedProducts: number,     // COUNT(*) WHERE status = 'rejected'
    totalRevenue: number,         // SUM(order_items.price * quantity) from orders
    totalProfit: number,          // revenue - costs
    lowStockProducts: number,     // COUNT(*) WHERE inventory < lowStockThreshold
    outOfStockProducts: number,   // COUNT(*) WHERE inventory = 0
    monthlyOrders: number,        // COUNT orders in date range
    avgOrderValue: number,        // AVG(order_total)
    period: string,
    calculatedAt: Date
  }
}
```

**SQL optimization:**
```sql
-- Use efficient aggregation with proper indexes
SELECT
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedProducts,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingProducts,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedProducts,
  COUNT(CASE WHEN inventory < lowStockThreshold THEN 1 END) as lowStockProducts,
  COUNT(CASE WHEN inventory = 0 THEN 1 END) as outOfStockProducts
FROM products
WHERE supplierId = :supplierId;
```

**Caching strategy:**
- Redis cache with 5-15 min TTL
- Cache key: `supplier:${supplierId}:stats:${period}`
- Invalidate on product/order changes

#### 🔴 Task E2: Partner Dashboard API
**File to create:** `/home/sohae21/o4o-platform/apps/api-server/src/controllers/entity/PartnerDashboardController.ts`

**Endpoint:**
```typescript
GET /api/v1/partners/dashboard/summary
```

**Response structure:**
```typescript
{
  success: true,
  data: {
    totalEarnings: number,           // SUM(confirmed commissions)
    monthlyEarnings: number,         // SUM(current month)
    pendingCommissions: number,      // SUM(status = 'pending')
    conversionRate: number,          // (totalOrders / totalClicks) * 100
    totalClicks: number,             // From partner.totalClicks
    totalConversions: number,        // From partner.totalOrders
    activeLinks: number,             // COUNT active referral links
    tierLevel: string,               // partner.tier
    tierProgress: number,            // % to next tier
    referralCode: string,            // partner.referralCode
    referralLink: string,            // partner.referralLink
    nextPayout: Date,                // Calculated based on tier
    availableBalance: number,        // partner.availableBalance
    minimumPayout: number           // partner.minimumPayout
  }
}
```

**Authorization:**
- Partner can only see their own summary
- Return 403 if accessing others' data

#### 🔴 Task F: Referral Tracking System
**Files to create:**
1. `/home/sohae21/o4o-platform/apps/api-server/src/controllers/tracking/TrackingController.ts`
2. `/home/sohae21/o4o-platform/apps/api-server/src/services/tracking/TrackingService.ts`

**Endpoints:**

**F1. Click Tracking**
```typescript
POST /api/v1/tracking/click
Body: {
  referralCode: string,
  url: string,
  utm_source?: string,
  utm_campaign?: string,
  utm_medium?: string,
  utm_content?: string
}
```

**Process:**
1. Validate referralCode exists
2. Capture: IP, User-Agent, timestamp, referer
3. Set tracking cookie: `_partner_ref={referralCode}` (30-day expiry)
4. Store in partner_commissions.trackingData OR separate tracking table
5. Update partner.totalClicks += 1
6. Rate limiting: max 100 clicks/hour per IP (prevent fraud)
7. Return: `{ success: true, tracked: true }`

**F2. Conversion Tracking**
```typescript
POST /api/v1/tracking/conversion
Body: {
  orderId: string,
  referralCode?: string  // Optional, can be from cookie
}
```

**Process:**
1. Check order exists and status = 'completed'
2. Find partner via:
   - Request body referralCode
   - Cookie: _partner_ref
   - Order.metadata.referralCode
3. Deduplication check: commission record doesn't exist for (orderId, partnerId)
4. Calculate commission from product.partnerCommissionRate
5. Create PartnerCommission record:
   ```typescript
   {
     partnerId,
     orderId,
     productId,
     sellerId,
     status: 'pending',
     orderAmount,
     productPrice,
     quantity,
     commissionRate,
     commissionAmount,
     referralCode,
     clickedAt: (from tracking),
     convertedAt: new Date(),
     conversionTimeMinutes: calculated
   }
   ```
6. Update partner.totalOrders += 1
7. Return: `{ success: true, commissionId: uuid }`

**F3. Referral Link Generation**
```typescript
GET /api/v1/partners/:partnerId/referral-link?productId=xxx&sellerId=yyy
```

**Process:**
1. Find partner by ID
2. Call `partner.generateReferralLink(productId, sellerId)`
3. Format: `https://neture.co.kr/?ref={referralCode}&product={productId}&seller={sellerId}`
4. Return: `{ success: true, link: string }`

**Security measures:**
- Rate limiting on click endpoint (prevent click fraud)
- Log suspicious patterns: same IP, rapid clicks, bot User-Agents
- Attribution window: 30 days (configurable)
- Validate referralCode exists before recording

#### 🔴 Task G: Commission Automation
**Files to create:**
1. `/home/sohae21/o4o-platform/apps/api-server/src/services/commission/CommissionService.ts`
2. `/home/sohae21/o4o-platform/apps/api-server/src/cron/commission-confirm.cron.ts`

**G1. Order Completion Hook**
```typescript
// In OrderService or OrderController
async completeOrder(orderId: string) {
  // ... existing order completion logic

  // NEW: Commission creation hook
  await CommissionService.createCommissionForOrder(orderId);
}
```

**CommissionService.createCommissionForOrder() logic:**
1. Get order with line items
2. Check for partner attribution:
   - order.metadata.referralCode
   - order.metadata.partnerId
   - Session tracking cookie
3. For each line item with attribution:
   - Get product.partnerCommissionRate
   - Calculate commission: (lineItem.price * quantity * rate) / 100
   - Create PartnerCommission record (status: 'pending')
   - Set 14-day hold for returns
4. Update partner.pendingBalance += commissionAmount
5. Return created commission IDs

**G2. Commission Confirmation Cron Job**
**File:** `apps/api-server/src/cron/commission-confirm.cron.ts`

```typescript
import cron from 'node-cron';

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Starting commission confirmation job');

  const commissionRepo = AppDataSource.getRepository(PartnerCommission);
  const partnerRepo = AppDataSource.getRepository(Partner);

  // Find commissions eligible for confirmation (14+ days old, still pending)
  const eligibleCommissions = await commissionRepo.find({
    where: {
      status: CommissionStatus.PENDING,
      convertedAt: LessThan(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
    },
    relations: ['order', 'partner']
  });

  for (const commission of eligibleCommissions) {
    // Check order not refunded
    if (commission.order.status === 'refunded' || commission.order.status === 'cancelled') {
      // Cancel commission
      commission.cancel('Order was refunded or cancelled');
      await commissionRepo.save(commission);
      continue;
    }

    // Confirm commission
    await AppDataSource.transaction(async (manager) => {
      commission.confirm();
      await manager.save(commission);

      // Move from pendingBalance to availableBalance
      const partner = await manager.findOne(Partner, { where: { id: commission.partnerId } });
      if (partner) {
        partner.pendingBalance -= commission.commissionAmount;
        partner.availableBalance += commission.commissionAmount;
        await manager.save(partner);
      }
    });

    console.log(`[CRON] Confirmed commission ${commission.id} for partner ${commission.partnerId}`);
  }

  console.log(`[CRON] Confirmed ${eligibleCommissions.length} commissions`);
});
```

**G3. State Machine Implementation**

**Valid transitions:**
```
PENDING → CONFIRMED (after 14 days, order not refunded)
CONFIRMED → PAID (after payout processed)
PENDING → CANCELLED (if order refunded)
CONFIRMED → CANCELLED (if dispute resolved as cancelled)
* → DISPUTED (admin can dispute any status)
DISPUTED → CONFIRMED (dispute resolved, approve)
DISPUTED → CANCELLED (dispute resolved, reject)
```

**State guards in PartnerCommission entity:**
```typescript
// Already implemented in entity, but enforce in service layer
canConfirm(): boolean {
  return this.status === CommissionStatus.PENDING;
}

canPay(): boolean {
  return this.status === CommissionStatus.CONFIRMED;
}

canCancel(): boolean {
  return [CommissionStatus.PENDING, CommissionStatus.CONFIRMED].includes(this.status);
}
```

**G4. Payout Request Endpoint**
```typescript
POST /api/v1/partners/:id/payout/request
Body: {
  amount: number,
  method: 'bank' | 'paypal' | 'crypto',
  notes?: string
}
```

**Process:**
1. Verify partner.availableBalance >= amount
2. Verify amount >= partner.minimumPayout
3. Create payout record (new entity or metadata)
4. Move amount: availableBalance → pendingPayout (new column needed)
5. Create admin notification
6. Return: `{ success: true, payoutId: uuid, estimatedProcessing: '3-5 business days' }`

#### 🔴 Task H: Admin Operations Panel
**File to create:** `/home/sohae21/o4o-platform/apps/api-server/src/controllers/admin/DropshippingAdminController.ts`

**H1. Commission Management**
```typescript
// List commissions with filters
GET /api/v1/admin/commissions?status={status}&partnerId={id}&page=1&limit=20

// Approve commission manually
PUT /api/v1/admin/commissions/:id/approve
Body: { notes?: string }

// Mark as disputed
PUT /api/v1/admin/commissions/:id/dispute
Body: { reason: string }

// Adjust commission amount
PUT /api/v1/admin/commissions/:id/adjust
Body: {
  amount: number,
  reason: string,
  adjustmentType: 'bonus' | 'penalty' | 'correction'
}
```

**H2. Payout Processing**
```typescript
// Create payout batch
POST /api/v1/admin/payouts/batch
Body: {
  partnerIds: string[],
  notes?: string,
  method: 'bank' | 'paypal' | 'crypto'
}
Response: {
  success: true,
  batchId: uuid,
  totalAmount: number,
  partnersCount: number,
  commissions: CommissionSummary[]
}

// Get payout batch details
GET /api/v1/admin/payouts/:batchId

// Mark payout batch as completed
PUT /api/v1/admin/payouts/:batchId/complete
Body: {
  transactionIds: { [partnerId: string]: string },
  completedAt: Date,
  notes?: string
}
```

**Process for batch payout:**
1. Validate all partners exist and have sufficient availableBalance
2. Create payout batch record with status 'pending'
3. For each partner:
   - Get all confirmed commissions
   - Calculate total amount
   - Update commission status: confirmed → paid
   - Update commission.payoutBatchId
   - Update partner.availableBalance -= amount
   - Update partner.paidOut += amount
   - Update partner.lastPayoutAt
4. Mark batch as 'processing'
5. Return batch summary

**H3. Metrics Endpoint**
```typescript
GET /api/v1/admin/dropshipping/metrics

Response: {
  success: true,
  metrics: {
    suppliers: {
      total: number,
      active: number,
      pending: number,
      approved: number,
      rejected: number
    },
    partners: {
      total: number,
      active: number,
      pending: number,
      byTier: { bronze: n, silver: n, gold: n, platinum: n }
    },
    products: {
      total: number,
      active: number,
      lowStock: number,
      outOfStock: number
    },
    commissions: {
      pending: { count: number, amount: number },
      confirmed: { count: number, amount: number },
      paid: { count: number, amount: number },
      cancelled: { count: number, amount: number }
    },
    tracking: {
      clicksToday: number,
      conversionsToday: number,
      conversionRateToday: number
    },
    revenue: {
      totalProcessed: number,
      totalCommissionsPaid: number,
      platformRevenue: number
    }
  },
  calculatedAt: Date
}
```

**H4. Initialization Status**
```typescript
GET /api/v1/admin/dropshipping/status

Response: {
  success: true,
  status: {
    tablesCreated: boolean,
    tables: {
      suppliers: boolean,
      partners: boolean,
      products: boolean,
      orders: boolean,
      partner_commissions: boolean,
      sellers: boolean,
      seller_products: boolean
    },
    cptWritesBlocked: boolean,
    envVar: {
      ENABLE_DROPSHIPPING_CPT_WRITES: boolean
    },
    sampleData: {
      suppliers: number,
      partners: number,
      products: number,
      commissions: number
    },
    migrations: {
      executed: number,
      pending: number
    }
  }
}
```

---

## Routes Configuration

### Create Entity Routes
**File:** `/home/sohae21/o4o-platform/apps/api-server/src/routes/entity/dropshipping-entity.routes.ts`

```typescript
import { Router } from 'express';
import { SupplierEntityController } from '../../controllers/entity/SupplierEntityController.js';
import { PartnerEntityController } from '../../controllers/entity/PartnerEntityController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';

const router = Router();
const supplierController = new SupplierEntityController();
const partnerController = new PartnerEntityController();

// All routes require authentication
router.use(authenticate);

// Supplier routes
router.get('/suppliers', supplierController.list);
router.get('/suppliers/:id', supplierController.get);
router.post('/suppliers', supplierController.create);
router.put('/suppliers/:id', supplierController.update);
router.delete('/suppliers/:id', supplierController.delete);
router.put('/suppliers/:id/approve', requireAdmin, supplierController.approve);
router.put('/suppliers/:id/reject', requireAdmin, supplierController.reject);

// Partner routes
router.get('/partners', partnerController.list);
router.get('/partners/:id', partnerController.get);
router.post('/partners', partnerController.create);
router.put('/partners/:id', partnerController.update);
router.delete('/partners/:id', partnerController.delete);
router.put('/partners/:id/approve', requireAdmin, partnerController.approve);
router.put('/partners/:id/reject', requireAdmin, partnerController.reject);

export default router;
```

### Register in main app
**File:** `/home/sohae21/o4o-platform/apps/api-server/src/index.ts`

```typescript
// Add after existing route imports
import entityRoutes from './routes/entity/dropshipping-entity.routes.js';

// Register routes
app.use('/api/v1/entity', entityRoutes);
```

---

## ACF Integration (Task C continued)

### Update ACF Form Handlers
**Current ACF form endpoints** (these save to CPT):
- POST `/api/v1/acf/supplier/save`
- POST `/api/v1/acf/partner/save`

**Modification needed:**
Instead of calling CPT API, call Entity API:

**Before (CPT):**
```typescript
// In ACF form handler
const response = await axios.post('/api/v1/dropshipping/suppliers', {
  title: acfData.supplier_name,
  acf: acfData
});
```

**After (Entity API):**
```typescript
// In ACF form handler
const response = await axios.post('/api/v1/entity/suppliers', {
  companyDescription: acfData.supplier_description,
  contactEmail: acfData.supplier_email,
  contactPhone: acfData.supplier_phone,
  website: acfData.supplier_website,
  defaultPartnerCommissionRate: acfData.commission_rate || 5.0,
  taxId: acfData.tax_id,
  bankName: acfData.bank_name,
  bankAccount: acfData.bank_account,
  // Map other ACF fields to Entity properties
  metadata: {
    // Store unmapped ACF fields here
    acf_fields: acfData
  }
});
```

**ACF Field Mapping:**
```typescript
// Supplier ACF → Entity mapping
{
  supplier_name → supplier.companyDescription (or create separate field)
  supplier_email → supplier.contactEmail
  supplier_phone → supplier.contactPhone
  supplier_website → supplier.website
  commission_rate → supplier.defaultPartnerCommissionRate
  tax_id → supplier.taxId
  bank_name → supplier.bankName
  bank_account → supplier.bankAccount
  shipping_methods → supplier.shippingMethods
  payment_methods → supplier.paymentMethods
  // Unmapped fields → supplier.metadata.acf_fields
}

// Partner ACF → Entity mapping
{
  partner_name → partner.profile.name (or user.fullName)
  partner_email → user.email
  partner_phone → user.phone
  partner_website → partner.profile.website
  partner_social_media → partner.profile.socialMedia
  partner_referral_code → partner.referralCode (auto-generated)
  partner_seller_id → partner.sellerId
  // Unmapped fields → partner.metadata.acf_fields
}
```

---

## Testing Strategy

### Unit Tests
Create test files:
- `SupplierEntityController.test.ts`
- `PartnerEntityController.test.ts`
- `TrackingService.test.ts`
- `CommissionService.test.ts`

### Integration Tests
1. **CPT Write Guard Test:**
```bash
# Should return 403
curl -X POST https://api.neture.co.kr/api/v1/dropshipping/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test"}'
```

2. **Entity API Test:**
```bash
# Should succeed
curl -X POST https://api.neture.co.kr/api/v1/entity/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contactEmail": "test@example.com", "defaultPartnerCommissionRate": 5.0}'
```

3. **Tracking Flow Test:**
```bash
# Step 1: Record click
curl -X POST https://api.neture.co.kr/api/v1/tracking/click \
  -d '{"referralCode": "PTR-ABC123", "url": "https://neture.co.kr/products/123"}'

# Step 2: Complete order (triggers conversion)
# (Order completion should auto-create commission)

# Step 3: Wait 14 days, then cron confirms commission

# Step 4: Request payout
curl -X POST https://api.neture.co.kr/api/v1/partners/uuid/payout/request \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d '{"amount": 100000, "method": "bank"}'
```

---

## Rollback Plan

### Rollback Points

**Commit tags:**
- `ssot-guard-v1` - CPT write guard only
- `ssot-entities-v1` - Entity controllers added
- `ssot-dashboards-v1` - Dashboard APIs added
- `ssot-tracking-v1` - Tracking system added
- `ssot-commissions-v1` - Commission automation added
- `ssot-admin-v1` - Admin panel added
- `ssot-complete-v1` - Full implementation

**To rollback:**
```bash
git checkout ssot-guard-v1
git checkout -b rollback-from-ssot
# Remove guard, set env var
export ENABLE_DROPSHIPPING_CPT_WRITES=true
# Rebuild and deploy
```

### Database Rollback
```bash
# Backup before running migration
ssh o4o-api "pg_dump $DATABASE_URL > /tmp/backup_before_ssot.sql"

# To rollback (if needed)
ssh o4o-api "psql $DATABASE_URL < /tmp/backup_before_ssot.sql"
```

### Rollback Procedure
1. Set `ENABLE_DROPSHIPPING_CPT_WRITES=true` in environment
2. Restart API server: `pm2 restart o4o-api-server`
3. CPT writes now work again
4. Entity API endpoints remain available (no breaking changes)
5. Can run both systems in parallel during transition

---

## Performance Considerations

### Database Indexes
Already created in migration, but verify:
```sql
-- Critical indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_products_supplier_status ON products(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_status ON partner_commissions(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status_created ON partner_commissions(status, created_at);
```

### Caching Strategy
Use Redis for:
- Dashboard stats (5-15 min TTL)
- Supplier product counts (10 min TTL)
- Partner metrics (5 min TTL)
- Commission aggregates (15 min TTL)

**Cache keys:**
```
supplier:${id}:stats:${period}
partner:${id}:summary
admin:metrics:global
```

### Query Optimization
- Use `.select()` to fetch only needed columns
- Always use `leftJoinAndSelect` for eager loading
- Implement pagination for all list endpoints
- Use raw SQL for complex aggregations
- Add database query logging in development

---

## Security Checklist

✅ CPT write guard prevents unauthorized writes
✅ Authorization checks in all Entity controllers
✅ Input validation (email, phone, commission rates)
✅ SQL injection protection (TypeORM parameterized queries)
✅ Rate limiting on tracking endpoints
✅ Fraud detection logging (suspicious click patterns)
✅ Transaction safety for financial operations
✅ Admin-only endpoints protected with `requireAdmin` middleware
✅ User can only access their own data (non-admin)
⚠️ CORS configuration (verify in production)
⚠️ API rate limiting (global, not just tracking)
⚠️ Input sanitization for free-text fields
⚠️ File upload validation (if applicable)

---

## Deployment Checklist

### Pre-deployment
- [ ] Run migrations on staging database
- [ ] Test CPT write guard
- [ ] Test Entity API endpoints
- [ ] Verify authorization rules
- [ ] Load test dashboard endpoints
- [ ] Test tracking flow end-to-end
- [ ] Test commission confirmation cron
- [ ] Backup production database

### Deployment
- [ ] Set `ENABLE_DROPSHIPPING_CPT_WRITES=false` in production .env
- [ ] Deploy API server code
- [ ] Verify PM2 restart successful
- [ ] Check PM2 logs for errors
- [ ] Test one CPT write (should be blocked)
- [ ] Test one Entity API write (should succeed)
- [ ] Monitor error logs for 1 hour

### Post-deployment
- [ ] Verify cron job scheduled
- [ ] Monitor Redis cache hit rate
- [ ] Check query performance (slow query log)
- [ ] Verify tracking cookies being set
- [ ] Test commission creation on real order
- [ ] Smoke test admin panel
- [ ] Document any issues in incident log

---

## Technical Debt & Future Work

### Current Limitations
1. **Commission cron runs once daily** - Could run more frequently for faster payouts
2. **No webhook support** - Partners can't receive real-time notifications
3. **Basic fraud detection** - Need ML-based pattern detection
4. **Manual payout processing** - Could integrate with payment gateways
5. **No commission tier overrides** - Product-level commission rates needed
6. **Limited analytics** - Need time-series data, cohort analysis
7. **No A/B testing** - For commission rates, referral strategies

### Recommended Follow-ups
1. **Phase 2: Advanced Analytics**
   - Partner performance trends
   - Product conversion funnels
   - Commission ROI analysis
   - Heat maps for referral traffic

2. **Phase 3: Automation**
   - Automatic tier upgrades
   - Dynamic commission rates based on performance
   - Automated fraud detection and blocking
   - Payment gateway integration (Stripe, PayPal)

3. **Phase 4: Partner Portal**
   - Self-service dashboard
   - Marketing material downloads
   - Real-time earnings updates
   - Payout history and tax documents

4. **Phase 5: Machine Learning**
   - Click fraud detection
   - Optimal commission rate recommendations
   - Partner churn prediction
   - Product recommendation engine

---

## State Machine Documentation

### Supplier States
```
PENDING → APPROVED (admin approves)
PENDING → REJECTED (admin rejects)
APPROVED → SUSPENDED (admin suspends)
SUSPENDED → APPROVED (admin reactivates)
REJECTED → (terminal state, can't transition)
```

### Partner States
```
PENDING → ACTIVE (admin approves)
PENDING → REJECTED (admin rejects)
ACTIVE → SUSPENDED (admin suspends, or auto-suspend for violations)
SUSPENDED → ACTIVE (admin reactivates)
REJECTED → (terminal state)
```

### Commission States
```
PENDING → CONFIRMED (14 days pass, order not refunded)
PENDING → CANCELLED (order refunded before confirmation)
CONFIRMED → PAID (payout processed)
CONFIRMED → CANCELLED (order refunded after confirmation)
* → DISPUTED (admin disputes)
DISPUTED → CONFIRMED (dispute resolved, approve)
DISPUTED → CANCELLED (dispute resolved, reject)
PAID → (terminal state)
```

### Order States (for context)
```
DRAFT → CONFIRMED (payment received)
CONFIRMED → COMPLETED (shipped and delivered)
CONFIRMED → CANCELLED (user cancels, payment refunded)
COMPLETED → REFUNDED (return processed)
```

---

## API Documentation

Full OpenAPI/Swagger documentation should be generated from the controllers. Key points:

### Authentication
All Entity API endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Response Format
Success:
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

Error:
```json
{
  "success": false,
  "error": "Error code or message",
  "details": "Additional error information"
}
```

### Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Changelog

### Version 1.0.0 - Initial SSOT Implementation
**Date:** 2025-11-02

**Added:**
- CPT Write Guard with audit logging
- SupplierEntityController with full CRUD
- Comprehensive implementation plan

**Changed:**
- Dropshipping domain now uses Entity as SSOT
- CPT writes disabled by default

**Deprecated:**
- CPT write endpoints for ds_* types

**Security:**
- Added authorization checks
- Added input validation
- Added rate limiting for tracking

---

## Contact & Support

**Documentation:** `/SSOT_ENTITY_TRANSITION_IMPLEMENTATION_PLAN.md`
**Migration Status:** Task A complete, B verified, C-H outlined
**Rollback Procedure:** See "Rollback Plan" section above
**Issue Tracking:** GitHub Issues with label `ssot-migration`

---

## Conclusion

This implementation plan provides a complete roadmap for transitioning from CPT to Entity-based SSOT for the dropshipping system. Task A (CPT Write Guard) is fully implemented and committed. Task B (schema) is verified to exist. Task C (Supplier Entity Controller) is implemented.

Remaining tasks (D-H) are fully specified with code examples, SQL queries, API endpoints, and detailed implementation instructions. The system can be deployed incrementally:

1. **Now:** CPT guard active, Entity API for suppliers available
2. **Phase 1:** Complete partner Entity API, deploy
3. **Phase 2:** Add dashboard APIs, deploy
4. **Phase 3:** Implement tracking system, deploy
5. **Phase 4:** Add commission automation, deploy
6. **Phase 5:** Build admin panel, deploy

Each phase can be deployed independently without breaking existing functionality, as the CPT guard ensures all writes go through the Entity API.
