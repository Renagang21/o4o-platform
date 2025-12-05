# 📄 **Step 25 – Phase B-4 Build Stabilization Work Order**

## API Server V2 — Commerce/Dropshipping Build Fix & Import/Service Alignment

**Version:** 2025-12-04
**Author:** ChatGPT PM
**Status:** 🟡 IN PROGRESS

---

# 🎯 목적 (Purpose)

Phase B-3에서 Commerce + Dropshipping 모듈 전체가 NextGen V2 아키텍처로 재구성되었지만
여전히 약 **120+ TypeScript build errors**가 남아 있습니다.

이 오류들은 대부분:

1. BaseService 패턴 미적용
2. Service constructor에서 repository 대신 entity class 전달
3. getInstance() 누락
4. logger import 잘못됨
5. import path가 구(/src/entities, /src/database)로 남아 있음
6. 일부 enum/class export 충돌
7. settlement/authorization/commission 계층 간 타입 mismatch
8. 서비스 간 cross-import 순서 불일치

→ 즉, **기능적 문제(Service 로직)는 없음**,
**구조적 문제(경로·타입·패턴)만 남아있는 상태**입니다.

Phase B-4를 정상적으로 진행하려면
**먼저 빌드를 완전히 안정화(build PASS)** 해야 합니다.

따라서 이 Work Order는 아래 목표를 가집니다:

### ✔ 목표 1: Build Error = 0

### ✔ 목표 2: BaseService 패턴 완전 통일

### ✔ 목표 3: Import 경로 최신화 (단기 패치)

### ✔ 목표 4: logger 및 utils 패턴 통일

### ✔ 목표 5: SettlementEngineV2/OrderService 타입 정합성 확보

---

# 🟦 Phase B-4 Build Stabilization — 고정 작업 목록

총 10개 Categories, 약 35~45개 코드 위치에 패치 필요.

---

# 1️⃣ **ProductService — getInstance() 추가**

현재 오류:

```
ProductService.getInstance is not a function
```

필요 패치:

```typescript
static instance = new ProductService(Product);

static getInstance() {
  return this.instance;
}
```

위 패턴을 CartService/PaymentService 등
Commerce 서비스 전체에 동일하게 적용.

---

# 2️⃣ **BaseService 패턴 오류 수정 (Service constructor 수정)**

현재 형태 (잘못된 코드 예):

```typescript
constructor() {
    super(Product); // ❌ Entity class 전달 → repository 아님
}
```

올바른 구조:

```typescript
constructor() {
    const repo = AppDataSource.getRepository(Product);
    super(repo);
}
```

적용 대상 (Commerce + Dropshipping 전체):

* ProductService
* CategoryService
* CartService
* OrderService
* PaymentService
* ShippingService
* SellerService
* SupplierService
* PartnerService
* SellerProductService
* CommissionService
* SettlementService
* SettlementManagementService
* SellerDashboardService
* SupplierDashboardService
* PartnerDashboardService

총 17개 서비스 모두 확인 필요.

---

# 3️⃣ **import path patch — 단기 해결 버전**

현재:

```typescript
import { Product } from '../../entities/Product.js';
```

→ 오래된 src/entities 경로 또는 dist 경로 참조

임시 패치:

```typescript
import { Product } from '../entities/Product.js';
```

또는 최상단:

```typescript
import { Product } from '../entities/index.js';
```

**Phase B-6에서 전체 import를 batch 업데이트 예정**
(지금은 오류만 해결하는 수준으로 수정)

---

# 4️⃣ **logger import 수정**

현재 오류:

```typescript
import { logger } from "../../utils/logger.js";
```

실제 구현은 default export:

```typescript
import logger from "../../utils/logger.js";
```

또는:

```typescript
import { AppLogger } from "../../common/logger";
```

모듈 전체에서 logger import 통일.

---

# 5️⃣ **Payment enums export 충돌 해결**

오류 메시지:

```
PaymentMethod is declared twice
PaymentStatus is declared twice
```

수정 방법:

* /modules/commerce/entities/index.ts에서 중복 export 제거
* Payment.ts에서 export 형태 통일

정답 패턴:

