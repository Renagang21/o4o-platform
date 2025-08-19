# 드롭쉬핑 API 서버 구현 요구사항

## 📋 개요
이 문서는 드롭쉬핑 플랫폼의 API 서버에서 구현해야 할 데이터베이스 스키마, API 엔드포인트, 비즈니스 로직을 정의합니다.

## 🗄️ 데이터베이스 스키마

### 1. 사용자 역할 관련 테이블

#### dropshipping_suppliers (공급자)
```sql
CREATE TABLE dropshipping_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  business_registration VARCHAR(100),
  tax_id VARCHAR(100),
  description TEXT,
  logo_url VARCHAR(500),
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  address JSONB,
  verification_status ENUM('pending', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
  verification_date TIMESTAMP,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  minimum_order_amount DECIMAL(10,2) DEFAULT 0,
  shipping_methods JSONB,
  return_policy TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_user_id ON dropshipping_suppliers(user_id);
CREATE INDEX idx_suppliers_verification ON dropshipping_suppliers(verification_status);
```

#### dropshipping_sellers (판매자)
```sql
CREATE TABLE dropshipping_sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  store_url VARCHAR(500),
  business_type ENUM('individual', 'company') DEFAULT 'individual',
  business_registration VARCHAR(100),
  description TEXT,
  logo_url VARCHAR(500),
  verification_status ENUM('pending', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
  verification_date TIMESTAMP,
  tier_level ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_profit DECIMAL(15,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  marketplace_connections JSONB DEFAULT '[]',
  payment_methods JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sellers_user_id ON dropshipping_sellers(user_id);
CREATE INDEX idx_sellers_tier ON dropshipping_sellers(tier_level);
```

#### dropshipping_affiliates (제휴자)
```sql
CREATE TABLE dropshipping_affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  website VARCHAR(500),
  social_media JSONB,
  tier_level ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  parent_affiliate_id UUID REFERENCES dropshipping_affiliates(id),
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_commission_earned DECIMAL(15,2) DEFAULT 0,
  total_commission_paid DECIMAL(15,2) DEFAULT 0,
  pending_commission DECIMAL(15,2) DEFAULT 0,
  payout_threshold DECIMAL(10,2) DEFAULT 50.00,
  payout_schedule ENUM('weekly', 'biweekly', 'monthly', 'on_demand') DEFAULT 'monthly',
  payment_methods JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_affiliates_user_id ON dropshipping_affiliates(user_id);
CREATE INDEX idx_affiliates_code ON dropshipping_affiliates(affiliate_code);
CREATE INDEX idx_affiliates_parent ON dropshipping_affiliates(parent_affiliate_id);
```

### 2. 제품 관련 테이블

#### dropshipping_products (공급자 제품)
```sql
CREATE TABLE dropshipping_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES dropshipping_suppliers(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  images JSONB DEFAULT '[]',
  base_price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  cost DECIMAL(10,2) NOT NULL,
  weight DECIMAL(10,3),
  dimensions JSONB,
  stock_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  shipping_class VARCHAR(50),
  shipping_time_days INTEGER DEFAULT 3,
  attributes JSONB DEFAULT '{}',
  variations JSONB DEFAULT '[]',
  status ENUM('active', 'inactive', 'out_of_stock') DEFAULT 'active',
  total_sales INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  seo_title VARCHAR(255),
  seo_description TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_supplier ON dropshipping_products(supplier_id);
CREATE INDEX idx_products_sku ON dropshipping_products(sku);
CREATE INDEX idx_products_status ON dropshipping_products(status);
CREATE INDEX idx_products_category ON dropshipping_products(category_id);
```

