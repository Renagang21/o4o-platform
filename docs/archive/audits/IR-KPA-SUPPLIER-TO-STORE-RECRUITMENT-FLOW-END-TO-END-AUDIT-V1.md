# IR-KPA-SUPPLIER-TO-STORE-RECRUITMENT-FLOW-END-TO-END-AUDIT-V1

> **조사 일시**: 2026-04-05
> **전체 판정**: **PARTIAL** — 핵심 흐름은 구현되어 있으나, "판매자 모집" 개념과 코드 경로 사이에 해석 불일치 존재

---

## 1. 핵심 발견 (Executive Summary)

이전 IR에서 "취급요청형 = SERVICE"로 결론냈으나, 전과정 추적 결과 **3개의 독립된 승인 시스템**이 존재한다.

| # | 시스템 | 테이블 | approval_type | 승인 주체 | 용도 |
|---|--------|--------|---------------|----------|------|
| A | **서비스 오퍼 승인** | `offer_service_approvals` | — | 서비스 운영자 | 공급자 오퍼를 서비스에 등록 |
| B | **약국 취급 승인 (SERVICE)** | `product_approvals` | `SERVICE` | KPA 운영자 | 약국이 SERVICE 상품 취급 신청 |
| C | **약국 취급 승인 (PRIVATE)** | `product_approvals` | `PRIVATE` | **공급자** | 약국이 공급자에게 직접 취급 요청 |

**KPA 약국 HUB의 현재 코드 경로:**
- PUBLIC 상품 → 클릭 시 즉시 listing 생성 (승인 없음)
- SERVICE 상품 → KPA **운영자** 승인 후 listing 활성화

**공급자 승인 경로 (시스템 C):**
- Neture 공급자 콘솔에 SellerRequestsPage 존재
- `product_approvals.approval_type='private'`로 관리
- **KPA 약국 HUB에서는 이 경로를 사용하지 않음**

---

## 2. 전과정 표

### 2.1 공급자 상품 등록 → HUB 노출까지

| 단계 | 행위 | API | 테이블 | 상태 변화 | 구현 | 코드 위치 |
|------|------|-----|--------|----------|------|----------|
| 1 | 공급자가 상품 등록 | POST /supplier/products | `supplier_product_offers` | 신규 생성 (is_active=false, approval_status=PENDING, distributionType 설정) | ✅ | `offer.service.ts:636-743` |
| 2 | 공급자가 서비스 선택 후 승인 요청 | POST /supplier/products/submit-approval | `offer_service_approvals` | serviceKey별 pending 레코드 생성 | ✅ | `offer.service.ts:324-378` |
| 3 | 서비스 운영자가 오퍼 승인 | PATCH /operator/service-approvals/:id/approve | `offer_service_approvals` → `supplier_product_offers` | approval_status=approved → is_active=true | ✅ | `operator-service-approval.controller.ts:182-279` |
| 4a | PUBLIC 오퍼 승인 시 자동 확장 | (승인 후 자동) | `organization_product_listings` | 모든 활성 organization에 listing 생성 (is_active=false) | ✅ | `auto-listing.utils.ts:27-60` |
| 4b | SERVICE 오퍼 승인 시 자동 확장 | (승인 후 자동) | `organization_product_listings` | 해당 서비스 organization에 listing 생성 (is_active=false) | ✅ | `auto-listing.utils.ts:72-108` |
| 4c | KPA 브릿지 | (kpa-society 승인 시 자동) | `product_approvals` | KPA 2차 심사 큐에 pending row 생성 | ✅ | `offer-service-approval.service.ts:374-385` |
| 5 | HUB 카탈로그 조회 | GET /pharmacy/products/catalog | `supplier_product_offers` JOIN | is_active=true, supplier.status=ACTIVE인 PUBLIC+SERVICE 오퍼 조회 | ✅ | `pharmacy-products.controller.ts:61-185` |

### 2.2 약국 취급 신청 → 내 매장 등록

| 단계 | 행위 | API | 테이블 | 상태 변화 | 구현 | 코드 위치 |
|------|------|-----|--------|----------|------|----------|
| 6a | PUBLIC 상품 "내 대시보드에 등록" | POST /pharmacy/products/apply | `organization_product_listings` | **즉시** listing 생성 (is_active=false) | ✅ | `product-approval-v2.service.ts:414-487` |
| 6b | SERVICE 상품 "내 대시보드에 등록" | POST /pharmacy/products/apply | `product_approvals` | approval_type=SERVICE, status=pending | ✅ | `product-approval-v2.service.ts:29-99` |
| 7 | KPA 운영자가 SERVICE 승인 | PATCH /operator/product-applications/:id/approve | `product_approvals` + `organization_product_listings` | status=approved + 기존 listing is_active=true | ✅ | `operator-product-applications.controller.ts:129-176` |
| 8 | 약국이 내 매장에서 상품 관리 | GET /pharmacy/products/listings | `organization_product_listings` | 조회 | ✅ | `pharmacy-products.controller.ts:316-341` |

