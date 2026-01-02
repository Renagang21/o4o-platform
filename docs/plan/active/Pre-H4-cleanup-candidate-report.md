# Pre-H4: Server Cleanup Candidate Report

> **Status**: Investigation Complete
> **Date**: 2025-01-02
> **Work Order**: Pre-H4 (조사 전용)
> **Scope**: 삭제 후보 식별만, 실제 삭제 금지

---

## 1. Backend 삭제 후보

### 1.1 Stub/미완성 라우트

| 파일 | 상태 | 판정 | 비고 |
|------|------|------|------|
| `routes/ds-seller-authorization.routes.ts` | Stub (501 응답) | REMOVE CANDIDATE | Phase 9 미구현 |
| `routes/ds-seller-product.routes.ts` | Stub (501 응답) | REMOVE CANDIDATE | Phase 9 미구현 |
| `routes/market-trial.routes.ts` | Experimental | NEED DECISION | docs에 experimental 표기 |
| `routes/migration.routes.ts` | Dropshipping 전용 | KEEP | 초기화 도구 |

### 1.2 중복 가능성 엔티티 (ecommerce-core vs api-server)

| api-server 엔티티 | ecommerce-core 대응 | 판정 | 비고 |
|-------------------|---------------------|------|------|
| `entities/checkout/CheckoutOrder.entity.ts` | `EcommerceOrder` | NEED DECISION | 기능 중복 가능성 |
| `entities/checkout/CheckoutPayment.entity.ts` | `EcommercePayment` | NEED DECISION | 기능 중복 가능성 |
| `entities/checkout/OrderLog.entity.ts` | - | KEEP | 감사 로그 전용 |
| `routes/checkout.routes.ts` | CosmeticsOrderService | NEED DECISION | Toss 결제 통합 |
| `routes/wishlist.routes.ts` | - | KEEP | Customer 기능 |

### 1.3 미사용 가능성 라우트

| 파일 | 근거 | 판정 |
|------|------|------|
| `routes/analytics.ts` | 1859 bytes, 단순 stub | NEED DECISION |
| `routes/signage.routes.ts` | 완성된 CRUD, 서비스 독립 | KEEP |
| `routes/forms.ts` | 2333 bytes, 구조만 존재 | NEED DECISION |
| `routes/categories.ts` | 332 bytes, 최소 stub | REMOVE CANDIDATE |

---

## 2. K-Shopping 분류 (H1-0 FROZEN)

### 2.1 엔티티

| 파일 | 분류 | 근거 |
|------|------|------|
| `kshopping-application.entity.ts` | **KEEP** | FROZEN 선언, 향후 통합 대기 |
| `kshopping-participant.entity.ts` | **KEEP** | FROZEN 선언, 향후 통합 대기 |

### 2.2 컨트롤러/라우트

| 파일 | 분류 | 근거 |
|------|------|------|
| `k-shopping/controllers/admin.controller.ts` | **KEEP** | 운영 워크플로우 |
| `k-shopping/controllers/application.controller.ts` | **KEEP** | 신청 워크플로우 |
| `k-shopping/kshopping.routes.ts` | **KEEP** | FROZEN 상태 유지 |

### 2.3 마이그레이션

| 파일 | 분류 | 근거 |
|------|------|------|
| `9990000000010-CreateKShoppingTables.ts` | **KEEP** | 테이블 생성 필수 |

### 2.4 K-Shopping 판정 요약

```
K-Shopping 전체: KEEP (FROZEN)
- 확장 금지 상태 유지
- Cosmetics Core 통합 시점까지 동결
- 삭제 시점: H-series 통합 Work Order 결정 후
```

---

## 3. Frontend/Admin 영향 분석

### 3.1 K-Shopping 관련

| 위치 | 상태 |
|------|------|
| `apps/admin-dashboard/src/**/*kshopping*` | **없음** (영향 없음) |
| `apps/admin-dashboard/src/**/*k-shopping*` | **없음** (영향 없음) |

### 3.2 Market Trial 관련

| 위치 | 상태 | 판정 |
|------|------|------|
| `apps/ecommerce/src/pages/market-trial/` | Experimental | NEED DECISION |
| - `MarketTrialDetailPage.tsx` | Frontend 존재 | Backend와 함께 결정 |
| - `MarketTrialJoinPage.tsx` | Frontend 존재 | Backend와 함께 결정 |

### 3.3 Dropshipping Seller 관련

| 위치 | 상태 | 판정 |
|------|------|------|
| `admin-dashboard/.../dropshipping/seller/ProductMarketplace.tsx` | UI 존재 | Backend stub 연동 |
| `admin-dashboard/.../dropshipping/seller/SellerDashboard.tsx` | UI 존재 | Backend stub 연동 |
| `admin-dashboard/.../dropshipping/seller/SellerProducts.tsx` | UI 존재 | Backend stub 연동 |
| `admin-dashboard/.../dropshipping/seller/SellerSettlement.tsx` | UI 존재 | Backend stub 연동 |

