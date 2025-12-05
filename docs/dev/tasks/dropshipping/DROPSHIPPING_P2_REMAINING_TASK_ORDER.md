# 📄 **Dropshipping P2 Remaining Task Order**

**버전:** 1.0
**작성일:** 2025-12-05
**대상:** Commission / Dashboard / Settlement 완성
**목적:** Dropshipping Core 100% 완성
**우선순위:** Commission → Settlement → Dashboard 순서

---

## 📊 현재 완료 상태

### ✅ 완료된 작업 (P1 + P2.1 + P2.2 부분)

**P1: 100% 완료**
- DTO validation (3개)
- class-validator 전체 적용

**P2.1: 100% 완료**
- RBAC middleware 전체 endpoint 적용
- Role-based access control 완료

**P2.2: 70% 완료**
- Seller/Supplier/Partner approval actions 완성
- Partner controller 완전 구현 (4 TODOs)
- Seller controller 완전 구현 (1 TODO)

### ⏳ 남은 작업 (P2.2 나머지 30%)

**Commission Controller (4 TODOs)**
- createPolicy
- getPolicy
- updatePolicy
- listPolicies

**Dashboard Controller (3 TODOs)**
- Seller KPI 계산
- Supplier KPI 계산
- Partner KPI 계산

**Settlement Controller (5 TODOs)**
- createSettlement
- getSettlement
- listSettlements
- updateSettlement
- processSettlement

---

## 🎯 작업 목표

이 Task Order를 완료하면:

1. **Commission Engine 완성** → 파트너/셀러 수익 계산 가능
2. **Settlement Service 완성** → 정산 프로세스 자동화
3. **Dashboard KPI 완성** → 실시간 성과 분석 가능
4. **Dropshipping Core 100% 완성** → 확장앱 조사 준비 완료

---

# 1️⃣ Commission Controller & Engine (Priority 1)

## 현재 상태 분석

**파일 위치:**
- Controller: `src/modules/dropshipping/controllers/commission.controller.ts`
- Service: CommissionEngine 또는 CommissionService
- Entity: `src/modules/dropshipping/entities/CommissionPolicy.ts`

**남은 TODO:**
```typescript
// TODO: Implement CommissionEngine.createPolicy
// TODO: Implement CommissionEngine.getPolicy
// TODO: Implement CommissionEngine.updatePolicy
// TODO: Implement CommissionEngine.listPolicies
```

## 작업 계획

### Step 1: CommissionEngine/Service 확인

**조사 항목:**
```bash
# 1. CommissionEngine 존재 여부 확인
find . -name "*Commission*Service.ts" -o -name "*CommissionEngine.ts"

# 2. CommissionPolicy Entity 구조 확인
cat src/modules/dropshipping/entities/CommissionPolicy.ts

# 3. 기존 메서드 확인
grep -n "async.*Policy" src/modules/dropshipping/services/*Commission*.ts
```

### Step 2: CommissionEngine 구현

**필수 메서드:**

```typescript
class CommissionEngine {
  // Policy 생성
  async createPolicy(data: CreateCommissionPolicyDto): Promise<CommissionPolicy> {
    // - Validation: rate 범위 (0-100%)
    // - Validation: 정책 중복 체크
    // - Entity 생성 및 저장
    // - Log: Policy created
  }

  // Policy 조회
  async getPolicy(id: string): Promise<CommissionPolicy | null> {
    // - Repository findOne
    // - 존재 여부 확인
  }

  // Policy 업데이트
  async updatePolicy(id: string, data: UpdateCommissionPolicyDto): Promise<CommissionPolicy> {
    // - 기존 policy 조회
    // - Validation
    // - 업데이트 및 저장
    // - Log: Policy updated
  }

  // Policy 목록
  async listPolicies(filters: {
    isActive?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ policies: CommissionPolicy[]; total: number; page: number; limit: number; totalPages: number }> {
    // - QueryBuilder 생성
    // - Filter 적용
    // - Pagination
    // - getManyAndCount
  }
}
```

### Step 3: Controller 구현