### 2.3 공급자 직접 승인 (PRIVATE) — 별도 시스템

| 단계 | 행위 | API | 테이블 | 상태 변화 | 구현 | 코드 위치 |
|------|------|-----|--------|----------|------|----------|
| P1 | 판매자가 공급자에 취급 요청 | POST /service-products/:id/apply | `product_approvals` | approval_type=PRIVATE, status=pending | ✅ | `seller.controller.ts:118` |
| P2 | 공급자가 요청 목록 조회 | GET /neture/supplier/requests | `product_approvals` | approval_type=private인 건 조회 | ✅ | `supplier-product.controller.ts:223-298` |
| P3 | 공급자가 승인/거부 | POST /supplier/requests/:id/approve | `product_approvals` | status=approved/rejected | ⚠️ **프론트엔드 UI 있으나 백엔드 액션 엔드포인트 미구현** | `SellerRequestDetailPage.tsx:341-422` (UI만) |

---

## 3. 유형별 매핑 표

| 공급자 등록 유형 | distribution_type | 공급자 뷰 라벨 | HUB 탭 | 클릭 시 동작 | 승인 주체 | 내 매장 등록 | 구현 상태 |
|----------------|------------------|--------------|--------|------------|----------|------------|----------|
| 전체 공개 | `PUBLIC` | 전체 공개 | 판매자 모집 | 즉시 listing 생성 | 없음 | 즉시 (is_active=false) | ✅ 완전 구현 |
| 서비스 공급 | `SERVICE` | 서비스 | B2B | product_approvals 생성 | KPA 운영자 | 승인 후 listing 활성화 | ✅ 완전 구현 |
| 비공개 | `PRIVATE` | 비공개 | (미노출) | — | — | — | ✅ (HUB에 미노출) |

---

## 4. 10대 질문 답변

### Q1. 공급자가 상품 등록 시 어떤 등록 유형을 선택할 수 있는가?

3가지: **PRIVATE** (기본값), **PUBLIC**, **SERVICE**
- `isPublic` 토글과 `serviceKeys` 배열로 결정
- `distributionType`은 파생값: `isPublic=true → PUBLIC`, `serviceKeys.length>0 → SERVICE`, `else → PRIVATE`
- PUBLIC과 SERVICE는 **동시 선택 불가** (PUBLIC이 우선)

**코드**: `offer.service.ts:22-26` `deriveDistributionType()`

### Q2. 각 등록 유형은 DB에서 어떤 필드/상태로 저장되는가?

- `supplier_product_offers.distribution_type`: PUBLIC / SERVICE / PRIVATE
- `supplier_product_offers.is_public`: boolean
- `supplier_product_offers.service_keys`: text[] (서비스 키 배열)
- `supplier_product_offers.approval_status`: PENDING / APPROVED / REJECTED
- `supplier_product_offers.is_active`: boolean

### Q3. 그 상품이 KPA 매장 HUB에 보이는 조건은 무엇인가?

```sql
WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE')
  AND spo.is_active = true
  AND s.status = 'ACTIVE'  -- 공급자 활성 상태
```

**코드**: `pharmacy-products.controller.ts:107-135`

### Q4. "판매자 모집"에 해당하는 상품은 현재 코드에서 실제로 구분 가능한가?

**가능하다.** `distribution_type = 'PUBLIC'`으로 필터링.
단, 현재 HUB의 "판매자 모집" 탭은 **단순히 PUBLIC 상품을 보여줄 뿐**, Neture의 "판매자 모집 제품" (`is_partner_recruiting` 플래그)과는 **다른 개념**이다.

### Q5. 판매자 모집 상품에서 취급 신청 기능이 현재 실제 구현되어 있는가?

**부분 구현.**
- KPA HUB에서 PUBLIC 상품 클릭 시: **즉시 listing 생성** (취급 신청이 아닌 즉시 등록)
- Neture 판매자 콘솔에서 공급자에게 직접 요청: UI 존재 (`SellerRequestDetailPage`)하나 **백엔드 승인 액션 엔드포인트 미구현**

### Q6. 취급 신청 후 공급자 승인 절차가 있는가?

**KPA HUB 경로에서는 없다.**
- PUBLIC → 즉시 listing (공급자 승인 없음)
- SERVICE → KPA **운영자** 승인 (공급자 승인 아님)

**Neture PRIVATE 경로에서는 있다.**
- `product_approvals.approval_type='private'` → 공급자 승인 필요
- 단, KPA HUB에서 이 경로는 사용하지 않음

