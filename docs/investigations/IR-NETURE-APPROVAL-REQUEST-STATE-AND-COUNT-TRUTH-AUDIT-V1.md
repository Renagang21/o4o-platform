# IR-NETURE-APPROVAL-REQUEST-STATE-AND-COUNT-TRUTH-AUDIT-V1

> **Status**: ACTIVE — 기준 문서
> **Author**: Claude Opus 4.6 (조사) / 작업 지시자 검토
> **Created**: 2026-04-09
> **Scope**: Neture 공급자 상품 승인 요청 플로우 + 운영자 승인 대기 KPI 집계
> **Severity**: CRITICAL — 프로덕션 배포된 기능이 실제로는 아무 상태도 바꾸지 못함
> **Related WO (선행 실패)**: WO-NETURE-PRODUCT-TABLE-SELECTION-AND-APPROVAL-REFRESH-FIX-V1 (commit `89e5856bb`)
> **Related Baseline**: [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md), [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md)

---

## 0. 요약 (Executive Summary)

Neture 공급자 상품 승인 요청 플로우에 **3개의 독립적이고 치명적인 버그가 중첩**되어 있다. 이 버그들은 연쇄적으로 작동해 "공급자 50건 승인요청 → 성공 토스트 → 공급자/운영자 양쪽 숫자 무변화 → 운영자 체크박스 disabled"라는 단일 증상을 만든다.

| 버그 ID | 요약 | 위치 | 심각도 |
|:-------:|-----|------|:-----:|
| **B1** | `submitForApproval`가 `service_keys` 필터 후 빈 배열이어도 `result.submitted++` 실행. 실제 DB INSERT 0건이어도 프론트엔 "N건 요청 완료" 반환 | `apps/api-server/src/modules/neture/services/offer.service.ts:396-435` | **CRITICAL** |
| **B2** | 운영자 KPI "승인 대기"가 legacy 컬럼 `spo.approval_status='PENDING'`을 카운트. 같은 쿼리 안에서 row는 `offer_service_approvals`, KPI는 `spo.approval_status` — **데이터 소스 불일치** | `apps/api-server/src/modules/neture/services/offer.service.ts:1611-1624` | **CRITICAL** |
| **B3** | 운영자 체크박스가 `isSelectable = serviceApprovals.some(pending)` 로 gating. B1이 해결되지 않으면 모든 체크박스가 영구 disabled | `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx:262-263` | **HIGH** |

> **한 줄 결론**: 프론트 레이어에는 버그가 없었다. 모든 버그는 **백엔드 데이터 계약**에 있다. 공급자는 가짜 성공을 받고, 운영자는 completely 무관한 legacy 컬럼을 본다.

---

## 1. 배경 및 관찰 사실

### 1.1 사용자 보고 (브라우저 기준)

1. 운영자 `/operator/all-registered-products` 에서 **상품 리스트 체크박스가 동작하지 않음**
2. 공급자 `/supplier/products` 에서 **bulk 승인 요청 후 숫자가 변하지 않음**
3. 공급자에서 **50건 승인 요청 후 공급자/운영자 양쪽 모두 변화 없음**
4. 운영자의 "승인 대기 98"은 사용자 관찰상 **공급자 승인 요청과 무관한 숫자로 의심됨**

### 1.2 선행 수정(WO-V1)과 실효성

`WO-NETURE-PRODUCT-TABLE-SELECTION-AND-APPROVAL-REFRESH-FIX-V1` (commit `89e5856bb`)이 다음 5개 수정을 적용했다:

- BaseTable td `onClick` 에 `e.stopPropagation()` 추가
- EditableDataTable의 비편집 컬럼 consumer `onCellClick` 보존
- BaseTable dead code `handleToggleRow` 제거
- Supplier bulk approval handler에 `await Promise.all([fetchProducts(pagination.page), fetchTabCounts()])`
- Operator `handleBulkApprove` / `handleBulkReject` 에 `await fetchOffers(page)`