**패턴:**
```typescript
// POST /api/v1/dropshipping/commission-policies
static async createCommissionPolicy(req: AuthRequest, res: Response) {
  const data = req.body as CreateCommissionPolicyDto;
  const engine = CommissionEngine.getInstance();

  const policy = await engine.createPolicy(data);

  return BaseController.ok(res, {
    message: 'Commission policy created',
    policy
  });
}

// GET /api/v1/dropshipping/commission-policies/:id
static async getCommissionPolicy(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const engine = CommissionEngine.getInstance();

  const policy = await engine.getPolicy(id);

  if (!policy) {
    return BaseController.notFound(res, 'Policy not found');
  }

  return BaseController.ok(res, { policy });
}

// PUT /api/v1/dropshipping/commission-policies/:id
static async updateCommissionPolicy(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = req.body as UpdateCommissionPolicyDto;
  const engine = CommissionEngine.getInstance();

  const policy = await engine.updatePolicy(id, data);

  return BaseController.ok(res, {
    message: 'Policy updated',
    policy
  });
}

// GET /api/v1/dropshipping/commission-policies
static async listCommissionPolicies(req: AuthRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const isActive = req.query.isActive === 'true';

  const engine = CommissionEngine.getInstance();
  const result = await engine.listPolicies({ isActive, page, limit });

  return BaseController.okPaginated(res, result.policies, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  });
}
```

### DoD (Definition of Done)

- [ ] CommissionEngine에 4개 메서드 구현
- [ ] Controller에 4개 TODO 제거
- [ ] TypeScript 컴파일 통과
- [ ] Policy CRUD 테스트 가능

---

# 2️⃣ Settlement Controller & Service (Priority 2)

## 현재 상태 분석

**파일 위치:**
- Controller: `src/modules/dropshipping/controllers/settlement.controller.ts`
- Service: SettlementService
- Entity: `src/modules/dropshipping/entities/Settlement.ts`, `SettlementItem.ts`

**남은 TODO:**
```typescript
// TODO: Implement SettlementService.create
// TODO: Implement SettlementService.findById
// TODO: Implement SettlementService.list with filters
// TODO: Implement SettlementService.update
// TODO: Implement SettlementService.process
```

## 작업 계획

### Step 1: SettlementService 구조 확인

**조사 항목:**
```bash
# 1. SettlementService 존재 여부
find . -name "SettlementService.ts"

# 2. Settlement Entity 구조
cat src/modules/dropshipping/entities/Settlement.ts

# 3. SettlementItem Entity 구조
cat src/modules/dropshipping/entities/SettlementItem.ts
```

### Step 2: SettlementService 구현

**필수 메서드:**

```typescript
class SettlementService {
  // Settlement 생성
  async createSettlement(data: CreateSettlementDto): Promise<Settlement> {
    // - Partner/Seller 정산 대상 확인
    // - 정산 기간 검증
    // - Commission 집계
    // - Settlement Entity 생성
    // - SettlementItem 생성 (각 수익 항목)
    // - 총액 계산
    // - 저장 및 반환
  }

  // Settlement 조회
  async findById(id: string): Promise<Settlement | null> {
    // - Relations: items, partner, seller
    // - Repository findOne
  }

  // Settlement 목록
  async listSettlements(filters: {
    partnerId?: string;
    sellerId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ settlements: Settlement[]; total: number; ... }> {
    // - QueryBuilder 생성
    // - Filter 적용
    // - Pagination
    // - getManyAndCount
  }

  // Settlement 업데이트
  async updateSettlement(id: string, data: UpdateSettlementDto): Promise<Settlement> {
    // - 기존 settlement 조회
    // - Status 변경 가능 여부 검증
    // - 업데이트 및 저장
  }

  // Settlement 처리 (정산 실행)
  async processSettlement(id: string): Promise<Settlement> {
    // - Settlement 조회
    // - Status: PENDING → PROCESSING
    // - 실제 정산 처리 (은행 이체 API 연동 등)
    // - Status: PROCESSING → COMPLETED
    // - processedAt 기록
    // - 저장 및 반환
  }
}
```

### Step 3: Controller 구현

**패턴:**
```typescript
// POST /api/v1/dropshipping/settlements
static async createSettlement(req: AuthRequest, res: Response) {
  const data = req.body as CreateSettlementDto;
  const service = SettlementService.getInstance();

  const settlement = await service.createSettlement(data);

  return BaseController.ok(res, {
    message: 'Settlement created',
    settlement
  });
}

// GET /api/v1/dropshipping/settlements/:id
static async getSettlement(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const service = SettlementService.getInstance();

  const settlement = await service.findById(id);

  if (!settlement) {
    return BaseController.notFound(res, 'Settlement not found');
  }

  return BaseController.ok(res, { settlement });
}

// GET /api/v1/dropshipping/settlements
static async listSettlements(req: AuthRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const partnerId = req.query.partnerId as string;

  const service = SettlementService.getInstance();
  const result = await service.listSettlements({
    status,
    partnerId,
    page,
    limit
  });

  return BaseController.okPaginated(res, result.settlements, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  });
}

// PUT /api/v1/dropshipping/settlements/:id
static async updateSettlement(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = req.body as UpdateSettlementDto;
  const service = SettlementService.getInstance();

  const settlement = await service.updateSettlement(id, data);

  return BaseController.ok(res, {
    message: 'Settlement updated',
    settlement
  });
}

// POST /api/v1/dropshipping/settlements/:id/process
static async processSettlement(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const service = SettlementService.getInstance();

  const settlement = await service.processSettlement(id);

  return BaseController.ok(res, {
    message: 'Settlement processed',
    settlement
  });
}
```

