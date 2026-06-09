# CHECK-O4O-OPERATOR-BULK-ACTION-FLOW-P1-COMPLETION-V1

> **Type:** CHECK (read-only 검증·고정)
> **Date:** 2026-06-09
> **Scope:** 운영자 Bulk Action Flow P1 정비 완료 검증
> **판정:** **CONDITIONAL PASS**

---

## 1. CHECK 개요

`IR-O4O-OPERATOR-BULK-ACTION-FLOW-CROSSSERVICE-AUDIT-V1` 에서 식별된 운영자 bulk 흐름
편차 5건이 후속 WO/IR 로 정비된 뒤, 실제로 main 에 반영되어 있는지와 남은 P1 위험이
없는지 확인하고 결과를 문서로 고정한다.

본 CHECK 는 **read-only** 다. 코드/UI/API/DB/migration/route/menu 를 일절 수정하지 않는다.

> **관련 문서:** 직전 세션이 동일 범위를 `docs/checks/CHECK-O4O-OPERATOR-BULK-P1-COMPLETION-V1.md`
> (커밋 `f56074e0b`, PASS) 로 한 차례 고정했다. 본 문서는 WO 사양에 따른 **상세 검증판**으로,
> 정적 코드 확인 + 타입체크 + live guard smoke 결과를 항목별로 기록한다. 두 문서는 동일 범위의
> 보완 관계이며 충돌하지 않는다.

---

## 2. 사전 git 상태

- Branch: `main`
- 직전 커밋: `f56074e0b docs(operator): CHECK operator bulk P1 completion — PASS`
- 검증 대상 5개 파일 모두 working tree 미변경(선행 WO 커밋 상태 유지):

| 파일 | 마지막 커밋 |
|------|-------------|
| `services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx` | `68dfead02` (dead selectable 제거) |
| `services/web-kpa-society/src/pages/operator/QualificationRequestsPage.tsx` | `d190f30cb` (BulkResultModal 연결) |
| `services/web-glycopharm/src/pages/operator/QualificationRequestsPage.tsx` | `d190f30cb` (BulkResultModal 연결) |
| `services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx` | `d4124102f` (dead surface cleanup 반영) |
| `apps/api-server/src/modules/neture/neture.routes.ts` | `531809f7f` (supply-products guard) |

> 워킹트리에는 본 CHECK 와 무관한 다른 세션의 WIP(가이드 카피/seoRegistry/Order CHECK 등)가
> 존재한다. 본 CHECK 커밋에는 **신규 문서 1개만** path-specific 으로 add 한다.

---

## 3. 선행 IR/WO 목록

| 커밋 | 작업 |
|------|------|
| `ff2dbb60d` | `IR-O4O-OPERATOR-BULK-ACTION-FLOW-CROSSSERVICE-AUDIT-V1` |
| `68dfead02` | `WO-O4O-KCOS-OPERATOR-PRODUCTS-DEAD-SELECTABLE-CLEANUP-V1` |
| `d190f30cb` | `WO-O4O-OPERATOR-QUALIFICATION-BULK-RESULT-MODAL-V1` (KPA/GP) |
| `e1687bcc5` | `IR-O4O-OPERATOR-CUSTOM-BULK-CONVERGENCE-SAFETY-AUDIT-V1` |
| `82119f532` | `WO-O4O-NETURE-ALL-OFFERS-SCOPE-GUARD-FIX-V1` |
| `531809f7f` | `WO-O4O-NETURE-SUPPLY-PRODUCTS-SCOPE-GUARD-FIX-V1` |
| `e908c8906` / `d4124102f` | `WO-O4O-GLYCOPHARM-PHARMACIES-DEAD-SURFACE-CLEANUP-V1` (정렬→cleanup 반영) |

bulk P1 커밋들(`68dfead02`/`d190f30cb`/`82119f532`/`531809f7f`)의 변경은 4개 프론트 페이지 +
`neture.routes.ts` 로 한정되며, **migration/SQL/entity 변경 0건**임을 확인했다.