#### dropshipping_seller_products (판매자가 가져온 제품)
```sql
CREATE TABLE dropshipping_seller_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES dropshipping_sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES dropshipping_products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES dropshipping_suppliers(id),
  custom_sku VARCHAR(100),
  custom_name VARCHAR(500),
  custom_description TEXT,
  markup_type ENUM('fixed', 'percentage') DEFAULT 'percentage',
  markup_value DECIMAL(10,2) DEFAULT 30.00,
  selling_price DECIMAL(10,2) NOT NULL,
  auto_sync_price BOOLEAN DEFAULT true,
  auto_sync_stock BOOLEAN DEFAULT true,
  auto_sync_info BOOLEAN DEFAULT false,
  status ENUM('active', 'paused', 'out_of_stock') DEFAULT 'active',
  channels JSONB DEFAULT '[]',
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_profit DECIMAL(15,2) DEFAULT 0,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seller_products_seller ON dropshipping_seller_products(seller_id);
CREATE INDEX idx_seller_products_product ON dropshipping_seller_products(product_id);
CREATE INDEX idx_seller_products_status ON dropshipping_seller_products(status);
```

### 3. 주문 관련 테이블

#### dropshipping_orders (드롭쉬핑 주문)
```sql
CREATE TABLE dropshipping_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  ecommerce_order_id INTEGER REFERENCES orders(id),
  seller_id UUID REFERENCES dropshipping_sellers(id),
  supplier_id UUID REFERENCES dropshipping_suppliers(id),
  customer_id INTEGER REFERENCES users(id),
  affiliate_id UUID REFERENCES dropshipping_affiliates(id),
  affiliate_link_id UUID,
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  supplier_cost DECIMAL(10,2) NOT NULL,
  seller_profit DECIMAL(10,2) NOT NULL,
  affiliate_commission DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dropship_orders_seller ON dropshipping_orders(seller_id);
CREATE INDEX idx_dropship_orders_supplier ON dropshipping_orders(supplier_id);
CREATE INDEX idx_dropship_orders_customer ON dropshipping_orders(customer_id);
CREATE INDEX idx_dropship_orders_affiliate ON dropshipping_orders(affiliate_id);
CREATE INDEX idx_dropship_orders_status ON dropshipping_orders(status);
CREATE INDEX idx_dropship_orders_ecommerce ON dropshipping_orders(ecommerce_order_id);
```

### 4. 제휴 관련 테이블

#### dropshipping_affiliate_links (제휴 링크)
```sql
CREATE TABLE dropshipping_affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES dropshipping_affiliates(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  short_url VARCHAR(255) UNIQUE,
  custom_alias VARCHAR(100),
  product_id UUID REFERENCES dropshipping_products(id),
  category_id INTEGER REFERENCES categories(id),
  campaign_name VARCHAR(255),
  description TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  qr_code_url VARCHAR(500),
  clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(15,2) DEFAULT 0,
  commission DECIMAL(15,2) DEFAULT 0,
  platform VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_affiliate_links_affiliate ON dropshipping_affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_links_product ON dropshipping_affiliate_links(product_id);
CREATE INDEX idx_affiliate_links_short ON dropshipping_affiliate_links(short_url);
CREATE INDEX idx_affiliate_links_active ON dropshipping_affiliate_links(is_active);
```

#### dropshipping_commissions (수수료)
```sql
CREATE TABLE dropshipping_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES dropshipping_affiliates(id),
  order_id UUID REFERENCES dropshipping_orders(id),
  link_id UUID REFERENCES dropshipping_affiliate_links(id),
  product_id UUID REFERENCES dropshipping_products(id),
  order_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  tier_level VARCHAR(20),
  status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  payout_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commissions_affiliate ON dropshipping_commissions(affiliate_id);
CREATE INDEX idx_commissions_order ON dropshipping_commissions(order_id);
CREATE INDEX idx_commissions_status ON dropshipping_commissions(status);
CREATE INDEX idx_commissions_payout ON dropshipping_commissions(payout_id);
```

#### dropshipping_payouts (지급)
```sql
CREATE TABLE dropshipping_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  affiliate_id UUID REFERENCES dropshipping_affiliates(id),
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  account_details JSONB,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  transaction_id VARCHAR(255),
  processed_at TIMESTAMP,
  notes TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payouts_affiliate ON dropshipping_payouts(affiliate_id);
CREATE INDEX idx_payouts_status ON dropshipping_payouts(status);
```

## 🔌 API 엔드포인트

### 1. 인증 및 역할 관리

