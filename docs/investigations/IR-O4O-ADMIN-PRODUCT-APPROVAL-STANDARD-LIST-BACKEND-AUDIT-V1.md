# IR-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-BACKEND-AUDIT-V1

> **Status:** Read-only audit (no code/backend/DB change)
> **Date:** 2026-06-17
> **Scope:** Neture `/admin/product-approvals` 상품 승인 관리 화면 — O4O 표준 리스트 전환 전 backend-aware 선행 감사
> **판정:** **backend pagination 선행 필요** (frontend standard list adoption 은 backend 선행 후 진행)

---

## 1. Executive Summary

Neture admin `/admin/product-approvals` ("상품 승인 관리") 화면은 **array-only 응답 + 전량 client-side 필터링** 구조다. backend `GET /neture/admin/products` 는 TypeORM `offerRepo.find()` 로 조건에 맞는 **모든 row 를 정렬하여 한 번에 반환**하며, page/limit/search/sort 파라미터를 받지 않는다. 응답 envelope 은 `{ success, data: [...] }` 로 **pagination meta 가 없다**.

따라서 이 화면은 표준 리스트 Phase 1 내부 감사에서 분류된 대로 **frontend 표준 적용 전 backend 선행이 필요한 대상**이다. `/operator/stores`(Full reference)처럼 곧바로 표준 DataTable + server pagination 으로 전환할 수 없고, 다음 순서가 필요하다.

1. **backend pagination/search/sort 도입** (선행 WO) — `GET /neture/admin/products` 에 page/limit/search/sortBy/sortOrder 추가 + 응답 envelope 에 pagination meta 추가
2. **frontend standard list adoption** (후속 WO) — 표준 DataTable + server-driven 페이지네이션/검색/정렬 + URL sync

승인/반려/배치 액션은 **별도 endpoint** (`/products/:id/approve`, `/reject`, `/batch-approve`, `/batch-reject`)로 list 조회와 분리돼 있어, list 응답 구조 변경이 액션 흐름에 영향을 주지 않는다 → backend pagination 도입의 위험도는 낮다.

**추가 관측 (참고):** backend `getAllProducts()` 매핑은 `masterName` 을 반환하나 frontend `AdminProduct` 타입/렌더링은 `marketingName`·`category` 를 참조한다. 즉 현재 list 의 상품명/카테고리 컬럼과 검색 키(`p.marketingName`)가 실데이터와 어긋날 가능성이 있다. 표준 전환 WO 에서 **field contract 정합**을 함께 다뤄야 한다 (§5, §11 참조).

---

## 2. 현재 화면 구조

| 항목 | 값 |
|------|----|
| 화면 명 | 상품 승인 관리 (상품 오퍼를 검토하고 승인/반려) |
| 라우트 | `/admin/product-approvals` (**복수형** — WO 표기 `/admin/product-approval` 은 단수, 실제 경로는 복수) |
| 레이아웃 | 자체 마크업 (표준 `OperatorDashboardLayout`/표준 DataTable 미사용) |
| 상단 | 4 KPI 카드 (전체 / 승인대기 / 승인됨 / 반려됨) — 모두 client 집계 |
| 필터 | 검색 input(상품명·공급자) + status 버튼(all/PENDING/APPROVED/REJECTED) — 전부 client-side |
| 리스트 | 순수 `<table>` 직접 렌더 (페이지네이션 없음, 전량 렌더) |
| 액션 | 행별 승인/반려, 행 클릭 → 상세 모달(client state, 별도 fetch 없음) |

---

## 3. Frontend route / component / API client

