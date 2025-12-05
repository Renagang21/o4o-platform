# 📄 **Step 25 — Phase B-3: Commerce + Dropshipping Module Migration Work Order**

## API Server V2 — NextGen Commerce & Dropshipping Rebuild

**Version:** 2025-12
**Author:** ChatGPT PM
**Status:** Ready for Implementation

---

# 🎯 목적 (Purpose)

Commerce & Dropshipping 도메인은 **전체 API Server 기능의 40% 이상을 차지하는 핵심 영역**입니다.

이번 Phase B-3에서는 아래 두 도메인을 NextGen Backend V2 구조로 완전 재편성합니다:

* **Commerce Module (상품/장바구니/주문/결제)**
* **Dropshipping Module (Seller/Supplier/Partner/Authorization/Settlement)**

AUTH → USER/Profile에서 확립한 NextGen V2 패턴을 이제 본격적으로 Commerce와 Dropshipping 전반에 적용합니다.

이 모듈은 **Front-End(NextGen Main-Site)와 직접적으로 연동되는 핵심 API**이므로 아키텍처 일관성과 성능·견고함이 매우 중요합니다.

---

# 🟦 Phase B-3 전체 구조

```
Phase B-3 Step 1 — DTO Migration
Phase B-3 Step 2 — Entity Migration
Phase B-3 Step 3 — Service Migration
Phase B-3 Step 4 — Controller Rebuild
Phase B-3 Step 5 — Route Rebuild
Phase B-3 Step 6 — Settlement Engine V2 Integration
Phase B-3 Step 7 — Dropshipping Authorization Cleanup
Phase B-3 Step 8 — Integration Tests
Phase B-3 Step 9 — Build/Deploy Validation
```

---

# 🟩 Phase B-3 Step-by-Step Work Order

아래 단계는 실제 개발 작업 순서이며, 코드와 경로까지 모두 포함된 완전한 지시서입니다.

---

## 1️⃣ Step 1 — Module 디렉토리 생성

새 구조를 생성합니다:

```
src/modules/commerce/
  controllers/
  services/
  entities/
  dto/
  routes/
  utils/
  tests/
  index.ts

src/modules/dropshipping/
  controllers/
  services/
  entities/
  dto/
  routes/
  utils/
  tests/
  index.ts
```

---

## 2️⃣ Step 2 — DTO Migration

### Commerce DTOs (12개):

```
create-product.dto.ts
update-product.dto.ts
product-query.dto.ts
add-to-cart.dto.ts
update-cart.dto.ts
checkout.dto.ts
payment.dto.ts
create-order.dto.ts
update-order-status.dto.ts
shipment.dto.ts
order-query.dto.ts
index.ts
```

### Dropshipping DTOs (10개):

```
seller-application.dto.ts
supplier-application.dto.ts
authorize-product.dto.ts
commission-policy.dto.ts
settlement.dto.ts
partner-profile.dto.ts
seller-profile.dto.ts
supplier-profile.dto.ts
dashboard-query.dto.ts
request-approval.dto.ts
index.ts
```

### DTO Rule:

* class-validator
* class-transformer
* strict typing
* Swagger-like Response DTO 포함

---

## 3️⃣ Step 3 — Entity Migration (Commerce)

아래 엔티티를 modules 경로로 이동:

```
Product.ts
Category.ts
Cart.ts
CartItem.ts
Order.ts
OrderItem.ts
OrderEvent.ts
Payment.ts
Shipment.ts
ShipmentTrackingHistory.ts
PaymentSettlement.ts
ChannelProductLink.ts
ChannelOrderLink.ts
ExternalChannel.ts
```

### 수정 사항:

* forwardRef 적용
* index.ts로 barrel export
* relations 재검토
* snake_case table name 유지

---

## 4️⃣ Step 4 — Entity Migration (Dropshipping)

아래 엔티티 이동:

```
Seller.ts
SellerProfile.ts
SellerAuthorization.ts
SellerAuthorizationAuditLog.ts
SellerChannelAccount.ts
Supplier.ts
SupplierProfile.ts
Partner.ts
PartnerProfile.ts
Commission.ts
CommissionPolicy.ts
Settlement.ts
SettlementItem.ts
PaymentSettlement.ts
SellerProduct.ts
SellerDashboard.ts (optional)
PartnerDashboard.ts (optional)
```