```typescript
// 역할 신청/검증
POST   /api/v1/dropshipping/apply-role
POST   /api/v1/dropshipping/verify-role
GET    /api/v1/dropshipping/my-roles
POST   /api/v1/dropshipping/switch-role

// 권한 확인
GET    /api/v1/dropshipping/permissions
POST   /api/v1/dropshipping/check-permission
```

### 2. 공급자(Supplier) API

```typescript
// 제품 관리
GET    /api/v1/dropshipping/supplier/products
POST   /api/v1/dropshipping/supplier/products
PUT    /api/v1/dropshipping/supplier/products/:id
DELETE /api/v1/dropshipping/supplier/products/:id
POST   /api/v1/dropshipping/supplier/products/bulk-upload
PUT    /api/v1/dropshipping/supplier/products/bulk-update

// 재고 관리
GET    /api/v1/dropshipping/supplier/inventory
PUT    /api/v1/dropshipping/supplier/inventory/:productId
POST   /api/v1/dropshipping/supplier/inventory/bulk-update
GET    /api/v1/dropshipping/supplier/inventory/alerts

// 주문 처리
GET    /api/v1/dropshipping/supplier/orders
GET    /api/v1/dropshipping/supplier/orders/:id
PUT    /api/v1/dropshipping/supplier/orders/:id/status
POST   /api/v1/dropshipping/supplier/orders/:id/ship
POST   /api/v1/dropshipping/supplier/orders/:id/tracking
GET    /api/v1/dropshipping/supplier/orders/:id/label

// 분석 및 보고서
GET    /api/v1/dropshipping/supplier/analytics
GET    /api/v1/dropshipping/supplier/reports
GET    /api/v1/dropshipping/supplier/best-sellers
```

### 3. 판매자(Seller) API

```typescript
// 제품 마켓플레이스
GET    /api/v1/dropshipping/seller/marketplace
GET    /api/v1/dropshipping/seller/marketplace/search
GET    /api/v1/dropshipping/seller/marketplace/product/:id
POST   /api/v1/dropshipping/seller/products/import
POST   /api/v1/dropshipping/seller/products/bulk-import

// 내 제품 관리
GET    /api/v1/dropshipping/seller/products
PUT    /api/v1/dropshipping/seller/products/:id
DELETE /api/v1/dropshipping/seller/products/:id
PUT    /api/v1/dropshipping/seller/products/:id/pricing
PUT    /api/v1/dropshipping/seller/products/:id/status
POST   /api/v1/dropshipping/seller/products/:id/sync
PUT    /api/v1/dropshipping/seller/products/bulk-pricing

// 주문 관리
GET    /api/v1/dropshipping/seller/orders
GET    /api/v1/dropshipping/seller/orders/:id
POST   /api/v1/dropshipping/seller/orders/create
GET    /api/v1/dropshipping/seller/orders/:id/tracking

// 분석
GET    /api/v1/dropshipping/seller/analytics
GET    /api/v1/dropshipping/seller/profit-report
```

### 4. 제휴자(Affiliate) API

```typescript
// 링크 관리
GET    /api/v1/dropshipping/affiliate/links
POST   /api/v1/dropshipping/affiliate/links
PUT    /api/v1/dropshipping/affiliate/links/:id
DELETE /api/v1/dropshipping/affiliate/links/:id
GET    /api/v1/dropshipping/affiliate/links/:id/stats
POST   /api/v1/dropshipping/affiliate/links/:id/qr

// 수수료 관리
GET    /api/v1/dropshipping/affiliate/commissions
GET    /api/v1/dropshipping/affiliate/commission/summary
GET    /api/v1/dropshipping/affiliate/commission/export
GET    /api/v1/dropshipping/affiliate/performance
GET    /api/v1/dropshipping/affiliate/top-products
GET    /api/v1/dropshipping/affiliate/tier-info

// 지급 관리
GET    /api/v1/dropshipping/affiliate/payout/summary
GET    /api/v1/dropshipping/affiliate/payout/accounts
POST   /api/v1/dropshipping/affiliate/payout/accounts
DELETE /api/v1/dropshipping/affiliate/payout/accounts/:id
GET    /api/v1/dropshipping/affiliate/payout/requests
POST   /api/v1/dropshipping/affiliate/payout/request
POST   /api/v1/dropshipping/affiliate/payout/requests/:id/cancel
GET    /api/v1/dropshipping/affiliate/payout/history

// AFFILIATE 앱 연동
POST   /api/v1/dropshipping/affiliate/app/connect
GET    /api/v1/dropshipping/affiliate/app/status
POST   /api/v1/dropshipping/affiliate/app/sync
POST   /api/v1/dropshipping/affiliate/app/webhook
```

