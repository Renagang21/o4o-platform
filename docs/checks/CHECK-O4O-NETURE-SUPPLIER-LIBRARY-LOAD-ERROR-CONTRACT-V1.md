# CHECK-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1`
선행 IR: `IR-O4O-NETURE-SUPPLIER-REMAINING-C-LOAD-ERROR-CONTRACT-AUDIT-V1` (권장 묶음 2)
작성일: 2026-07-26 (KST)

---

## 1. 실제 route

```text
/supplier/library            SupplierLibraryPage
/supplier/library/new        SupplierLibraryFormPage (생성)
/supplier/library/:id/edit   SupplierLibraryFormPage (수정)
```

`App.tsx:816-818` 기준 확정. WO 예상과 일치.

## 2. `getLibraryItems` 정상 응답 구조 (backend 정적 확인)

```text
GET /neture/library   (requireAuth + requireLinkedSupplier)
→ { success: true, data: { items: NetureSupplierLibraryItem[], total: number } }
```

| 항목 | 값 | 근거 |
|------|-----|------|
| items 위치 | `data.items` | `neture-library.routes.ts:125-151` |
| total | `data.total` (필수 제공) | `neture-library.service.ts:59,76` |
| page·limit | 지원 | `routes:128-133` |
| **limit 상한** | **100** | `service.ts:62` `Math.min(opts?.limit \|\| 20, 100)` |
| 검색 필터 | `category` **만** | `service.ts:64-67` |
| id 필터 | **없음** | 동일 |
| 실패 | 500 `INTERNAL_ERROR` | `routes:147-150` |

### 단건 조회 API — **없음**

```text
GET    /library         목록
POST   /library         생성
PATCH  /library/:id     수정
DELETE /library/:id     삭제
```

조회용 `GET /library/:id` 가 존재하지 않는다. 따라서 수정 화면의 "목록 조회 후 `find(id)`" 구조는 유지했다(신규 backend API 금지).

## 3. 기존 `[]` fallback

```ts
catch (error) { console.warn(...); return []; }
return result.data?.items || [];
```

정상 빈 목록·조회 실패·깨진 200 payload 가 모두 `[]` 로 수렴했다.

## 4. 적용한 고정 오류 코드와 payload 검증

```text
SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED
```

```ts
catch                                   → console.warn(원문) 후 고정 코드 throw
!result?.success || !Array.isArray(items) → 고정 코드 throw
total 누락                                → 실패 아님. items.length 로 대체(보조 필드)
```

반환 타입을 `SupplierLibraryItem[]` → **`{ items, total }`** 로 확장했다.
소비처가 "조회 범위(limit) 밖에 자료가 더 있는지"를 판단하기 위해 `total` 이 필요하다(§8).

## 5. 전체 소비처

| 파일 | route | 용도 |
|------|-------|------|
| `SupplierLibraryPage.tsx` | `/supplier/library` | 목록 |
| `SupplierLibraryFormPage.tsx` | `/supplier/library/:id/edit` | 수정 대상 prefill |

전수 검색 결과 그 외 소비처 없음. 두 곳 모두 같은 커밋에서 반영했다.

## 6. 목록 페이지 4상태

```text
loading   기존 DataTable loading 유지
error     지속 오류 UI + 다시 시도 (목록 대신 렌더)
success + 0건   "등록된 자료가 없습니다" (기존 emptyText 유지)
success + 데이터  기존 DataTable
```

오류 UI:

```text
자료함 목록을 불러오지 못했습니다.
잠시 후 다시 시도해 주세요.
[다시 시도]
```

오류 상태와 정상 빈 상태는 **배타 렌더**(삼항)라 동시 노출이 불가능하다.

## 7. 수정 페이지 상태 분리

```ts
type loadState = 'idle' | 'loading' | 'error' | 'not-found' | 'out-of-range' | 'success';
```

| 상태 | 조건 | 문구 | 다시 시도 |
|------|------|------|:---:|
| `error` | 조회 자체 실패(throw) | 자료 정보를 불러오지 못했습니다. / 잠시 후 다시 시도해 주세요. | **제공** |
| `not-found` | 조회 성공 + 미발견 + `total <= items.length` | 자료를 찾을 수 없습니다. / 이미 삭제되었거나 접근할 수 없는 자료입니다. | **미제공** |
| `out-of-range` | 조회 성공 + 미발견 + `total > items.length` | 자료 정보를 확인할 수 없습니다. / 자료함에서 해당 자료를 열어 주세요. | 제공 |
| `success` | 대상 발견 | 폼 prefill | — |