**이 5개 수정은 논리적으로는 올바르고 배포도 완료**(`deploy-web-services` workflow success 2026-04-09 12:45:56Z)**되었으나, 사용자가 체감하는 증상을 전혀 해결하지 못한다.** 왜냐하면:

- 체크박스는 bubbling이 아니라 **`disabled` 속성**으로 막혀 있다 (B3)
- 승인 요청 refresh는 **애초에 서버가 상태를 바꾸지 않기 때문에** await를 해도 똑같이 stale이다 (B1)
- 운영자 KPI는 **어떤 승인 행위로도 변하지 않는 legacy 컬럼**을 본다 (B2)

**선행 수정은 "고장나지 않은 코드를 맞는 방향으로 다듬은 것"이며, 증상의 근본 원인과 무관하다.**

---

## 2. 조사 방법

1. **코드 경로 추적**: Frontend → API client → Backend route → Service → DB schema
2. **데이터 계약 대조**: 공급자 집계 쿼리와 운영자 집계 쿼리가 같은 테이블/컬럼을 보는지 비교
3. **배포 상태 확인**: `gcloud run revisions list`, `gh run list`
4. **프로덕션 로그 스캔**: `gcloud logging read` 로 최근 2일간 `submitForApproval` 호출 흔적 확인
5. **마이그레이션 원본 확인**: `offer_service_approvals` / `supplier_product_offers` 테이블 정의

DB 직접 쿼리는 read-only라도 사용자 승인 이전에는 수행하지 않음 (CLAUDE.md 운영 원칙).

---

## 3. 공급자 승인 요청의 truth chain

### 3.1 전체 체인

```
[Frontend] SupplierProductsPage.tsx:1132
  supplierApi.submitForApproval(Array.from(selectedIds))
  ↓ selectedIds = Set<string> where each string = SupplierProduct.id = supplier_product_offers.id

[API Client] services/web-neture/src/lib/api/supplier.ts:578-589
  POST /api/v1/neture/supplier/products/submit-approval
  body: { offerIds: string[] }
  response: { success: boolean; data?: { submitted: number; skipped: number; errors: [] }; error?: string }

[Backend Route] apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts:118-139
  validateAuth + requireActiveSupplier
  → netureService.submitForApproval(supplierId, offerIds)

[Backend Service] apps/api-server/src/modules/neture/services/offer.service.ts:396-435
  1. SELECT id, service_keys FROM supplier_product_offers
     WHERE id = ANY($1) AND supplier_id = $2
  2. for each offerId in offerIds:
     a. if (!ownedMap.has(offerId)) → errors.push('NOT_OWNED'), continue
     b. offerServiceKeys = ownedMap.get(offerId).filter(k => k !== 'neture' && k !== 'glucoseview')
     c. if (offerServiceKeys.length > 0):
          approvalService.createPendingApprovals(offerId, offerServiceKeys)
     d. result.submitted++   ← ❗ 필터 후 빈 배열이어도 무조건 증가
  3. return { submitted, skipped, errors }

[Approval Record Insert] apps/api-server/src/modules/neture/services/offer-service-approval.service.ts:25-38
  INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
  VALUES (?, ?, 'pending', NOW(), NOW())
  ON CONFLICT (offer_id, service_key) DO NOTHING
```

### 3.2 실제 DB 쓰기 대상

| 테이블 | 쓰기 여부 | 컬럼 |
|--------|:--------:|------|
| `supplier_product_offers` | ❌ **NO** | `approval_status` 는 **절대 업데이트되지 않음** |
| `offer_service_approvals` | ✅ (조건부) | `approval_status = 'pending'` 로 INSERT, 단 `service_keys`가 유효할 때만 |

**`supplier_product_offers.approval_status` 는 사실상 dead column이다.** 코드베이스 전체에서 `UPDATE supplier_product_offers SET approval_status` 패턴이 발견되지 않는다. 오직 INSERT 시 default `'PENDING'` 으로 고정될 뿐이다.

### 3.3 B1 직접 원인 상세