### 5. 전자상거래 통합 API

```typescript
// 제품 동기화
POST   /api/v1/dropshipping/sync/products
POST   /api/v1/dropshipping/sync/inventory
POST   /api/v1/dropshipping/sync/prices
GET    /api/v1/dropshipping/sync/status

// 주문 플로우
POST   /api/v1/dropshipping/orders/create-from-ecommerce
POST   /api/v1/dropshipping/orders/split-to-suppliers
POST   /api/v1/dropshipping/orders/update-ecommerce-status
POST   /api/v1/dropshipping/orders/sync-tracking

// 웹훅
POST   /api/v1/dropshipping/webhooks/order-created
POST   /api/v1/dropshipping/webhooks/order-updated
POST   /api/v1/dropshipping/webhooks/product-updated
POST   /api/v1/dropshipping/webhooks/inventory-changed
```

## 🔄 전자상거래 통합 로직

### 1. 제품 통합 플로우

```typescript
// 공급자 제품 → 전자상거래 제품
async function syncSupplierProductToEcommerce(supplierId: string, productId: string) {
  // 1. 드롭쉬핑 제품 가져오기
  const dropshipProduct = await getDropshippingProduct(productId);
  
  // 2. 전자상거래 제품 생성/업데이트
  const ecommerceProduct = {
    name: dropshipProduct.name,
    description: dropshipProduct.description,
    price: dropshipProduct.base_price,
    sku: `DS-${supplierId}-${dropshipProduct.sku}`,
    stock: dropshipProduct.stock_quantity,
    images: dropshipProduct.images,
    category_id: dropshipProduct.category_id,
    meta_data: {
      dropshipping: true,
      supplier_id: supplierId,
      dropship_product_id: productId,
      shipping_time: dropshipProduct.shipping_time_days
    }
  };
  
  // 3. 기존 products 테이블에 저장
  const result = await createOrUpdateProduct(ecommerceProduct);
  
  // 4. 연결 정보 저장
  await saveProductMapping(productId, result.id);
  
  return result;
}
```

### 2. 주문 처리 플로우

```typescript
// 전자상거래 주문 → 드롭쉬핑 주문
async function processDropshippingOrder(orderId: number) {
  // 1. 전자상거래 주문 가져오기
  const order = await getEcommerceOrder(orderId);
  
  // 2. 드롭쉬핑 제품 확인
  const dropshipItems = await identifyDropshipItems(order.items);
  
  if (dropshipItems.length === 0) return;
  
  // 3. 공급자별로 주문 분할
  const supplierOrders = await splitOrderBySupplier(dropshipItems);
  
  // 4. 각 공급자에게 주문 생성
  for (const supplierOrder of supplierOrders) {
    const dropshipOrder = await createDropshippingOrder({
      ecommerce_order_id: orderId,
      supplier_id: supplierOrder.supplier_id,
      seller_id: supplierOrder.seller_id,
      items: supplierOrder.items,
      shipping_address: order.shipping_address,
      // ... 기타 주문 정보
    });
    
    // 5. 공급자에게 알림
    await notifySupplier(dropshipOrder);
    
    // 6. 제휴 수수료 계산
    if (order.affiliate_code) {
      await calculateAffiliateCommission(dropshipOrder, order.affiliate_code);
    }
  }
  
  // 7. 주문 상태 업데이트
  await updateOrderStatus(orderId, 'processing');
}
```

### 3. 재고 동기화