### DoD (Definition of Done)

- [ ] SettlementService에 5개 메서드 구현
- [ ] Controller에 5개 TODO 제거
- [ ] Settlement 생성/조회/처리 흐름 동작
- [ ] TypeScript 컴파일 통과

---

# 3️⃣ Dashboard Controller & KPI Services (Priority 3)

## 현재 상태 분석

**파일 위치:**
- Controller: `src/modules/dropshipping/controllers/dashboard.controller.ts`
- Services: SellerDashboardService, SupplierDashboardService, PartnerDashboardService (또는 통합 DashboardService)

**남은 TODO:**
```typescript
// TODO: Implement SellerDashboardService.getDashboard
// TODO: Implement SupplierDashboardService.getDashboard
// TODO: Implement PartnerDashboardService.getDashboard
```

## 작업 계획

### Step 1: Dashboard Service 구조 설계

**옵션 A: 통합 DashboardService**
```typescript
class DashboardService {
  async getSellerDashboard(sellerId: string, period?: string): Promise<SellerDashboard> {}
  async getSupplierDashboard(supplierId: string, period?: string): Promise<SupplierDashboard> {}
  async getPartnerDashboard(partnerId: string, period?: string): Promise<PartnerDashboard> {}
}
```

**옵션 B: 분리된 Service**
```typescript
class SellerDashboardService {
  async getDashboard(sellerId: string, period?: string): Promise<SellerDashboard> {}
}
class SupplierDashboardService {
  async getDashboard(supplierId: string, period?: string): Promise<SupplierDashboard> {}
}
class PartnerDashboardService {
  async getDashboard(partnerId: string, period?: string): Promise<PartnerDashboard> {}
}
```

**권장: 옵션 A (통합 DashboardService)**

### Step 2: KPI 정의

**Seller KPI:**
```typescript
interface SellerDashboard {
  // 매출 통계
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number; // %

  // 상품 통계
  totalProducts: number;
  activeProducts: number;

  // 주문 통계
  totalOrders: number;
  monthlyOrders: number;
  averageOrderValue: number;

  // 고객 통계
  totalCustomers: number;
  repeatCustomerRate: number; // %
  customerSatisfaction: number; // 1-5

  // 성과 지표
  conversionRate: number; // %
  returnRate: number; // %

  // 정산 정보
  pendingSettlement: number;
  lastSettlementDate: Date;
}
```

**Supplier KPI:**
```typescript
interface SupplierDashboard {
  // 공급 통계
  totalProducts: number;
  activeProducts: number;

  // 판매 통계
  totalSales: number;
  monthlySales: number;
  salesGrowth: number; // %

  // 셀러 통계
  totalSellers: number;
  activeSellers: number;

  // 재고 통계
  lowStockProducts: number;
  outOfStockProducts: number;

  // 주문 통계
  totalOrders: number;
  monthlyOrders: number;
  averageOrderValue: number;

  // 정산 정보
  pendingSettlement: number;
  lastSettlementDate: Date;
}
```

**Partner KPI:**
```typescript
interface PartnerDashboard {
  // 트래픽 통계
  totalClicks: number;
  monthlyClicks: number;
  clickGrowth: number; // %

  // 전환 통계
  totalConversions: number;
  monthlyConversions: number;
  conversionRate: number; // %

  // 수익 통계
  totalCommission: number;
  monthlyCommission: number;
  pendingCommission: number;
  paidCommission: number;
  averageCommissionPerOrder: number;

  // 캠페인 통계
  activeCampaigns: number;
  topPerformingCampaign: string;

  // 정산 정보
  pendingSettlement: number;
  nextSettlementDate: Date;
}
```

### Step 3: DashboardService 구현