오류 상태에서 **빈 수정 폼을 렌더하지 않는다**(전용 화면으로 조기 return). 기존 폼 데이터를 임의 초기화하지 않는다.

## 8. `limit: 100` 결함 조사·처리 결과

### 조사

WO §5 의 세 후보를 코드 기준으로 판정했다.

| 후보 | 가능 여부 | 근거 |
|------|:---:|------|
| A. 기존 단건 조회 API 재사용 | **불가** | `GET /library/:id` 미존재 (§2) |
| B. 목록 API 의 id·query 필터 | **불가** | 필터는 `category` 만 (§2) |
| C. pagination 순회 | 기술적으로 가능하나 **미채택** | `total` 이 커질수록 요청이 선형 증가 → WO §5 "무제한 전체 조회 금지" 에 저촉 |

### 본 WO 처리 — 오인 제거만 (근본 해결은 분리)

```text
반영:  total > items.length 이면 not-found 로 단정하지 않고 out-of-range 로 안내
       → "limit 범위 밖 자료를 not-found 로 표시" (WO §8 금지) 해소
미반영: 101번째 이후 자료를 실제로 찾아 수정 진입시키는 기능
```

프로덕션 검증에서 `total: 250 / items: 1` 합성 응답으로 **`자료를 찾을 수 없습니다` 가 아닌 별도 안내가 나오는 것**을 확인했다(§10-2).

### 후속 WO

```text
WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1
```

안전한 해결 후보(우선순위 순):

```text
1. backend 에 GET /library/:id 단건 조회 추가 (권장 — 요청 1회, 권한·404 계약 명확)
2. 목록 API 에 id 필터 파라미터 추가
3. 프론트 pagination 순회 (상한 필요, 요청 수 증가로 최후 수단)
```

1·2 모두 backend 변경이 필요해 본 WO 범위(§12 신규 API·backend 변경 금지) 밖이다.

## 9. 다시 시도 방식

| 화면 | 동작 |
|------|------|
| 목록 | `fetchItems()` — `getLibraryItems()` 만 재호출. route 이동·전체 reload 없음 |
| 수정 | `reloadItem()`(= `loadItem`) — 수정 대상 조회만 재호출. route 이동 없음 |

목록 페이지는 현재 필터 상태(`visibilityFilter`)를 클라이언트 필터로 유지하므로 재시도 시 조건이 보존된다.

## 10. 오류 주입·복구 결과

프로덕션에서 XHR URL 재작성(도달 불가 주소 / 404) 및 합성 200 응답으로 목록 요청만 조작. **운영 데이터 write 0.**

### 10-1. 목록 페이지 (WO §13-2) — 8/8 PASS

| 시나리오 | 결과 | 관측값 |
|----------|:---:|--------|
| A 정상 `[]` | PASS | `등록된 자료가 없습니다`, 오류 미표시 |
| B 정상 + 합성 데이터 | PASS | `합성 자료 1` 행 렌더 |
| C 4xx(404) | PASS | 오류 + 다시 시도, **빈 상태 문구 미노출** |
| D 네트워크 실패 | PASS | 동일 |
| E 200 + items 비배열 | PASS | 오류 (정상 0건으로 흐르지 않음) |
| F 다시 시도 실패 | PASS | 오류 유지 |
| G 다시 시도 성공 + `[]` | PASS | 오류 해제 → 정상 빈 상태 |
| H 다시 시도 성공 + 데이터 | PASS | 오류 해제 → 목록 렌더 |

### 10-2. 수정 페이지 (WO §13-3) — 8/8 PASS

| 시나리오 | 결과 | 관측값 |
|----------|:---:|--------|
| A 대상 존재 | PASS | 폼 prefill (input 렌더) |
| B 대상 없음 | PASS | `자료를 찾을 수 없습니다`, 다시 시도 **미노출** |
| C 4xx(404 주입) | PASS | `자료 정보를 불러오지 못했습니다` + 다시 시도, **not-found 문구 미노출** |
| D 네트워크 실패 | PASS | 동일 |
| E payload 깨짐 | PASS | error (§10-1 E 와 동일 경로) |
| F 다시 시도 실패 | PASS | error 유지, not-found 미노출 |
| G 다시 시도 성공 + 대상 없음 | PASS | not-found |
| H 다시 시도 성공 + 대상 존재 | PASS | 폼 복구 |
| **100건 초과 (`total 250 / items 1`)** | PASS | **`자료 정보를 확인할 수 없습니다`** — not-found 로 오인하지 않음 |