```typescript
// 실시간 재고 동기화
async function syncInventory(productId: string) {
  // 1. 드롭쉬핑 제품 재고 확인
  const dropshipProduct = await getDropshippingProduct(productId);
  
  // 2. 연결된 모든 전자상거래 제품 찾기
  const linkedProducts = await getLinkedEcommerceProducts(productId);
  
  // 3. 각 제품의 재고 업데이트
  for (const linkedProduct of linkedProducts) {
    // 판매자의 마크업 고려
    const sellerProduct = await getSellerProduct(linkedProduct.seller_id, productId);
    
    if (sellerProduct.auto_sync_stock) {
      await updateProductStock(linkedProduct.ecommerce_product_id, {
        stock: dropshipProduct.stock_quantity - dropshipProduct.reserved_quantity,
        low_stock_alert: dropshipProduct.stock_quantity <= dropshipProduct.low_stock_threshold
      });
    }
  }
  
  // 4. 재고 부족 알림
  if (dropshipProduct.stock_quantity <= dropshipProduct.low_stock_threshold) {
    await sendLowStockAlert(productId);
  }
}
```

## 🎯 관리자 기능 통합

### 1. 기존 관리자 메뉴에 드롭쉬핑 추가

```typescript
// 관리자 메뉴 확장
const adminMenuExtensions = {
  // 제품 관리에 추가
  products: {
    submenu: [
      { title: '드롭쉬핑 제품', path: '/admin/products/dropshipping' },
      { title: '공급자 제품 승인', path: '/admin/products/supplier-approval' },
      { title: '제품 매핑 관리', path: '/admin/products/mapping' }
    ]
  },
  
  // 주문 관리에 추가
  orders: {
    submenu: [
      { title: '드롭쉬핑 주문', path: '/admin/orders/dropshipping' },
      { title: '공급자별 주문', path: '/admin/orders/by-supplier' },
      { title: '배송 추적', path: '/admin/orders/tracking' }
    ]
  },
  
  // 사용자 관리에 추가
  users: {
    submenu: [
      { title: '공급자 관리', path: '/admin/users/suppliers' },
      { title: '판매자 관리', path: '/admin/users/sellers' },
      { title: '제휴자 관리', path: '/admin/users/affiliates' },
      { title: '역할 승인', path: '/admin/users/role-approvals' }
    ]
  },
  
  // 보고서에 추가
  reports: {
    submenu: [
      { title: '드롭쉬핑 매출', path: '/admin/reports/dropshipping-revenue' },
      { title: '공급자 실적', path: '/admin/reports/supplier-performance' },
      { title: '제휴 수수료', path: '/admin/reports/affiliate-commissions' }
    ]
  },
  
  // 설정에 추가
  settings: {
    submenu: [
      { title: '드롭쉬핑 설정', path: '/admin/settings/dropshipping' },
      { title: '수수료 정책', path: '/admin/settings/commission-rates' },
      { title: '자동화 규칙', path: '/admin/settings/automation' }
    ]
  }
};
```

### 2. 관리자 대시보드 위젯

```typescript
// 드롭쉬핑 대시보드 위젯
const dropshippingDashboardWidgets = [
  {
    id: 'dropship_overview',
    title: '드롭쉬핑 개요',
    component: 'DropshippingOverviewWidget',
    position: 'top',
    metrics: [
      'active_suppliers',
      'active_sellers',
      'total_dropship_products',
      'pending_approvals'
    ]
  },
  {
    id: 'dropship_orders',
    title: '드롭쉬핑 주문 현황',
    component: 'DropshippingOrdersWidget',
    position: 'main',
    data: [
      'today_orders',
      'pending_shipments',
      'in_transit',
      'completed_today'
    ]
  },
  {
    id: 'supplier_performance',
    title: '공급자 실적',
    component: 'SupplierPerformanceWidget',
    position: 'sidebar',
    showTopSuppliers: 5
  },
  {
    id: 'affiliate_earnings',
    title: '제휴 수익',
    component: 'AffiliateEarningsWidget',
    position: 'sidebar',
    period: 'month'
  }
];
```

## 🔧 비즈니스 로직 구현

