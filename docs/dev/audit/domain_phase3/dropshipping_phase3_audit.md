# Dropshipping 도메인 Phase 3 조사 보고서

**작성일**: 2025-11-30
**패키지**: `@o4o/dropshipping-core` (Core), `@o4o/dropshipping-cosmetics` (Extension)

---

## 1. Dropshipping Core 구조 분석

### 1.1 Core App 정의 (`dropshipping-core/src/manifest.ts`)

```typescript
{
  appId: 'dropshipping-core',
  name: 'Dropshipping Core',
  type: 'core',
  version: '1.0.0',

  // 데이터 소유권
  ownsTables: [
    'products',
    'suppliers',
    'sellers',
    'seller_products',
    'seller_authorizations',
    'partners',
    'commissions',
    'commission_policies',
    'partner_commissions',
    'settlements',
    'settlement_items',
    'partner_profiles',
    'seller_profiles',
    'supplier_profiles',
    'channel_product_links',
    'seller_channel_accounts',
    'payment_settlements',
  ],

  // CPT 정의
  cpt: [
    { name: 'ds_product', storage: 'entity', label: '드랍쉬핑 상품' },
    { name: 'ds_supplier', storage: 'entity', label: '공급업체' },
    { name: 'ds_seller', storage: 'entity', label: '판매자' },
    { name: 'ds_partner', storage: 'entity', label: '파트너' },
  ],

  // ACF 정의 (Core는 기본 메타데이터만 제공)
  acf: [
    {
      groupId: 'ds_product_meta',
      label: '드랍쉬핑 상품 메타데이터',
      fields: [
        { key: 'supplierPrice', type: 'number', label: '공급가', required: true },
        { key: 'sellerPrice', type: 'number', label: '판매가', required: true },
        { key: 'commissionRate', type: 'number', label: '수수료율 (%)' },
      ],
    },
  ],

  // 권한
  permissions: [
    'dropshipping.read',
    'dropshipping.write',
    'dropshipping.admin',
    'seller.read',
    'seller.write',
    'seller.admin',
    'supplier.read',
    'supplier.write',
    'supplier.admin',
    'partner.read',
    'partner.write',
    'partner.admin',
    'commission.view',
    'commission.calculate',
    'commission.admin',
    'settlement.view',
    'settlement.process',
    'settlement.admin',
  ],

  // 라우트
  routes: [
    '/api/v2/seller',
    '/api/v2/seller/*',
    '/api/v2/supplier',
    '/api/v2/supplier/*',
    '/api/admin/dropshipping',
    '/api/admin/dropshipping/*',
    '/api/admin/seller-authorization',
    '/api/admin/seller-authorization/*',
  ],

  // 삭제 정책
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: true,
  },
}
```

### 1.2 핵심 엔티티 구조

#### Product
```typescript
@Entity('products')
class Product {
  id: string;

  // 관계
  supplierId: string;     // 공급업체
  categoryId?: string;    // 카테고리 (→ organizationId 추가 가능)

  // 기본 정보
  name: string;
  description: string;
  sku: string;
  slug: string;

  type: ProductType;      // PHYSICAL, DIGITAL, SERVICE, SUBSCRIPTION
  status: ProductStatus;  // DRAFT, ACTIVE, INACTIVE, OUT_OF_STOCK, DISCONTINUED

  // 가격 정보
  supplierPrice: number;       // 공급가
  recommendedPrice: number;    // 권장 판매가
  comparePrice?: number;       // 정가 (할인 비교용)
  currency: string;            // KRW

  // 커미션 정책 (Phase PD-2)
  commissionType?: 'rate' | 'fixed';
  commissionValue?: number;    // rate: 0-1, fixed: 금액
  sellerCommissionRate?: number;
  platformCommissionRate?: number;

  // Legacy 커미션 (하위 호환)
  partnerCommissionRate: number;
  partnerCommissionAmount?: number;

  // 재고 관리
  inventory: number;
  lowStockThreshold?: number;
  trackInventory: boolean;
  allowBackorder: boolean;

  // 미디어
  images?: ProductImages;
  tags?: string[];

  // 변형 상품 (사이즈, 색상 등)
  variants?: ProductVariant[];
  hasVariants: boolean;

  // 물리 정보
  dimensions?: ProductDimensions;
  shipping?: ShippingInfo;

  // SEO
  seo?: ProductSEO;

  // 공급자 등급별 가격
  tierPricing?: {
    bronze?: number;
    silver?: number;
    gold?: number;
    platinum?: number;
  };

  // 확장 메타데이터 (Extension 확장 포인트)
  metadata?: Record<string, any>;

  // 헬퍼 메서드
  getCurrentPrice(sellerTier?: string): number;
  getCommissionPolicy(): { type: 'rate' | 'fixed'; value: number } | null;
  calculatePartnerCommission(salePrice: number): number;
  isInStock(): boolean;
  canOrder(quantity: number): boolean;
}
```