| 항목 | 경로 |
|------|------|
| Route 등록 | [services/web-neture/src/App.tsx:995](services/web-neture/src/App.tsx#L995) — `<Route path="/admin/product-approvals" element={<AdminProductApprovalPage />} />` |
| Component | [services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx](services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx) |
| API client | [services/web-neture/src/lib/api/admin.ts:391-440](services/web-neture/src/lib/api/admin.ts#L391-L440) — `adminProductApi` |

### 사용하는 API client method

| 용도 | method | 호출 endpoint |
|------|--------|--------------|
| 목록 조회 | `adminProductApi.getProducts(status?)` | `GET /neture/admin/products[?status=]` |
| (미사용) 대기 목록 | `adminProductApi.getPendingProducts()` | `GET /neture/admin/products/pending` |
| 승인 | `adminProductApi.approveProduct(id)` | `POST /neture/admin/products/:id/approve` |
| 반려 | `adminProductApi.rejectProduct(id, reason)` | `POST /neture/admin/products/:id/reject` |
| (미사용) 배치 승인 | `adminProductApi.batchApprove(ids)` | `POST /neture/admin/products/batch-approve` |
| (미사용) 배치 반려 | `adminProductApi.batchReject(ids, reason)` | `POST /neture/admin/products/batch-reject` |

> 현재 화면은 list 조회 시 `status` 인자를 **넘기지 않는다** (`adminProductApi.getProducts()` 무인자). 즉 항상 전체를 받아 client 에서 status 필터링한다. batch / pending method 는 client 에 정의돼 있으나 이 화면에서는 호출하지 않음.

---

## 4. Backend endpoint / controller / service

| 계층 | 경로 |
|------|------|
| Route 등록 (목록) | [apps/api-server/src/modules/neture/controllers/admin.controller.ts:493-514](apps/api-server/src/modules/neture/controllers/admin.controller.ts#L493-L514) — `GET /products` |
| Route 등록 (대기) | admin.controller.ts:302-310 — `GET /products/pending` |
| Route 등록 (승인) | admin.controller.ts:316-339 — `POST /products/:id/approve` |
| Route 등록 (반려) | admin.controller.ts:379-403 — `POST /products/:id/reject` |
| Route 등록 (배치) | admin.controller.ts:408-487 — `POST /products/batch-approve`·`/batch-reject` |
| Guard | `requireAuth` → `requireNetureScope('neture:admin')` (전 endpoint 동일) |
| Service (facade) | [apps/api-server/src/modules/neture/neture.service.ts:127,153](apps/api-server/src/modules/neture/neture.service.ts#L153) — `getAllProducts` / `getPendingProducts` 위임 |
| Service (구현) | [apps/api-server/src/modules/neture/services/offer.service.ts:515-557](apps/api-server/src/modules/neture/services/offer.service.ts#L515-L557) — `getAllProducts()` |
| 데이터 소스 | TypeORM `offerRepo` (entity = SupplierProductOffer / 테이블 `supplier_product_offers`) + `relations: ['supplier','master']` + 조직명 enrichment(`getOrgNameMap`) |

### 마운트 prefix
`admin.controller.ts` 의 router 는 `/admin` prefix 에 마운트된다 → 실 경로는 `/api/v1/neture/admin/products`.

---

## 5. 현재 응답 shape

**Envelope:** `{ success: true, data: T[] }` — **pagination meta 없음** (array-only under `data`).

`getAllProducts()` 가 반환하는 각 항목(offer.service.ts:533-552):

```
{ id, masterId, masterName, supplierName, supplierId, isPublic,
  distributionType, isActive, approvalStatus,
  priceGeneral, priceGold, pricePlatinum, consumerReferencePrice,
  consumerShortDescription, consumerDetailDescription,
  businessShortDescription, businessDetailDescription, createdAt }
```

Frontend `AdminProduct` 타입(admin.ts:375-389) 이 기대하는 필드:

```
{ id, masterId, marketingName, supplierName, category, distributionType,
  approvalStatus, isActive, createdAt, consumer*/business* descriptions }
```

**⚠ Field contract drift:** backend 는 `masterName` 을 주고 frontend 는 `marketingName`·`category` 를 읽는다. 현재 list 의 상품명 컬럼(`p.marketingName`)·카테고리 컬럼(`p.category`)이 실제로는 `undefined` 일 수 있으며, 검색 입력 시 `p.marketingName.toLowerCase()` 가 NPE 위험을 가진다. (본 IR 범위는 read-only 이므로 코드 수정 없음. 표준 전환 WO 에서 backend 매핑에 `marketingName`·`category` 추가 또는 frontend 필드명 정합 필요.)

---

## 6. 현재 검색 / 필터 / 정렬 / 페이지네이션 현황

| 기능 | 현황 | 처리 위치 |
|------|------|----------|
| **페이지네이션** | **없음** — 전체 row 를 받아 전량 렌더 | N/A (client slice 도 없음) |
| **검색** | 있음 — 상품명·공급자 부분일치 | **client-side** (AdminProductApprovalPage.tsx:74-82) |
| **필터: status** | 있음 — all/PENDING/APPROVED/REJECTED | **client-side** (동) |
| **필터: serviceKey** | 없음 | — |
| **필터: supplier** | 없음 (검색에 supplierName 포함될 뿐) | — |
| **필터: category** | 없음 | — |
| **필터: distributionType** | 없음 (컬럼 표시만) | — |
| **필터: dateFrom/dateTo** | 없음 | — |
| **정렬** | **없음** (UI 정렬 컨트롤 없음) | backend 고정 `createdAt DESC` |

### Backend 측 현황
- `GET /products` 는 query 로 `supplierId / distributionType / isActive / approvalStatus` **필터만** 수용(admin.controller.ts:495-506). page/limit/search/sort 미수용.
- `getAllProducts()` 는 `offerRepo.find({ where, relations, order: { createdAt: 'DESC' } })` — **고정 정렬, 무제한 take**.
- 즉 **검색·status 필터는 backend 가 이미 지원 가능**하나(현재 frontend 가 안 쓸 뿐), **pagination·sort·자유 텍스트 검색은 backend 미지원**.

---

## 7. 승인 / 반려 / 상세 액션 영향도

| 액션 | endpoint | 비고 |
|------|----------|------|
| 승인 | `POST /products/:id/approve` → `netureService.approveProduct(id, adminUserId)` | service approval SSOT 정규화 흐름(WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1), 멱등, 규제상품 permit 게이트, action-log 기록 |
| 반려 | `POST /products/:id/reject` → `rejectProduct(id, adminUserId, reason)` | action-log 기록 |
| 배치 승인/반려 | `POST /products/batch-approve`·`/batch-reject` | V3 표준(WO-O4O-TABLE-STANDARD-V3-EXPANSION) — 현재 이 화면 미사용 |
| 상세 | **없음 (별도 fetch 없음)** | 행 클릭 시 list 항목을 그대로 모달에 표시 (consumer/business 설명 포함) |

**핵심:** 액션 endpoint 는 list 조회와 **완전히 분리**돼 있고 단건 id 기반이다. list 응답 envelope 에 pagination meta 를 추가하거나 정렬/검색 파라미터를 추가해도 **승인/반려/배치 비즈니스 로직에는 영향이 없다.** 상세도 별도 API 가 아니므로 영향 없음.

---

## 8. Backend pagination 도입 가능성

**가능 (낮은 위험).** 도입 지점:

- **Controller** (admin.controller.ts:493-514): `req.query` 에서 `page`/`limit` 파싱 → service 로 전달, 응답을 `{ success, data, pagination }` 으로 확장.
- **Service** (offer.service.ts:515-557): `offerRepo.find()` 를 `findAndCount()` 로 교체하고 `skip`/`take` 적용 → `[rows, total]` 반환. 또는 `QueryBuilder` 로 전환(검색/정렬 동시 도입 시 권장).

호환 전략: `page` 미전달 시 기존 동작(전량) 유지하거나, 기본 `limit` 적용 + 응답에 pagination meta 항상 포함. frontend 가 array-only 와 `{data,pagination}` 양쪽을 견딜 수 있도록 단계적 전환(§10).

---

## 9. Backend search / sort 도입 가능성

### Search (추가 가능 필드)
현재 `offerRepo.find()` where 는 정확매치만. 자유 텍스트 검색을 주려면 **QueryBuilder + ILIKE** 필요:
- `master.name` (product_masters.name) — JOIN 으로 검색 가능
- `supplierName` — **주의:** 이 값은 DB 컬럼이 아니라 `getOrgNameMap()` 으로 사후 enrichment 되는 조직명이다. 조직명으로 DB 레벨 검색하려면 organizations JOIN 추가 필요 (현재 구조상 단순 where 로 불가).

### Sort (sortBy/sortOrder whitelist 후보)
`offerRepo` 가 실제 정렬 가능한 **DB 컬럼**:

| sortBy 후보 | DB 정렬 가능성 |
|-------------|---------------|
| `createdAt` | ✅ (현재 기본) |
| `approvalStatus` | ✅ offer 컬럼 |
| `distributionType` | ✅ offer 컬럼 |
| `priceGeneral` | ✅ offer 컬럼 |
| `isActive` | ✅ offer 컬럼 |
| `masterName` | △ master JOIN 정렬 필요 |
| `supplierName` | ✗ enrichment 값 — DB 정렬 불가(JOIN organizations 필요) |
| `category` | ✗ 현재 미반환 — 매핑/JOIN 선행 필요 |

→ **whitelist 권장 초기값:** `createdAt`, `approvalStatus`, `distributionType`, `priceGeneral`. `supplierName`/`category` 정렬은 매핑·JOIN 정합 후 별도 확장.

---

## 10. 표준 응답 `{ success, data, pagination }` 전환 전략

기준 사례: 같은 admin.ts 내 `adminSettlementApi`/`adminCommissionApi`/`adminPartnerMonitoringApi` 는 이미 `{ data, meta:{page,limit,total,totalPages} }` 패턴을 쓴다 → **동일 envelope 컨벤션 채택**.

호환 단계:
1. backend 가 `pagination`(또는 `meta`) 을 응답에 **추가** (기존 `data` 배열 위치 유지) → 기존 frontend 는 `data` 만 읽으므로 **무해**.
2. frontend client(`adminProductApi.getProducts`)를 `{ data, pagination }` 반환형으로 확장하되, meta 부재 시 기본값 fallback (기존 settlement/commission client 와 동일 방어).
3. 화면을 server-driven 으로 전환.

---

## 11. Frontend standard list adoption 전략

전제: §8–10 backend 선행 완료.

1. 자체 `<table>` → 표준 DataTable 로 교체 (KPA/Operator 표준 리스트 컨벤션 정렬).
2. status 필터·검색·정렬·페이지를 **server-driven** 으로 이관 + **URL sync** (KCos `/operator/applications` URL sync 최소 개선 선례 참조).
3. KPI 4 카드는 server 집계로 이관 검토(현재 client 집계는 전량 로드 전제 → pagination 후 깨짐) — **pagination 도입 시 KPI 집계 endpoint 분리 필요**(중요 의존성).
4. **field contract 정합**(§5): `marketingName`·`category` backend 매핑 추가 또는 frontend 필드명 교정.
5. 승인/반려/상세 액션은 그대로 재사용(영향 없음, §7).

---

## 12. 위험도와 금지선

| 항목 | 평가 |
|------|------|
| backend pagination 도입 위험 | **낮음** — list 조회와 액션이 분리, envelope 추가는 하위호환 |
| backend sort 도입 위험 | **낮음** — whitelist 로 컬럼 제한 시 안전 |
| backend search(조직명) 도입 위험 | **중** — supplierName 은 enrichment 값, JOIN 재설계 필요 |
| KPI 집계 의존성 | **중** — pagination 후 client 전량 집계 불가 → 집계 endpoint 선행/동반 필요 |
| field contract drift | **중** — marketingName/category 정합 누락 시 표준 전환 후에도 빈 컬럼/검색 오류 잔존 |

**준수한 금지선:** 코드/backend/frontend/DB/schema/migration/package.json/lock/Dockerfile/CI 무변경. 다른 세션 WIP 무수정. read-only 조사만. 문서 1개만 생성·path-specific 커밋.

---

## 13. 후속 WO 제안

### WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1 (선행)
- `GET /neture/admin/products` 에 `page`/`limit`/`search`/`sortBy`/`sortOrder` 수용.
- `getAllProducts()` → `findAndCount()`/QueryBuilder 전환, sortBy whitelist(§9), search(master.name 우선; supplierName 은 JOIN 검토).
- 응답 envelope `{ success, data, pagination }` (settlement/commission 컨벤션).
- **KPI 집계 endpoint 분리** (예: `GET /neture/admin/products/summary`) 동반 — pagination 후 KPI 보존용.
- 하위호환 유지(기존 frontend 깨지지 않음).

### WO-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1 (후속)
- 표준 DataTable + server-driven 페이지/검색/정렬 + URL sync.
- KPI 카드 server 집계 연결.
- field contract 정합(marketingName/category).
- 승인/반려/상세 액션 재사용.

---

## 14. 결론

**판정: backend pagination(+search/sort) 선행 필요.**

`/admin/product-approvals` 는 array-only + client 전량 처리 화면이므로 frontend 표준 리스트를 곧바로 적용하면 무제한 로드 구조가 그대로 남는다. list 조회와 승인/반려/배치 액션이 분리돼 있어 backend pagination 도입 위험은 낮다. 단 **KPI client 집계 의존성**과 **marketingName/category field contract drift** 두 가지가 표준 전환 시 함께 정리돼야 한다.

권장 순서: **`WO-...-BACKEND-PAGINATION-V1`(+KPI 집계 분리) → `WO-...-STANDARD-LIST-ADOPTION-V1`(+field contract 정합)**. 그동안 browser smoke(`SMOKE-O4O-STANDARD-LIST-PHASE1-REFERENCE-V1`)는 환경 블로커 해제 후 별도 진행.