---

## 4. K-Cosmetics ProductsPage 확인

`services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx`

| 확인 항목 | 결과 |
|-----------|------|
| `selectedIds` 없음 | ✅ |
| `selectable` 없음 | ✅ |
| `selectedKeys` 없음 | ✅ |
| `onSelectionChange` 없음 | ✅ |
| ActionBar/useBatchAction/BulkResultModal 추가 없음 | ✅ |
| row click 상세 이동 유지 | ✅ `onRowClick → navigate('/operator/products/:id')` |
| route/menu/backend 변경 없음 | ✅ |

`DataTable` 는 조회 전용(`columns`/`data`/`onRowClick`/pagination)으로만 사용된다.
죽은 선택 UI 없음 → **PASS**.

---

## 5. KPA QualificationRequests 확인

`services/web-kpa-society/src/pages/operator/QualificationRequestsPage.tsx`

| 확인 항목 | 결과 |
|-----------|------|
| `BulkResultModal` import (`@o4o/ui`) | ✅ (L9) |
| `open={batch.showResult}` | ✅ (L348) |
| `result={batch.result}` | ✅ (L350) |
| `onClose` → `batch.clearResult()` + `load()` | ✅ (L349) |
| `onRetry` → `batch.retryFailed()` | ✅ (L351) |
| bulk action 종류 증가 없음 | ✅ `bulk-delete` 단일 (danger, confirm + visible only when selected) |

bulk 흐름: `handleBulkDelete` → confirm → `batch.executeBatch(batchDeleteRequests, ids)` →
성공 시 selection 초기화 + reload. 결과는 `BulkResultModal` 로 성공/실패/부분실패 표시.
→ **PASS**.

---

## 6. GlycoPharm QualificationRequests 확인

`services/web-glycopharm/src/pages/operator/QualificationRequestsPage.tsx`

KPA 와 동일 구조(이식판):

| 확인 항목 | 결과 |
|-----------|------|
| `BulkResultModal` 연결(open/result/onClose+load/onRetry) | ✅ (L356-361) |
| 기존 bulk action 정책 유지 (`bulk-delete` 단일) | ✅ |
| 신규 위험 action 없음 | ✅ |
| serviceKey='glycopharm' API(`glycopharmQualificationApi`) 사용 | ✅ |

→ **PASS**.

---

## 7. GlycoPharm PharmaciesPage 확인

`services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx`

| 확인 항목 | 결과 |
|-----------|------|
| `selectedIds` 없음 | ✅ |
| `selectable` 없음 | ✅ |
| `selectedKeys` 없음 | ✅ |
| `onSelectionChange` 없음 | ✅ |
| ActionBar 없음 | ✅ |
| RowActionMenu no-op action 없음 | ✅ (RowActionMenu 자체 제거됨) |
| `API 연결 필요` 류 dead 주석이 live action 에 남음 | ✅ 없음 |
| 준비중 안내 배너 존재 | ✅ "약국 상태 관리 기능 준비 중" (L337-347) |
| 목록 조회/필터/페이지네이션/loading/error/empty 유지 | ✅ |
| backend/API/route/menu 변경 없음 | ✅ (backend stub 유지, 변경 없음) |

파일 헤더에 cleanup 의도가 명문화되어 있고(`WO-O4O-GLYCOPHARM-PHARMACIES-DEAD-SURFACE-CLEANUP-V1`),
DataTable 은 조회 전용으로만 사용된다. 죽은 단건/일괄 action 제거 완료 → **PASS**.

---

## 8. Neture all-offers guard 확인

`apps/api-server/src/modules/neture/neture.routes.ts`

```
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';  // L17

// L96
router.get('/operator/all-offers',
  requireAuth, requireNetureScope('neture:operator') as RequestHandler, ...)

// L126
router.patch('/operator/all-offers/batch-active',
  requireAuth, requireNetureScope('neture:operator') as RequestHandler, ...)
```