#### Supplier
```typescript
@Entity('suppliers')
class Supplier {
  id: string;
  userId: string;  // User 연동

  businessName: string;
  businessNumber: string;
  contactEmail: string;
  contactPhone: string;

  status: 'active' | 'inactive' | 'suspended';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';

  commissionRate: number;  // 기본 커미션율
  metadata?: Record<string, any>;
}
```

#### Seller
```typescript
@Entity('sellers')
class Seller {
  id: string;
  userId: string;  // User 연동

  businessName: string;
  businessNumber?: string;
  sellerType: 'individual' | 'business';

  status: 'pending' | 'approved' | 'active' | 'inactive' | 'suspended';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';

  defaultCommissionRate: number;
  metadata?: Record<string, any>;
}
```

#### Commission & Settlement
```typescript
@Entity('commissions')
class Commission {
  id: string;
  orderId: string;
  productId: string;
  partnerId: string;

  saleAmount: number;
  commissionAmount: number;
  commissionRate: number;

  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  settlementId?: string;
}

@Entity('settlements')
class Settlement {
  id: string;
  partnerId: string;
  supplierId?: string;
  sellerId?: string;

  period: { start: Date; end: Date };
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  items: SettlementItem[];
  metadata?: Record<string, any>;
}
```

---

## 2. Dropshipping Extension 구조 분석

### 2.1 Cosmetics Extension (`dropshipping-cosmetics/src/manifest.ts`)