### 1. 수수료 계산 로직

```typescript
class CommissionCalculator {
  // 판매자 수익 계산
  calculateSellerProfit(order: DropshippingOrder): number {
    const supplierCost = order.supplier_cost;
    const sellingPrice = order.subtotal;
    const platformFee = sellingPrice * 0.05; // 플랫폼 수수료 5%
    
    return sellingPrice - supplierCost - platformFee;
  }
  
  // 제휴 수수료 계산
  calculateAffiliateCommission(
    order: DropshippingOrder,
    affiliate: Affiliate
  ): number {
    const baseRate = affiliate.commission_rate;
    const tierBonus = this.getTierBonus(affiliate.tier_level);
    const finalRate = baseRate * (1 + tierBonus);
    
    return order.subtotal * (finalRate / 100);
  }
  
  // 계층별 보너스
  private getTierBonus(tier: string): number {
    const bonuses = {
      bronze: 0,
      silver: 0.2,  // 20% 보너스
      gold: 0.5,    // 50% 보너스
      platinum: 1.0 // 100% 보너스
    };
    return bonuses[tier] || 0;
  }
}
```

### 2. 자동 주문 처리

```typescript
class AutoOrderProcessor {
  async processOrder(orderId: string) {
    const order = await this.getOrder(orderId);
    
    // 1. 재고 확인
    const stockCheck = await this.checkStock(order.items);
    if (!stockCheck.available) {
      await this.handleOutOfStock(order, stockCheck.unavailableItems);
      return;
    }
    
    // 2. 재고 예약
    await this.reserveStock(order.items);
    
    // 3. 공급자에게 주문 전송
    await this.sendToSupplier(order);
    
    // 4. 결제 처리
    await this.processPayment(order);
    
    // 5. 주문 확정
    await this.confirmOrder(order);
    
    // 6. 알림 발송
    await this.sendNotifications(order);
  }
  
  private async checkStock(items: OrderItem[]): Promise<StockCheckResult> {
    // 재고 확인 로직
  }
  
  private async reserveStock(items: OrderItem[]) {
    // 재고 예약 로직
  }
  
  private async sendToSupplier(order: Order) {
    // 공급자 API 호출 또는 이메일 발송
  }
}
```

### 3. 가격 동기화

```typescript
class PriceSynchronizer {
  async syncPrices(productId: string) {
    const supplierProduct = await this.getSupplierProduct(productId);
    const sellerProducts = await this.getSellerProducts(productId);
    
    for (const sellerProduct of sellerProducts) {
      if (!sellerProduct.auto_sync_price) continue;
      
      // 마크업 적용
      const newPrice = this.calculateSellingPrice(
        supplierProduct.base_price,
        sellerProduct.markup_type,
        sellerProduct.markup_value
      );
      
      // 전자상거래 제품 가격 업데이트
      await this.updateEcommercePrice(
        sellerProduct.ecommerce_product_id,
        newPrice
      );
      
      // 판매자 제품 가격 업데이트
      await this.updateSellerProductPrice(sellerProduct.id, newPrice);
    }
  }
  
  private calculateSellingPrice(
    basePrice: number,
    markupType: 'fixed' | 'percentage',
    markupValue: number
  ): number {
    if (markupType === 'fixed') {
      return basePrice + markupValue;
    } else {
      return basePrice * (1 + markupValue / 100);
    }
  }
}
```

## 📊 모니터링 및 분석

### 1. 실시간 모니터링

```typescript
// 모니터링 메트릭
const monitoringMetrics = {
  orders: {
    total_orders: 'COUNT(*)',
    pending_orders: "COUNT(*) WHERE status = 'pending'",
    revenue_today: 'SUM(total_amount) WHERE DATE(created_at) = CURRENT_DATE',
    average_order_value: 'AVG(total_amount)'
  },
  
  inventory: {
    low_stock_products: 'COUNT(*) WHERE stock_quantity <= low_stock_threshold',
    out_of_stock: "COUNT(*) WHERE status = 'out_of_stock'",
    total_inventory_value: 'SUM(stock_quantity * cost)'
  },
  
  performance: {
    supplier_fulfillment_rate: 'AVG(fulfilled_orders / total_orders)',
    average_shipping_time: 'AVG(delivered_at - shipped_at)',
    customer_satisfaction: 'AVG(rating)'
  },
  
  affiliates: {
    active_affiliates: "COUNT(DISTINCT affiliate_id) WHERE created_at >= NOW() - INTERVAL '30 days'",
    conversion_rate: 'AVG(conversions / clicks)',
    total_commission_pending: "SUM(commission_amount) WHERE status = 'pending'"
  }
};
```