```typescript
// apps/api-server/src/modules/neture/services/offer.service.ts:415-428
for (const offerId of offerIds) {
  if (!ownedMap.has(offerId)) {
    result.errors.push({ id: offerId, error: 'NOT_OWNED' });
    continue;
  }

  try {
    // offer에 저장된 serviceKeys 사용 (neture/glucoseview 제외)
    const offerServiceKeys = ownedMap.get(offerId)!.filter(
      (k) => k !== 'neture' && k !== 'glucoseview',
    );

    if (offerServiceKeys.length > 0) {
      await approvalService.createPendingApprovals(offerId, offerServiceKeys);
    }

    result.submitted++;   // ❗ 버그
  } catch (error) { ... }
}
```

**다음 4개 시나리오에서 `offer_service_approvals`에 row가 전혀 INSERT 되지 않지만 `submitted++`는 실행된다:**

| Offer의 `service_keys` | 필터 결과 | createPendingApprovals | `submitted++` |
|------------------------|:--------:|:---------------------:|:-------------:|
| `NULL` | (null).filter → 런타임 에러 → catch | ❌ | ❌ (errors로 감) |
| `[]` | `[]` | ❌ skip | ✅ **+1** |
| `['neture']` | `[]` | ❌ skip | ✅ **+1** |
| `['glucoseview']` | `[]` | ❌ skip | ✅ **+1** |
| `['neture', 'glucoseview']` | `[]` | ❌ skip | ✅ **+1** |
| `['kpa']` | `['kpa']` | ✅ INSERT 1 row | ✅ **+1** |

**결과**: `result.submitted`는 "실제 INSERT된 건수"가 아니라 "소유권이 있고 예외가 발생하지 않은 건수"를 의미한다. 프론트는 이 값을 "승인 요청 완료 건수"로 해석해 사용자에게 표시하므로 **가짜 성공**이 발생한다.

**`result.skipped`는 초기화만 되고 어디서도 증가하지 않는 dead field이다.**

### 3.4 공급자 탭 숫자의 집계 기준

```sql
-- offer.service.ts:1285-1304 (getSupplierProductApprovalCounts)
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
  ))::int AS unrequested,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM offer_service_approvals osa
    WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
  ))::int AS pending,
  ...
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
WHERE ...
```

- **Source**: `offer_service_approvals` 테이블
- **Logic**: offer 단위로 "approvals 중 pending row가 있는가?" 를 체크
- **결론**: 집계 로직 자체는 올바르다. B1으로 INSERT가 안 되면 `unrequested`는 절대 `pending`으로 전이하지 못한다.

---

## 4. 운영자 승인 대기 KPI의 truth chain

### 4.1 운영자 API 쿼리 해부

`apps/api-server/src/modules/neture/services/offer.service.ts:1492-1645` 의 `getAllRegisteredOffers`는 `Promise.all` 안에서 **3개 쿼리를 동시 실행**한다.

#### 쿼리 A — Row 데이터 (line 1565-1608)

```sql
SELECT
  spo.id,
  spo.approval_status AS "approvalStatus",  -- legacy column
  ...
  svc_appr.approvals AS "serviceApprovals"  -- new source
FROM supplier_product_offers spo
  JOIN product_masters pm ON pm.id = spo.master_id
  ...
  LEFT JOIN LATERAL (
    SELECT COALESCE(json_agg(json_build_object(
      'id', osa.id,
      'serviceKey', osa.service_key,
      'status', osa.approval_status
    )), '[]'::json) AS approvals
    FROM offer_service_approvals osa
    WHERE osa.offer_id = spo.id
  ) svc_appr ON true
WHERE ${where}
ORDER BY ...
LIMIT ... OFFSET ...
```

→ 각 offer의 `serviceApprovals` 배열은 **`offer_service_approvals` 테이블**에서 LATERAL JOIN으로 집계.

