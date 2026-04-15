# IR-O4O-STORE-QR-AND-DESCRIPTION-OVERRIDE-BROWSER-VERIFY-V1

> **검증 보고서 — QR → 상품 상세 → 설명 override 흐름**
> 검증일: 2026-04-15
> 검증 대상 WO: WO-O4O-STORE-PRODUCT-DESCRIPTION-PIPELINE-RESTORE-V1, WO-STORE-PRODUCT-DESCRIPTION-OVERRIDE-V1

---

## 1. 전체 판정

### **PARTIAL**

핵심 API 기능(PATCH override + 권한 검증)은 정상 동작 확인.
공개 스토어프론트 경로(slug 기반)는 **사전 인프라 미비**로 E2E 검증 불가.

---

## 2. 배포 상태

| 서비스 | 최신 리비전 | 배포 시각 (UTC) | 상태 |
|--------|------------|----------------|------|
| `o4o-core-api` | `o4o-core-api-01209-625` | 2026-04-15 13:11 | Active |
| `kpa-society-web` | `kpa-society-web-00474-n2k` | 2026-04-15 13:14 | Active |

---

## 3. 시나리오별 결과

| 시나리오 | 결과 | 검증 방법 | 비고 |
|----------|------|----------|------|
| S1 (기본 설명 표시 fallback) | **PASS (코드)** | SQL 코드 경로 분석 | `COALESCE(sp.description, spo.consumer_detail_description, '')` — sp 없으면 spo fallback |
| S2 (QR → 상품 상세) | **BLOCKED** | API 호출 | QR 코드 0건 (테스트 데이터 없음) |
| S3 (override 생성) | **PASS** | API 직접 호출 | `PATCH /store/products/:offerId/description` → 200 OK, StoreProduct 자동 생성 확인 |
| S4 (override 우선 적용) | **PASS (코드)** | SQL 코드 경로 분석 | `COALESCE(sp.description, spo.consumer_detail_description, '')` — sp 있으면 sp 우선 |
| S5 (다른 매장 fallback) | **PASS (코드)** | SQL 코드 경로 분석 | `sp.organization_id = opl.organization_id` 조건으로 매장별 격리 |
| S6 (QR + override) | **BLOCKED** | — | S2와 동일 사유 |
| S7 (새로고침 유지) | **PASS (코드)** | 프론트엔드 분석 | DB 저장 후 API refetch → 영속 데이터 |
| S8 (권한 검증) | **PASS** | API 직접 호출 | 미인증: `{"success":false,"error":"Authentication required","code":"AUTH_REQUIRED"}` |
| S9 (에디터 렌더링) | **UNTESTED** | — | 브라우저 접근 필요 (slug 미해결로 페이지 진입 불가) |
| S10 (회귀 테스트) | **PASS (코드)** | 코드 분석 | LEFT JOIN + COALESCE — 기존 경로 변경 없음 |

---

## 4. API 검증 상세

### 4.1 PATCH 성공 (S3)

**요청:**
```http
PATCH /api/v1/store/products/c0b8b453-1fd8-41e5-a134-56cfbe2ac9d8/description
Authorization: Bearer {pharmacy_token}
Content-Type: application/json

{
  "description": "<p>매장 맞춤 우루사 설명입니다. <strong>간 건강</strong>에 좋은 제품입니다.</p>",
  "shortDescription": "매장 맞춤 간이 설명"
}
```

**응답 (200):**
```json
{
  "success": true,
  "data": {
    "id": "f92d393a-6b33-48d7-9422-e1d4d2030f9d",
    "description": "<p>매장 맞춤 우루사 설명...</p>",
    "shortDescription": "매장 맞춤 간이 설명",
    "updatedAt": "2026-04-15T13:46:32.039Z"
  }
}
```

**확인 사항:**
- StoreProduct 자동 생성됨 (ID: `f92d393a-...`)
- CatalogProduct 자동 생성됨 (find-or-create 정상 동작)
- description/shortDescription 저장 완료

### 4.2 인증 실패 (S8)

**요청:** Authorization 헤더 없이 PATCH
**응답 (401):**
```json
{"success":false,"error":"Authentication required","code":"AUTH_REQUIRED"}
```

### 4.3 공급자 데이터 확인

**요청:** `GET /api/v1/store/products/master/{masterId}/offers`
**결과:** `consumerShortDescription: "<p>간 건강을 위한 우루사</p>"` — 공급자 설명 존재 확인

---

## 5. 발견된 문제

### BLOCKER: 공개 스토어 slug 미해결