### 정책:

* V2 Settlement 구조에 맞게 일부 필드 rename
* AuditLog 관계 forwardRef 적용

---

## 5️⃣ Step 5 — Service Migration (Commerce)

Service 이동 및 BaseService 패턴 적용:

```
ProductService
CategoryService
CartService
OrderService
PaymentService
ShippingService
SettlementReadService (Commerce counterpart)
```

### 모든 서비스:
* direct repository access 제거
* repository는 BaseService.repo로 통일

### OrderService 중요 작업:

* order creation pipeline 재구성
* event emission 기반 구조 적용
* payment → order → shipment workflow 정리

---

## 6️⃣ Step 6 — Service Migration (Dropshipping)

아래 서비스 이동 및 재작성:

```
SellerService
SupplierService
PartnerService
SellerProductService
SellerDashboardService
SupplierDashboardService
PartnerDashboardService
SettlementService
CommissionService
AuthorizationGateService (Phase B-6로 이동)
```

### 특히:

#### SettlementEngine 통합

* SettlementEngineV2를 dropshipping 모듈로 이동
* Seller/Supplier/Partner settlement 통합 pipeline 구성

#### Authorization Service 재편성

* Seller/Product approval workflow 정리
* Legacy V1 endpoints 완전 제거
* 모든 approval 로직 → authorize-product.dto.ts 기반으로 통일

---

## 7️⃣ Step 7 — Controller Migration (Commerce)

새 Controller 생성:

```
product.controller.ts
category.controller.ts
cart.controller.ts
order.controller.ts
payment.controller.ts
shipment.controller.ts
index.ts
```

### 모든 controller:

* BaseController 상속
* static method 패턴
* DTO Validation 적용
* NextGen error handling 적용

### OrderController 주요 메서드:

```typescript
static async createOrder(req: AuthRequest, res: Response): Promise<any>
static async getOrder(req: AuthRequest, res: Response): Promise<any>
static async listOrders(req: AuthRequest, res: Response): Promise<any>
static async updateOrderStatus(req: AuthRequest, res: Response): Promise<any>
static async cancelOrder(req: AuthRequest, res: Response): Promise<any>
static async confirmPayment(req: AuthRequest, res: Response): Promise<any>
static async shipOrder(req: AuthRequest, res: Response): Promise<any>
```

---

## 8️⃣ Step 8 — Controller Migration (Dropshipping)

아래 컨트롤러 생성:

```
seller.controller.ts
supplier.controller.ts
partner.controller.ts
seller-product.controller.ts
approval.controller.ts
commission.controller.ts
settlement.controller.ts
dashboard.controller.ts
index.ts
```

### 대시보드 API:
판매자/공급자/파트너 대시보드 API를 **NextGen Function Component 데이터 포맷**에 맞게 반환하도록 구현.

---

## 9️⃣ Step 9 — Route Migration

### Commerce routes:

```
/api/v1/commerce/products
/api/v1/commerce/categories
/api/v1/commerce/cart
/api/v1/commerce/orders
/api/v1/commerce/payments
/api/v1/commerce/shipping
```

### Dropshipping routes:

```
/api/v1/dropshipping/seller
/api/v1/dropshipping/supplier
/api/v1/dropshipping/partner
/api/v1/dropshipping/authorization
/api/v1/dropshipping/commission
/api/v1/dropshipping/settlements
/api/v1/dropshipping/dashboard
```

### 모든 routes:

* validation.middleware 적용
* requireAuth/requireAdmin 적용
* asyncHandler 적용

### Legacy routes deprecation:

```
src/routes/cpt/dropshipping.routes.ts
src/routes/entity/dropshipping-entity.routes.ts
src/routes/ds-*.routes.ts
src/routes/categories.ts
src/routes/products.ts
src/routes/orders.routes.ts
```

→ **120일 sunset 정책 적용** (Removal: 2026-04-03)

---

## 🔟 Step 10 — Settlement Engine V2 Integration

**가장 중요한 통합 포인트**

### 작업 내용:
* Seller/Supplier/Partner 정산 pipeline 통일
* SettlementService + SettlementEngineV2 + Settlement Types V2 재배치
* Partner 정산, Seller 정산, Supplier 정산 모두 동일 구조로 맵핑