#### 쿼리 B — KPI 집계 (line 1611-1624)

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE spo.is_active = true)::int AS active,
  COUNT(*) FILTER (WHERE spo.is_active = false)::int AS inactive,
  COUNT(*) FILTER (WHERE spo.distribution_type = 'PUBLIC')::int AS "distPublic",
  COUNT(*) FILTER (WHERE spo.distribution_type = 'SERVICE')::int AS "distService",
  COUNT(*) FILTER (WHERE spo.distribution_type = 'PRIVATE')::int AS "distPrivate",
  COUNT(*) FILTER (WHERE spo.approval_status = 'PENDING')::int AS "approvalPending",
  COUNT(*) FILTER (WHERE spo.approval_status = 'APPROVED')::int AS "approvalApproved",
  COUNT(*) FILTER (WHERE spo.approval_status = 'REJECTED')::int AS "approvalRejected"
FROM supplier_product_offers spo
WHERE spo.deleted_at IS NULL
```

→ KPI는 **`supplier_product_offers.approval_status` legacy 컬럼**에서 카운트.
→ **페이지 필터(키워드/카테고리/배포 타입)가 전혀 반영되지 않는다.** 항상 전체 테이블 기준.

### 4.2 B2 직접 원인 — 데이터 소스 불일치

**같은 API 응답 안에서 두 개의 다른 truth가 섞여 있다**:

| 필드 | Source table | Source column |
|------|:------------:|:-------------:|
| `data[].serviceApprovals` (row별) | `offer_service_approvals` | `approval_status` (소문자: `'pending'`, `'approved'`, `'rejected'`) |
| `kpi.approvalPending/Approved/Rejected` | `supplier_product_offers` | `approval_status` (**대문자**: `'PENDING'`, `'APPROVED'`, `'REJECTED'`) |

- 대소문자까지 다르다 (의도적 구분인지는 불명)
- `spo.approval_status`는 offer 생성 시 default `'PENDING'` 이후 업데이트 경로 없음
- `kpi.approvalPending = 98`은 사실상 "deleted_at IS NULL인 전체 offer 중 create 직후 상태가 유지된 것의 수"
- **사용자의 가설 "98은 승인요청 하지 않은 숫자"는 정확히 맞다**

### 4.3 추가 문제 — 운영자 KPI 범위 문제

운영자 KPI 쿼리는 `WHERE spo.deleted_at IS NULL` 만 적용한다. 따라서:
- 페이지에서 키워드 검색 중이어도 KPI는 항상 전체 테이블 기준
- 공급자 필터를 적용해도 KPI는 반영 안 됨
- 카테고리/규제 타입 필터링해도 KPI는 반영 안 됨

이는 의도적 설계일 수도 있지만, row 데이터가 필터링되는 것과 비교하면 UX상 혼동을 유발한다.

---

## 5. 공급자 vs 운영자 집계 비교표

| 항목 | 공급자 "승인 요청중" | 운영자 KPI "승인 대기" |
|------|:-------------------:|:---------------------:|
| **Table** | `offer_service_approvals` | `supplier_product_offers` |
| **Column** | `approval_status = 'pending'` | `approval_status = 'PENDING'` |
| **대소문자** | 소문자 | 대문자 |
| **단위** | offer당 N row (service별) | offer당 1 row |
| **업데이트 경로** | 공급자 submit → INSERT | **어디서도 업데이트 안 됨 (dead column)** |
| **같은 개념인가?** | ❌ **완전히 다른 개념** |
| **같은 숫자로 수렴 가능한가?** | ❌ 구조적으로 불가능 |

**결론: 공급자와 운영자는 서로 다른 truth를 본다. 프론트 refresh로 해결할 수 없다.**

---

## 6. 운영자 체크박스의 truth

### 6.1 선택 가능 gating 로직

```tsx
// services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx:262-263
const isSelectable = (o: AllRegisteredOffer) =>
  (o.serviceApprovals || []).some((a) => a.status === 'pending' && a.id);