### 2. 보고서 생성

```typescript
class ReportGenerator {
  async generateSupplierReport(supplierId: string, period: string) {
    return {
      overview: await this.getSupplierOverview(supplierId, period),
      products: await this.getProductPerformance(supplierId, period),
      orders: await this.getOrderStatistics(supplierId, period),
      revenue: await this.getRevenueBreakdown(supplierId, period),
      ratings: await this.getRatingsAnalysis(supplierId, period)
    };
  }
  
  async generateAffiliateReport(affiliateId: string, period: string) {
    return {
      earnings: await this.getEarningsSummary(affiliateId, period),
      links: await this.getLinkPerformance(affiliateId, period),
      conversions: await this.getConversionAnalysis(affiliateId, period),
      products: await this.getTopProducts(affiliateId, period),
      payouts: await this.getPayoutHistory(affiliateId, period)
    };
  }
}
```

## 🔐 보안 및 권한

### 1. API 미들웨어

```typescript
// 드롭쉬핑 역할 확인 미들웨어
export const requireDropshippingRole = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    
    // 역할 확인
    const hasRole = await checkUserDropshippingRole(userId, role);
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // 검증 상태 확인
    const isVerified = await checkRoleVerification(userId, role);
    if (!isVerified && role !== 'affiliate') {
      return res.status(403).json({ error: 'Role verification required' });
    }
    
    next();
  };
};

// 리소스 소유권 확인
export const requireResourceOwnership = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const resourceId = req.params.id;
    
    const isOwner = await checkResourceOwnership(
      userId,
      resourceType,
      resourceId
    );
    
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
};
```

## 📝 마이그레이션 스크립트

```sql
-- 기존 전자상거래 테이블과 연동을 위한 컬럼 추가
ALTER TABLE products 
ADD COLUMN is_dropshipping BOOLEAN DEFAULT false,
ADD COLUMN dropship_supplier_id UUID REFERENCES dropshipping_suppliers(id),
ADD COLUMN dropship_product_id UUID REFERENCES dropshipping_products(id);

ALTER TABLE orders
ADD COLUMN has_dropship_items BOOLEAN DEFAULT false,
ADD COLUMN dropship_order_ids UUID[] DEFAULT '{}';

ALTER TABLE users
ADD COLUMN dropshipping_roles JSONB DEFAULT '[]',
ADD COLUMN dropshipping_verified BOOLEAN DEFAULT false;

-- 인덱스 추가
CREATE INDEX idx_products_dropshipping ON products(is_dropshipping) WHERE is_dropshipping = true;
CREATE INDEX idx_orders_dropshipping ON orders(has_dropship_items) WHERE has_dropship_items = true;
```

## 🚀 구현 우선순위

1. **Phase 1: 데이터베이스 설정**
   - 모든 테이블 생성
   - 인덱스 및 제약조건 설정
   - 기존 테이블과의 관계 설정

2. **Phase 2: 기본 API 구현**
   - 인증 및 권한 시스템
   - CRUD 작업 API
   - 검증 로직

3. **Phase 3: 전자상거래 통합**
   - 제품 동기화
   - 주문 처리 플로우
   - 재고 관리

4. **Phase 4: 자동화 및 최적화**
   - 자동 주문 처리
   - 실시간 동기화
   - 알림 시스템

5. **Phase 5: 분석 및 보고서**
   - 대시보드 구현
   - 보고서 생성
   - 성능 모니터링

---

이 문서를 기반으로 API 서버 개발팀이 구현을 진행할 수 있습니다.