```typescript
{
  appId: 'dropshipping-cosmetics',
  name: 'Dropshipping Cosmetics Extension',
  type: 'extension',
  version: '1.0.0',

  // Core 의존성
  dependencies: {
    'dropshipping-core': '^1.0.0',
  },

  // Core CPT 확장
  extendsCPT: ['ds_product'],

  // Extension CPT
  cpt: [
    {
      name: 'cosmetics_influencer_routine',
      storage: 'entity',
      label: 'Influencer Routine',
    },
  ],

  // 화장품 메타데이터 ACF
  acf: [
    {
      groupId: 'cosmetics_metadata',
      label: 'Cosmetics Information',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'skinType',
          type: 'multiselect',
          label: 'Skin Type',
          choices: { dry: '건성', oily: '지성', combination: '복합성', ... },
        },
        {
          key: 'concerns',
          type: 'multiselect',
          label: 'Skin Concerns',
          choices: { acne: '여드름', whitening: '미백', wrinkle: '주름개선', ... },
        },
        {
          key: 'ingredients',
          type: 'array',
          label: 'Key Ingredients',
          subFields: [
            { key: 'name', type: 'text', label: 'Ingredient Name' },
            { key: 'description', type: 'text', label: 'Description' },
            { key: 'percentage', type: 'number', label: 'Percentage' },
          ],
        },
        {
          key: 'certifications',
          type: 'multiselect',
          label: 'Certifications',
          choices: { vegan: '비건', organic: '유기농', crueltyfree: '동물실험반대', ... },
        },
        {
          key: 'routineInfo',
          type: 'object',
          label: 'Routine Information',
          subFields: [
            { key: 'timeOfUse', type: 'multiselect', choices: { morning: '아침', evening: '저녁', ... } },
            { key: 'step', type: 'select', choices: { cleansing: '클렌징', toner: '토너', ... } },
            { key: 'orderInRoutine', type: 'number' },
          ],
        },
        { key: 'texture', type: 'select', choices: { gel: '젤', cream: '크림', ... } },
        { key: 'volume', type: 'text', label: 'Volume/Size' },
        { key: 'expiryPeriod', type: 'text', label: 'Expiry Period After Opening' },
      ],
    },
  ],

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // Extension 라우트
  routes: ['/api/v1/cosmetics', '/api/v1/partner'],

  // Extension 권한
  permissions: [
    'cosmetics:view',
    'cosmetics:edit',
    'cosmetics:manage_filters',
    'cosmetics:recommend_routine',
  ],

  // 메뉴 확장
  menu: {
    parent: 'dropshipping',
    items: [
      {
        id: 'cosmetics-filters',
        label: 'Cosmetics Filters',
        path: '/admin/cosmetics/filters',
        permission: 'cosmetics:manage_filters',
      },
      {
        id: 'cosmetics-routines',
        label: 'Routine Templates',
        path: '/admin/cosmetics/routines',
        permission: 'cosmetics:recommend_routine',
      },
    ],
  },
}
```

---

## 3. Organization-Core 연동 분석

### 3.1 현재 구조

**✅ 좋은 점**:
- `userId` 기반 데이터 연결 → `organizationId` 추가 용이
- `metadata` 필드로 확장 가능
- Seller/Supplier 엔티티가 조직 단위 확장에 적합

**🔵 현재 상태 (정상)**:
- Organization 테이블 없음 → **예상된 상태** (아직 미도입)
- 조직 공동구매 기능은 Extension으로 추가 예정

### 3.2 Organization 연동 시나리오

#### Scenario A: Product에 organizationId 추가 (지부 공동구매)
```typescript
@Entity('products')
class Product {
  // ... 기존 필드 ...

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;  // 지부/분회 전용 상품

  @Column({ type: 'enum', enum: ['global', 'organization'], default: 'global' })
  scope: string;  // 전체 vs 조직 전용

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  // 조직별 가격 정책
  organizationPricing?: {
    [orgId: string]: {
      price: number;
      minQuantity: number;  // 공동구매 최소 수량
      deadline: Date;       // 구매 마감일
    };
  };

  // 조회 필터
  static findByOrganization(orgId: string): Promise<Product[]> {
    return this.find({
      where: [
        { organizationId: orgId, scope: 'organization' },
        { scope: 'global' },
      ],
    });
  }
}
```

#### Scenario B: Settlement에 organizationId 추가 (조직별 정산)
```typescript
@Entity('settlements')
class Settlement {
  id: string;
  partnerId: string;

  organizationId?: string;  // 지부/분회 정산
  organizationType?: 'branch' | 'division' | 'global';

  period: { start: Date; end: Date };
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed';

  // 조직별 정산 계산
  static async calculateForOrganization(orgId: string, period: DateRange) {
    const orders = await Order.find({
      where: {
        organizationId: orgId,
        createdAt: Between(period.start, period.end),
      },
    });

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const commission = totalAmount * 0.05;  // 조직 수수료

    return Settlement.create({
      organizationId: orgId,
      period,
      totalAmount,
      commission,
    });
  }
}
```