```

```tsx
// services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx:375-388
render: (_v, row) => {
  const canSelect = isSelectable(row);
  return (
    <input
      type="checkbox"
      checked={selectedOfferIds.has(row.id)}
      onChange={(e) => { e.stopPropagation(); toggleSelectOne(row.id); }}
      onClick={(e) => e.stopPropagation()}
      disabled={!canSelect}
      className="w-4 h-4 accent-blue-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      title={canSelect ? '' : '승인 대기 항목만 선택 가능'}
    />
  );
},
```

- `isSelectable` 은 offer의 `serviceApprovals` 배열에 pending status row가 최소 1개 있어야 true
- `<input disabled={!canSelect}>` → 선택 불가 row는 물리적으로 클릭이 안 됨

### 6.2 B3 직접 원인

B1으로 인해 `offer_service_approvals`에 row가 생성되지 않는다 → 쿼리 A의 LATERAL JOIN이 빈 배열 반환 → `serviceApprovals = []` → `isSelectable = false` → 체크박스 **영구 disabled**.

**운영자 체크박스는 B1이 해결되기 전에는 동작할 수 없는 구조이다.**

### 6.3 선행 수정(WO-V1)의 실효성 재평가

선행 수정에서 BaseTable의 td `onClick`에 `e.stopPropagation()`을 추가해 row click bubbling을 막았다. 이 수정은 다음 시나리오에 대해 유효하다:

- 체크박스가 enable된 row에서 → 체크박스 외 영역을 클릭해도 drawer가 열리지 않음

하지만 사용자가 체감하는 "체크박스 클릭 불가" 버그는 bubbling이 아니라 disabled 때문이다. 따라서 선행 수정은 **증상의 원인과 완전히 다른 현상을 고친 것**이다. 롤백할 이유는 없지만, **이 수정만으로 체크박스 버그가 해결될 것으로 기대하면 안 된다.**

---

## 7. 50건 승인 요청 후 양쪽 무변화의 직접 원인

**가장 유력한 시나리오 (확률 > 90%)**:

1. 사용자가 공급자에서 50건 선택 후 "승인 요청" 클릭
2. 프론트 `supplierApi.submitForApproval([...50 offer IDs])` 호출
3. 백엔드:
   - 50개 offer 모두 `supplier_id` 일치 확인 성공
   - 각 offer의 `service_keys` 필터링 → 모두 `[]` 또는 `['neture']` 로 추정
   - `createPendingApprovals` 50회 모두 skip (B1)
   - `result.submitted = 50` 반환 (가짜 성공)
4. 프론트: "승인 요청 완료: 50건 요청" toast 표시
5. `fetchTabCounts` 재호출 → `offer_service_approvals`에 row 없음 → 공급자 숫자 그대로
6. 운영자 화면은 KPI를 legacy 컬럼에서 가져옴 → B2로 인해 공급자 행위와 무관 → 98 그대로
7. 운영자 체크박스는 `serviceApprovals = []` → B3으로 모두 disabled

**대안 시나리오 1 — 네트워크 실패**: 공급자의 브라우저에서 요청 자체가 서버에 도달하지 않음. 프로덕션 로그에서 최근 2일간 `NetureOfferService.submitForApproval` 관련 `logger.info` 출력이 0건인 점이 이 가설을 지지할 수도 있음. 단, log level 설정 때문일 가능성도 있어 단정 불가.

**대안 시나리오 2 — 프론트가 잘못된 ID 전달**: `selectedIds`가 offer ID가 아닌 다른 필드(master_id 등)였다면 `NOT_OWNED` 에러가 50건 반환되어 "50건 실패" 토스트가 표시되어야 하는데, 사용자 관찰에선 성공 토스트가 떴으므로 이 시나리오는 배제.

---

## 8. 수정 필요 범위 (To Be)

### 8.1 Backend — `submitForApproval` 근본 수정 (B1)

**옵션 1 (권장): 명시적 실패**
- `service_keys`가 필터 후 빈 배열이면 `errors.push({id, error: 'NO_ELIGIBLE_SERVICE_KEYS'})` 후 continue
- `result.submitted`는 실제 INSERT 건수만 증가
- `result.skipped`를 실제로 사용 (또는 필드 제거)

**옵션 2: 기본 service_keys 자동 배정**
- Offer 생성/편집 화면에서 service_keys를 필수로 강제
- 마이그레이션으로 기존 offer에 기본값 backfill

**옵션 3: 정책 계층 통합**
- service_keys 개념 자체를 재검토 — Neture Distribution Engine V1과의 관계 재정립
- [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) 참조

### 8.2 Backend — 운영자 KPI 집계 소스 변경 (B2)

- `getAllRegisteredOffers`의 KPI 쿼리를 `offer_service_approvals` 기준으로 재작성
- KPI 의미 재정의:
  - `approvalPending`: 공급자가 승인 요청했고 아직 결정 전인 건수 (`EXISTS pending row`)
  - `approvalApproved`: 모든 service 승인 완료된 건수
  - `approvalRejected`: 하나라도 reject된 건수
- `spo.approval_status` legacy 컬럼을 deprecate 또는 제거
- 운영자 KPI와 페이지 필터의 연동 여부 제품 의사결정 필요

### 8.3 Frontend — 방어 장치 (선택적)

- `SupplierProductsPage`: 응답 검증 — `result.data.submitted === 0` 이고 `errors === []` 면 의심 상황으로 경고 표시
- `AllRegisteredProductsPage`: empty state 개선 — 모든 체크박스가 disabled일 때 사용자에게 이유 안내

### 8.4 데이터 정합성 복구 (마이그레이션)

- 기존 offer 중 `service_keys`가 `[]` 또는 `['neture']`인 것 수량 조사
- 이미 "승인 요청됨" 상태로 UI에 표시됐던 offer의 실제 `offer_service_approvals` 상태 확인
- 필요 시 backfill migration으로 `service_keys` + pending row 동기화

---

## 9. 검증 필요 사항 (Production DB)

다음 쿼리는 read-only 검증이며 사용자 승인 후 `gcloud sql` 또는 Cloud Console SQL Editor로 실행한다.

```sql
-- 1. 최근 offer의 service_keys 실제 분포
SELECT
  CASE
    WHEN service_keys IS NULL THEN 'NULL'
    WHEN array_length(service_keys, 1) IS NULL THEN 'EMPTY'
    ELSE array_to_string(service_keys, ',')
  END AS keys,
  COUNT(*)
