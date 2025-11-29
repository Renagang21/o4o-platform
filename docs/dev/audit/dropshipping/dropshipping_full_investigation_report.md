# Dropshipping Full Investigation Report

**Investigation Date:** 2025-11-29
**Branch:** develop
**Scope:** Complete backend and frontend analysis for Core/Extension separation
**Investigator:** Claude (Sonnet 4.5)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Chapter 1: Current Implementation Deep Dive](#chapter-1-current-implementation-deep-dive)
3. [Chapter 2: Comparison with Forum Pattern](#chapter-2-comparison-with-forum-pattern)
4. [Chapter 3: Core/Extension Analysis](#chapter-3-coreextension-analysis)
5. [Chapter 4: Data Model Analysis](#chapter-4-data-model-analysis)
6. [Chapter 5: UI Architecture Analysis](#chapter-5-ui-architecture-analysis)
7. [Chapter 6: Business Logic Analysis](#chapter-6-business-logic-analysis)
8. [Chapter 7: Risk Assessment](#chapter-7-risk-assessment)

---

## Executive Summary

### Key Findings

1. **Architectural State:**
   - Dropshipping is a **monolithic implementation** embedded in `apps/api-server`
   - **90+ files** across backend entities, services, controllers, routes, and frontend UI
   - **~33,000+ lines of code** spread across API server, admin dashboard, and main site
   - **NOT modularized** as a packageable app like Forum

2. **Separation Feasibility:**
   - ✅ **Core business logic is identifiable** and can be extracted
   - ⚠️ **High coupling** between entities, services, and UI components
   - ⚠️ **Dual storage strategy** (TypeORM + CPT) adds complexity
   - ⚠️ **Production-critical system** requires careful migration

3. **Forum Pattern Applicability:**
   - ✅ Forum's `Core + Extension` pattern is **applicable** to Dropshipping
   - ✅ Clear separation between **generic dropshipping logic** and **service-specific metadata**
   - ⚠️ More complex than Forum due to **financial operations** (commission, settlement)
   - ⚠️ Requires **phased migration** to avoid breaking production

4. **Service-Specific Extensions:**
   - **Cosmetics:** Skin type, ingredients, beauty concerns, product categories
   - **Pharmacy:** Medication metadata, dosage, contraindications, prescription requirements, organization features
   - **Travel:** Destinations, schedules, booking info, travel packages

### Recommendation

**Proceed with Core/Extension separation** following the Forum App pattern, but with a **phased, cautious approach** due to:
- Production-critical financial operations
- Complex entity relationships
- Extensive UI customization requirements
- Need for backward compatibility

---

## Chapter 1: Current Implementation Deep Dive

### 1.1 Entity Analysis

#### 1.1.1 Product Entity (`apps/api-server/src/entities/Product.ts`)

**Purpose:** Core supplier product with comprehensive ecommerce features

**Fields (40+ total):**

**Core Product Info:**
- `id` (UUID), `supplierId`, `categoryId`
- `name`, `description`, `shortDescription`
- `sku`, `slug`
- `type` (PHYSICAL, DIGITAL, SERVICE, SUBSCRIPTION)
- `status` (DRAFT, ACTIVE, INACTIVE, OUT_OF_STOCK, DISCONTINUED)

**Pricing:**
- `supplierPrice` (공급가 - decimal 10,2)
- `recommendedPrice` (권장 판매가 - decimal 10,2)
- `comparePrice` (정가 for discount comparison)
- `currency` (default: KRW)

**Commission (Phase PD-2):**
- `commissionType` ('rate' | 'fixed')
- `commissionValue` (decimal 10,4)
- `sellerCommissionRate` (optional override)
- `platformCommissionRate` (platform share)
- **Legacy fields:**
  - `partnerCommissionRate` (deprecated but kept for backward compatibility)
  - `partnerCommissionAmount`

**Inventory:**
- `inventory`, `lowStockThreshold`, `trackInventory`, `allowBackorder`

**Media:**
- `images` (JSONB: main, gallery[], thumbnails[])
- `tags` (simple-array)

**Variants:**
- `variants` (JSONB: id, name, sku, price, inventory, attributes)
- `hasVariants` (boolean)

**Physical Product:**
- `dimensions` (JSONB: length, width, height, weight, unit)
- `shipping` (JSONB: ShippingInfo)

**SEO:**
- `seo` (JSONB: title, description, keywords, slug)
- `features` (simple-array)
- `specifications` (text)

**Supplier Tier Pricing (Document #66):**
- `tierPricing` (JSONB: bronze, silver, gold, platinum prices)

**Additional:**
- `brand`, `model`, `warranty`
- `metadata` (JSONB - extensible)
- `createdAt`, `updatedAt`, `publishedAt`

**Helper Methods:**
```typescript
getCurrentPrice(sellerTier): number
getCommissionPolicy(): {type, value} | null
calculatePartnerCommission(salePrice): number
isInStock(): boolean
isLowStock(): boolean
getMainImage(): string | null
isPublished(): boolean
getDiscountPercentage(): number
reduceInventory(quantity): void
increaseInventory(quantity): void
canOrder(quantity): boolean
```

**Relationships:**
- ManyToOne: Supplier
- ManyToOne: Category
- (Implicitly referenced by SellerProduct, SellerAuthorization, Commission)

**Analysis:**
- ✅ **Core candidate:** Generic product structure is reusable across all services
- ⚠️ **Extension point:** `metadata` JSONB field can store service-specific data
- ⚠️ **Commission logic:** Complex commission calculation should remain in Core
- ⚠️ **Tier pricing:** Business logic specific to Korean marketplace, but generalizable

---

#### 1.1.2 Supplier Entity (`apps/api-server/src/entities/Supplier.ts`)

**Purpose:** Supplier (wholesaler) profile with tier system and pricing policies

**Fields (30+ total):**

**User Relationship:**
- `id`, `userId` (One-to-One with User)
- `businessInfo` (One-to-One with BusinessInfo entity)

**Status & Tier:**
- `status` (PENDING, APPROVED, SUSPENDED, REJECTED)
- `tier` (BASIC, PREMIUM, ENTERPRISE)
- `isActive`

**Company Info:**
- `companyDescription`, `specialties[]`, `certifications[]`, `website`

**Pricing & Policies (Document #66):**
- `sellerTierDiscounts` (JSON: bronze, silver, gold, platinum discount rates)
- `supplierPolicy` (JSON: SupplierPolicy - min/max order, processing time, policies)
- `defaultPartnerCommissionRate` (decimal 5,2 - default 5.0%)
- `defaultPartnerCommissionAmount` (fixed commission option)

**Financial:**
- `taxId`, `bankName`, `bankAccount`, `accountHolder`

**Performance:**
- `metrics` (JSON: SupplierMetrics - products, orders, revenue, rating, fulfillment)
- `averageRating`, `totalReviews`

**Contact:**
- `contactPerson`, `contactPhone`, `contactEmail`

**Operational:**
- `operatingHours[]`, `timezone`, `shippingMethods[]`, `paymentMethods[]`

**Additional:**
- `foundedYear`, `employeeCount`, `socialMedia` (JSON), `metadata` (JSON)
- Timestamps: `createdAt`, `updatedAt`, `approvedAt`, `approvedBy`

**Helper Methods:**
```typescript
isApproved(): boolean
canCreateProducts(): boolean
getDiscountedPrice(originalPrice, sellerTier): number
calculatePartnerCommission(salePrice, productCommissionRate?): number
getMaxProducts(): number  // Tier-based limits
getCommissionRate(): number  // Platform fee by tier
updateMetrics(metrics): void
updateRating(newRating): void
approve(approvedBy): void
suspend(): void
reject(): void
reactivate(): void
```

**Relationships:**
- OneToOne: User, BusinessInfo
- OneToMany: Product

**Analysis:**
- ✅ **Core candidate:** Generic supplier management
- ⚠️ **Extension point:** `specialties[]` and `certifications[]` can be service-specific
- ✅ **Tier system:** Generalizable business model
- ⚠️ **Commission policies:** Core logic with extension overrides possible

---

#### 1.1.3 Seller Entity (`apps/api-server/src/entities/Seller.ts`)

**Purpose:** Seller (retailer) profile with tier system and store branding

**Fields (35+ total):**

**User Relationship:**
- `id`, `userId` (One-to-One with User)
- `businessInfo` (One-to-One with BusinessInfo)

**Status & Tier:**
- `status` (PENDING, APPROVED, SUSPENDED, REJECTED)
- `tier` (BRONZE, SILVER, GOLD, PLATINUM)
- `isActive`

**Store Branding (Document #66):**
- `branding` (JSON: SellerBranding)
  - `storeName`, `storeDescription`, `logo`, `banner`
  - `colors: { primary, secondary }`
- `storeSlug` (unique URL)

**Policies:**
- `policies` (JSON: return, shipping, customer service, terms)

**Performance:**
- `metrics` (JSON: SellerMetrics - products, orders, revenue, conversion, satisfaction)
- `averageRating`, `totalReviews`

**Financial:**
- `totalRevenue`, `monthlyRevenue`
- `platformCommissionRate` (default 2.5%)

**Product Management:**
- `productCount`, `activeProductCount`

**Customer Service:**
- `responseTime`, `customerSatisfactionRate`

**Operational:**
- `operatingHours[]`, `timezone`, `shippingMethods[]`, `paymentMethods[]`

**Marketing:**
- `featuredSeller`, `featuredUntil`, `specialOffers[]`
- `socialMedia` (JSON), `marketingDescription`

**Partner Program (Document #66):**
- `allowPartners` (enable/disable partner recruitment)
- `partnerInviteMessage`, `partnerRequirements[]`

**Helper Methods:**
```typescript
isApproved(): boolean
canSellProducts(): boolean
getSupplierDiscountEligibility(): number  // By tier
getMaxProducts(): number  // Tier limits
getPlatformCommissionRate(): number  // Tier-based
checkTierUpgradeEligibility(): SellerTier | null
updateMetrics(metrics): void
updateRating(newRating): void
addRevenue(amount): void
incrementProductCount(): void
decrementProductCount(isActive): void
approve(approvedBy): void
suspend(): void
reject(): void
reactivate(): void
upgradeTier(newTier): void
getStoreUrl(): string
updateLastActive(): void
```

**Relationships:**
- OneToOne: User, BusinessInfo
- (Implicitly referenced by SellerProduct, Partner, Settlement)

**Analysis:**
- ✅ **Core candidate:** Generic seller management
- ⚠️ **Extension point:** `branding` and `storeSlug` enable service-specific storefronts
- ✅ **Tier system:** Generalizable across services
- ⚠️ **Partner program:** Core feature with service-specific recruitment strategies

---

#### 1.1.4 SellerProduct Entity (`apps/api-server/src/entities/SellerProduct.ts`)

**Purpose:** Seller's imported product with custom pricing and sync policy (Phase PD-3)

**Fields (15 total):**

**Relationships:**
- `sellerId`, `seller` (ManyToOne User)
- `productId`, `product` (ManyToOne Product, eager loaded)

**Pricing:**
- `salePrice` (seller's selling price)
- `basePriceSnapshot` (supplier price at import time)
- `costPrice`, `profit`, `profitMargin`
- `marginRate` (0-1, e.g., 0.25 = 25%)
- `marginAmount` (salePrice - basePrice)

**Sync Policy:**
- `syncPolicy` ('auto' | 'manual')

**Status:**
- `status` (ACTIVE, INACTIVE, OUT_OF_STOCK, DISCONTINUED)
- `isActive`

**Inventory:**
- `sellerInventory`
- `supplierInventorySnapshot` (for auto-sync tracking)

**Sales Stats:**
- `salesCount`, `totalSold`

**Timestamps:**
- `addedAt`, `createdAt`, `updatedAt`

**Helper Methods:**
```typescript
calculateMarginAmount(): number
calculateMarginRate(): number
updatePricing(salePrice, basePrice?): void
applySalePriceFromMargin(marginRate): void
needsPriceSync(currentSupplierPrice): boolean
syncPriceWithSupplier(currentSupplierPrice): void
```

**Unique Constraint:**
- `(sellerId, productId)` - one import per seller per product

**Analysis:**
- ✅ **Core candidate:** Generic seller catalog management
- ✅ **Auto-sync logic:** Core feature for price synchronization
- ⚠️ **Margin calculation:** Business logic should remain in Core
- ✅ **Extension point:** Minimal - mostly structural

---

#### 1.1.5 SellerAuthorization Entity (`apps/api-server/src/entities/SellerAuthorization.ts`)

**Purpose:** Product-level authorization for sellers to sell supplier products (Phase 9)

**Business Rules:**
- One authorization per (seller, product) pair (UNIQUE constraint)
- 10-product limit per seller (enforced in business logic)
- 30-day cooldown after rejection (configurable)
- Permanent revocation capability
- Self-seller auto-approval (supplier_id = seller.user.supplier_id)

**States:**
- `REQUESTED` - Awaiting supplier approval
- `APPROVED` - Seller can sell
- `REJECTED` - Cooldown period active
- `REVOKED` - Permanently revoked
- `CANCELLED` - Seller cancelled request

**Fields (15 total):**

**Foreign Keys:**
- `sellerId`, `seller`
- `productId`, `product`
- `supplierId`, `supplier`

**Status:**
- `status` (AuthorizationStatus enum)

**State Timestamps:**
- `requestedAt`, `approvedAt`, `rejectedAt`, `revokedAt`, `cancelledAt`

**Reasons:**
- `rejectionReason`, `revocationReason`

**Actor Tracking:**
- `approvedBy`, `rejectedBy`, `revokedBy`

**Business Rules:**
- `cooldownUntil` (timestamp for re-request eligibility)
- `expiresAt` (optional expiration)

**Metadata:**
- `metadata` (JSONB - extensible)

**Helper Methods:**
```typescript
isApproved(): boolean
isInCooldown(): boolean
canRequest(): boolean
approve(approvedBy): void
reject(rejectedBy, reason, cooldownDays = 30): void
revoke(revokedBy, reason): void
cancel(): void
getCooldownDaysRemaining(): number
getErrorMessage(): string
```

**Indexes:**
- `(sellerId, productId)` UNIQUE
- `(productId, status)`
- `(sellerId, status)`
- `(supplierId, status)`
- `(supplierId, requestedAt)`
- `(sellerId, productId, cooldownUntil)`

**Analysis:**
- ✅ **Core candidate:** Generic authorization workflow
- ✅ **State machine:** Well-defined transitions
- ⚠️ **Cooldown logic:** Business rule that may vary by service
- ✅ **Extension point:** `metadata` for service-specific approval criteria

---

#### 1.1.6 Partner Entity (`apps/api-server/src/entities/Partner.ts`)

**Purpose:** Affiliate partner with referral tracking and commission earnings (Document #66)

**Fields (40+ total):**

**User & Seller Relationship:**
- `userId` (One-to-One with User)
- `sellerId` (ManyToOne Seller) - Partner chooses which seller to promote

**Status & Tier:**
- `status` (PENDING, ACTIVE, SUSPENDED, REJECTED)
- `tier` (BRONZE, SILVER, GOLD, PLATINUM)
- `isActive`

**Referral System (Document #66):**
- `referralCode` (unique, e.g., "PART123")
- `referralLink` (tracking URL with ref parameter)

**Partner Profile:**
- `profile` (JSON: PartnerProfile)
  - `bio`, `website`
  - `socialMedia: { youtube, instagram, facebook, twitter, tiktok, blog }`
  - `audience: { size, demographics, interests[] }`
  - `marketingChannels[]`

**Performance Metrics:**
- `metrics` (JSON: PartnerMetrics)
  - `totalClicks`, `totalOrders`, `totalRevenue`, `totalCommission`
  - `conversionRate`, `averageOrderValue`
  - Monthly metrics: `clicksThisMonth`, `ordersThisMonth`, `revenueThisMonth`, `commissionThisMonth`

**Commission & Earnings:**
- `totalEarnings`, `availableBalance`, `pendingBalance`, `paidOut`

**Payout Info:**
- `payoutInfo` (JSON: PayoutInfo - bank/paypal/crypto)
- `minimumPayout` (default 50,000 KRW)

**Performance Tracking:**
- `totalClicks`, `totalOrders`, `conversionRate`, `averageOrderValue`
- `monthlyClicks`, `monthlyOrders`, `monthlyEarnings`

**Application:**
- `applicationMessage`, `rejectionReason`

**Marketing Materials:**
- `allowedPromotionTypes[]`
- `canUseProductImages`, `canCreateCoupons`

**Communication:**
- `emailNotifications`, `smsNotifications`, `preferredLanguage`

**Webhook:**
- `webhookUrl`, `webhookSecret`, `webhookEnabled`, `webhookEvents[]`, `webhookLastDeliveredAt`

**Helper Methods:**
```typescript
isApproved(): boolean
canPromote(): boolean
generateReferralLink(productId?, sellerId?): string
getCommissionBonus(): number  // Tier-based bonus
getPayoutFrequency(): string  // Tier-based frequency
checkTierUpgradeEligibility(): PartnerTier | null
recordClick(): void
recordOrder(orderValue, commission): void
updateMetrics(metrics): void
processPayout(amount): boolean
confirmPendingBalance(): void
resetMonthlyMetrics(): void
approve(approvedBy): void
suspend(): void
reject(reason): void
reactivate(): void
upgradeTier(newTier): void
updateLastActive(): void
```

**Analysis:**
- ✅ **Core candidate:** Generic affiliate system
- ✅ **Referral tracking:** Core feature for all services
- ⚠️ **Extension point:** `profile.audience` and `marketingChannels` may vary by service
- ⚠️ **Tier bonuses:** Business rules that may differ by service

---

#### 1.1.7 Commission Entity (`apps/api-server/src/entities/Commission.ts`)

**Purpose:** Commission records with state machine (Phase 2.1)

**State Machine:**
- `PENDING` → Commission created, awaiting hold period
- `CONFIRMED` → Hold period passed, ready for payment
- `PAID` → Payment completed
- `CANCELLED` → Order cancelled/refunded

**Fields (15 total):**

**Relationships:**
- `partnerId`, `partner`
- `productId`, `product`
- `sellerId` (optional)
- `orderId`
- `conversionId` (UNIQUE - one commission per conversion)
- `policyId`, `policy` (CommissionPolicy)

**Referral:**
- `referralCode`

**Status:**
- `status` (CommissionStatus enum)

**Financial:**
- `commissionAmount`, `orderAmount`, `currency`
- `commissionRate` (if applicable)
- `policyType` (snapshot at creation)

**Hold Period:**
- `holdUntil` (commission confirmed after this date - refund window)

**Payment:**
- `paymentMethod`, `paymentReference`

**Metadata:**
- `metadata` (JSON)
  - `policyCode`, `policyName`
  - `attributionModel`, `attributionWeight`
  - `conversionType`
  - `adjustmentHistory[]` (audit trail)
  - `cancellationReason`
  - `paymentReference`

**Timestamps:**
- `createdAt`, `updatedAt`, `confirmedAt`, `paidAt`, `cancelledAt`

**Helper Methods:**
```typescript
isPending(): boolean
isConfirmed(): boolean
isPaid(): boolean
isCancelled(): boolean
canConfirm(): boolean
canPay(): boolean
canCancel(): boolean
confirm(): void
markAsPaid(paymentMethod, paymentReference?): void
cancel(reason?, adminId?): void
adjustAmount(newAmount, reason, adminId?): void
validate(): {isValid, errors[]}
```

**Analysis:**
- ✅ **Core candidate:** Generic commission tracking
- ✅ **State machine:** Well-defined lifecycle
- ✅ **Hold period:** Core refund window logic
- ⚠️ **Extension point:** `metadata` for service-specific attribution models

---

#### 1.1.8 CommissionPolicy Entity (`apps/api-server/src/entities/CommissionPolicy.ts`)

**Purpose:** Commission calculation rules with priority-based conflict resolution

**Policy Types:**
- `DEFAULT` - Platform-wide default
- `TIER_BASED` - Based on partner tier
- `PRODUCT_SPECIFIC` - Specific product override
- `CATEGORY` - Product category-based
- `PROMOTIONAL` - Time-limited promotion
- `PARTNER_SPECIFIC` - Individual partner negotiation

**Commission Types:**
- `PERCENTAGE` - X% of sale price
- `FIXED` - Fixed amount per sale
- `TIERED` - Different rates based on volume

**Fields (25+ total):**

**Identification:**
- `policyCode` (unique, e.g., "DEFAULT-2025", "TIER-GOLD")
- `name`, `description`

**Type & Status:**
- `policyType`, `status` (ACTIVE, INACTIVE, SCHEDULED, EXPIRED)

**Priority:**
- `priority` (higher number = higher priority for conflict resolution)

**Scope Filters:**
- `partnerId`, `partnerTier`, `productId`, `supplierId`, `category`, `tags[]`

**Commission Structure:**
- `commissionType`
- `commissionRate` (for percentage)
- `commissionAmount` (for fixed)
- `tieredRates[]` (for tiered: minAmount, maxAmount, rate, amount)

**Constraints:**
- `minCommission`, `maxCommission`

**Validity Period:**
- `validFrom`, `validUntil`

**Conditions:**
- `minOrderAmount`, `maxOrderAmount`
- `requiresNewCustomer`, `excludeDiscountedItems`

**Usage Limits:**
- `maxUsagePerPartner`, `maxUsageTotal`, `currentUsageCount`

**Stacking Rules:**
- `canStackWithOtherPolicies`, `exclusiveWith[]`

**Approval:**
- `requiresApproval`, `createdBy`, `approvedBy`, `approvedAt`

**Helper Methods:**
```typescript
isActive(): boolean
calculateCommission(orderAmount, quantity = 1): number
appliesTo(context: { partnerId?, partnerTier?, productId?, ... }): boolean
incrementUsage(): void
```

**Analysis:**
- ✅ **Core candidate:** Generic commission policy engine
- ✅ **Priority system:** Flexible conflict resolution
- ⚠️ **Extension point:** `category` and `tags[]` can be service-specific
- ⚠️ **Promotional policies:** May vary by service/season

---

#### 1.1.9 Settlement Entity (`apps/api-server/src/entities/Settlement.ts`)

**Purpose:** Settlement/payout records for sellers, suppliers, and platform (Phase PD-5)

**Party Types:**
- `seller` - Payout to seller
- `supplier` - Payout to supplier
- `platform` - Platform earnings
- `partner` - Partner commission payout

**Fields (12 total):**

**Party:**
- `partyType` (SettlementPartyType)
- `partyId`, `party` (ManyToOne User)

**Period:**
- `periodStart`, `periodEnd` (timestamp with time zone)

**Amounts (stored as numeric for precision):**
- `totalSaleAmount` (for sellers)
- `totalBaseAmount` (for suppliers)
- `totalCommissionAmount` (for platform/partners)
- `totalMarginAmount` (sale - base)
- `payableAmount` (net amount after deductions)

**Status:**
- `status` (PENDING, PROCESSING, PAID, CANCELLED)
- `paidAt`

**Additional:**
- `metadata` (JSONB), `notes`, `memo` (admin internal notes)

**Relations:**
- `items` (OneToMany SettlementItem)

**Helper Methods:**
```typescript
markAsPaid(paidAt?): void
cancel(): void
canModify(): boolean
getPeriodLabel(): string  // "2025-11"
```

**Analysis:**
- ✅ **Core candidate:** Generic settlement/payout system
- ✅ **Multi-party support:** Sellers, suppliers, partners, platform
- ⚠️ **Extension point:** `metadata` for service-specific settlement rules
- ⚠️ **Period calculation:** May vary by service (weekly, monthly, etc.)

---

#### 1.1.10 Other Supporting Entities

**SettlementItem:**
- Individual items in a settlement
- References: `orderId`, `productId`, `amount`, `commission`, etc.

**PartnerCommission:**
- Partner-specific commission tracking
- May overlap with Commission entity

**PartnerProfile, SellerProfile, SupplierProfile:**
- Extended profile metadata (JSONB storage)

**ChannelProductLink:**
- Multi-channel product management (e.g., Coupang, 11번가)

**SellerChannelAccount:**
- Seller's connected channel accounts

**PaymentSettlement:**
- Payment transaction tracking

**Analysis:**
- ✅ **Core candidates:** All supporting entities are generic
- ⚠️ **Extension point:** Profile metadata can be service-specific

---

### 1.2 Service Analysis

#### 1.2.1 SellerService (`apps/api-server/src/services/SellerService.ts`)

**Purpose:** Handles seller-specific operations (Phase PD-3)

**Key Methods:**

**Catalog Browsing:**
```typescript
async getCatalog(sellerId: string, filters: CatalogFilters): Promise<{
  products: Product[],
  total: number,
  page: number,
  limit: number
}>
```
- Filters: search, category, supplierId, onlyAvailable
- Returns supplier products that can be imported
- Joins with `seller_products` to show import status

**Product Import:**
```typescript
async importProduct(sellerId: string, request: ImportProductRequest): Promise<SellerProduct>
```
- Validates seller authorization
- Creates SellerProduct record
- Sets pricing (salePrice or marginRate)
- Sets sync policy (auto/manual)

**Seller Product Management:**
```typescript
async getSellerProducts(sellerId: string, filters: SellerProductFilters): Promise<SellerProduct[]>
async getSellerProductById(sellerId: string, productId: string): Promise<SellerProduct>
async updateSellerProduct(sellerId: string, productId: string, request: UpdateSellerProductRequest): Promise<SellerProduct>
async removeSellerProduct(sellerId: string, productId: string): Promise<void>
```

**Price Sync:**
```typescript
async syncSellerProductPrice(sellerId: string, productId: string): Promise<SellerProduct>
```
- Manual price sync with supplier's current price
- Respects `syncPolicy` setting

**Analysis:**
- ✅ **Core candidate:** Generic seller catalog operations
- ✅ **Authorization checks:** Integrated with SellerAuthorization
- ✅ **Price sync logic:** Core feature
- ⚠️ **Extension point:** `filters` can include service-specific criteria

---

#### 1.2.2 SellerProductService (`apps/api-server/src/services/SellerProductService.ts`)

**Purpose:** Seller product CRUD and management

**Key Features:**
- Product import validation
- Pricing calculation (margin-based or fixed)
- Inventory management
- Auto-sync with supplier prices
- Bulk operations

**Analysis:**
- ✅ **Core candidate:** Generic product management
- ✅ **Pricing logic:** Core margin calculation

---

#### 1.2.3 SellerDashboardService (`apps/api-server/src/services/SellerDashboardService.ts`)

**Purpose:** Aggregates seller dashboard data

**Key Methods:**
- `getDashboardStats(sellerId)` - Revenue, orders, products, performance
- `getRecentOrders(sellerId)` - Recent order history
- `getTopProducts(sellerId)` - Best-selling products
- `getPerformanceMetrics(sellerId)` - KPIs, trends

**Analysis:**
- ✅ **Core candidate:** Generic dashboard aggregations
- ⚠️ **Extension point:** KPIs and metrics may be service-specific

---

#### 1.2.4 SellerAuthorizationService (`apps/api-server/src/services/SellerAuthorizationService.ts`)

**Purpose:** Authorization workflow management (Phase 9)

**Key Methods:**
- `requestAuthorization(sellerId, productId)` - Seller requests access
- `approveAuthorization(authId, supplierId)` - Supplier approves
- `rejectAuthorization(authId, supplierId, reason)` - Supplier rejects
- `revokeAuthorization(authId, reason)` - Admin/supplier revokes
- `checkAuthorizationStatus(sellerId, productId)` - Check status
- `getSellerAuthorizations(sellerId)` - List seller's requests
- `getSupplierAuthorizations(supplierId)` - List pending approvals

**Business Rules:**
- 10-product limit per seller
- 30-day cooldown after rejection
- Self-seller auto-approval
- Permanent revocation

**Analysis:**
- ✅ **Core candidate:** Generic authorization workflow
- ⚠️ **Business rules:** May vary by service (e.g., limit, cooldown)
- ⚠️ **Extension point:** Service-specific approval criteria

---

#### 1.2.5 SupplierDashboardService (`apps/api-server/src/services/SupplierDashboardService.ts`)

**Purpose:** Aggregates supplier dashboard data

**Key Methods:**
- `getDashboardStats(supplierId)` - Products, orders, revenue
- `getAuthorizationRequests(supplierId)` - Pending approvals
- `getProductPerformance(supplierId)` - Top products
- `getSellerList(supplierId)` - Active sellers

**Analysis:**
- ✅ **Core candidate:** Generic supplier dashboard
- ⚠️ **Extension point:** Performance metrics may vary

---

#### 1.2.6 PartnerService (`apps/api-server/src/services/PartnerService.ts`)

**Purpose:** Partner/affiliate management (Document #66)

**Key Methods:**
- `createPartner(userId, sellerId, applicationData)` - Apply as partner
- `approvePartner(partnerId, approvedBy)` - Approve application
- `rejectPartner(partnerId, reason)` - Reject application
- `generateReferralCode(partnerId)` - Generate unique code
- `trackClick(referralCode)` - Record click event
- `trackConversion(referralCode, orderId, orderAmount)` - Record sale
- `calculateCommission(partnerId, orderAmount, productId)` - Calculate earning
- `getPartnerDashboard(partnerId)` - Dashboard stats
- `requestPayout(partnerId, amount)` - Request withdrawal
- `processPayout(partnerId, amount, method)` - Admin payout

**Analysis:**
- ✅ **Core candidate:** Generic affiliate system
- ✅ **Referral tracking:** Core feature
- ⚠️ **Extension point:** Commission calculation may vary by service

---

#### 1.2.7 CommissionEngine (`apps/api-server/src/services/CommissionEngine.ts`)

**Purpose:** Advanced commission calculation with policy resolution (Phase 2.1)

**Key Features:**
- Priority-based policy selection
- Multi-policy application (if stacking allowed)
- Tiered commission calculation
- Attribution modeling
- Hold period management
- Adjustment and refund handling

**Key Methods:**
```typescript
async calculateCommission(context: CommissionContext): Promise<CommissionResult>
async getPoliciesForContext(context): Promise<CommissionPolicy[]>
async selectBestPolicy(policies): Promise<CommissionPolicy>
async confirmPendingCommissions(): Promise<void>  // Cron job
async cancelCommission(commissionId, reason): Promise<void>
async adjustCommission(commissionId, newAmount, reason): Promise<void>
```

**CommissionContext:**
- `partnerId`, `partnerTier`
- `productId`, `supplierId`, `category`, `tags`
- `orderAmount`, `isNewCustomer`

**Analysis:**
- ✅ **Core candidate:** Complex commission engine is reusable
- ✅ **Policy resolution:** Generic algorithm
- ⚠️ **Extension point:** Service-specific policies via CommissionPolicy entity
- ⚠️ **Hold period:** Business rule that may vary (7-30 days)

---

#### 1.2.8 CommissionCalculator (`apps/api-server/src/services/CommissionCalculator.ts`)

**Purpose:** Helper functions for commission calculations

**Key Functions:**
- `calculatePercentageCommission(amount, rate)`
- `calculateFixedCommission(amount, quantity)`
- `calculateTieredCommission(amount, tiers)`
- `applyMinMaxConstraints(commission, policy)`
- `calculateAttributionWeight(model, touchpoints)`

**Analysis:**
- ✅ **Core candidate:** Pure calculation functions
- ✅ **No service-specific logic**

---

#### 1.2.9 Settlement Services

**SettlementService:**
- Core CRUD operations
- Settlement creation
- Status management

**SettlementManagementService:**
- High-level settlement operations
- Batch settlement generation
- Approval workflows

**SettlementReadService:**
- Query optimization
- Dashboard aggregations
- Report generation

**SettlementBatchService:**
- Automated settlement generation
- Batch processing
- Period calculations

**SettlementScheduler:**
- Cron job scheduling
- Automated monthly/weekly settlements
- Notification triggers

**Analysis:**
- ✅ **Core candidates:** All settlement services are generic
- ⚠️ **Extension point:** Settlement period (weekly, monthly, custom) may vary
- ⚠️ **Calculation rules:** Deductions, fees may be service-specific

---

### 1.3 CPT & ACF Analysis

#### 1.3.1 CPT Definitions (`dropshipping-cpts.ts`)

**4 CPTs Defined:**

1. **`ds_supplier`**
   - Label: "공급자"
   - Storage: CPT (WordPress-compatible)
   - Purpose: Supplier profiles (alternative to TypeORM Supplier entity)

2. **`ds_partner`**
   - Label: "파트너"
   - Storage: CPT
   - Purpose: Partner profiles

3. **`ds_product`**
   - Label: "드롭쉬핑 상품"
   - Storage: CPT
   - Public: true (has archive page)
   - Taxonomies: `ds_product_category`, `ds_product_tag`
   - Purpose: Product catalog (alternative to TypeORM Product entity)

4. **`ds_commission_policy`**
   - Label: "수수료 정책"
   - Storage: CPT
   - Purpose: Commission policy management

**Analysis:**
- ⚠️ **Dual storage:** CPTs exist alongside TypeORM entities
- ⚠️ **Complexity:** Synchronization required between CPT and Entity storage
- ✅ **WordPress compatibility:** Allows WordPress plugin ecosystem integration
- ⚠️ **Core vs Extension:** CPTs are currently Core, but Extensions can extend them with ACF

---

#### 1.3.2 ACF Field Groups (`dropshipping-fields.ts`)

**7 ACF Groups (859 lines):**

**1. `ds_product_pricing` (Applied to: ds_product)**
- Fields: cost_price, msrp, margin_rate (readonly), partner_commission_rate
- Purpose: Product pricing management
- Legal Notice: Fair Trade Act compliance (MSRP is recommended price)

**2. `ds_product_supplier` (Applied to: ds_product)**
- Fields: supplier (relationship), supplier_sku
- Purpose: Link product to supplier

**3. `ds_product_shipping` (Applied to: ds_product)**
- Fields: shipping_days_min/max, shipping_fee
- Purpose: Shipping information

**4. `ds_supplier_info` (Applied to: ds_supplier)**
- Fields: email, phone, business_number, api_key, api_endpoint
- Purpose: Supplier contact and integration

**5. `ds_supplier_pricing_management` (Applied to: ds_product, Role: supplier)**
- Fields: cost_price_supplier_edit, msrp_supplier_edit, commission_rate_supplier_edit
- Conditional Logic: Only visible to suppliers
- Purpose: Supplier price management (requires admin approval)

**6. `ds_partner_info` (Applied to: ds_partner)**
- Fields: partner_type, partner_grade, referral_code (readonly), commission_rate
- Purpose: Partner profile

**7. `ds_commission_policy_details` (Applied to: ds_commission_policy)**
- Fields: policy_supplier, commission_rate, partner_grade (checkbox), min_order_amount, start_date, end_date
- Purpose: Policy configuration

**8. `ds_seller_autonomous_pricing` (Applied to: ds_product, Role: seller)**
- Fields: seller_final_price, seller_profit_margin (readonly), msrp_comparison (readonly)
- Conditional Logic: Only visible to sellers
- Purpose: Seller autonomous pricing (Fair Trade Act compliance)

**Legal Compliance Features:**
- MSRP notices (recommended price, not mandatory)
- Seller autonomy notices (freedom to set prices)
- Approval workflow notices (supplier changes need approval)

**JavaScript Enhancements:**
- Real-time margin calculation
- Price comparison displays
- Color-coded profitability indicators
- Approval workflow triggers

**Analysis:**
- ✅ **Core candidate:** Pricing, supplier, shipping fields are generic
- ⚠️ **Extension point:** ACF groups can be extended by service-specific fields
- ⚠️ **Legal compliance:** Fair Trade Act notices are Korea-specific but adaptable
- ⚠️ **Role-based fields:** Conditional logic based on user role (supplier/seller)
- ✅ **Extension pattern:** Similar to `forum-neture` extending `forum_post` with `cosmetic_meta`

---

### 1.4 Routes & Controllers Analysis

#### 1.4.1 Seller Routes (`/api/v2/seller`)

**Endpoints:**
```
GET    /api/v2/seller/catalog              # Browse supplier products
POST   /api/v2/seller/products             # Import product
GET    /api/v2/seller/products             # List seller products
GET    /api/v2/seller/products/:id         # Get product details
PUT    /api/v2/seller/products/:id         # Update product
DELETE /api/v2/seller/products/:id         # Remove product
POST   /api/v2/seller/products/:id/sync    # Manual price sync
GET    /api/v2/seller/dashboard            # Dashboard stats
GET    /api/v2/seller/orders               # Order history
GET    /api/v2/seller/settlements          # Settlement records
```

**Analysis:**
- ✅ **Core candidate:** Generic seller API endpoints
- ⚠️ **Extension point:** Additional endpoints for service-specific features

---

#### 1.4.2 Supplier Routes (`/api/v2/supplier`)

**Endpoints:**
```
GET    /api/v2/supplier/products           # List products
POST   /api/v2/supplier/products           # Create product
PUT    /api/v2/supplier/products/:id       # Update product
DELETE /api/v2/supplier/products/:id       # Delete product
GET    /api/v2/supplier/authorizations     # Pending approvals
POST   /api/v2/supplier/authorizations/:id/approve  # Approve seller
POST   /api/v2/supplier/authorizations/:id/reject   # Reject seller
GET    /api/v2/supplier/dashboard          # Dashboard stats
GET    /api/v2/supplier/orders             # Order history
```

**Analysis:**
- ✅ **Core candidate:** Generic supplier API
- ✅ **Authorization workflow:** Core feature

---

#### 1.4.3 Admin Routes (`/api/admin/dropshipping`)

**Endpoints:**
```
GET    /api/admin/dropshipping/products           # Admin product list
POST   /api/admin/dropshipping/products           # Admin create product
PUT    /api/admin/dropshipping/products/:id       # Admin update
DELETE /api/admin/dropshipping/products/:id       # Admin delete
GET    /api/admin/dropshipping/suppliers          # Supplier management
POST   /api/admin/dropshipping/suppliers/:id/approve  # Approve supplier
GET    /api/admin/dropshipping/sellers            # Seller management
POST   /api/admin/dropshipping/sellers/:id/approve    # Approve seller
GET    /api/admin/dropshipping/authorizations     # All authorizations
GET    /api/admin/dropshipping/settlements        # Settlement management
POST   /api/admin/dropshipping/settlements        # Generate settlement
PUT    /api/admin/dropshipping/settlements/:id    # Update settlement
GET    /api/admin/dropshipping/commissions        # Commission records
```

**Analysis:**
- ✅ **Core candidate:** Generic admin operations
- ⚠️ **Extension point:** Service-specific admin features

---

### 1.5 Migration Analysis

**6+ Migration Files:**

1. **`1755000000000-CreateSupplierTables.ts`**
   - Creates: `suppliers`, `supplier_profiles`, related tables
   - Indexes: userId (unique), status+tier

2. **`1758897000000-InitializeDropshippingCPTs.ts`**
   - Registers: ds_supplier, ds_partner, ds_product, ds_commission_policy
   - Creates CPT metadata storage

3. **`1800000000000-CreateDropshippingEntities.ts`**
   - Creates: Main dropshipping entities
   - Complex relationships and indexes

4. **`1759103000000-CreateCustomPostTypeTables.ts`**
   - Creates: CPT infrastructure (custom_post_types, custom_post_meta, etc.)

5. **`1737115000000-CreateSettlementTables.ts`**
   - Creates: settlements, settlement_items
   - Financial precision (numeric types)

6. **`1900000000000-BaselineDropshippingEntities.ts`**
   - Baseline schema synchronization
   - Ensures all entities exist

**Analysis:**
- ✅ **Core candidate:** All migrations belong in Core
- ⚠️ **Extension migrations:** Extensions may add their own migrations for service-specific tables
- ✅ **Indexes:** Well-optimized for queries
- ⚠️ **Breaking changes:** Migration order is critical

---

## Chapter 2: Comparison with Forum Pattern

### 2.1 Forum App Architecture (Reference)

**Forum Core (`packages/forum-app`):**
```typescript
// manifest.ts
export const forumManifest = {
  appId: 'forum-core',
  type: 'core',
  ownsTables: ['forum_post', 'forum_category', 'forum_comment', 'forum_tag'],
  cpt: [
    { name: 'forum_post', storage: 'entity', label: '포럼 게시글' },
    { name: 'forum_category', storage: 'entity', label: '포럼 카테고리' },
  ],
  acf: [],  // Core provides no ACF, Extensions add metadata
  routes: ['/admin/forum', '/admin/forum/posts', ...],
  lifecycle: {
    install: './lifecycle/install.js',
    uninstall: './lifecycle/uninstall.js',
  },
}
```

**Forum Extension (`packages/forum-neture`):**
```typescript
// manifest.ts
export const forumNetureManifest = {
  appId: 'forum-neture',
  type: 'extension',
  dependencies: { 'forum-core': '>=1.0.0' },
  extendsCPT: [
    { name: 'forum_post', acfGroup: 'cosmetic_meta' }
  ],
  acf: [
    {
      groupId: 'cosmetic_meta',
      label: '화장품 메타데이터',
      fields: [
        { key: 'skinType', type: 'select', options: ['건성', '지성', ...] },
        { key: 'concerns', type: 'multiselect', options: ['여드름', '주름', ...] },
        { key: 'routine', type: 'array' },
        { key: 'productIds', type: 'array' },
      ],
    },
  ],
  adminRoutes: [
    { path: '/admin/forum', component: './admin-ui/pages/ForumNetureApp.js' },
  ],
  defaultConfig: {
    categories: [
      { name: '공지사항', slug: 'announcements', color: '#FF6B6B' },
      { name: '사용후기', slug: 'reviews', color: '#4ECDC4' },
    ],
    skin: 'neture',
    brandColor: '#8B7355',
  },
}
```

**Key Patterns:**
- ✅ **Core owns tables:** Forum Core owns `forum_post`, `forum_category`, etc.
- ✅ **Extensions extend CPTs:** Extensions add ACF metadata to Core CPTs
- ✅ **No table ownership by Extensions:** Extensions don't own core tables
- ✅ **Admin UI override:** Extensions can override Core admin routes
- ✅ **Default configuration:** Extensions provide service-specific defaults

---

### 2.2 Dropshipping vs Forum Comparison

| Aspect | Forum Core | Forum Extension (Neture) | Dropshipping (Current) | Dropshipping Core (Proposed) | Dropshipping Extension (Proposed) |
|--------|-----------|-------------------------|------------------------|------------------------------|----------------------------------|
| **Package Structure** | ✅ `packages/forum-app` | ✅ `packages/forum-neture` | ❌ Monolithic in `apps/api-server` | ✅ `packages/dropshipping-core` | ✅ `packages/dropshipping-cosmetics` |
| **Table Ownership** | ✅ Owns `forum_*` tables | ❌ No table ownership | ❌ No concept of ownership | ✅ Owns `products`, `suppliers`, `sellers`, `settlements`, etc. | ❌ No table ownership |
| **CPT Definitions** | ✅ 4 CPTs | ❌ None (extends Core CPTs) | ✅ 4 CPTs (ds_supplier, ds_product, etc.) | ✅ 4 CPTs | ❌ None (extends Core CPTs) |
| **ACF Fields** | ❌ None (Core is metadata-free) | ✅ `cosmetic_meta` ACF group | ✅ 7 ACF groups (all in Core) | ✅ Base ACF groups (pricing, supplier, partner) | ✅ Service-specific ACF (cosmetic_meta) |
| **Entities** | ✅ ForumPost, ForumCategory, ForumComment | ❌ None | ✅ 18 entities (all in api-server) | ✅ All 18 entities in Core | ❌ None (extends Core entities via ACF) |
| **Services** | ✅ ForumService | ❌ None (uses Core services) | ✅ 13+ services (all in api-server) | ✅ All services in Core | ⚠️ Service-specific overrides (optional) |
| **Admin UI** | ✅ Core admin pages | ✅ Overrides with Neture skin | ✅ Admin dashboard pages (hardcoded) | ✅ Core admin pages | ✅ Overrides with service-specific UI |
| **Migrations** | ✅ In package | ❌ None (uses Core tables) | ✅ In api-server migrations | ✅ In Core package | ⚠️ Extension-specific migrations (if needed) |
| **Lifecycle Hooks** | ✅ install/uninstall | ❌ None (uses Core lifecycle) | ❌ None | ✅ install/uninstall/activate/deactivate | ⚠️ Extension lifecycle (optional) |
| **Manifest** | ✅ Defined | ✅ Defined | ❌ None | ✅ To be created | ✅ To be created |
| **Dependencies** | N/A (Core has no deps) | ✅ `forum-core >= 1.0.0` | N/A | N/A (Core) | ✅ `dropshipping-core >= 1.0.0` |

---

### 2.3 Key Differences

**Forum is Simpler:**
- Forum has **4 entities** (Post, Category, Comment, Tag)
- Dropshipping has **18 entities** (Product, Supplier, Seller, Commission, Settlement, etc.)
- Forum has **minimal business logic** (CRUD, moderation)
- Dropshipping has **complex financial logic** (commission calculation, settlement generation)

**Forum is Content-Focused:**
- Forum Core is a **content management system**
- Extensions add **metadata** (skin type, medical info)
- No financial transactions

**Dropshipping is Transaction-Focused:**
- Dropshipping Core is a **marketplace & financial system**
- Extensions add **product metadata** AND **business rules**
- Financial operations (commission, settlement) are critical

**ACF Strategy Difference:**
- Forum Core: **No ACF** (metadata-free)
- Forum Extensions: **All ACF** (service-specific metadata)
- Dropshipping Core: **Base ACF** (pricing, supplier, partner)
- Dropshipping Extensions: **Extended ACF** (cosmetic metadata, pharmacy metadata)

---

### 2.4 Forum Pattern Applicability to Dropshipping

**Can Apply:**
- ✅ **Core/Extension separation:** Clear boundary between generic and service-specific
- ✅ **extendsCPT pattern:** Extensions extend `ds_product` with ACF
- ✅ **Admin UI override:** Service-specific dashboards
- ✅ **Manifest structure:** App metadata and configuration
- ✅ **Lifecycle hooks:** Installation and uninstallation

**Challenges:**
- ⚠️ **Complex entity relationships:** 18 entities with many relationships
- ⚠️ **Financial operations:** Commission and settlement must remain in Core
- ⚠️ **Business logic extensions:** Services may need to override commission policies
- ⚠️ **Migration complexity:** Production data migration is risky

**Adaptations Needed:**
- **Core should include base business logic:** Unlike Forum (which is purely structural), Dropshipping Core must include commission calculation, settlement generation, etc.
- **Extensions can override policies:** Extensions should be able to define custom CommissionPolicy records
- **ACF separation is different:** Core provides base ACF (pricing), Extensions add metadata ACF (cosmetics)

---

## Chapter 3: Core/Extension Analysis

### 3.1 Core Candidates (MUST be in Core)

#### Entities (All 18)

**Rationale:** All entities are generic dropshipping concepts, not service-specific.

| Entity | Why Core? |
|--------|-----------|
| Product | Generic product structure (name, SKU, price, inventory) |
| Supplier | Generic supplier management (tier, policies, metrics) |
| Seller | Generic seller management (tier, branding, metrics) |
| SellerProduct | Seller's catalog (pricing, sync policy) |
| SellerAuthorization | Authorization workflow (generic approval system) |
| Partner | Affiliate system (referral tracking, commissions) |
| Commission | Commission records (state machine, hold period) |
| CommissionPolicy | Commission rules (priority, policies, calculation) |
| Settlement | Payout system (multi-party, period-based) |
| SettlementItem | Settlement details |
| Order | Order tracking with referral |
| PartnerProfile | Partner metadata |
| SellerProfile | Seller metadata |
| SupplierProfile | Supplier metadata |
| ChannelProductLink | Multi-channel management |
| SellerChannelAccount | Channel accounts |
| PaymentSettlement | Payment tracking |
| PartnerCommission | Partner-specific commissions |

**Extension Point:** `metadata` JSONB fields in entities can store service-specific data.

---

#### Services (All Core)

**Rationale:** Business logic is generic, with extension points via policies and metadata.

| Service | Why Core? | Extension Points |
|---------|-----------|------------------|
| SellerService | Generic seller operations | Filters can include service-specific criteria |
| SellerProductService | Generic product management | N/A |
| SellerDashboardService | Generic dashboard aggregations | KPIs may vary |
| SellerAuthorizationService | Generic authorization workflow | Approval criteria may vary |
| SupplierDashboardService | Generic supplier dashboard | Metrics may vary |
| PartnerService | Generic affiliate system | Commission rules may vary |
| CommissionEngine | Generic commission calculation | Policies are data-driven (CommissionPolicy entity) |
| CommissionCalculator | Pure calculation functions | N/A |
| SettlementService | Generic settlement CRUD | N/A |
| SettlementManagementService | Generic settlement operations | Period calculations may vary |
| SettlementReadService | Generic query optimization | N/A |
| SettlementBatchService | Generic batch processing | Period logic may vary |
| SettlementScheduler | Generic cron scheduling | Schedule may vary (weekly, monthly) |

**How Extensions Customize:**
- **CommissionPolicy:** Extensions create service-specific policies (e.g., higher rates for beauty products)
- **ACF Metadata:** Extensions add fields that influence business logic (e.g., prescription requirement affects authorization)
- **Service Overrides:** Extensions can extend Core services (e.g., `CosmeticsSellerService extends SellerService`)

---

#### CPT Definitions (Core owns all 4)

**Rationale:** CPTs are WordPress-compatible storage layer for Core entities.

| CPT | Why Core? |
|-----|-----------|
| ds_supplier | Core Supplier entity representation |
| ds_partner | Core Partner entity representation |
| ds_product | Core Product entity representation |
| ds_commission_policy | Core CommissionPolicy representation |

**Extensions:**
- Extensions **do not define new CPTs**
- Extensions **extend existing CPTs** with ACF (e.g., `extendsCPT: ['ds_product']`)

---

#### Base ACF Groups (Core owns base groups)

**Rationale:** Pricing, supplier, and partner fields are generic.

**Core ACF Groups:**
1. `ds_product_pricing` - Cost price, MSRP, commission rate (generic)
2. `ds_product_supplier` - Supplier relationship (generic)
3. `ds_product_shipping` - Shipping info (generic)
4. `ds_supplier_info` - Supplier contact and API (generic)
5. `ds_partner_info` - Partner type, grade, referral code (generic)
6. `ds_commission_policy_details` - Policy configuration (generic)

**Extensions:**
- Extensions **do not modify Core ACF groups**
- Extensions **add new ACF groups** to extend Core CPTs

**Example (Cosmetics Extension):**
```typescript
acf: [
  {
    groupId: 'cosmetic_meta',
    label: '화장품 메타데이터',
    appliesTo: 'ds_product',
    fields: [
      { key: 'skinType', type: 'select', options: ['건성', '지성', '복합성', '민감성'] },
      { key: 'ingredients', type: 'array', label: '주요 성분' },
      { key: 'beautyConcerns', type: 'multiselect', options: ['여드름', '주름', '미백'] },
      { key: 'productCategory', type: 'select', options: ['스킨케어', '메이크업', '바디케어'] },
    ],
  },
]
```

---

#### Routes & Controllers (Core owns all)

**Rationale:** API endpoints are generic CRUD operations.

**Core Routes:**
- `/api/v2/seller/*` - Seller operations
- `/api/v2/supplier/*` - Supplier operations
- `/api/admin/dropshipping/*` - Admin operations
- `/api/cpt/dropshipping/*` - CPT operations

**Extensions:**
- Extensions **do not add new routes** (use Core routes)
- Extensions **may override route handlers** (e.g., custom product creation logic)

---

#### Migrations (Core owns all baseline migrations)

**Rationale:** Core tables must be created by Core.

**Core Migrations:**
1. Create all 18 entity tables
2. Create indexes and constraints
3. Initialize CPT infrastructure
4. Seed default data (e.g., default commission policies)

**Extensions:**
- Extensions **do not create Core tables**
- Extensions **may add migrations** for extension-specific tables (if needed)
- Example: Pharmacy extension may create `pharmacy_prescriptions` table

---

#### Lifecycle Hooks (Core only)

**Rationale:** Core manages installation and data migration.

**Core Lifecycle:**
```typescript
lifecycle: {
  install: async () => {
    // Run migrations
    // Create default commission policies
    // Initialize CPT definitions
    // Seed sample data (optional)
  },
  activate: async () => {
    // Enable scheduled jobs (SettlementScheduler)
    // Register webhooks
  },
  deactivate: async () => {
    // Disable scheduled jobs
    // Cleanup temporary data
  },
  uninstall: async (mode: 'keep-data' | 'purge') => {
    if (mode === 'purge') {
      // Drop all tables (with confirmation)
      // Delete all CPT data
    }
    // Unregister webhooks
  },
}
```

**Extensions:**
- Extensions **do not have lifecycle hooks** (rely on Core)
- OR: Extensions have minimal lifecycle hooks (e.g., install default config)

---

### 3.2 Extension Candidates (Service-Specific)

#### Cosmetics Extension (`dropshipping-cosmetics`)

**Purpose:** Beauty/cosmetics marketplace features

**ACF Extensions:**
```typescript
acf: [
  {
    groupId: 'cosmetic_meta',
    appliesTo: 'ds_product',
    fields: [
      {
        key: 'skinType',
        type: 'multiselect',
        label: '피부 타입',
        options: ['건성', '지성', '복합성', '민감성', '중성'],
        description: '제품이 적합한 피부 타입을 선택하세요',
      },
      {
        key: 'ingredients',
        type: 'array',
        label: '주요 성분',
        subFields: [
          { key: 'name', type: 'text', label: '성분명' },
          { key: 'percentage', type: 'number', label: '함량 (%)' },
          { key: 'function', type: 'text', label: '기능' },
        ],
      },
      {
        key: 'beautyConcerns',
        type: 'multiselect',
        label: '피부 고민',
        options: ['여드름', '주름', '미백', '모공', '탄력', '진정', '보습', '안티에이징'],
      },
      {
        key: 'productCategory',
        type: 'select',
        label: '제품 카테고리',
        options: ['스킨케어', '메이크업', '바디케어', '헤어케어', '선케어', '남성케어'],
      },
      {
        key: 'usageMethod',
        type: 'textarea',
        label: '사용 방법',
      },
      {
        key: 'certifications',
        type: 'multiselect',
        label: '인증',
        options: ['비건', '유기농', '동물실험무', '저자극', '무향료', '무알코올'],
      },
    ],
  },
  {
    groupId: 'cosmetic_seller_info',
    appliesTo: 'seller_profile',
    fields: [
      {
        key: 'beautySpecialties',
        type: 'multiselect',
        label: '전문 분야',
        options: ['스킨케어', '메이크업', 'K-뷰티', '럭셔리 코스메틱', '자연주의'],
      },
    ],
  },
]
```

**Default Configuration:**
```typescript
defaultConfig: {
  categories: [
    { name: '스킨케어', slug: 'skincare', icon: 'droplet' },
    { name: '메이크업', slug: 'makeup', icon: 'palette' },
    { name: '바디케어', slug: 'bodycare', icon: 'user' },
    { name: '헤어케어', slug: 'haircare', icon: 'scissors' },
  ],
  brandColor: '#E8B4B8',  // Soft pink
  accentColor: '#8B7355',  // Beige
  skin: 'neture',
}
```

**Admin UI Overrides:**
```typescript
adminRoutes: [
  {
    path: '/admin/dropshipping/products',
    component: './admin-ui/CosmeticsProductManager.tsx',  // Custom product form
  },
  {
    path: '/admin/dropshipping/dashboard',
    component: './admin-ui/CosmeticsDashboard.tsx',  // Beauty-focused KPIs
  },
]
```

**Business Logic Extensions:**
- **Commission Policy:** Create default policies for beauty products (e.g., higher commission for luxury cosmetics)
- **Search Filters:** Enable filtering by skin type, ingredients, concerns
- **Product Recommendations:** Beauty routine builder

---

#### Pharmacy Extension (`dropshipping-pharmacy`)

**Purpose:** Pharmacy/medication marketplace with prescription management

**ACF Extensions:**
```typescript
acf: [
  {
    groupId: 'pharmacy_meta',
    appliesTo: 'ds_product',
    fields: [
      {
        key: 'medicationType',
        type: 'select',
        label: '의약품 구분',
        options: ['전문의약품', '일반의약품', '의약외품', '건강기능식품'],
        required: true,
      },
      {
        key: 'requiresPrescription',
        type: 'toggle',
        label: '처방전 필요 여부',
        default: false,
      },
      {
        key: 'activeIngredients',
        type: 'array',
        label: '유효 성분',
        subFields: [
          { key: 'name', type: 'text', label: '성분명' },
          { key: 'dosage', type: 'text', label: '함량' },
        ],
      },
      {
        key: 'dosageForm',
        type: 'select',
        label: '제형',
        options: ['정제', '캡슐', '시럽', '주사제', '연고', '패치', '액제', '분말'],
      },
      {
        key: 'contraindications',
        type: 'textarea',
        label: '금기사항',
        description: '복용하면 안 되는 경우를 기재하세요',
      },
      {
        key: 'sideEffects',
        type: 'textarea',
        label: '부작용',
      },
      {
        key: 'storageConditions',
        type: 'text',
        label: '보관 방법',
        default: '실온 보관 (1-30℃)',
      },
      {
        key: 'ageRestriction',
        type: 'number',
        label: '최소 연령 제한',
        description: '구매 가능 최소 나이 (예: 19세 이상)',
      },
    ],
  },
  {
    groupId: 'pharmacy_supplier_info',
    appliesTo: 'ds_supplier',
    fields: [
      {
        key: 'pharmacyLicense',
        type: 'text',
        label: '약국 허가 번호',
        required: true,
      },
      {
        key: 'pharmacistName',
        type: 'text',
        label: '약사 이름',
      },
      {
        key: 'pharmacistLicense',
        type: 'text',
        label: '약사 면허 번호',
      },
    ],
  },
]
```

**Default Configuration:**
```typescript
defaultConfig: {
  categories: [
    { name: '감기/독감', slug: 'cold-flu', icon: 'thermometer' },
    { name: '소화기', slug: 'digestive', icon: 'pill' },
    { name: '진통제', slug: 'painkillers', icon: 'heart-pulse' },
    { name: '영양제', slug: 'supplements', icon: 'capsule' },
    { name: '피부약', slug: 'dermatology', icon: 'spray-can' },
  ],
  brandColor: '#4A90E2',  // Medical blue
  accentColor: '#50E3C2',  // Teal
  skin: 'yaksa',
  organizationFeatures: {
    enableMembershipManagement: true,
    enableEducationResources: true,
    enableProfessionalForum: true,
  },
}
```

**Admin UI Overrides:**
```typescript
adminRoutes: [
  {
    path: '/admin/dropshipping/products',
    component: './admin-ui/PharmacyProductManager.tsx',  // Prescription validation
  },
  {
    path: '/admin/dropshipping/prescriptions',
    component: './admin-ui/PrescriptionManagement.tsx',  // NEW route
  },
  {
    path: '/admin/dropshipping/organization',
    component: './admin-ui/OrganizationDashboard.tsx',  // Yaksa association features
  },
]
```

**Business Logic Extensions:**
- **Authorization Override:** Require pharmacy license verification for suppliers
- **Prescription Validation:** Orders for prescription drugs require prescription upload
- **Age Verification:** Enforce age restrictions at checkout
- **Commission Policy:** Create policies for medication categories

**Organization Features (Yaksa-specific):**
- Member directory (pharmacists)
- Education resources
- Professional forum (different from public forum)
- Event management

---

#### Travel Extension (`dropshipping-travel`)

**Purpose:** Travel service marketplace with booking features

**ACF Extensions:**
```typescript
acf: [
  {
    groupId: 'travel_meta',
    appliesTo: 'ds_product',
    fields: [
      {
        key: 'travelType',
        type: 'select',
        label: '여행 유형',
        options: ['패키지 투어', '자유 여행', '골프 투어', '크루즈', '항공권', '숙박', '액티비티'],
        required: true,
      },
      {
        key: 'destinations',
        type: 'array',
        label: '여행지',
        subFields: [
          { key: 'country', type: 'text', label: '국가' },
          { key: 'city', type: 'text', label: '도시' },
          { key: 'duration', type: 'number', label: '체류 일수' },
        ],
      },
      {
        key: 'departureDate',
        type: 'date',
        label: '출발 날짜',
      },
      {
        key: 'returnDate',
        type: 'date',
        label: '귀국 날짜',
      },
      {
        key: 'totalDuration',
        type: 'text',
        label: '총 여행 기간',
        default: '5박 6일',
      },
      {
        key: 'schedule',
        type: 'array',
        label: '일정표',
        subFields: [
          { key: 'day', type: 'number', label: 'Day' },
          { key: 'activities', type: 'textarea', label: '활동 내역' },
          { key: 'meals', type: 'text', label: '식사 (조/중/석)' },
          { key: 'accommodation', type: 'text', label: '숙소' },
        ],
      },
      {
        key: 'includedServices',
        type: 'multiselect',
        label: '포함 사항',
        options: ['항공권', '숙박', '식사', '관광', '가이드', '여행자 보험', '비자', '공항 픽업'],
      },
      {
        key: 'excludedServices',
        type: 'multiselect',
        label: '불포함 사항',
        options: ['개인 경비', '선택 관광', '팁', '여행자 보험', '비자'],
      },
      {
        key: 'travelInsurance',
        type: 'toggle',
        label: '여행자 보험 포함',
        default: true,
      },
      {
        key: 'minimumParticipants',
        type: 'number',
        label: '최소 인원',
        default: 10,
      },
      {
        key: 'maximumParticipants',
        type: 'number',
        label: '최대 인원',
        default: 40,
      },
    ],
  },
]
```

**Default Configuration:**
```typescript
defaultConfig: {
  categories: [
    { name: '유럽 패키지', slug: 'europe-package', icon: 'plane' },
    { name: '동남아 골프', slug: 'asia-golf', icon: 'golf-flag' },
    { name: '크루즈', slug: 'cruise', icon: 'ship' },
    { name: '항공권', slug: 'flights', icon: 'ticket' },
    { name: '숙박', slug: 'hotels', icon: 'bed' },
  ],
  brandColor: '#1E88E5',  // Sky blue
  accentColor: '#FFA726',  // Orange
  skin: 'travel',
  bookingFeatures: {
    enableCalendar: true,
    enableAvailabilityCheck: true,
    enableGroupBooking: true,
  },
}
```

**Admin UI Overrides:**
```typescript
adminRoutes: [
  {
    path: '/admin/dropshipping/products',
    component: './admin-ui/TravelProductManager.tsx',  // Travel package builder
  },
  {
    path: '/admin/dropshipping/bookings',
    component: './admin-ui/BookingManagement.tsx',  // NEW route
  },
  {
    path: '/admin/dropshipping/calendar',
    component: './admin-ui/TravelCalendar.tsx',  // Availability calendar
  },
]
```

**Business Logic Extensions:**
- **Inventory Management:** Booking-based inventory (departure dates, seat availability)
- **Pricing:** Dynamic pricing based on season, occupancy
- **Commission Policy:** Higher commission for international tours
- **Booking Workflow:** Group booking, waitlist management

---

### 3.3 Gray Areas (Debatable)

**1. Role-Based ACF Fields**

**Current:** `ds_supplier_pricing_management` and `ds_seller_autonomous_pricing` are in Core ACF

**Question:** Should these be in Core or Extensions?

**Analysis:**
- ✅ **Core:** These fields are generic (cost price, sale price, margin calculation)
- ⚠️ **Extension:** Service-specific UI customizations (e.g., cosmetics may have different pricing UX)
- **Recommendation:** Keep in Core, allow Extensions to **override UI** (not fields)

**2. Legal Compliance Notices**

**Current:** Fair Trade Act notices are in Core ACF (Korea-specific)

**Question:** Should legal compliance be in Core?

**Analysis:**
- ⚠️ **Core:** Legal compliance is business-critical
- ⚠️ **Extension:** Different countries have different laws
- **Recommendation:** Keep in Core, make notices **configurable** (allow Extensions to customize)

**3. Settlement Period Calculation**

**Current:** Monthly settlement is hardcoded in SettlementScheduler

**Question:** Should settlement period be configurable?

**Analysis:**
- ✅ **Core:** Settlement logic is generic
- ⚠️ **Extension:** Different services may have different payout schedules (weekly, monthly, on-demand)
- **Recommendation:** Make settlement period **configurable** in Core (weekly/monthly/custom)

**4. Partner Tier Bonuses**

**Current:** Tier bonuses are hardcoded in Partner entity

**Question:** Should tier bonuses be service-specific?

**Analysis:**
- ✅ **Core:** Tier system is generic
- ⚠️ **Extension:** Different services may have different bonus structures
- **Recommendation:** Keep in Core, allow **override via CommissionPolicy** (Extensions create custom policies)

---

## Chapter 4: Data Model Analysis

### 4.1 Entity Schemas

**Product Entity Schema:**

```sql
CREATE TABLE products (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign Keys
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Type & Status
  type VARCHAR(20) DEFAULT 'physical',  -- physical, digital, service, subscription
  status VARCHAR(20) DEFAULT 'draft',   -- draft, active, inactive, out_of_stock, discontinued
  is_active BOOLEAN DEFAULT true,

  -- Pricing
  supplier_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'KRW',

  -- Commission (Phase PD-2)
  commission_type VARCHAR(10),  -- 'rate' | 'fixed'
  commission_value DECIMAL(10,4),
  seller_commission_rate DECIMAL(5,2),
  platform_commission_rate DECIMAL(5,2),

  -- Legacy commission (backward compatibility)
  partner_commission_rate DECIMAL(5,2) DEFAULT 0,
  partner_commission_amount DECIMAL(10,2),

  -- Inventory
  inventory INTEGER DEFAULT 0,
  low_stock_threshold INTEGER,
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,

  -- Media (JSONB)
  images JSONB,  -- {main: string, gallery: string[], thumbnails: string[]}
  tags TEXT[],

  -- Variants (JSONB)
  variants JSONB,  -- [{id, name, sku, price, inventory, attributes}]
  has_variants BOOLEAN DEFAULT false,

  -- Physical product (JSONB)
  dimensions JSONB,  -- {length, width, height, weight, unit}
  shipping JSONB,    -- {weight, dimensions, shippingClass, freeShipping, shippingCost}

  -- SEO (JSONB)
  seo JSONB,  -- {title, description, keywords, slug}
  features TEXT[],
  specifications TEXT,

  -- Tier Pricing (JSONB)
  tier_pricing JSONB,  -- {bronze: number, silver: number, gold: number, platinum: number}

  -- Additional
  brand VARCHAR(100),
  model VARCHAR(100),
  warranty TEXT,
  metadata JSONB,  -- ← Extension point

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,

  -- Indexes
  INDEX idx_supplier_status (supplier_id, status),
  INDEX idx_category_status (category_id, status),
  INDEX idx_status_created (status, created_at)
);
```

**Extension Point:**
- `metadata JSONB` can store service-specific data (e.g., `{cosmetic: {skinType: '건성', ingredients: [...]}}`)
- ACF fields map to `metadata` keys

---

### 4.2 CPT Usage

**Current CPT Strategy:**

1. **CPT Registration:**
   - 4 CPTs registered: `ds_supplier`, `ds_partner`, `ds_product`, `ds_commission_policy`
   - Stored in `custom_post_types` table

2. **CPT Data Storage:**
   - CPT posts stored in `custom_posts` table
   - ACF metadata stored in `custom_post_meta` table

3. **Dual Storage:**
   - TypeORM entities: Primary storage (relational)
   - CPT + ACF: WordPress-compatible storage (metadata)

**Synchronization Strategy:**

**Option A: CPT as Cache (Current)**
- TypeORM entities are **source of truth**
- CPT data is **synchronized** from entities (one-way sync)
- ACF fields **read from entity metadata**

**Option B: CPT as Primary**
- CPT + ACF are **source of truth**
- TypeORM entities **synchronized** from CPT (one-way sync)
- More WordPress-native

**Option C: Hybrid**
- Structural data in TypeORM (id, name, price, inventory)
- Metadata in ACF (cosmetic metadata, pharmacy metadata)
- Two-way sync required

**Recommendation:**
- **Option A** (CPT as Cache) is simplest and safest
- TypeORM provides better query performance and type safety
- CPT provides WordPress plugin compatibility

---

### 4.3 Metadata Storage

**JSONB Fields in Entities:**

| Entity | JSONB Field | Purpose | Extension Usage |
|--------|-------------|---------|----------------|
| Product | `metadata` | Generic product metadata | Store cosmetic/pharmacy/travel metadata |
| Product | `images` | Product images | Extensions may add additional image types |
| Product | `variants` | Product variants | Extensions may add variant attributes |
| Product | `dimensions` | Physical dimensions | Extensions may add shipping restrictions |
| Product | `shipping` | Shipping info | Extensions may customize shipping rules |
| Product | `seo` | SEO metadata | Extensions may add service-specific SEO |
| Product | `tierPricing` | Tier-based pricing | Extensions may add custom tier structures |
| Supplier | `metadata` | Supplier metadata | Store pharmacy license, certifications |
| Supplier | `metrics` | Performance metrics | Extensions may add custom KPIs |
| Supplier | `sellerTierDiscounts` | Tier discount rates | Extensions may customize discount structure |
| Supplier | `supplierPolicy` | Supplier policies | Extensions may add custom policies |
| Seller | `metadata` | Seller metadata | Store beauty specialties, travel expertise |
| Seller | `branding` | Store branding | Extensions customize branding (colors, logo) |
| Seller | `metrics` | Performance metrics | Extensions add custom KPIs |
| Seller | `policies` | Seller policies | Extensions add custom policies |
| Partner | `metadata` | Partner metadata | Store marketing channel preferences |
| Partner | `profile` | Partner profile | Extensions add audience demographics |
| Partner | `metrics` | Partner metrics | Extensions add attribution models |
| Commission | `metadata` | Commission metadata | Store attribution history, adjustments |
| Settlement | `metadata` | Settlement metadata | Store service-specific settlement rules |

**ACF to JSONB Mapping:**

```typescript
// Example: Cosmetics ACF → Product.metadata
{
  "cosmetic": {
    "skinType": ["건성", "민감성"],
    "ingredients": [
      { "name": "히알루론산", "percentage": 5, "function": "보습" },
      { "name": "나이아신아마이드", "percentage": 2, "function": "미백" }
    ],
    "beautyConcerns": ["여드름", "미백"],
    "productCategory": "스킨케어",
    "usageMethod": "세안 후 적당량을 손에 덜어 얼굴에 펴 발라줍니다.",
    "certifications": ["비건", "동물실험무"]
  }
}
```

**Extension Strategy:**
- Extensions define ACF fields
- ACF fields stored in `Product.metadata.{service}`
- Business logic queries `metadata` for service-specific data

---

## Chapter 5: UI Architecture Analysis

### 5.1 Admin Dashboard UI

**Current Structure:**

```
apps/admin-dashboard/src/pages/dropshipping/
├── index.tsx                  # Main dropshipping page (dashboard)
├── Products.tsx               # Product list & management
├── ProductEditor.tsx          # Product create/edit form
├── BulkProductImport.tsx      # Bulk import UI
├── Orders.tsx                 # Order management
├── Settlements.tsx            # Settlement management
├── Commissions.tsx            # Commission records
├── Approvals.tsx              # Approval workflows
└── SystemSetup.tsx            # System configuration
```

**Components (Shortcodes):**

```
apps/admin-dashboard/src/components/shortcodes/dropshipping/
├── index.tsx                  # Shortcode registry
├── UserDashboard.tsx          # Role-based dashboard (seller/supplier/partner)
├── RoleVerification.tsx       # Role switcher
├── seller/
│   ├── SellerDashboard.tsx       # Seller main dashboard
│   ├── SellerProducts.tsx        # Seller product catalog
│   ├── SellerSettlement.tsx      # Seller settlement history
│   └── ProductMarketplace.tsx    # Supplier product browsing
├── supplier/
│   ├── SupplierProducts.tsx      # Supplier product management
│   └── SupplierProductEditor.tsx # Supplier product form
├── partner/
│   ├── PartnerDashboard.tsx            # Partner main dashboard
│   ├── PartnerProducts.tsx             # Partner promotable products
│   ├── PartnerCommissions.tsx          # Partner commission history
│   └── PartnerCommissionDashboard.tsx  # Partner earnings overview
├── affiliate/
│   ├── AffiliateCommissionDashboard.tsx
│   └── index.ts
└── shared/
    ├── LinkGenerator.tsx         # Referral link generator
    └── SharedPayoutRequests.tsx  # Payout request UI
```

**Analysis:**

**Core UI Components:**
- ✅ Product list/editor (generic)
- ✅ Seller/Supplier/Partner dashboards (generic)
- ✅ Order management (generic)
- ✅ Settlement management (generic)
- ✅ Commission management (generic)
- ✅ Approval workflows (generic)

**Extension UI Override Points:**
- ⚠️ **ProductEditor:** Extensions can override product form (add cosmetic fields, pharmacy fields, travel fields)
- ⚠️ **SellerDashboard:** Extensions can add service-specific KPIs
- ⚠️ **SupplierProductEditor:** Extensions can customize supplier product form
- ⚠️ **ProductMarketplace:** Extensions can add service-specific filters (skin type, medication type, destination)

**Extension Strategy:**
```typescript
// Extension overrides admin route
adminRoutes: [
  {
    path: '/admin/dropshipping/products',
    component: './admin-ui/CosmeticsProductEditor.tsx',  // Replaces core ProductEditor
  },
]

// CosmeticsProductEditor.tsx
import { CoreProductEditor } from '@o4o/dropshipping-core/admin-ui';

export default function CosmeticsProductEditor() {
  return (
    <CoreProductEditor
      extraFields={<CosmeticMetadataFields />}  // Inject cosmetic fields
      onSave={handleCosmeticSave}  // Custom save logic
    />
  );
}
```

---

### 5.2 Main Site UI

**Current Structure:**

```
apps/main-site/src/components/shortcodes/
├── SupplierDashboard.tsx           # Supplier frontend dashboard
├── PartnerDashboard.tsx            # Partner frontend dashboard
└── PartnerDashboardOverview.tsx    # Partner overview

apps/main-site/src/pages/dashboard/
├── SellerProductCreatePage.tsx             # Seller product import page
└── SupplierProductAuthorizationsPage.tsx   # Supplier authorization management
```

**Analysis:**

**Core UI:**
- ✅ Supplier dashboard (generic)
- ✅ Partner dashboard (generic)
- ✅ Seller product import (generic)

**Extension UI Override Points:**
- ⚠️ **Product Browsing:** Extensions can customize product filters (skin type, medication type, destination)
- ⚠️ **Product Details:** Extensions can add service-specific product details
- ⚠️ **Dashboard Widgets:** Extensions can add service-specific widgets

**Extension Strategy:**
```typescript
// Extension provides main-site components
mainSiteComponents: [
  {
    name: 'CosmeticsProductCard',
    component: './main-site/CosmeticsProductCard.tsx',
  },
  {
    name: 'CosmeticsProductFilters',
    component: './main-site/CosmeticsProductFilters.tsx',
  },
]
```

---

### 5.3 UI Component Reusability

**Core UI Components (Reusable):**

| Component | Purpose | Extension Override? |
|-----------|---------|---------------------|
| ProductCard | Product display card | ✅ Yes (add metadata display) |
| ProductList | Product list/grid | ✅ Yes (add filters) |
| ProductEditor | Product create/edit form | ✅ Yes (add metadata fields) |
| DashboardStats | KPI dashboard widgets | ✅ Yes (add custom KPIs) |
| OrderList | Order list table | ❌ No (generic) |
| SettlementList | Settlement list table | ❌ No (generic) |
| CommissionList | Commission list table | ❌ No (generic) |
| AuthorizationList | Authorization list table | ⚠️ Maybe (add approval criteria) |

**Extension Component Strategy:**

**Option A: Override Entire Component**
```typescript
// Extension replaces Core component
<CosmeticsProductCard product={product} />
```

**Option B: Extend Component with Slots**
```typescript
// Core component provides slots for Extensions
<CoreProductCard product={product}>
  <ProductCard.Metadata>
    <CosmeticMetadataDisplay product={product} />
  </ProductCard.Metadata>
</CoreProductCard>
```

**Recommendation:** **Option B** (Slots) is more flexible and maintainable

---

## Chapter 6: Business Logic Analysis

### 6.1 Core Business Logic

**Commission Calculation Engine:**

**Algorithm:**
1. Get CommissionPolicy records matching context (partnerId, productId, tier, etc.)
2. Sort by priority (highest first)
3. Select best policy (or apply multiple if stacking allowed)
4. Calculate commission based on policy type (percentage, fixed, tiered)
5. Apply min/max constraints
6. Create Commission record with PENDING status
7. Set holdUntil date (current date + hold period, e.g., 7 days)
8. Background job confirms commissions after hold period (state: PENDING → CONFIRMED)

**Core Logic:**
```typescript
async function calculateCommission(context: CommissionContext): Promise<number> {
  // 1. Get applicable policies
  const policies = await getPoliciesForContext(context);

  // 2. Select best policy
  const policy = selectBestPolicy(policies);

  // 3. Calculate commission
  let commission = 0;
  switch (policy.commissionType) {
    case 'PERCENTAGE':
      commission = context.orderAmount * (policy.commissionRate / 100);
      break;
    case 'FIXED':
      commission = policy.commissionAmount;
      break;
    case 'TIERED':
      const tier = policy.tieredRates.find(t =>
        context.orderAmount >= t.minAmount &&
        (!t.maxAmount || context.orderAmount <= t.maxAmount)
      );
      commission = tier ? (tier.rate ? context.orderAmount * tier.rate / 100 : tier.amount) : 0;
      break;
  }

  // 4. Apply constraints
  if (policy.minCommission && commission < policy.minCommission) {
    commission = policy.minCommission;
  }
  if (policy.maxCommission && commission > policy.maxCommission) {
    commission = policy.maxCommission;
  }

  return commission;
}
```

**Extension Override Points:**
- ✅ **Policy Creation:** Extensions create custom CommissionPolicy records (data-driven)
- ⚠️ **Calculation Override:** Extensions can extend CommissionEngine (code-driven)
- ⚠️ **Hold Period:** Extensions can customize hold period (7, 14, 30 days)

**Example Extension Override:**
```typescript
// Cosmetics Extension: Higher commission for luxury products
export class CosmeticsCommissionEngine extends CommissionEngine {
  async calculateCommission(context: CommissionContext): Promise<number> {
    const baseCommission = await super.calculateCommission(context);

    // Luxury cosmetics bonus
    if (context.product.metadata?.cosmetic?.productCategory === '럭셔리 코스메틱') {
      return baseCommission * 1.2;  // 20% bonus
    }

    return baseCommission;
  }
}
```

---

**Settlement Generation Engine:**

**Algorithm:**
1. Determine settlement period (start date, end date)
2. Get all paid orders in period
3. Group by party (seller, supplier, partner)
4. Calculate totals:
   - For Sellers: totalSaleAmount, totalMarginAmount (sale - cost), payableAmount (margin - platform fee)
   - For Suppliers: totalBaseAmount (cost price), payableAmount (base price)
   - For Partners: totalCommissionAmount, payableAmount (confirmed commissions)
5. Create Settlement record with PENDING status
6. Create SettlementItem records for each order
7. Admin approves → status = PROCESSING
8. Payment completed → status = PAID, set paidAt

**Core Logic:**
```typescript
async function generateMonthlySettlement(partyType: SettlementPartyType, partyId: string, year: number, month: number): Promise<Settlement> {
  // 1. Determine period
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  // 2. Get orders
  const orders = await getOrdersInPeriod(partyId, periodStart, periodEnd);

  // 3. Calculate totals
  let totalSaleAmount = 0;
  let totalBaseAmount = 0;
  let totalMarginAmount = 0;
  let totalCommissionAmount = 0;

  for (const order of orders) {
    if (partyType === 'seller') {
      totalSaleAmount += order.salePrice;
      totalBaseAmount += order.costPrice;
      totalMarginAmount += order.salePrice - order.costPrice;
    } else if (partyType === 'supplier') {
      totalBaseAmount += order.costPrice;
    } else if (partyType === 'partner') {
      totalCommissionAmount += order.commission;
    }
  }

  // 4. Calculate payable amount
  let payableAmount = 0;
  if (partyType === 'seller') {
    const platformFee = totalSaleAmount * (seller.platformCommissionRate / 100);
    payableAmount = totalMarginAmount - platformFee;
  } else if (partyType === 'supplier') {
    payableAmount = totalBaseAmount;
  } else if (partyType === 'partner') {
    payableAmount = totalCommissionAmount;
  }

  // 5. Create settlement
  const settlement = await Settlement.create({
    partyType,
    partyId,
    periodStart,
    periodEnd,
    totalSaleAmount,
    totalBaseAmount,
    totalMarginAmount,
    totalCommissionAmount,
    payableAmount,
    status: 'PENDING',
  });

  return settlement;
}
```

**Extension Override Points:**
- ⚠️ **Period Calculation:** Extensions can customize settlement period (weekly, bi-weekly, monthly)
- ⚠️ **Fee Calculation:** Extensions can add service-specific fees (e.g., prescription validation fee for pharmacy)
- ⚠️ **Payout Threshold:** Extensions can customize minimum payout amount

**Example Extension Override:**
```typescript
// Pharmacy Extension: Add prescription validation fee
export class PharmacySettlementService extends SettlementService {
  async generateMonthlySettlement(partyId: string, year: number, month: number): Promise<Settlement> {
    const settlement = await super.generateMonthlySettlement(partyId, year, month);

    // Deduct prescription validation fee
    if (partyType === 'supplier') {
      const prescriptionOrders = await getPrescriptionOrders(partyId, settlement.periodStart, settlement.periodEnd);
      const validationFee = prescriptionOrders.length * 1000;  // 1,000 KRW per prescription
      settlement.payableAmount -= validationFee;
      settlement.metadata = {
        ...settlement.metadata,
        pharmacy: {
          prescriptionOrders: prescriptionOrders.length,
          validationFee,
        },
      };
    }

    return settlement;
  }
}
```

---

**Authorization Workflow:**

**State Machine:**
- REQUESTED → APPROVED (supplier approves)
- REQUESTED → REJECTED (supplier rejects, cooldown starts)
- APPROVED → REVOKED (admin/supplier revokes permanently)
- REQUESTED → CANCELLED (seller cancels)

**Business Rules:**
- 10-product limit per seller (enforced in service)
- 30-day cooldown after rejection (enforced in entity)
- Self-seller auto-approval (if seller.userId = supplier.userId)
- Permanent revocation (cannot re-request)

**Core Logic:**
```typescript
async function requestAuthorization(sellerId: string, productId: string): Promise<SellerAuthorization> {
  // 1. Check 10-product limit
  const authorizedProducts = await SellerAuthorization.count({
    where: { sellerId, status: 'APPROVED' },
  });
  if (authorizedProducts >= 10) {
    throw new Error('Seller has reached 10-product limit');
  }

  // 2. Check existing authorization
  const existing = await SellerAuthorization.findOne({
    where: { sellerId, productId },
  });
  if (existing) {
    if (existing.status === 'REVOKED') {
      throw new Error('Authorization permanently revoked');
    }
    if (existing.isInCooldown()) {
      throw new Error(`In cooldown period. ${existing.getCooldownDaysRemaining()} days remaining.`);
    }
  }

  // 3. Check self-seller auto-approval
  const product = await Product.findOne({ where: { id: productId } });
  const seller = await Seller.findOne({ where: { id: sellerId } });
  if (product.supplierId === seller.userId) {
    // Auto-approve
    return await SellerAuthorization.create({
      sellerId,
      productId,
      supplierId: product.supplierId,
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: seller.userId,
    });
  }

  // 4. Create authorization request
  return await SellerAuthorization.create({
    sellerId,
    productId,
    supplierId: product.supplierId,
    status: 'REQUESTED',
    requestedAt: new Date(),
  });
}
```

**Extension Override Points:**
- ⚠️ **Product Limit:** Extensions can customize limit (e.g., 20 for pharmacy due to wider catalog)
- ⚠️ **Cooldown Period:** Extensions can customize cooldown (e.g., 14 days for cosmetics)
- ⚠️ **Auto-Approval Rules:** Extensions can add custom auto-approval criteria (e.g., pre-approved suppliers)
- ⚠️ **Approval Criteria:** Extensions can add validation (e.g., pharmacy license required)

**Example Extension Override:**
```typescript
// Pharmacy Extension: Require pharmacy license
export class PharmacyAuthorizationService extends SellerAuthorizationService {
  async requestAuthorization(sellerId: string, productId: string): Promise<SellerAuthorization> {
    // 1. Validate pharmacy license
    const seller = await Seller.findOne({ where: { id: sellerId } });
    if (!seller.metadata?.pharmacy?.pharmacyLicense) {
      throw new Error('Pharmacy license required to sell medication products');
    }

    // 2. Call core logic
    return await super.requestAuthorization(sellerId, productId);
  }

  async approveAuthorization(authId: string, supplierId: string): Promise<SellerAuthorization> {
    // 1. Validate supplier license
    const supplier = await Supplier.findOne({ where: { id: supplierId } });
    if (!supplier.metadata?.pharmacy?.pharmacistLicense) {
      throw new Error('Pharmacist license required to supply medication products');
    }

    // 2. Call core logic
    return await super.approveAuthorization(authId, supplierId);
  }
}
```

---

### 6.2 Extension Business Logic Override Strategies

**Strategy 1: Service Extension (Code-Driven)**

Extensions extend Core services and override methods:

```typescript
// @o4o/dropshipping-cosmetics/src/backend/services/CosmeticsCommissionEngine.ts
import { CommissionEngine } from '@o4o/dropshipping-core';

export class CosmeticsCommissionEngine extends CommissionEngine {
  async calculateCommission(context: CommissionContext): Promise<number> {
    const baseCommission = await super.calculateCommission(context);

    // Cosmetics-specific logic
    if (context.product.metadata?.cosmetic?.certifications?.includes('유기농')) {
      return baseCommission * 1.15;  // 15% bonus for organic products
    }

    return baseCommission;
  }
}
```

**Strategy 2: Policy Creation (Data-Driven)**

Extensions create custom CommissionPolicy records:

```typescript
// @o4o/dropshipping-cosmetics/src/lifecycle/install.ts
export async function install() {
  await CommissionPolicy.create({
    policyCode: 'COSMETICS-LUXURY-2025',
    name: '럭셔리 코스메틱 특별 커미션',
    policyType: 'CATEGORY',
    category: '럭셔리 코스메틱',
    commissionType: 'PERCENTAGE',
    commissionRate: 15,  // 15% for luxury cosmetics
    priority: 100,  // Higher priority than default
    status: 'ACTIVE',
  });
}
```

**Strategy 3: Metadata Validation (ACF-Driven)**

Extensions define ACF fields that influence business logic:

```typescript
// @o4o/dropshipping-pharmacy/src/backend/services/PharmacyProductService.ts
import { SellerProductService } from '@o4o/dropshipping-core';

export class PharmacyProductService extends SellerProductService {
  async importProduct(sellerId: string, request: ImportProductRequest): Promise<SellerProduct> {
    // 1. Validate prescription requirement
    const product = await Product.findOne({ where: { id: request.productId } });
    if (product.metadata?.pharmacy?.requiresPrescription) {
      // Prescription products require additional validation
      const seller = await Seller.findOne({ where: { id: sellerId } });
      if (!seller.metadata?.pharmacy?.prescriptionHandlingCertified) {
        throw new Error('Seller must be certified to handle prescription products');
      }
    }

    // 2. Call core logic
    return await super.importProduct(sellerId, request);
  }
}
```

**Recommendation:**
- ✅ **Prefer Data-Driven (Strategy 2)** for commission policies, pricing rules
- ⚠️ **Use Code-Driven (Strategy 1)** only when necessary (complex logic)
- ✅ **Use Metadata Validation (Strategy 3)** for service-specific constraints

---

## Chapter 7: Risk Assessment

### 7.1 Separation Challenges

**Challenge 1: Entity Relationships**

**Risk:** 18 entities with complex relationships (ManyToOne, OneToMany) may break during separation

**Example:**
```typescript
// Product → Supplier (ManyToOne)
// Product → SellerProduct (OneToMany)
// Product → SellerAuthorization (OneToMany)
// Product → Commission (OneToMany)
```

**Mitigation:**
- ✅ Keep all entities in Core
- ✅ Extensions do not create new relational tables (use metadata)
- ⚠️ Test all entity relationships after package extraction

---

**Challenge 2: Dual Storage Synchronization**

**Risk:** TypeORM entities and CPT data may become out of sync

**Example:**
- Supplier creates product in TypeORM
- Product not synchronized to `ds_product` CPT
- WordPress plugins cannot access product

**Mitigation:**
- ✅ Choose primary storage (TypeORM recommended)
- ✅ Implement one-way sync (TypeORM → CPT)
- ⚠️ Test sync mechanism after separation

---

**Challenge 3: Financial Operations**

**Risk:** Commission and settlement calculations are critical; bugs could cause financial loss

**Example:**
- Commission calculation bug overpays partners
- Settlement generation bug underpays sellers

**Mitigation:**
- ✅ Comprehensive unit tests for commission calculation
- ✅ Integration tests for settlement generation
- ✅ Manual QA review of financial operations
- ⚠️ Backup data before migration

---

**Challenge 4: Service Dependencies**

**Risk:** Services have dependencies on each other; breaking these dependencies may cause runtime errors

**Example:**
```typescript
// SellerService depends on SellerProductService
// CommissionEngine depends on CommissionCalculator
// SettlementService depends on OrderService
```

**Mitigation:**
- ✅ Map all service dependencies
- ✅ Test service integrations after package extraction
- ⚠️ Use dependency injection to manage services

---

**Challenge 5: Migration Path**

**Risk:** Production data exists in current structure; migrating to packages may cause data loss

**Example:**
- Products table has 10,000 records
- Migration fails halfway
- Data corruption

**Mitigation:**
- ✅ **Phased migration:** Core first, Extensions later
- ✅ **Backward compatibility:** Keep old code until migration complete
- ✅ **Data backup:** Full database backup before migration
- ✅ **Rollback plan:** Ability to revert to old structure
- ⚠️ **Test on staging** before production

---

### 7.2 Testing Requirements

**Unit Tests:**
- ✅ All entity methods (helper functions)
- ✅ All service methods (business logic)
- ✅ Commission calculation (edge cases)
- ✅ Settlement generation (various scenarios)
- ✅ Authorization workflow (state transitions)

**Integration Tests:**
- ✅ Entity relationships (CRUD operations)
- ✅ Service integrations (seller imports product → authorization → order → commission → settlement)
- ✅ API endpoints (end-to-end workflows)
- ✅ CPT synchronization (TypeORM ↔ CPT)

**E2E Tests:**
- ✅ Seller workflow (browse catalog → import product → set price → sell → receive settlement)
- ✅ Supplier workflow (create product → approve seller → receive settlement)
- ✅ Partner workflow (generate referral link → track conversion → earn commission → request payout)
- ✅ Admin workflow (approve supplier → approve seller → manage settlements)

**Performance Tests:**
- ✅ Commission calculation (10,000 orders)
- ✅ Settlement generation (monthly batch)
- ✅ Product catalog browsing (pagination, filters)
- ✅ Dashboard aggregations (large datasets)

**User Acceptance Tests:**
- ✅ Cosmetics service (import beauty products, set prices, test UI)
- ✅ Pharmacy service (import medications, validate prescriptions)
- ✅ Travel service (import travel packages, manage bookings)

---

### 7.3 Deployment Strategy

**Phase 1: Core Extraction (Week 1-2)**

**Tasks:**
1. Create `packages/dropshipping-core` directory structure
2. Move entities → `dropshipping-core/src/backend/entities`
3. Move services → `dropshipping-core/src/backend/services`
4. Move migrations → `dropshipping-core/src/migrations`
5. Create manifest.ts
6. Create lifecycle hooks (install, uninstall)
7. Update `apps/api-server` to import from `@o4o/dropshipping-core`
8. Run tests (unit, integration, E2E)
9. Deploy to staging
10. Test on staging

**Rollback Plan:**
- Revert package structure
- Restore old code in `apps/api-server`

---

**Phase 2: Extension Creation (Week 3-4)**

**Tasks:**
1. Create `packages/dropshipping-cosmetics`
2. Define ACF groups (cosmetic_meta)
3. Create admin UI overrides (CosmeticsProductEditor)
4. Create default configuration (categories, branding)
5. Create manifest.ts
6. Install extension on staging
7. Test cosmetics-specific features
8. Deploy to staging
9. User acceptance testing

**Rollback Plan:**
- Uninstall extension
- Use Core only (generic dropshipping)

---

**Phase 3: Multi-Extension Testing (Week 5)**

**Tasks:**
1. Create `packages/dropshipping-pharmacy`
2. Create `packages/dropshipping-travel`
3. Test all three extensions side-by-side
4. Validate no conflicts
5. Test extension switching (Cosmetics → Pharmacy)
6. Deploy to staging
7. User acceptance testing

**Rollback Plan:**
- Uninstall all extensions
- Use Core only

---

**Phase 4: Production Deployment (Week 6)**

**Tasks:**
1. Full database backup
2. Deploy Core to production
3. Monitor for errors
4. Deploy Extensions to production (one by one)
5. Monitor for errors
6. User acceptance testing on production
7. Mark migration as complete

**Rollback Plan:**
- Database restore
- Revert to old code
- Hotfix any critical issues

---

### 7.4 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Entity relationship breaks** | Medium | High | Comprehensive integration tests |
| **CPT sync fails** | Medium | Medium | One-way sync (TypeORM → CPT), fallback to TypeORM only |
| **Commission calculation bug** | Low | High | Extensive unit tests, manual QA, financial audit |
| **Settlement generation bug** | Low | High | Extensive testing, manual review before payout |
| **Service dependency breaks** | Medium | High | Dependency mapping, integration tests |
| **Migration data loss** | Low | Critical | Full backup, phased migration, rollback plan |
| **UI breaks after separation** | Medium | Medium | E2E tests, manual QA |
| **Performance degradation** | Low | Medium | Performance tests, monitoring |
| **Extension conflicts** | Low | Medium | Manifest validation, extension isolation |
| **Production downtime** | Low | Critical | Phased deployment, rollback plan, hotfix readiness |

---

## Conclusion

### Summary of Findings

1. **Dropshipping is a complex, production-ready system** with 90+ files and 33,000+ lines of code
2. **Monolithic architecture** embedded in `apps/api-server` without modularization
3. **Forum App pattern is applicable** but requires adaptations due to:
   - Complex entity relationships (18 entities vs Forum's 4)
   - Financial operations (commission, settlement) vs content management
   - Service-specific business logic (not just metadata)
4. **Clear Core/Extension boundary exists:**
   - **Core:** All entities, services, base ACF, CPT definitions, migrations, lifecycle
   - **Extensions:** Service-specific ACF, admin UI overrides, default config, business rule customizations
5. **Separation is feasible but risky** due to production-critical financial operations
6. **Phased migration recommended** with comprehensive testing and rollback plans

### Recommendations

1. ✅ **Proceed with Core/Extension separation** following Forum App pattern
2. ✅ **Keep all entities in Core** (no service-specific relational tables)
3. ✅ **Use ACF for Extensions** (metadata-driven approach)
4. ✅ **Data-driven business logic** (CommissionPolicy records, not code overrides)
5. ✅ **Phased migration:** Core first, Extensions later, one extension at a time
6. ✅ **Comprehensive testing:** Unit, integration, E2E, performance, UAT
7. ✅ **Backup and rollback plan:** Essential for production deployment

### Next Steps

1. Review this investigation report with stakeholders
2. Review Core/Extension candidate map (`dropshipping_core_extension_candidate_map.md`)
3. Approve separation strategy and migration plan
4. Allocate resources (developers, QA, DevOps)
5. Create prototype Core package (POC)
6. Begin Phase 1: Core Extraction

---

**Status:** Investigation Complete
**Confidence Level:** High
**Ready for Implementation:** Yes (with caution and testing)