#### Scenario C: Seller Authorization + Organization (분회장 승인)
```typescript
@Entity('seller_authorizations')
class SellerAuthorization {
  id: string;
  sellerId: string;

  organizationId?: string;  // 분회/지부 판매 권한
  authorizedBy: string;     // 승인자 (분회장/지부장)

  scope: 'global' | 'organization';
  status: 'pending' | 'approved' | 'rejected';

  // 조직별 승인 워크플로우
  static async requestOrganizationAuthorization(
    sellerId: string,
    orgId: string
  ) {
    const orgAdmin = await Organization.findAdmin(orgId);
    return this.create({
      sellerId,
      organizationId: orgId,
      scope: 'organization',
      status: 'pending',
      authorizedBy: orgAdmin.id,
    }).save();
  }
}
```

### 3.3 RBAC 확장 (조직별 역할)

```typescript
// RoleAssignment에 scope 추가
@Entity('role_assignments')
class RoleAssignment {
  userId: string;
  role: string;  // 'seller', 'supplier', 'groupbuy_manager'

  scope?: string;        // organizationId
  scopeType?: string;    // 'organization', 'global'

  isActive: boolean;
}

// 권한 체크 예시
async function canUserManageProduct(userId: string, product: Product) {
  // 1. 글로벌 관리자 체크
  const globalAdmin = await RoleAssignment.findOne({
    where: { userId, role: 'admin', isActive: true, scopeType: 'global' }
  });
  if (globalAdmin) return true;

  // 2. 조직 관리자 체크
  if (product.organizationId) {
    const orgAdmin = await RoleAssignment.findOne({
      where: {
        userId,
        role: 'groupbuy_manager',
        isActive: true,
        scope: product.organizationId,
      }
    });
    if (orgAdmin) return true;
  }

  // 3. Supplier 소유권 체크
  const supplier = await Supplier.findOne({ where: { userId } });
  if (supplier && product.supplierId === supplier.id) return true;

  return false;
}
```

---

## 4. CPT·ACF·Block Editor 연동

### 4.1 CPT 등록 (App Store 설치 시)

```typescript
// AppManager.install('dropshipping-core')
const cptRegistry = new CPTRegistry();

for (const cptDef of manifest.cpt) {
  cptRegistry.register({
    name: cptDef.name,           // 'ds_product'
    storage: cptDef.storage,     // 'entity'
    label: cptDef.label,         // '드랍쉬핑 상품'
    entity: Product,             // TypeORM Entity
    supports: cptDef.supports,   // ['title', 'content', 'metadata']
  });
}
```

### 4.2 ACF 필드 확장 (Extension 설치 시)

```typescript
// AppManager.install('dropshipping-cosmetics')
const acfRegistry = new ACFRegistry();

// 1. Core CPT에 Extension ACF 그룹 추가
acfRegistry.registerGroup({
  groupId: 'cosmetics_metadata',
  label: 'Cosmetics Information',
  appliesTo: 'ds_product',  // Core CPT 확장
  fields: [
    { key: 'skinType', type: 'multiselect', ... },
    { key: 'ingredients', type: 'array', ... },
    { key: 'certifications', type: 'multiselect', ... },
  ],
});

// 2. 상품 조회 시 ACF 데이터 자동 병합
const product = await Product.findOne({ where: { id } });
const acfData = await acfRegistry.getFieldValues('ds_product', product.id);
return {
  ...product,
  acf: acfData,  // { skinType: ['dry', 'sensitive'], ingredients: [...] }
};
```

### 4.3 Block Editor 통합 (향후)

```typescript
// ds_product CPT용 Block 정의
const productBlocks = [
  { type: 'core/heading', supports: ['text'] },
  { type: 'core/paragraph', supports: ['text', 'formatting'] },
  { type: 'core/image', supports: ['upload', 'caption'] },
  { type: 'dropshipping/price-table', acfGroup: 'ds_product_meta' },
  { type: 'cosmetics/ingredient-list', acfGroup: 'cosmetics_metadata' },  // Extension Block
  { type: 'cosmetics/skin-type-badge', acfGroup: 'cosmetics_metadata' },
];
```