### Q7. 공급자 승인은 어떤 API/화면/테이블에서 처리되는가?

| 항목 | 값 |
|------|------|
| 화면 | `SellerRequestsPage.tsx` + `SellerRequestDetailPage.tsx` (Neture 공급자 콘솔) |
| API (읽기) | `GET /neture/supplier/requests` — ✅ 구현 |
| API (승인/거부) | `POST /supplier/requests/:id/approve` — ⚠️ 프론트엔드 호출 코드 있으나 백엔드 미구현 |
| 테이블 | `product_approvals` (approval_type='private') |

### Q8. 승인 후 상품이 판매자의 내 매장에 자동 등록되는가?

- **PUBLIC**: 승인 절차 없이 즉시 listing 생성 (is_active=false → 약국이 수동 활성화)
- **SERVICE**: KPA 운영자 승인 시 기존 listing의 is_active=true로 변경 (listing은 `autoExpandServiceProduct`로 사전 생성)
- **PRIVATE (공급자 승인)**: 승인 후 listing 생성 로직은 **미구현**

### Q9. 구현 상태 분류

| 구분 | 항목 |
|------|------|
| **완전 구현** | 공급자 상품 등록, 서비스 승인, HUB 카탈로그 조회, PUBLIC 즉시 등록, SERVICE 운영자 승인, 내 매장 listing 조회/관리 |
| **부분 구현** | 공급자 직접 승인 (읽기 API + UI 있으나 쓰기 API 미완), 판매자 모집 표시 (`is_partner_recruiting` Neture에만) |
| **미구현** | 공급자 승인 후 자동 listing 생성, KPA HUB에서 공급자 직접 승인 경로 |

### Q10. 현재 탭 구조가 실제 코드 구조와 맞는가?

**부분적으로 맞다.**

| 탭 | 코드 기준 | 정합성 | 비고 |
|-----|----------|--------|------|
| 전체 | PUBLIC + SERVICE 전체 | ✅ | |
| B2B | distributionType=SERVICE | ✅ | KPA 운영자 승인 필요 |
| 추천 상품 | supplier_product_offers.is_featured (1순위) + created_at DESC (fallback) | ✅ | WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1 — 공급자 자율 강조 기반. 운영자 큐레이션 폐기됨 (Phase 3) |
| 판매자 모집 | distributionType=PUBLIC | ⚠️ | 코드상 "즉시 등록"이지, "모집" 흐름은 아님 |

"판매자 모집" 탭의 불일치:
- **탭 이름이 암시하는 것**: 공급자가 판매자를 모집 → 약국이 신청 → 공급자 승인
- **코드의 실제 동작**: 약국 클릭 → 즉시 listing 생성 (승인 없음, 모집 없음)

---

## 5. 전과정 흐름도

### 경로 A: PUBLIC 상품 (현재 "판매자 모집" 탭)

```
공급자 → 상품 등록 (distributionType=PUBLIC)
  ↓
공급자 → 서비스 승인 요청 (submit-approval)
  ↓
서비스 운영자 → 오퍼 승인 (offer_service_approvals)
  ↓
syncOfferFromServiceApprovals() → is_active=true
  ↓
autoExpandPublicProduct() → 모든 org에 listing 생성 (is_active=false)
  ↓
KPA HUB 카탈로그에 노출
  ↓
약국 → "내 대시보드에 등록" 클릭
  ↓
createPublicListing() → 즉시 listing 생성 (또는 기존 listing 반환)
  ↓
약국 → 내 매장에서 수동 활성화
```

### 경로 B: SERVICE 상품 (현재 "B2B" 탭)

```
공급자 → 상품 등록 (distributionType=SERVICE, serviceKeys=['kpa-society'])
  ↓
공급자 → 서비스 승인 요청
  ↓
서비스 운영자 → 오퍼 승인
  ↓
syncOfferFromServiceApprovals() → is_active=true
  ↓
autoExpandServiceProduct() → KPA org에 listing 생성 (is_active=false)
  ↓
KPA 브릿지 → product_approvals에 pending row 생성 (KPA 2차 심사 큐)
  ↓
KPA HUB 카탈로그에 노출
  ↓
약국 → "내 대시보드에 등록" 클릭
  ↓
createServiceApproval() → product_approvals (type=SERVICE, status=pending)
  ↓
KPA 운영자 → 승인
  ↓
기존 listing is_active=true로 변경
```

### 경로 C: 공급자 직접 승인 (PRIVATE) — KPA HUB에서 미사용

