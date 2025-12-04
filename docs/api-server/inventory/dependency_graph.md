# Dependency Graph Analysis

**Scan Date**: 2025-12-03
**Total Files Analyzed**: 842
**Circular Dependencies Found**: 20

---

## ⚠️ Circular Dependencies Detected

### 1. Entity-Entity Circular Dependencies (Expected)

대부분의 순환 의존성은 TypeORM Entity 간의 양방향 관계로 인한 것입니다.
이는 TypeORM의 특성상 예상되는 패턴이지만, Phase B에서 관계 정의 방식을 재검토해야 합니다.

| # | Dependency Path | Type | Severity |
|---|-----------------|------|----------|
| 3 | `entities/Role.ts` ↔ `entities/Permission.ts` | Entity Relation | Low |
| 4 | `entities/Category.ts` ↔ `entities/Post.ts` | Entity Relation | Low |
| 5 | `entities/Post.ts` ↔ `entities/Tag.ts` | Entity Relation | Low |
| 6 | `entities/Product.ts` ↔ `entities/Supplier.ts` | Entity Relation | Low |
| 7 | `entities/Cart.ts` ↔ `entities/CartItem.ts` | Entity Relation | Low |
| 8 | `entities/CustomPost.ts` ↔ `entities/CustomPostType.ts` | Entity Relation | Low |
| 9 | `entities/Form.ts` ↔ `entities/FormSubmission.ts` | Entity Relation | Low |
| 10 | `entities/Menu.ts` ↔ `entities/MenuItem.ts` | Entity Relation | Low |
| 11 | `entities/Order.ts` ↔ `entities/OrderEvent.ts` | Entity Relation | Low |
| 12 | `entities/Order.ts` ↔ `entities/OrderItem.ts` | Entity Relation | Low |
| 13 | `entities/Settlement.ts` ↔ `entities/SettlementItem.ts` | Entity Relation | Low |
| 15 | `entities/PaymentSettlement.ts` ↔ `entities/Payment.ts` | Entity Relation | Low |
| 17 | `entities/StorePlaylist.ts` ↔ `entities/PlaylistItem.ts` | Entity Relation | Low |
| 18 | `entities/ACFField.ts` ↔ `entities/ACFFieldGroup.ts` | Entity Relation | Low |
| 19 | `entities/CrowdfundingParticipation.ts` ↔ `entities/CrowdfundingProject.ts` | Entity Relation | Low |
| 20 | `entities/WorkflowState.ts` ↔ `entities/WorkflowTransition.ts` | Entity Relation | Low |

---

### 2. Package/External Circular Dependencies

| # | Dependency Path | Type | Severity |
|---|-----------------|------|----------|
| 1 | `forum-app/dist/.../Permission.d.ts` ↔ `forum-app/dist/.../Role.d.ts` | Package Internal | Low |
| 2 | `packages/types/dist/app-lifecycle.d.ts` ↔ `packages/types/dist/index.d.ts` | Package Internal | Low |

**Note**: 이는 외부 패키지 내부의 순환으로, API Server 코드와 무관합니다.

---

### 3. ⚠️ Service/Middleware Circular Dependencies (Critical)

| # | Dependency Path | Type | Severity |
|---|-----------------|------|----------|
| 14 | `middleware/metrics.middleware.ts` ↔ `queues/webhook.queue.ts` | Service/Middleware | **HIGH** |
| 16 | `services/app-registry.service.ts` ↔ `services/google-ai.service.ts` | Service/Service | **HIGH** |

**⚠️ 이 두 순환 의존성은 Phase B에서 반드시 제거해야 합니다.**

#### 문제점:
- **Middleware ↔ Queue 순환**: 미들웨어가 큐를 참조하고, 큐가 미들웨어를 참조하는 구조는 잘못된 설계입니다.
- **Service ↔ Service 순환**: 서비스 간 순환 의존성은 테스트 불가능하고 유지보수 어려움을 야기합니다.

#### 해결 방안:
1. **Middleware → Queue**: 큐는 미들웨어를 직접 import하지 말고, 이벤트 emit 패턴 사용
2. **Service → Service**: 공통 로직을 별도 유틸리티로 분리하거나, Dependency Injection 재구성

---

## 📊 Module Dependency Summary

### High-Level Module Structure

```
src/
├── entities/        (122 files) - Data models
├── services/        (120 files) - Business logic
├── controllers/     (81 files)  - Request handlers
├── routes/          (114 files) - Route definitions
├── middleware/      - Request/response interceptors
├── queues/          - Background job processing
├── utils/           - Utility functions
└── modules/         - Feature modules
```

---

## 🔍 Cross-Module Import Analysis

### Expected Dependencies (Clean)

```
Controllers → Services → Entities
Routes → Controllers
Routes → Middleware
Services → Repositories (TypeORM)
Entities ← Entities (Relations)
```

### Detected Issues

1. **Middleware ↔ Queue**: ❌ Circular
2. **Service ↔ Service**: ❌ Circular (app-registry ↔ google-ai)
3. **Entity ↔ Entity**: ⚠️ 16 circular pairs (TypeORM 양방향 관계)

---

## 📝 Recommendations for Phase B

### 1. Entity Relations 재구성

TypeORM의 양방향 관계를 유지하되, `Lazy Loading` 및 `Forward Reference` 패턴을 적용하여
순환 import를 최소화해야 합니다.

예:
```typescript
// Before (circular)
import { Post } from './Post';

// After (forward reference)
import type { Post } from './Post';
```

---

### 2. Service Layer 재구성 (Critical)

- `app-registry.service` ↔ `google-ai.service` 순환 제거
- Shared logic을 `utils/` 또는 `common/` 모듈로 분리
- Dependency Injection Container 재구성

---

### 3. Middleware ↔ Queue 분리 (Critical)

- Queue는 middleware를 직접 import하지 않음
- Event-driven architecture 적용
- Message Bus 패턴 도입 고려

---

## 🎯 Phase B Action Items

Based on this dependency analysis:

1. [ ] Entity 관계 정의 표준화 (Forward Reference 적용)
2. [ ] Service 간 순환 의존성 제거 (app-registry ↔ google-ai)
3. [ ] Middleware/Queue 아키텍처 재설계
4. [ ] Module Boundary 명확히 정의
5. [ ] Import 경로 표준화 (barrel exports 활용)

---

**Analysis Complete**: ✅
**Critical Issues**: 2 (Service/Middleware circular dependencies)
**Low-Priority Issues**: 18 (Entity-Entity bidirectional relations)

