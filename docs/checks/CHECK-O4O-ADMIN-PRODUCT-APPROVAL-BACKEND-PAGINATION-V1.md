# CHECK-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1

> **WO:** WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
> **Date:** 2026-06-17
> **선행 IR:** IR-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-BACKEND-AUDIT-V1
> **성격:** backend 선행 WO (frontend 화면 전환 없음). additive · 하위호환.

---

## 1. 목표 요약

Neture admin `/admin/product-approvals` 표준 리스트 전환의 backend 기반을 구현한다.
`GET /neture/admin/products` 의 array-only 전량 반환을 **하위호환 가능한 pagination/search/sort** 구조로 확장하고, pagination 도입 시 깨지는 KPI client 집계를 **summary endpoint** 로 분리하며, frontend↔backend **field contract drift**(`masterName` vs `marketingName`/`category`)를 정리했다.

---

## 2. 변경 endpoint

| Endpoint | 변경 | 비고 |
|----------|------|------|
| `GET /api/v1/neture/admin/products` | **확장(additive)** | page/limit/search/sortBy/sortOrder 수용 + pagination meta 추가 |
| `GET /api/v1/neture/admin/products/summary` | **신규** | 전체 기준 승인 상태 집계(KPI 대체) |
| `POST /products/:id/approve` · `/reject` · `/batch-approve` · `/batch-reject` | **무변경** | 액션/비즈니스 로직 손대지 않음 |
| `GET /products/pending` | **무변경** | — |

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/services/offer.service.ts` | `getAllProductsPaged()` · `getProductsSummary()` 신규 메서드 추가. 기존 `getAllProducts()` 무변경 |
| `apps/api-server/src/modules/neture/neture.service.ts` | facade 위임 메서드 `getAllProductsPaged` · `getProductsSummary` 추가 |
| `apps/api-server/src/modules/neture/controllers/admin.controller.ts` | `GET /products` 핸들러 확장 + `GET /products/summary` 라우트 추가 |
| `services/web-neture/src/lib/api/admin.ts` | `getProductsList()` · `getSummary()` 메서드 + 타입 추가. 기존 `getProducts()` 무변경 |
| `docs/checks/CHECK-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1.md` | 본 문서 |

> `getAllProducts()` 를 변경하지 않은 이유: operator 측 소비처([operator-product-approval.controller.ts:74](apps/api-server/src/modules/neture/controllers/operator-product-approval.controller.ts#L74))가 동일 메서드를 array 반환으로 사용 중. 신규 진입점만 additive 로 추가해 operator 흐름 무영향.

---

## 4. Query parameter 매핑 (`GET /products`)

| query | 타입 | 처리 |
|-------|------|------|
| `page` | number | 미전달 시 pagination 미적용(전량). 전달 시 `max(1, floor)` |
| `limit` | number | 미전달 시 전량. 전달 시 `min(100, max(1, floor))` — **상한 100** |
| `search` | string | `master.name ILIKE %search%` (trim) |
| `sortBy` | string | whitelist(§5), 미허용 값은 `createdAt` fallback |
| `sortOrder` | `asc`/`desc` (대소문자 무관) | `ASC` 외 전부 `DESC` fallback |
| `approvalStatus` | enum | 기존 유지 (enum 검증) |
| `distributionType` | enum | 기존 유지 (enum 검증) |
| `isActive` | `'true'`/`'false'` | 기존 유지 |
| `supplierId` | string | 기존 유지 |

**하위호환 핵심:** `page`/`limit` 둘 다 미전달이면 기존과 동일하게 **전량 반환**한다. 기존 `adminProductApi.getProducts()`(무인자)는 그대로 동작하며 화면이 깨지지 않는다.

---

## 5. Sort whitelist

`offer.service.ts`의 `getAllProductsPaged` 내 `SORT_WHITELIST` (DB 컬럼만):

| sortBy | 매핑 |
|--------|------|
| `createdAt` | `offer.createdAt` (기본) |
| `approvalStatus` | `offer.approvalStatus` |
| `distributionType` | `offer.distributionType` |
| `priceGeneral` | `offer.priceGeneral` |
| `isActive` | `offer.isActive` |

**V1 제외(보류):**
- `supplierName` — organizations enrichment(`getOrgNameMap`) 값으로 DB 컬럼 아님. 정렬 시 organizations JOIN 재설계 필요 → 후속.
- `category` — master.category relation. 정렬은 후속(검색/표시는 제공). 
- `masterName`/`marketingName` — master JOIN 정렬 가능하나 V1 whitelist 보수적으로 제외.

미허용 sortBy → `createdAt` fallback (예외 발생 없음).

---

## 6. Search 지원 범위

- **지원:** `master.name` (product_masters.name) ILIKE 부분일치.
- **V1 제외:** `supplierName` 검색 — enrichment 값이라 단순 where 불가. organizations JOIN 도입은 후속 WO.
- QueryBuilder 는 to-one relation(supplier/master/category)만 join → `getManyAndCount()` total 정확.

---

## 7. Response envelope

```jsonc
{
  "success": true,
  "data": [ /* 기존 AdminProduct[] (배열 위치 유지) */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 137,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

- **paging 미요청 시:** `data` = 전량, `pagination` = `{ page:1, limit:total, total, totalPages:1, hasNextPage:false, hasPreviousPage:false }` (전체를 단일 페이지로 표현).
- `pagination` 은 additive — 기존 frontend 는 `data` 만 읽으므로 무해.

---

## 8. Summary endpoint

`GET /api/v1/neture/admin/products/summary`

```jsonc
{ "success": true, "data": { "total": 137, "pending": 12, "approved": 120, "rejected": 5 } }
```

- 공통 필터 `supplierId`/`distributionType`/`isActive` 수용. status 별 `GROUP BY` 집계.
- 후속 standard list adoption 에서 KPI 4카드를 이 endpoint 에 연결(현재 화면은 미사용 — 하위호환).

---

## 9. Field contract 정합 결과

| 필드 | 이전 | 변경 |
|------|------|------|
| `marketingName` | backend 미반환(frontend undefined·검색 NPE 위험) | **추가** — `master.name` 매핑 (신규 list 응답) |
| `category` | backend 미반환 | **추가** — `master.category.name` (없으면 `null`) |
| `masterName` | 기존 반환 | **유지** (혹시 모를 소비처 호환) |

- `getAllProductsPaged` 응답에 위 3필드 모두 포함. 기존 `getProducts()`(무인자)도 동일 endpoint 를 타므로 **현 화면의 검색 NPE 위험도 부수적으로 해소**됨.
- frontend `AdminProduct` 타입: `marketingName` 유지, `category: string` → `string | null`(소비처 `p.category || '-'` 안전), `masterName?: string` additive.

---

## 10. 기존 frontend 하위호환

| 항목 | 결과 |
|------|------|
| `adminProductApi.getProducts()` (무인자) | 변경 없음 — 전량 array 반환 계속 동작 |
| `/admin/product-approvals` 화면 | 표준 DataTable 전환 **안 함**. 기존 방식 그대로 동작 |
| `getProductsList()` / `getSummary()` | 신규 additive — 후속 adoption 화면용. 현재 미사용 |
| response `data` 배열 위치 | 유지 |

---

## 11. 승인/반려/배치 endpoint 무변경 확인

`POST /products/:id/approve`, `/reject`, `/batch-approve`, `/batch-reject` 및 `approveProduct`/`rejectProduct`/`approveProducts` 서비스 메서드, approval SSOT, action-log, 규제 permit gate **전부 미변경**. list 조회와 액션은 단건 id 기반으로 분리되어 영향 없음.

---

## 12. Typecheck 결과

| 대상 | 명령 | 결과 |
|------|------|------|
| api-server | `npx tsc --noEmit -p tsconfig.json` | 본 WO 변경분 **신규 에러 0** |
| web-neture | `npx tsc --noEmit` | **PASS (exit 0)** |

- api-server tsc 에 `src/controllers/market-trial/marketTrialController.ts(105,9) TS2353 (CreateTrialDto.productId)` 1건이 보고되나, **clean tree(본 변경 stash 후)에서도 동일 재현 → 본 WO 와 무관한 pre-existing baseline 에러**. 본 WO 가 손대지 않음.

---

## 13. 변경 없음 확인 (금지선)

| 항목 | 상태 |
|------|------|
| DB / schema / migration | 변경 없음 |
| `package.json` | 변경 없음 |
| `pnpm-lock.yaml` | 변경 없음 |
| Dockerfile / CI | 변경 없음 |
| 승인/반려/배치 로직 | 변경 없음 |
| frontend standard list 화면 전환 | 안 함 |
| unrelated 파일 | 커밋 제외 (작업 중 발생한 `tailwind.config.js` 변경 4건은 본 WO 무관 — path-specific add 로 제외) |

---

## 14. 후속 WO

**WO-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1**
- `/admin/product-approvals` 자체 `<table>` → 표준 DataTable + Pagination + URL sync.
- 검색/status 필터/정렬/페이지를 server-driven 으로 이관(`getProductsList`).
- KPI 4카드 → `getSummary()` 연결.
- (선택) `supplierName`/`category` 정렬·검색 backend 확장 — JOIN 재설계 동반 시.

> browser smoke(`SMOKE-O4O-STANDARD-LIST-PHASE1-REFERENCE-V1`)는 환경 블로커 해제 후 별도 진행.