FROM supplier_product_offers
WHERE deleted_at IS NULL
GROUP BY 1
ORDER BY 2 DESC;

-- 2. offer_service_approvals 테이블 현황
SELECT approval_status, COUNT(*)
FROM offer_service_approvals
GROUP BY approval_status;

-- 3. spo.approval_status legacy 분포 (B2 검증)
SELECT approval_status, COUNT(*)
FROM supplier_product_offers
WHERE deleted_at IS NULL
GROUP BY approval_status;

-- 4. "숫자 98"의 실체 확인
SELECT COUNT(*)
FROM supplier_product_offers
WHERE deleted_at IS NULL AND approval_status = 'PENDING';

-- 5. 공급자 승인 요청 플로우 고립 상태 — spo.approval_status가 'APPROVED'/'REJECTED'인 것이 있는지
SELECT
  approval_status,
  COUNT(*)
FROM supplier_product_offers
WHERE deleted_at IS NULL AND approval_status != 'PENDING'
GROUP BY approval_status;
```

**예상 결과 (B1/B2가 사실이라면)**:
- #1: 대부분의 offer가 `NULL` 또는 `EMPTY` 또는 `neture` 만 포함
- #2: `pending` row 수가 매우 적음 (공급자 submit이 거의 INSERT하지 못함)
- #3: 거의 모든 offer가 `PENDING` (legacy 기본값)
- #4: 정확히 98 (운영자가 본 숫자와 일치)
- #5: 거의 0건 (legacy 컬럼이 업데이트 경로 없음을 증명)

---

## 10. 후속 WO 초안 (시맨틱)

### WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1

**목표**:
1. 공급자 승인 요청이 실제 서버 상태를 변경하도록 보장 (B1)
2. 공급자/운영자가 같은 데이터 소스에서 같은 숫자를 보도록 통합 (B2)
3. 운영자 체크박스가 disabled로 고정되는 문제 자동 해결 (B3)

**작업 범위**:
- `apps/api-server/src/modules/neture/services/offer.service.ts`
  - `submitForApproval` — service_keys 빈 배열 처리 정책 결정 + `result.submitted`를 실제 INSERT 건수로 재정의
  - `getAllRegisteredOffers` KPI 쿼리 — `offer_service_approvals` 기준으로 재작성
- `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` — submit 응답 검증 로직 추가
- `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx` — empty state 개선
- 마이그레이션 (필요 시): 기존 offer의 `service_keys` 정합성 backfill

**블로커 (선행 의사결정)**:
- service_keys 정책 결정 — "offer 생성 시 어떤 서비스에 등록하겠다고 공급자가 선언하는가?" 에 대한 제품 의사결정
- B2 수정 시 `spo.approval_status` 컬럼의 처리 방향 — deprecate / 제거 / 유지

**필수 검증**:
1. 공급자 1건 승인요청 → `offer_service_approvals`에 row INSERT 확인 → 공급자 탭 숫자 즉시 변경
2. 공급자 50건 승인요청 → 실제 INSERT 건수가 `submitted` 와 일치
3. 운영자 KPI가 공급자 승인요청 건수와 동일
4. 운영자 체크박스가 enable되고 클릭 가능
5. 브라우저 기준으로 양쪽 재현 성공

---

## 11. 교훈 (Lessons Learned)

| # | 교훈 | 적용 |
|---|------|------|
| 1 | **프론트 체크박스 버그를 보면 먼저 "왜 disabled인가?" 를 확인하라** — bubbling부터 의심하면 안 된다 | 모든 selectable-with-gating 테이블 |
| 2 | **카운트가 안 바뀌는 증상을 보면 먼저 "집계 쿼리가 보는 컬럼이 실제로 업데이트되는 컬럼인가?" 를 확인하라** | 모든 KPI + 상태 쿼리 |
| 3 | **같은 API 응답 안에서 서로 다른 테이블을 섞지 말라** — row data와 KPI는 반드시 같은 source에서 계산 | 모든 listing API |
| 4 | **`result.submitted++` 같은 카운터는 실제 성공 조건과 결합해서만 증가시켜라** — "예외 없음" = "성공" 이 아니다 | 모든 bulk action handler |
| 5 | **Legacy 컬럼을 버리지 않고 dead state로 남겨두면 반드시 잘못된 계산의 source가 된다** | 모든 enum/status 컬럼 리팩토링 |
| 6 | **브라우저 기준 재현 없이 "수정 완료"를 선언하지 말라** — 로컬 타입체크와 빌드 성공은 증상 해결의 증거가 아니다 | 모든 UI 버그 수정 WO |

---

## 12. 관련 문서 / 참조

- [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) — service_keys 정책의 상위 계약
- [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) — 공급자/운영자 도메인 경계
- [NETURE-SUPPLIER-CODE-AUDIT-V1](../baseline/NETURE-SUPPLIER-CODE-AUDIT-V1.md) — 공급자 코드 사전 조사
- `docs/baseline/O4O-BOUNDARY-POLICY-V1.md` — Boundary Policy Guard Rules
- Commit `89e5856bb` — WO-NETURE-PRODUCT-TABLE-SELECTION-AND-APPROVAL-REFRESH-FIX-V1 (선행 실패 수정)
- Commit `47979575c` — WO-NETURE-SUPPLIER-PRODUCT-LIST-CHECKBOX-FIX-V1 (그 이전 실패 수정)

---

## 13. 변경 이력

| 날짜 | 변경 | 작성자 |
|------|------|--------|
| 2026-04-09 | 초기 작성 — 3개 버그 확정, 수정 범위 초안 | Claude Opus 4.6 |

---

*본 문서는 기준 문서(standard reference)이며, 후속 WO 착수 전 반드시 참조해야 한다.*