### 정산 프로세스:
```
1. Commission 계산
2. Settlement 생성
3. Settlement 승인
4. Payout 처리
5. Settlement 완료
```

---

## 1️⃣1️⃣ Step 11 — Integration Tests

새 테스트 파일 생성:

```
modules/commerce/tests/order-flow.test.ts
modules/commerce/tests/cart.test.ts
modules/commerce/tests/payment.test.ts
modules/dropshipping/tests/settlement.test.ts
modules/dropshipping/tests/authorization.test.ts
modules/dropshipping/tests/seller-flow.test.ts
```

### 테스트 시나리오:

#### Commerce:
* Add to Cart → Checkout → Pay → Order Confirm → Shipment

#### Dropshipping:
* Seller authorization request → approval workflow
* Supplier onboarding
* Settlement generation & payout
* Commission calculation

### Coverage 목표: **80%**

---

## 1️⃣2️⃣ Step 12 — Build & Deploy Validation

### 검증 항목:

* ✅ build PASS
* ✅ no circular dependencies
* ✅ NextGen Frontend 호출 테스트
* ✅ Dropshipping 대시보드 연동 테스트
* ✅ Site Builder → AppStore → Commerce 앱 설치 테스트
* ✅ Settlement pipeline 테스트
* ✅ Authorization workflow 테스트

---

# 🟦 성공 기준 (DoD)

✅ Commerce + Dropshipping 전체 NextGen 구조로 마이그레이션
✅ direct repository access 0
✅ DTO 적용률 100%
✅ controller/service/entity/routes 완전 재배치
✅ settlement pipeline NextGen 적용
✅ build/test PASS
✅ legacy routes deprecated with 120-day sunset

---

# 🟩 개발 채팅방 전달 메시지

아래 메시지를 그대로 개발 채팅방에 붙여넣으면 됩니다:

```
📌 Step 25 Phase B-3 — Commerce + Dropshipping Module Migration 시작합니다.

Work Order:
docs/nextgen-backend/tasks/step25_phase_b3_commerce_dropshipping_workorder.md

진행 순서:
1) DTO Migration (Commerce 12개 + Dropshipping 10개)
2) Entity Migration (Commerce → Dropshipping 순)
3) Service Migration (BaseService 패턴 적용)
4) Controller Migration (8개 controllers)
5) Routes Migration (unified routes)
6) Settlement Engine V2 Integration
7) Authorization workflow 정리
8) Integration & Build 테스트

AUTH/User/Profile 패턴 그대로 적용하며,
legacy routes는 120일 sunset 정책에 따라 deprecate 처리해주세요.

작업 완료 후 보고 바랍니다.
```

---

# 📊 모듈 규모 예상

| 항목 | Commerce | Dropshipping | 합계 |
|------|----------|--------------|------|
| DTOs | 12 files | 10 files | 22 files |
| Entities | 14 files | 16 files | 30 files |
| Services | 7 files | 9 files | 16 files |
| Controllers | 6 files | 8 files | 14 files |
| Routes | 1 file | 1 file | 2 files |
| Tests | 3 files | 3 files | 6 files |

**예상 코드량**: ~8,000 lines
**예상 작업 기간**: 4-6 days
**복잡도**: HIGH (Settlement Engine + Authorization 통합)

---

# 🚨 주의사항

1. **Settlement Engine**: 기존 정산 로직과 충돌하지 않도록 주의
2. **Authorization Flow**: Seller/Product approval 프로세스 유지
3. **Frontend 호환성**: NextGen Main-Site API 호출 형식 유지
4. **Legacy Routes**: 완전 제거가 아닌 deprecated + redirect
5. **Entity Relations**: forwardRef 적용으로 circular dependency 방지

---

# 📚 참고 문서

- Step 25 Phase B-2 Step 3: AUTH Controllers Migration
- Step 25 Phase B-2 Step 4: User Profile Migration
- BaseController Pattern: `src/common/base.controller.ts`
- BaseService Pattern: `src/common/base.service.ts`
- DTO Pattern: `src/common/docs/dto-pattern.md`

---

**Work Order Created**: 2025-12-03
**Ready for Implementation**: ✅
**Priority**: HIGH
**Risk Level**: MEDIUM-HIGH (Settlement + Authorization 통합)