```typescript
class DashboardService {
  static instance: DashboardService;

  private sellerRepository: Repository<Seller>;
  private supplierRepository: Repository<Supplier>;
  private partnerRepository: Repository<Partner>;
  private orderRepository: Repository<Order>;
  private commissionRepository: Repository<Commission>;
  private settlementRepository: Repository<Settlement>;

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getSellerDashboard(sellerId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<SellerDashboard> {
    // 1. Seller 조회
    const seller = await this.sellerRepository.findOne({ where: { id: sellerId } });
    if (!seller) throw new Error('Seller not found');

    // 2. 기간 계산
    const { dateFrom, dateTo } = this.getPeriodDates(period);

    // 3. 매출 통계
    const revenueStats = await this.calculateSellerRevenue(sellerId, dateFrom, dateTo);

    // 4. 상품 통계
    const productStats = await this.calculateSellerProducts(sellerId);

    // 5. 주문 통계
    const orderStats = await this.calculateSellerOrders(sellerId, dateFrom, dateTo);

    // 6. 고객 통계
    const customerStats = await this.calculateSellerCustomers(sellerId, dateFrom, dateTo);

    // 7. 정산 정보
    const settlementInfo = await this.getSellerSettlementInfo(sellerId);

    return {
      ...revenueStats,
      ...productStats,
      ...orderStats,
      ...customerStats,
      ...settlementInfo
    };
  }

  async getSupplierDashboard(supplierId: string, period = 'month'): Promise<SupplierDashboard> {
    // Similar implementation for Supplier
  }

  async getPartnerDashboard(partnerId: string, period = 'month'): Promise<PartnerDashboard> {
    // Similar implementation for Partner
  }

  // Helper methods
  private getPeriodDates(period: string): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    let dateFrom: Date;

    switch (period) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { dateFrom, dateTo: now };
  }

  private async calculateSellerRevenue(sellerId: string, dateFrom: Date, dateTo: Date) {
    // QueryBuilder로 매출 집계
  }

  private async calculateSellerProducts(sellerId: string) {
    // QueryBuilder로 상품 집계
  }

  // ... more helper methods
}
```

### Step 4: Controller 구현

```typescript
// GET /api/v1/dropshipping/dashboard/seller
static async getSellerDashboard(req: AuthRequest, res: Response) {
  if (!req.user) {
    return BaseController.unauthorized(res, 'Not authenticated');
  }

  const sellerService = SellerService.getInstance();
  const seller = await sellerService.getByUserId(req.user.id);

  if (!seller) {
    return BaseController.notFound(res, 'Seller profile not found');
  }

  const period = req.query.period as any || 'month';
  const dashboardService = DashboardService.getInstance();

  const dashboard = await dashboardService.getSellerDashboard(seller.id, period);

  return BaseController.ok(res, { dashboard });
}

// GET /api/v1/dropshipping/dashboard/supplier
static async getSupplierDashboard(req: AuthRequest, res: Response) {
  // Similar implementation
}

// GET /api/v1/dropshipping/dashboard/partner
static async getPartnerDashboard(req: AuthRequest, res: Response) {
  // Similar implementation
}
```

### DoD (Definition of Done)

- [ ] DashboardService 생성 및 3개 메서드 구현
- [ ] Controller에 3개 TODO 제거
- [ ] KPI 계산 로직 동작
- [ ] TypeScript 컴파일 통과
- [ ] Dashboard API 호출 시 실시간 통계 반환

---

# 📋 전체 작업 순서

## Phase 1: Commission (예상 소요: 2-3시간)

1. CommissionEngine/Service 조사
2. createPolicy 구현
3. getPolicy 구현
4. updatePolicy 구현
5. listPolicies 구현
6. Controller 연결
7. 테스트

## Phase 2: Settlement (예상 소요: 3-4시간)

1. SettlementService 조사
2. createSettlement 구현
3. findById 구현
4. listSettlements 구현
5. updateSettlement 구현
6. processSettlement 구현
7. Controller 연결
8. 테스트

## Phase 3: Dashboard (예상 소요: 4-5시간)

1. DashboardService 설계
2. KPI 계산 로직 구현
3. getSellerDashboard 구현
4. getSupplierDashboard 구현
5. getPartnerDashboard 구현
6. Controller 연결
7. 테스트

---

# ✅ 최종 완료 조건

### P2 완료 기준

- [ ] Commission: 4개 TODO 제거
- [ ] Settlement: 5개 TODO 제거
- [ ] Dashboard: 3개 TODO 제거
- [ ] **총 12개 TODO 제거**
- [ ] TypeScript 컴파일 에러 0개
- [ ] 모든 Service 메서드 정상 동작
- [ ] 모든 Controller endpoint 정상 응답

### Dropshipping Core 완성 기준

- [ ] P1: 100% (DTO validation)
- [ ] P2.1: 100% (RBAC middleware)
- [ ] P2.2: 100% (Approvals + Controllers + Business Logic)
- [ ] **총 40+ TODO 제거**
- [ ] **Core 완성도: 100%**

---

# 🎯 다음 단계

P2 완료 후:

1. **PR 생성** → develop 브랜치
2. **리뷰 및 머지**
3. **P3 시작** (OpenAPI, 레거시 제거, 패키지 정리)
4. **확장앱 전수조사** (cosmetics/organization/cgm)

---

*최종 업데이트: 2025-12-05*