---

## 5. App Store 패키징 검증

### 5.1 설치 시나리오

```bash
# 1. Core 앱 설치
POST /api/admin/appstore/install
{
  "appId": "dropshipping-core",
  "version": "1.0.0"
}

# 자동 실행:
# - Migration 실행 (products, suppliers, sellers, commissions 등 테이블 생성)
# - CPT 등록 (ds_product, ds_supplier, ds_seller, ds_partner)
# - ACF 등록 (ds_product_meta)
# - 권한 등록 (seller.read, commission.view, settlement.admin 등)
# - 라우트 등록 (/api/v2/seller/*, /api/admin/dropshipping/*)

# 2. Extension 설치
POST /api/admin/appstore/install
{
  "appId": "dropshipping-cosmetics",
  "version": "1.0.0"
}

# 자동 실행:
# - 의존성 검증 (dropshipping-core 설치 여부 확인)
# - Extension 테이블 생성 (cosmetics_influencer_routine)
# - ACF 그룹 등록 (cosmetics_metadata → ds_product CPT 확장)
# - Extension 라우트 등록 (/api/v1/cosmetics)
# - Extension 권한 등록 (cosmetics:view, cosmetics:manage_filters)
```

### 5.2 삭제 시나리오

```bash
# Extension 삭제 (정상)
DELETE /api/admin/appstore/uninstall/dropshipping-cosmetics?purgeData=false

# 자동 실행:
# - keep-data 모드 (cosmetics_influencer_routine 테이블 보존)
# - ACF 그룹 비활성화 (cosmetics_metadata는 보존, 조회만 중단)
# - Core는 유지됨

# Core 삭제 시도 (Extension 존재 시 거부)
DELETE /api/admin/appstore/uninstall/dropshipping-core

# 응답:
{
  "error": "Cannot uninstall dropshipping-core: dropshipping-cosmetics depends on it",
  "dependents": ["dropshipping-cosmetics"]
}

# Core 삭제 (모든 Extension 제거 후)
DELETE /api/admin/appstore/uninstall/dropshipping-core?purgeData=true

# 자동 실행:
# - Purge 모드 (products, suppliers, commissions, settlements 등 테이블 삭제)
# - CPT 등록 해제
# - 권한 제거
# - 라우트 제거
```

---

## 6. 독립 웹서버 선택적 설치 패턴

### 6.1 화장품 쇼핑몰 (cosmetics.neture.co.kr)

```json
{
  "installedApps": [
    "dropshipping-core",
    "dropshipping-cosmetics"
  ],
  "features": {
    "dropshipping": {
      "acf": ["cosmetics_metadata"],
      "filters": {
        "skinType": true,
        "concerns": true,
        "certifications": true
      },
      "influencerRoutines": true
    }
  }
}
```

### 6.2 일반 드랍쉬핑 쇼핑몰 (shop.example.com)

```json
{
  "installedApps": [
    "dropshipping-core"
  ],
  "features": {
    "dropshipping": {
      "acf": ["ds_product_meta"],  // 기본 메타데이터만
      "filters": {
        "category": true,
        "price": true
      }
    }
  }
}
```

### 6.3 약사회 공동구매 사이트 (yaksa.or.kr)

```json
{
  "installedApps": [
    "dropshipping-core",
    "organization-core",           // 향후
    "organization-groupbuy"        // 향후 Extension
  ],
  "features": {
    "dropshipping": {
      "organizationFilter": true,  // 분회/지부 필터
      "groupBuySchedule": true,    // 공동구매 일정
      "organizationPricing": true, // 조직별 가격
      "settlementByOrg": true      // 조직별 정산
    }
  }
}
```

---

## 7. Extension 제작 가이드 (향후)

### 7.1 Organization-Groupbuy Extension 예시