| 항목 | 상세 |
|------|------|
| 증상 | `GET /api/v1/stores/{slug}` → 404 STORE_NOT_FOUND |
| 테스트한 slug | `gp-8596a54f28124cb9933ca92e80e95b6e` (pharmacy info에서 반환) |
| 원인 | `pharmacy-info.controller.ts`에서 `storeSlug = org.code`로 반환하지만, `platform_store_slugs` 테이블에는 해당 slug이 없음 |
| 영향 범위 | 공개 스토어프론트 전체 (상품 목록, 상품 상세, QR 랜딩) |
| WO와의 관계 | **기존 인프라 이슈** — 이번 WO 변경과 무관 |
| 해결 방안 | `platform_store_slugs`에 이 약국의 slug INSERT 필요, 또는 `pharmacy-info.controller.ts`에서 실제 slug 반환하도록 수정 |

### MINOR: QR 테스트 데이터 부재

| 항목 | 상세 |
|------|------|
| 증상 | `GET /api/v1/kpa/pharmacy/qr` → `total: 0` |
| 원인 | 테스트 약국에 QR 코드가 생성되지 않음 |
| 영향 | S2, S6 시나리오 검증 불가 |
| 해결 방안 | QR 코드 1개 이상 생성 후 재검증 |

---

## 6. 코드 경로 검증 (정적 분석)

### 6.1 B2C 쿼리 (queryVisibleProducts)

```sql
-- Line 173-174 (store-public-utils.ts)
COALESCE(sp.description, spo.consumer_detail_description, '') AS description,
COALESCE(sp.short_description, spo.consumer_short_description, '') AS short_description,

-- Line 194-197: LEFT JOIN
LEFT JOIN store_products sp
  ON sp.product_master_id = pm.id
  AND sp.organization_id = opl.organization_id
  AND sp.is_active = true
```

**분석:**
- `sp` (store_products) 없을 때 → `sp.description = NULL` → COALESCE → `spo.consumer_detail_description` (S1 fallback)
- `sp` 존재 시 → `sp.description` 우선 (S4 override)
- `sp.organization_id = opl.organization_id` → 매장별 격리 (S5 다른 매장 fallback)
- LEFT JOIN → 기존 쿼리 결과 변경 없음 (S10 회귀 없음)

### 6.2 TABLET 쿼리 (queryTabletVisibleProducts)

동일 패턴 적용 확인 (Line 305-306, 325-328)

### 6.3 프론트엔드 (StorefrontProductDetailPage.tsx)

- `isAuthenticated` state: `getAccessToken()` 존재 여부로 판단 (S8)
- 설명 수정 모달: `RichTextEditor` (상세) + `textarea` (간이)
- 저장 후 즉시 반영: `setProduct({...product, description: editDesc})` (S7)
- `ContentRenderer html={product.description} variant="product-detail"` (S9)

---

## 7. 결론

### QR + 설명 + override 흐름 완성 여부

| 계층 | 상태 | 비고 |
|------|------|------|
| **Backend API (PATCH)** | **완성** | StoreProduct 자동 생성 + 설명 업데이트 정상 동작 |
| **Backend SQL (READ)** | **완성** | COALESCE 우선순위 + LEFT JOIN + 매장별 격리 |
| **Frontend UI** | **완성 (코드)** | 에디터 모달 + 저장 + 즉시 반영 구현 |
| **E2E 브라우저** | **미검증** | slug 인프라 이슈로 공개 스토어프론트 진입 불가 |
| **QR 연동** | **미검증** | QR 테스트 데이터 부재 |

### 실운영 사용 가능 여부

**조건부 가능** — slug 인프라 수정 후 즉시 사용 가능.
코드 레벨에서는 모든 기능 구현 완료. 공개 경로 접근에 필요한 `platform_store_slugs` 데이터 정합성만 해결하면 전체 흐름 정상 동작 예상.

---

## 8. 후속 작업 제안

| # | 작업 | 우선도 | 비고 |
|---|------|--------|------|
| 1 | **Slug 정합성 수정** — `pharmacy-info.controller.ts`의 storeSlug을 `platform_store_slugs` 테이블 기반으로 변경 | HIGH | E2E 경로 복원의 전제 조건 |
| 2 | **QR 테스트 데이터 생성** — 테스트 약국에 product landing QR 1개 이상 생성 | MEDIUM | S2/S6 검증용 |
| 3 | **E2E 재검증** — slug 수정 후 브라우저 기반 전체 검증 실행 | HIGH | 이 IR의 BLOCKED 항목 해소 |
| 4 | **ContentRenderer 렌더링 QA** — bold/list/image 실제 렌더링 확인 | LOW | S9 브라우저 검증 |

---

*End of IR-O4O-STORE-QR-AND-DESCRIPTION-OVERRIDE-BROWSER-VERIFY-V1*