| 확인 항목 | 결과 |
|-----------|------|
| `GET /operator/all-offers` requireAuth + requireNetureScope('neture:operator') | ✅ |
| `PATCH /operator/all-offers/batch-active` requireAuth + requireNetureScope('neture:operator') | ✅ |
| route path/controller/response shape 변경 없음 | ✅ (guard 추가만, WO 주석으로 명문화) |

operator sub-router 보다 먼저 등록된 standalone route 라 가드 미상속이던 gap 을 명시적으로 보강함.
→ **PASS**.

---

## 9. Neture supply-products guard 확인

`apps/api-server/src/modules/neture/neture.routes.ts`

```
// L372
router.get('/operator/supply-products',
  requireAuth, requireNetureScope('neture:operator') as RequestHandler, ...)
```

| 확인 항목 | 결과 |
|-----------|------|
| `GET /operator/supply-products` requireAuth + requireNetureScope('neture:operator') | ✅ |
| route path/controller/response shape 변경 없음 | ✅ |

operator sub-router 가드 이후 등록된 standalone route 의 guard 미상속 gap 보강 완료 → **PASS**.

---

## 10. TypeScript/build 검증

| 대상 | 명령 | 결과 |
|------|------|------|
| api-server | `npx tsc --noEmit` | ✅ clean (error 0, neture.routes 오류 0) |
| web-glycopharm | `npx tsc -b` | ✅ clean (error 0) |
| web-kpa-society | `npx tsc` | ✅ clean (error 0) |
| web-k-cosmetics | `npx tsc` | ✅ clean (error 0) |

신규 TypeScript 오류 없음. 대상 파일 모두 선행 green 커밋 이후 미변경.

---

## 11. live smoke 결과

API: `https://o4o-core-api-117791934476.asia-northeast3.run.app`

### Neture all-offers

| 케이스 | 기대 | 실측 |
|--------|------|------|
| 미인증 GET | 401 | ✅ 401 (live) |
| 미인증 PATCH batch-active | 401 | ✅ 401 (live) |
| neture:supplier 비-operator → GET | 403 | ⚠ 정적 검증 (아래 주석) |
| neture operator → GET | 200 | ⚠ 정적 검증 (아래 주석) |

### Neture supply-products

| 케이스 | 기대 | 실측 |
|--------|------|------|
| 미인증 GET | 401 | ✅ 401 (live) |
| neture:supplier 비-operator → GET | 403 | ⚠ 정적 검증 |
| neture operator → GET | 200 / empty | ⚠ 정적 검증 |

> **인증 케이스 제약:** 프로덕션 인증은 httpOnly 쿠키 세션 기반이라 `curl` 로
> 세션을 재현하지 못했다(login 200 이나 cookie jar 에 세션 미적재, `/auth/status`
> `authenticated:false`). 따라서 403(비-operator)/200(operator) 는 **정적 가드 검증**으로
> 대체한다 — 세 route 모두 `requireAuth → requireNetureScope('neture:operator')` 체인이
> 코드상 확인되며, 미인증 401 live 결과가 requireAuth 단계가 실제로 동작함을 입증한다.
> `requireNetureScope` 는 다른 Neture operator route 들이 공통 사용하는 검증된 미들웨어다.
> mutation 성 `batch-active` 는 프로덕션 직접 호출 없이 정적/미인증 smoke 로만 검증한다.

### UI smoke

정적 코드 검증으로 대체(브라우저 UI smoke 미실행). 각 페이지 구조는 §4~§7 에서 확인:
- K-Cos `/operator/products`: 체크박스 컬럼 없음 / row click 상세 이동 — 정적 확인
- GP `/operator/pharmacies`: 체크박스 컬럼 없음 / 죽은 단건 action 없음 / 준비중 안내 — 정적 확인
- KPA·GP QualificationRequests: bulk modal 정적 구조 정상. pending 데이터 실동작은 미실행.