**Dropshipping Seller UI 판정**: Backend stub 제거 시 Frontend도 함께 제거 필요

### 3.4 Wishlist/Checkout (main-site)

| 위치 | 상태 | 판정 |
|------|------|------|
| `main-site/src/shortcodes/_functions/commerce/checkout.ts` | 활성 | KEEP |
| `main-site/src/shortcodes/_functions/customer/wishlist.ts` | 활성 | KEEP |
| `main-site/src/views/checkout.json` | View 정의 | KEEP |
| `main-site/src/views/wishlist.json` | View 정의 | KEEP |

---

## 4. 문서/마이그레이션 정비 후보

### 4.1 마이그레이션 (999 prefix = experimental)

| 파일 | 상태 | 판정 |
|------|------|------|
| `9990000000000-CreateGlycopharmApplicationsTable.ts` | Glycopharm 서비스용 | KEEP |
| `9990000000000-CreateKpaTables.ts` | KPA 서비스용 | KEEP |
| `9990000000001-AddEnabledServicesToGlycopharmPharmacies.ts` | Glycopharm 확장 | KEEP |
| `9990000000010-CreateKShoppingTables.ts` | K-Shopping (FROZEN) | KEEP |
| `9991000000000-CreateGlucoseViewApplicationTables.ts` | GlucoseView 서비스용 | KEEP |

### 4.2 문서

| 문서 | 상태 | 판정 |
|------|------|------|
| `docs/services/market-trial/service-status.md` | Experimental 표기 | NEED DECISION |
| `docs/plan/active/H0-*.md` | 조사 보고서 | KEEP |
| `docs/plan/active/H1-*.md` | 결정 문서 | KEEP |
| `docs/plan/active/H2-*.md` | 설계/결정 문서 | KEEP |

---

## 5. 위험 영역 및 권고 사항

### 5.1 High Risk (신중한 결정 필요)

| 항목 | 위험 요소 | 권고 |
|------|----------|------|
| `CheckoutOrder/Payment` | ecommerce-core와 중복 가능성 | H4에서 통합 여부 결정 |
| Market Trial 전체 | Frontend/Backend 동시 영향 | 서비스 폐기 여부 명시적 결정 필요 |
| Dropshipping Seller Stub | UI 존재하나 Backend stub | Phase 9 진행 여부 결정 후 처리 |

### 5.2 Medium Risk (추가 조사 권장)

| 항목 | 위험 요소 | 권고 |
|------|----------|------|
| `analytics.ts` | 사용 여부 불명확 | 호출 로그 확인 후 결정 |
| `forms.ts` | 최소 구현 | 사용처 확인 후 결정 |
| `categories.ts` | 332 bytes stub | 안전 삭제 가능성 높음 |

### 5.3 Low Risk (안전 삭제 가능)

| 항목 | 근거 |
|------|------|
| `ds-seller-authorization.routes.ts` | 501 stub, Phase 9 미착수 |
| `ds-seller-product.routes.ts` | 501 stub, Phase 9 미착수 |
| `categories.ts` | 최소 stub, 사용 불명 |

---

## 6. Claude Code 의견

### 6.1 즉시 삭제 권고 (H4에서)

1. **Dropshipping Seller Stub Routes** (`ds-seller-*.routes.ts`)
   - 501 응답만 반환하는 stub
   - Phase 9 미착수 상태
   - Frontend UI도 함께 제거 권장

2. **categories.ts**
   - 332 bytes, 최소 stub
   - 실제 사용 흔적 없음

### 6.2 통합 검토 권고

1. **Checkout 엔티티 vs ecommerce-core**
   - `CheckoutOrder` / `EcommerceOrder` 중복 분석 필요
   - H4 Work Order에서 통합 방향 결정

2. **Market Trial 서비스**
   - Experimental 상태 유지 or 폐기 결정 필요
   - 결정 전까지 현상 유지

### 6.3 절대 삭제 금지

1. **K-Shopping 전체**
   - H1-0 FROZEN 상태
   - Cosmetics Core 통합 시점까지 유지
   - 통합 Work Order 없이 삭제 금지

2. **999 prefix 마이그레이션**
   - 서비스별 테이블 생성 담당
   - 서비스 폐기 결정 없이 삭제 금지

---

## 7. 다음 단계 권고

### H4-0: Cleanup Execution (제안)

```
1. 안전 삭제 실행
   - ds-seller-*.routes.ts 삭제
   - categories.ts 삭제
   - 관련 Frontend UI 삭제

2. 통합 검토 착수
   - Checkout vs ecommerce-core 분석
   - Market Trial 폐기 여부 결정

3. 문서 정리
   - 삭제된 코드 관련 문서 아카이브
   - FROZEN 문서 유지
```

---

*Document Version: 1.0*
*Created by: Pre-H4 Investigation*
*Investigation Only - No Deletion Performed*