```
약국 → Neture에서 공급자에게 취급 요청
  ↓
product_approvals (type=PRIVATE, status=pending)
  ↓
공급자 → SellerRequestsPage에서 확인
  ↓
공급자 → 승인/거부 (⚠️ 백엔드 액션 미구현)
  ↓
(미구현: 승인 후 listing 자동 생성)
```

---

## 6. 최종 결론

### 6.1 "판매자 모집"이 현재 코드 기준으로 정확히 무엇인지

현재 코드에서 "판매자 모집" 탭은 `distributionType=PUBLIC`인 상품을 보여주며, 클릭 시 **즉시 listing이 생성**된다. "모집"이라는 용어가 암시하는 공급자 승인 흐름은 이 경로에 **존재하지 않는다**.

Neture의 "판매자 모집 제품" (`RecruitingProductsOverviewPage`)은 별도의 `is_partner_recruiting` 플래그를 사용하며, KPA HUB의 PUBLIC 탭과는 **다른 개념**이다.

### 6.2 취급 신청 → 공급자 승인 → 내 매장 등록 흐름 구현 상태

| 구간 | 구현 상태 |
|------|----------|
| 취급 신청 (약국 → 공급자) | ⚠️ Neture PRIVATE 경로에 프론트엔드 UI 존재, 백엔드 승인 액션 미구현 |
| 공급자 승인 | ⚠️ SellerRequestDetailPage에 승인/거부 버튼 있으나 백엔드 미구현 |
| 승인 후 내 매장 등록 | ❌ 미구현 |

**KPA HUB에서는 이 흐름 자체가 연결되어 있지 않다.**

### 6.3 이전 IR에서 잘못 이해했던 부분

| 이전 이해 | 실제 |
|----------|------|
| "취급요청형 = SERVICE" | SERVICE는 **KPA 운영자 승인**이지, 공급자 승인이 아님 |
| "PUBLIC = 즉시 등록 = 판매자 모집" | PUBLIC은 즉시 등록이 맞지만, "모집" 개념과는 다름 |
| "공급자 승인은 없다" | 공급자 승인 시스템(PRIVATE)은 존재하나 KPA HUB와 미연결 |

### 6.4 다음 WO로 필요한 것

| 우선순위 | WO 유형 | 내용 |
|---------|--------|------|
| 1 | **용어 정비** | "판매자 모집" 탭이 실제로 의미하는 바를 재정의하거나, 탭 명칭을 코드 동작에 맞게 변경 |
| 2 | **구조 확정** | KPA HUB에서 공급자 직접 승인(PRIVATE) 경로를 사용할 것인지 정책 결정 |
| 3 | **승인 흐름 구현** (선택) | 공급자 승인 백엔드 액션 엔드포인트 구현 + 승인 후 listing 자동 생성 |
| 4 | **버튼/상태 정비** (선택) | PUBLIC 상품과 SERVICE 상품의 버튼 문구/상태 배지를 구분하여 약국 사용자에게 흐름 차이를 시각적으로 전달 |

---

## 7. 핵심 코드 참조

| 영역 | 파일 | 라인 |
|------|------|------|
| 공급자 상품 등록 | `modules/neture/services/offer.service.ts` | 636-743 |
| distributionType 파생 | `modules/neture/services/offer.service.ts` | 22-26 |
| 서비스 승인 요청 | `modules/neture/services/offer.service.ts` | 324-378 |
| 서비스 승인 sync | `modules/neture/services/offer-service-approval.service.ts` | 311-419 |
| 자동 확장 (PUBLIC) | `utils/auto-listing.utils.ts` | 27-60 |
| 자동 확장 (SERVICE) | `utils/auto-listing.utils.ts` | 72-108 |
| 약국 apply 분기 | `routes/o4o-store/controllers/pharmacy-products.controller.ts` | 208-224 |
| PUBLIC 즉시 listing | `modules/product-policy-v2/product-approval-v2.service.ts` | 414-487 |
| SERVICE 승인 요청 | `modules/product-policy-v2/product-approval-v2.service.ts` | 29-99 |
| KPA 운영자 승인 | `routes/kpa/controllers/operator-product-applications.controller.ts` | 129-176 |
| 공급자 요청 조회 | `modules/neture/controllers/supplier-product.controller.ts` | 223-298 |
| 공급자 승인 UI | `services/web-neture/src/pages/supplier/SellerRequestDetailPage.tsx` | 341-422 |
| 공급자 승인 API (프론트) | `services/web-neture/src/lib/api/supplier.ts` | 431-474 |
| 판매자 모집 제품 (운영자) | `services/web-neture/src/pages/operator/RecruitingProductsOverviewPage.tsx` | 115-116 |

---

*Generated: 2026-04-05*
*Status: PARTIAL — 핵심 흐름 구현되어 있으나 "판매자 모집" 개념과 코드 경로 사이 해석 불일치 존재*