---

## 12. 남은 후순위 후보 (NEEDS-FOLLOWUP 아님, P2 후보)

- Neture `AllRegisteredProductsPage` 는 custom bulk 이나 `IR-O4O-OPERATOR-CUSTOM-BULK-CONVERGENCE-SAFETY-AUDIT-V1`
  에서 confirm/부분실패/soft delete 구조로 **안전** 판정됨. 표준 `BulkResultModal` 로의 polish 는
  선택적 P2.
- GlycoPharm 약국 관리 backend(상태변경 API)는 현재 stub. 실제 약국 상태 관리가 필요하면
  별도 기능 WO 로 분리.
- admin member bulk 표준화(P2).
- standalone operator route scope guard 일괄 점검(보안 우선, P2).

---

## 13. 최종 판정

### CONDITIONAL PASS

코드 상태 기준 PASS 조건은 모두 충족한다:

- ✅ K-Cos Products dead selectable 제거 완료
- ✅ KPA/GP QualificationRequests `BulkResultModal` 연결 완료
- ✅ GP Pharmacies dead selectable/no-op action 제거 + 준비중 안내
- ✅ Neture all-offers (GET/PATCH) operator scope guard 보강
- ✅ Neture supply-products (GET) operator scope guard 보강
- ✅ Neture `AllRegisteredProductsPage` 안전한 custom bulk 로 유지(선행 IR)
- ✅ 신규 위험 bulk action 없음
- ✅ backend/API/DB/migration/route/menu 의도치 않은 변경 없음
- ✅ 4개 서비스 TypeScript clean

**CONDITIONAL** 사유(WO 의 CONDITIONAL PASS lane 에 해당):

- 인증된 operator/비-operator guard smoke(403/200)는 쿠키 세션 재현 불가로
  정적 가드 검증 + 미인증 401 live smoke 로 대체.
- QualificationRequests bulk modal 실동작은 pending 데이터 미확보로 정적 구조 검증으로 대체.
- Neture mutation `batch-active` 는 프로덕션 직접 호출 없이 guard 정적/미인증 smoke 로 대체.

→ 운영자 Bulk P1 은 **완료로 고정**한다. 다음은 P2 축에서
**대시보드 부가 섹션 통일** 또는 **admin member bulk 표준화** 중 택1.

---

## 14. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|------|------|
| 운영자가 체크박스 선택 후 실제 가능한 작업만 보는가 | ✅ 죽은 selectable 제거(K-Cos/GP Pharmacies). 실행 가능한 곳만 selectable 유지(QualificationRequests delete) |
| 죽은 선택 UI / no-op action 제거되었는가 | ✅ |
| bulk 결과가 성공/실패/부분실패로 투명 표시되는가 | ✅ `BulkResultModal` (KPA/GP) |
| operator 전용 API 가 operator scope 로 보호되는가 | ✅ Neture all-offers/supply-products `requireNetureScope('neture:operator')` |
| 위험 action 이 쉽게 실행되지 않게 보호되는가 | ✅ 삭제는 confirm + danger + 결과 모달, mutation route 는 operator scope |
| 공통화가 1인 개발 유지보수성을 높이는가 | ✅ KPA→GP 동일 `BulkResultModal`/`useBatchAction` 패턴, `@o4o/operator-ux-core` 공유 |
| Supplier/Store Hub/My Store/Guide 영역 부적절 혼입 없는가 | ✅ 본 범위는 operator 페이지 + neture operator route 한정 |

철학(`O4O-BUSINESS-PHILOSOPHY-V1` §3.2 Operator 정의, §11 Operator Dashboard 표준)과 충돌 없음.
"운영자는 실제 가능한 작업만, 투명한 결과로, scope 보호 하에 수행한다" 원칙에 부합.

---

*Generated: 2026-06-09 · read-only CHECK · 코드 무변경*
