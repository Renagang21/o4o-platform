# IR-KPA-REQUEST-BASED-PRODUCT-TYPE-CODE-AUDIT-V1

> **조사 일시**: 2026-04-05
> **조사 범위**: 데이터 모델 + 백엔드 API + 프론트엔드 흐름
> **전체 판정**: **PASS** — 취급요청형 상품은 현재 코드에서 명확히 구분 가능

---

## 1. 핵심 결론 (Executive Summary)

**"취급요청형 상품" = `distribution_type = 'SERVICE'`**

현재 코드에는 이미 두 가지 상품 등록 경로가 명확히 분리되어 있다.

| 유형 | distribution_type | 등록 흐름 | 승인 주체 |
|------|------------------|----------|----------|
| **즉시 등록형** | `PUBLIC` | 클릭 → 즉시 listing 생성 | 없음 (자동) |
| **취급요청형** | `SERVICE` | 클릭 → approval 생성(pending) → 운영자 승인 → listing 생성 | KPA Operator |

"취급요청형"을 위한 별도 필드나 상태값은 **불필요**하다.
`distribution_type` 자체가 이미 그 역할을 수행하고 있다.

---

## 2. 데이터 모델 조사 결과

### 2.1 핵심 테이블/엔티티

| 테이블 | 역할 | 핵심 필드 | 파일 |
|--------|------|----------|------|
| `supplier_product_offers` | 공급자 상품 오퍼 | `distribution_type` (PUBLIC/SERVICE/PRIVATE), `approval_status`, `is_active`, `service_keys` | `modules/neture/entities/SupplierProductOffer.entity.ts` |
| `product_approvals` | 취급요청 승인 추적 | `offer_id`, `organization_id`, `approval_type` (SERVICE/PRIVATE), `approval_status` (pending/approved/rejected/revoked) | `entities/ProductApproval.ts` |
| `organization_product_listings` | 매장 진열 상품 | `organization_id`, `offer_id`, `is_active`, `service_key` | `modules/store-core/entities/organization-product-listing.entity.ts` |
| `offer_service_approvals` | 서비스별 오퍼 승인 (공급자 측) | `offer_id`, `service_key`, `approval_status` | `modules/neture/entities/OfferServiceApproval.entity.ts` |
| ~~`offer_curations`~~ | **폐기됨** (WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1) — 추천 노출은 `supplier_product_offers.is_featured` 컬럼으로 일원화. 운영자 큐레이션 구조 자체가 "통제 극소화" 원칙에 위배되어 제거됨 | — | — |

### 2.2 OfferDistributionType Enum

```typescript
enum OfferDistributionType {
  PUBLIC = 'PUBLIC',    // 전체 서비스 공급 — 즉시 등록
  SERVICE = 'SERVICE',  // 개별 서비스 공급 — 승인 필요
  PRIVATE = 'PRIVATE',  // 비공개
}
```

### 2.3 ProductApprovalStatus Enum

```typescript
enum ProductApprovalStatus {
  PENDING = 'pending',    // 승인 대기
  APPROVED = 'approved',  // 승인 완료
  REJECTED = 'rejected',  // 반려
  REVOKED = 'revoked',    // 승인 취소
}
```

### 2.4 추가 구분 필드 유무

| 질문 | 답변 |
|------|------|
| `PUBLIC` 내부에서 즉시 주문형/요청형 구분 필드가 있는가? | **없음** — PUBLIC은 전부 즉시 listing 생성 |
| `SERVICE` 내부에서 추가 세분화가 있는가? | **없음** — SERVICE는 전부 승인 필요 |
| "취급요청" 전용 상태 필드가 있는가? | **없음** — `distribution_type` 자체로 구분 |
| workflow 상태 조합으로 구분하는 구조인가? | **아님** — `distribution_type` 단일 필드로 결정 |

---

## 3. 백엔드 흐름 조사 결과

### 3.1 POST `/pharmacy/products/apply` — 분기 로직