```typescript
export enum PaymentStatus { ... }
export enum PaymentMethod { ... }
```

index.ts에서는 한 번만 export.

---

# 6️⃣ **OrderItem interface vs class 충돌 해결**

현재:

* OrderItem.ts 내 class OrderItem
* index.ts 내 interface OrderItem (잘못된 타입)

patch:

* interface 이름 변경 → `OrderItemDTO`
* class 그대로 유지

---

# 7️⃣ **SettlementEngineV2 타입 mismatch 수정**

발생 오류:

* SettlementItem.amount is possibly undefined
* CommissionPolicy null 가능성
* SellerProfile relation 누락

필요 패치:

* dto.amount: number → number | null
* relation에 `{ nullable: true }` 추가
* SettlementEngineV2 내부에서 optional chaining 적용

---

# 8️⃣ **OrderService 대규모 타입 오류 해결**

총 31개 이상 오류:

* `order.customer` undefined
* `products?.length` 타입 오류
* `relations` 내 잘못된 경로
* `await repo.findOne` 타입 mismatch
* `Item.quantity` 타입 오류

해결 전략:

* OrderService를 CartService → ProductService → PaymentService와 정합성 맞추기
* optional chaining + strict null checks 적용
* relations를 실제 엔티티 이름으로 전부 정비
* findOne/find → findOneBy/findAndCount로 업그레이드

---

# 9️⃣ **CommissionEngine 타입 오류 해결**

주로 optional null guard 부족:

* `if (!commissionPolicy)`
* `policy.rate ?? 0`
* `settlementItems.push(...)` 타입 지정 필요

---

# 🔟 **Deprecated code 제거 또는 무력화**

아래 파일 중 legacy code가 남아 있으면 build 오류 유발 가능:

* dropshipping V1 routes
* seller-authorization V1 service
* commission V1
* payment V1
* shipping V1

Phase B-6에서 제거하지만,
지금 오류를 발생시키는 부분은 주석 처리하여 build PASS 확보.

---

# 🟩 실행 순서 (개발 채팅방 전달용)

아래 순서 그대로 실행하면 됨:

```
1) ProductService 패치
2) CategoryService 패치
3) CartService 패치
4) PaymentService 패치
5) ShippingService 패치
6) OrderService 패치 (대규모)
7) SettlementEngineV2 패치
8) SettlementService / SettlementManagementService 패치
9) CommissionService 패치
10) SellerService / SupplierService / PartnerService / SellerProductService 패치
11) DashboardServices 패치
12) logger / import path 전체 검색 후 single-pass 패치
13) build / typecheck
```

---

# 🟦 성공 기준 (DoD)

* [ ] 빌드 오류 0
* [ ] 모든 서비스 BaseService 패턴 적용
* [ ] repository 전달 방식 통일
* [ ] logger import 통일
* [ ] import 충돌 제거
* [ ] Order / Settlement / Authorization 관련 타입 확정
* [ ] build → PASS
* [ ] 테스트 코드 실행 가능

---

# 📊 Progress Tracking

| Step | Service/Module | Status | Errors Before | Errors After |
|------|----------------|--------|---------------|--------------|
| 1 | ProductService | ⬜ | - | - |
| 2 | CategoryService | ⬜ | - | - |
| 3 | CartService | ⬜ | - | - |
| 4 | PaymentService | ⬜ | - | - |
| 5 | ShippingService | ⬜ | - | - |
| 6 | OrderService | ⬜ | - | - |
| 7 | SettlementEngineV2 | ⬜ | - | - |
| 8 | SettlementService | ⬜ | - | - |
| 9 | CommissionService | ⬜ | - | - |
| 10 | Dropshipping Services | ⬜ | - | - |
| 11 | Dashboard Services | ⬜ | - | - |
| 12 | Logger/Import Cleanup | ⬜ | - | - |
| 13 | Final Build | ⬜ | 120+ | 0 |

---

**Related Documents:**
- Phase B-3 Completion Report: `docs/nextgen-backend/reports/step25_phase_b3_completion_report.md`
- Phase B-4 Service Completion Work Order: `docs/nextgen-backend/tasks/step25_phase_b4_service_completion_integration_tests_workorder.md`