```typescript
// packages/organization-groupbuy/src/manifest.ts
export const organizationGroupbuyManifest = {
  appId: 'organization-groupbuy',
  name: 'Organization Group Buying Extension',
  type: 'extension',

  dependencies: {
    'dropshipping-core': '>=1.0.0',
    'organization-core': '>=1.0.0',
  },

  // Extension 테이블
  ownsTables: [
    'groupbuy_campaigns',
    'groupbuy_participants',
    'groupbuy_orders',
  ],

  // Migration: Product에 organizationId, organizationPricing 컬럼 추가
  migrations: [
    './migrations/001-add-organization-fields.ts',
  ],

  // ACF: 공동구매 설정
  acf: [
    {
      groupId: 'groupbuy_settings',
      label: '공동구매 설정',
      appliesTo: 'ds_product',
      fields: [
        { key: 'organizationId', type: 'select', label: '대상 조직' },
        { key: 'minQuantity', type: 'number', label: '최소 주문 수량' },
        { key: 'deadline', type: 'datetime', label: '구매 마감일' },
        { key: 'organizationPrice', type: 'number', label: '조직 특가' },
      ],
    },
  ],

  // Lifecycle: 조직별 공동구매 캠페인 자동 생성
  lifecycle: {
    install: async (context) => {
      // 모든 Organization에 대해 공동구매 설정 초기화
      const orgs = await Organization.find({ where: { type: 'branch' } });
      for (const org of orgs) {
        await GroupbuyCampaign.create({
          organizationId: org.id,
          status: 'inactive',
          settings: { commissionRate: 0.05 },
        }).save();
      }
    },
  },
};
```

---

## 8. 권장사항

### 8.1 즉시 작업 가능
- [x] Dropshipping Core 매니페스트 완성됨
- [x] Cosmetics Extension 매니페스트 완성됨
- [x] CPT/ACF 정의 완성됨
- [x] Lifecycle hooks 구현됨
- [ ] AppManager UI 연동 (설치/삭제 버튼)
- [ ] CPT/ACF 자동 등록 검증

### 8.2 Organization 연동 후 작업
- [ ] Product에 `organizationId`, `organizationPricing` 컬럼 추가
- [ ] Settlement에 `organizationId` 컬럼 추가
- [ ] SellerAuthorization에 organization scope 추가
- [ ] RoleAssignment에 `scope: organizationId` 추가
- [ ] "우리 지부/분회 공동구매" 탭 UI 구현

### 8.3 공동구매 Extension 제작
- [ ] GroupbuyCampaign 엔티티 (조직별 공동구매 캠페인)
- [ ] 최소 수량/마감일 관리
- [ ] 조직별 특가 정책
- [ ] 조직 관리자 승인 워크플로우

### 8.4 Block Editor 통합 (장기)
- [ ] ds_product CPT를 Block Editor로 편집
- [ ] Extension Block: `cosmetics/ingredient-list`, `cosmetics/routine-step`
- [ ] ACF 데이터를 Block 속성으로 연동

---

## 결론

**✅ Dropshipping 도메인은 App Store 기반 Core/Extension 구조로 완벽하게 설계됨**

1. **Core/Extension 분리**: dropshipping-core (Core) + dropshipping-cosmetics (Extension)
2. **데이터 소유권**: ownsTables로 명확히 정의 (18개 테이블)
3. **설치/삭제**: Lifecycle hooks + 의존성 검증 + keep-data 정책
4. **독립 웹서버**: 각 서비스별 필요한 앱만 선택 설치
5. **Organization 연동**: userId → organizationId 추가로 공동구매 기능 확장 가능
6. **RBAC 통합**: RoleAssignment + scope로 조직별 역할 관리 (groupbuy_manager)
7. **CPT/ACF 확장**: Extension이 Core CPT에 ACF 필드 추가 (화장품 메타데이터)
8. **정산/커미션**: 조직별 정산 구조로 확장 가능

**다음 단계**: AppManager UI 연동 및 Organization-Groupbuy Extension 제작