## 11. 생성 모드 회귀

```text
목록 실패 주입 상태에서 /supplier/library/new 진입
→ 폼 정상 렌더, 오류·not-found 문구 0, 로딩 고착 0
```

생성 모드는 `isEditMode` 가 false 라 `loadItem()` 이 조기 return 하며 **목록 조회를 호출하지 않는다**. 목록 조회 실패가 생성 모드를 오류로 만들지 않음을 확인했다.

## 12. mutation 후 재조회 처리

- 목록: 삭제 후 `fetchItems()` 재호출 → 실패 시 목록 오류 상태로 표시(mutation 성공은 유지).
- 수정/생성 저장: 성공 후 `navigate('/supplier/library')` 로 이동하며, 이동한 목록에서 조회 실패 시 목록 오류 상태로 표시된다.
- mutation API(`createLibraryItem` / `updateLibraryItem` / `deleteLibraryItem`) 계약은 **무변경**.

## 13. 라우트·반응형

| route | 렌더 | 로딩 고착 | 오탐 오류 | 결과 |
|-------|:---:|:---:|:---:|------|
| `/supplier/library` | OK | 없음 | 없음 | 정상 빈 상태 |
| `/supplier/library/new` | OK | 없음 | 없음 | 폼 정상 |
| `/supplier/library/:id/edit` (없는 id) | OK | 없음 | 없음 | not-found (오류 아님) |

정상 상태 **콘솔 오류 0**, unhandled rejection 0.

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS |
| Tablet 768×1024 | PASS — 다시 시도 39px, 잘림 0, scrollWidth 768 = viewport |
| Mobile 390×844 | PASS — 목록·수정 오류 모두 다시 시도 89×39px, 잘림 0, overflow 0 |

not-found 와 error UI 가 동시 렌더되는 경우는 전 폭에서 0건(상호 배타 분기).

## 14. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `e0f027d1a` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30192439922) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01320-kpq` → **`neture-web-01321-2fl`** |

§10~§13 의 모든 검증은 배포된 프로덕션에서 수행했다.

## 15. 무변경 확인

| 항목 | 값 |
|------|-----|
| 자료함 데이터 모델 · 자료 유형 ENUM | **무변경** |
| 업로드·저장·삭제·게시 정책 | **무변경** |
| mutation API 계약 | **무변경** |
| 공통 pagination 구조 · 공통 API wrapper · 공통 UI Core | **무변경** |
| dependency / lockfile | **무변경** |
| 사이드바 · 자료함 IA | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck | PASS |
| build | PASS (12.13s) |

## 16. 변경 파일

```text
services/web-neture/src/lib/api/supplier.ts                       (API 1종 + 타입)
services/web-neture/src/pages/supplier/SupplierLibraryPage.tsx    (목록 소비처)
services/web-neture/src/pages/supplier/SupplierLibraryFormPage.tsx (수정 소비처)
```

3 파일 — 같은 구현 커밋(`e0f027d1a`). **API + 소비처 2곳 원자적 반영**, 부분 반영 0.

## 17. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 정상 0건 ↔ 오류 구분 | 확인 완료 | 계정 자료 0건 — 본 WO 핵심 회귀 검증에 적합 |
| 목록 데이터 렌더 · 수정 폼 prefill | **합성 200 응답으로 확인** | 실제 자료 없음. WO §16 허용 방식, 운영 데이터 생성 0 |
| 100건 초과 상황 | **합성 응답(`total 250`)으로 확인** | 실데이터 100건 초과 자료 없음. 테스트 데이터 생성은 WO 금지 |
| mutation 후 재조회 실동작 | **미확인** | 저장·삭제 실행에 운영 write 필요 → WO 금지 |

## 18. 후속 항목

| # | 항목 |
|---|------|
| 1 | **`WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1`** — 101번째 이후 자료 수정 진입 (§8). 권장: backend `GET /library/:id` 단건 조회 추가 |
| 2 | `WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1` (IR 묶음 3) — `listSpotPolicies()`, backend 404 계약 확인 선행 |
| 3 | IR E 등급 2건 — `getShipment()` / `getOrderCondition()` |
| 4 | `supplierScreenSets.ts` 상세·mutation 의 `call()` undefined 통과 (우선순위 낮음) |
| 5 | 실데이터 보유 계정으로 목록 렌더·수정 prefill·mutation 후 재조회 재검증 |