**파일**: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` (Lines 187-231)

```typescript
// 1. 오퍼의 distribution_type 조회
const [offer] = await dataSource.query(
  `SELECT distribution_type FROM supplier_product_offers WHERE id = $1::uuid AND is_active = true`,
  [supplyProductId]
);

// 2. distribution_type에 따라 완전히 다른 경로
if (offer.distribution_type === 'SERVICE') {
  result = await service.createServiceApproval(supplyProductId, organizationId, serviceKey, user.id);
} else if (offer.distribution_type === 'PUBLIC') {
  result = await service.createPublicListing(supplyProductId, organizationId, serviceKey);
}
```

**핵심**: 프론트엔드는 동일한 API를 호출하지만, 백엔드가 `distribution_type`을 보고 완전히 다른 서비스 메서드를 호출한다.

### 3.2 SERVICE 경로: `createServiceApproval()`

**파일**: `modules/product-policy-v2/product-approval-v2.service.ts` (Lines 29-99)

1. 오퍼 유효성 검증 (SERVICE 타입, active 상태)
2. 공급자 ACTIVE 상태 확인
3. 중복 검사 (PENDING/APPROVED → 거부, REJECTED/REVOKED → 재신청 허용)
4. `product_approvals` 테이블에 레코드 생성:
   - `approval_status = 'pending'`
   - `approval_type = 'service'`
5. **listing 생성하지 않음** — 운영자 승인 대기

### 3.3 PUBLIC 경로: `createPublicListing()`

**파일**: `modules/product-policy-v2/product-approval-v2.service.ts` (Lines 414-487)

1. 오퍼 유효성 검증 (PUBLIC 타입, active 상태)
2. 공급자 ACTIVE 상태 확인
3. 기존 listing 중복 확인 (있으면 반환)
4. `organization_product_listings` 테이블에 즉시 레코드 생성:
   - `is_active = false` (매장에서 수동 활성화 필요)
5. **승인 절차 없음** — 즉시 listing 생성

### 3.4 승인 후 listing 생성: `approveServiceProduct()`

**파일**: `modules/product-policy-v2/product-approval-v2.service.ts` (Lines 105-193)

1. 승인 레코드 PENDING 상태 확인
2. `approval_status = 'approved'` 업데이트
3. `organization_product_listings` 레코드 생성 (`is_active = false`)

### 3.5 자동 확장: `autoExpandPublicProduct()`

**파일**: `utils/auto-listing.utils.ts` (Lines 27-60)

PUBLIC 오퍼가 서비스 승인되면, 모든 활성 organization에 대해 listing을 자동 생성한다.
모두 `is_active = false`로 생성되어 매장에서 수동 활성화 필요.

---

## 4. 프론트엔드 흐름 조사 결과

### 4.1 현재 UI 상태 표시

| 상태 | 배지 | 의미 | 버튼 |
|------|------|------|------|
| `available` | 신청 가능 (회색) | 미신청 상태 | "내 대시보드에 등록" |
| `pending` | 승인 대기 (황색) | SERVICE 신청 후 대기 중 | 비활성 "승인 대기" |
| `approved` | 승인 완료 (청색) | 승인됨, listing 존재 | "매장 관리" |
| `listed` | 판매 중 (녹색) | listing 활성화됨 | 비활성 "판매 중" |

### 4.2 UI에서 PUBLIC vs SERVICE 구분

**현재 구분하지 않는다.** 두 유형 모두:
- 동일한 "내 대시보드에 등록" 버튼
- 동일한 `applyBySupplyProductId()` API 호출
- 동일한 상태 배지 표시

단, **PUBLIC 상품은 `pending` 상태를 거치지 않고 바로 `listed`(또는 `approved`) 상태로 전이**되므로,
실제로 "승인 대기" 배지가 보이는 상품은 **SERVICE 상품뿐**이다.

### 4.3 현재 탭 구조

```typescript
const DISTRIBUTION_TABS = [
  { key: 'all',         label: '전체' },
  { key: 'SERVICE',     label: 'B2B' },
  { key: 'recommended', label: '운영자 추천' },
  { key: 'PUBLIC',      label: '거점판매 모집' },
];
```

### 4.4 "취급요청" 관련 프론트엔드 코드

**없음** — "취급요청", "취급신청", "request" 등의 용어는 프론트엔드 코드에 존재하지 않는다.

---

## 5. 전체 흐름도

### PUBLIC (즉시 등록형)

```
약사 → "내 대시보드에 등록" 클릭
  ↓
POST /pharmacy/products/apply
  ↓
distribution_type = 'PUBLIC' 확인
  ↓
createPublicListing() 호출
  ↓
organization_product_listings 즉시 생성 (is_active=false)
  ↓
약사가 매장에서 수동 활성화
  ↓
상품 노출
```

### SERVICE (취급요청형 = 승인 필요)

```
약사 → "내 대시보드에 등록" 클릭
  ↓
POST /pharmacy/products/apply
  ↓
distribution_type = 'SERVICE' 확인
  ↓
createServiceApproval() 호출
  ↓
product_approvals 생성 (status='pending')
  ↓
KPA 운영자가 승인 큐에서 확인
  ↓
PATCH /operator/product-applications/:id/approve
  ↓
approveServiceProduct() → approval 승인 + listing 생성
  ↓
약사가 매장에서 수동 활성화
  ↓
상품 노출
```

---

## 6. 7대 질문 답변

### Q1. 취급요청형 상품을 현재 코드에서 명시적으로 구분하는 필드가 있는가?

**있다.** `supplier_product_offers.distribution_type = 'SERVICE'`가 곧 취급요청형이다.
SERVICE 상품은 `product_approvals` 테이블을 거치며, PUBLIC 상품은 거치지 않는다.

### Q2. 없다면, 어떤 필드 조합/상태 조합으로 추론 가능한가?

해당 없음 (Q1에서 PASS).

### Q3. 현재 PUBLIC 상품은 모두 즉시 listing 생성형인가, 아니면 일부는 승인형인가?

**모두 즉시 listing 생성형이다.**
`createPublicListing()`은 승인 단계 없이 곧바로 `organization_product_listings`를 생성한다.
PUBLIC 내에서 승인형/즉시형 분리는 존재하지 않는다.

### Q4. 공급자 승인 전에는 어떤 상태이고, 승인 후에는 어떤 레코드가 생성되는가?

| 시점 | SERVICE | PUBLIC |
|------|---------|--------|
| 신청 직후 | `product_approvals` (status=pending) | `organization_product_listings` (is_active=false) |
| 승인 후 | `product_approvals` (status=approved) + `organization_product_listings` (is_active=false) | — (승인 절차 없음) |

### Q5. 내 매장 `/store/commerce/orderable`에 보이는 조건은 무엇인가?

동일한 `getCatalog()` API를 사용한다. 카탈로그는 `supplier_product_offers`에서
`distribution_type IN ('PUBLIC','SERVICE')`, `is_active = true`, `supplier.status = 'ACTIVE'`인 상품을 조회하고,
각 상품에 대해 현재 사용자의 `isApplied`, `isApproved`, `isListed` 상태를 조인하여 반환한다.

### Q6. 마지막 탭 명칭으로 무엇이 가장 적절한가?

| 후보 | 적합도 | 근거 |
|------|--------|------|
| 거점판매 모집 | **현재 사용 중** | PUBLIC 상품의 성격을 설명하지만, "모집"이라는 용어가 승인 절차를 암시할 수 있어 혼동 가능 |
| 판매처 모집 | 부적합 | "판매처"는 공급자 관점 용어 — 약사(구매자) 관점이 아님 |
| 취급요청 | **부적합** | SERVICE 상품에 해당하는 용어 — PUBLIC 탭에 사용하면 의미 충돌 |
| 취급신청 | 부적합 | 위와 동일한 이유 |
| **즉시 등록** | **코드 구조상 가장 정확** | PUBLIC의 실제 동작(승인 없이 즉시 listing 생성)을 정확히 반영 |

**결론**: 코드 구조 기준으로 PUBLIC 탭은 **"즉시 등록"** 또는 현행 **"거점판매 모집"** 이 적절하다.
"취급요청/취급신청"은 오히려 **SERVICE(B2B) 탭**의 부연 설명에 해당한다.

### Q7. 현재 코드 기준으로 별도 탭 분리가 가능한가, 아니면 추가 개발이 필요한가?

**이미 분리되어 있다.**

현재 탭 구조가 이미 코드의 실제 분기와 정확히 일치한다:

| 탭 | 필터 | 코드 경로 |
|-----|------|----------|
| 전체 | `distributionType` 없음 | PUBLIC + SERVICE 전체 |
| B2B | `distributionType=SERVICE` | 취급요청형 (승인 필요) |
| 추천 상품 | `recommended=true` | `supplier_product_offers.is_featured DESC, created_at DESC` (공급자 자율 강조 + fallback) |
| 거점판매 모집 | `distributionType=PUBLIC` | 즉시 등록형 |

**추가 개발 불필요.**

---

## 7. 조사 대상 3종 등록 방식 대조

IR에서 제시한 3종 등록 방식과 현재 코드의 매핑:

| # | IR 설명 | 코드 매핑 | distribution_type | 승인 | 현재 탭 |
|---|--------|----------|------------------|------|---------|
| 1 | 전체 서비스 공급 (즉시 주문) | `createPublicListing()` | `PUBLIC` | 불필요 | 거점판매 모집 |
| 2 | 개별 서비스 공급 (운영자 승인) | `createServiceApproval()` | `SERVICE` | 운영자 승인 | B2B |
| 3 | 전체 서비스 + 취급요청형 | **현재 미구현** | 해당 없음 | — | — |

**3번 유형(전체 서비스 등록 + 취급요청)은 현재 코드에 존재하지 않는다.**

현재 구조에서는:
- `PUBLIC` = 전체 서비스 + 즉시 등록 (승인 없음)
- `SERVICE` = 개별 서비스 + 승인 필요

만약 3번 유형을 구현하려면 다음이 필요하다:
- `PUBLIC` 내부에서 "즉시형"과 "요청형"을 구분하는 추가 필드 (예: `requires_approval: boolean`)
- 또는 새로운 `distribution_type` 값 추가 (예: `PUBLIC_APPROVAL`)
- `createPublicListing()` 분기 로직 수정

---

## 8. 핵심 코드 참조

| 파일 | 라인 | 내용 |
|------|------|------|
| `pharmacy-products.controller.ts` | 208-224 | `/apply` 분기 (SERVICE vs PUBLIC) |
| `product-approval-v2.service.ts` | 29-99 | `createServiceApproval()` |
| `product-approval-v2.service.ts` | 414-487 | `createPublicListing()` |
| `product-approval-v2.service.ts` | 105-193 | `approveServiceProduct()` |
| `operator-product-applications.controller.ts` | 129-176 | 운영자 승인 엔드포인트 |
| `auto-listing.utils.ts` | 27-60 | `autoExpandPublicProduct()` |
| `SupplierProductOffer.entity.ts` | — | `distribution_type` enum 정의 |
| `ProductApproval.ts` | — | 승인 상태 enum 정의 |

---

## 9. 최종 결론

1. **취급요청형 상품 = `distribution_type = 'SERVICE'`** — 현재 코드에서 명확히 식별 가능
2. **PUBLIC 상품은 전부 즉시 등록형** — 내부에 요청형 구분 없음
3. **현재 탭 구조는 코드 분기와 정확히 일치** — 추가 개발 불필요
4. **마지막 탭 "거점판매 모집"은 PUBLIC의 의미에 부합** — "취급요청"은 오히려 B2B(SERVICE) 탭의 설명
5. **IR에서 제시한 3번 유형(전체 서비스 + 취급요청형)은 현재 미구현** — 구현하려면 추가 필드/분기 필요

---

*Generated: 2026-04-05*
*Status: PASS — 현재 코드에서 취급요청형 상품 명확히 구분 가능*
