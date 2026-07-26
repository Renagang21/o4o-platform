# CHECK-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1

> WO: `WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1`
> 선행: `CHECK-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1`
> 일자: 2026-07-26
> 상태: **PASS**

---

## 1. 배경 / 문제

`SupplierLibraryFormPage` 의 **수정 모드**는 단건 조회 API 가 없어서
`getLibraryItems({ limit: 100 })` 로 목록을 받아 `items.find(i => i.id === id)` 로 대상을 찾았다.

이 구조에서 발생하는 결함:

| # | 결함 | 결과 |
|---|------|------|
| 1 | 자료가 **101건 이상**이면 101번째부터는 목록 100건 안에 없음 | 존재하는 자료인데 "찾을 수 없음" |
| 2 | 목록 조회 실패와 대상 부재를 구분 못 함 | 장애를 "없는 자료"로 오표시 |
| 3 | 수정 1건을 위해 최대 100건 전송 | 불필요한 페이로드 |

즉 **페이지네이션 경계가 곧 데이터 가시성 경계**가 되어 있었다.

---

## 2. 변경 내용

### 2-1. Backend — 단건 조회 API 신설

**`apps/api-server/src/modules/neture/services/neture-library.service.ts`**

```ts
async getByIdForSupplier(id: string, supplierId: string): Promise<NetureSupplierLibraryItem | null> {
  try {
    return await this.repo.findOne({ where: { id, supplierId } });
  } catch (error) {
    logger.error('[NetureLibraryService] Error fetching item:', error);
    throw error;
  }
}
```

- 소유권 강제는 기존 `update()` / `delete()` 와 **동일한 `where: { id, supplierId }` 복합 조건**.
- 타인 소유·미존재를 모두 `null` 로 반환 → 라우트에서 404 로 통일(존재 여부 노출 금지).

**`apps/api-server/src/modules/neture/neture-library.routes.ts`**

```
GET /api/v1/neture/library/:id   (requireAuth + requireLinkedSupplier)
```

- 응답 shape 은 목록 항목과 동일하게 정규화(`producer` / `producerRef` / `visibility` / `serviceKey` / `contentType` / `metaStatus`).
- 미존재·타인 소유 → `404 { success:false, error:{ code:'ITEM_NOT_FOUND' } }`
- 예외 → `500 { success:false, error:{ code:'LIBRARY_ITEM_FETCH_FAILED' } }`
- **라우트 등록 순서**: `/library/public` (line 91) → `/library` (list) → `/library/:id` → `POST /library`.
  `/library/public` 이 `:id` 보다 앞에 등록되어 있어 **shadowing 없음** (프로덕션 검증 §4-1).

### 2-2. Frontend — API 클라이언트

**`services/web-neture/src/lib/api/supplier.ts`**

```ts
export const SUPPLIER_LIBRARY_ITEM_LOAD_FAILED = 'SUPPLIER_LIBRARY_ITEM_LOAD_FAILED';
export const SUPPLIER_LIBRARY_ITEM_NOT_FOUND  = 'SUPPLIER_LIBRARY_ITEM_NOT_FOUND';

async getLibraryItem(id: string): Promise<SupplierLibraryItem> {
  let response;
  try {
    response = await api.get(`/neture/library/${encodeURIComponent(id)}`);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    console.warn('[Supplier API] Failed to fetch library item:', extractApiError(error));
    throw new Error(status === 404 ? SUPPLIER_LIBRARY_ITEM_NOT_FOUND : SUPPLIER_LIBRARY_ITEM_LOAD_FAILED);
  }
  const data = response.data?.data;
  if (!response.data?.success || !data || typeof data !== 'object') {
    console.warn('[Supplier API] Unexpected library item payload shape');
    throw new Error(SUPPLIER_LIBRARY_ITEM_LOAD_FAILED);
  }
  return data as SupplierLibraryItem;
},
```

- **404 만** not-found. 그 외 4xx/5xx/네트워크/형상 이상은 전부 load-failed.
- 서버 원문·stack trace 는 화면에 노출하지 않고 `console.warn` 으로만 남긴다.

### 2-3. Frontend — 수정 화면

**`services/web-neture/src/pages/supplier/SupplierLibraryFormPage.tsx`**

- `LOOKUP_LIMIT = 100` 및 목록 기반 `find(id)` **제거**
- `'out-of-range'` 상태 **제거** (페이지네이션 경계 개념 자체가 사라짐)
- 상태: `'idle' | 'loading' | 'error' | 'not-found' | 'success'`

```ts
const loadItem = useCallback(async () => {
  if (!isEditMode || !id) return;
  setLoading(true);
  setLoadState('loading');
  try {
    const item = await supplierApi.getLibraryItem(id);
    setFormData({ ... });
    setLoadState('success');
  } catch (e: any) {
    setLoadState(e?.message === SUPPLIER_LIBRARY_ITEM_NOT_FOUND ? 'not-found' : 'error');
  } finally {
    setLoading(false);
  }
}, [id, isEditMode]);
```

- `error` → "자료 정보를 불러오지 못했습니다" + **다시 시도** 버튼
- `not-found` → "자료를 찾을 수 없습니다" + **다시 시도 없음** (재시도해도 결과 동일)
- 생성 모드(`/new`) 는 `isEditMode === false` 로 단건 조회를 아예 호출하지 않음

---

## 3. 빌드 / 배포

| 항목 | 결과 |
|------|------|
| `services/web-neture` typecheck + build | PASS |
| `apps/api-server` build (`tsconfig.build.json`) | PASS |
| 커밋 | `7b9ac821c` — `fix(neture): load supplier library edit items by id` |
| Deploy API Server (Cloud Run) | run `30193569621` **success** → `o4o-core-api-02929-l4g` |
| Deploy Web Services (Cloud Run) | run `30193569618`, `deploy-neture` **success** → `neture-web-01323-tsx` |

> backend + frontend 를 **같은 커밋**에 반영 (부분 반영 금지 조항 준수).

---

## 4. 프로덕션 검증

### 4-1. API 계약 (`https://api.neture.co.kr/api/v1`)

| 요청 | 응답 | 판정 |
|------|------|------|
| `GET /neture/library?limit=1` | `200 {"success":true,"data":{"items":[],"total":0}}` | 목록 계약 불변 PASS |
| `GET /neture/library/00000000-0000-0000-0000-000000000000` | `404 {"success":false,"error":{"code":"ITEM_NOT_FOUND","message":"Library item not found"}}` | PASS |
| `GET /neture/library/public?limit=1` | `200` 정상 | `:id` shadowing 없음 PASS |

> 타인 소유 id 추측 조회는 수행하지 않았다. 미존재 UUID 로만 404 경로를 확인했다.

### 4-2. 수정 화면 시나리오 (XHR 계측 — `__listCalls` / `__itemCalls`)

| # | 시나리오 | 결과 | 판정 |
|---|----------|------|------|
| A | **101번째 자료** (합성 200 단건 응답) | `prefilled: "합성 자료 101"`, **`listCalls: 0, itemCalls: 1`** | **핵심 회귀 해소 PASS** |
| B | 실 404 (유효 UUID, 미존재) | `notFound: true, err: false, retry: false, listCalls: 0, itemCalls: 1` | PASS |
| C | 500 | `err: true, retry: true, listCalls: 0, itemCalls: 1` | PASS |
| D | 네트워크 오류 | `err: true, retry: true, listCalls: 0, itemCalls: 1` | PASS |
| E | 형상 이상(200 + 비정상 payload) | `err: true, retry: true, listCalls: 0, itemCalls: 1` | PASS |
| F | error → **다시 시도**(실패 유지) | `err: true, retry: true, itemCalls: 1` (재요청 발생) | PASS |
| G | error → **다시 시도**(성공 전환) | `prefilled: "합성 자료 101", err: false, listCalls: 0, itemCalls: 1` | PASS |

**핵심**: 모든 수정 모드 진입에서 `listCalls: 0` — 목록 API 를 더 이상 경유하지 않는다.

### 4-3. 라우트 회귀

| 라우트 | 결과 | 판정 |
|--------|------|------|
| `/supplier/library` | 정상 렌더, "등록된 자료가 없습니다"(정상 empty), `listCalls: 1 / itemCalls: 0` | PASS |
| `/supplier/library/new` | 폼 정상, error/not-found 문구 없음, **`itemCalls: 0`** | PASS |
| `/supplier/library/:id/edit` | §4-2 전 시나리오 PASS | PASS |

| 확인 항목 | 결과 |
|-----------|------|
| 없는 id → not-found | PASS |
| 조회 장애 → error | PASS |
| 로딩 고착 | 0 |
| unhandled rejection | 0 |
| 정상 상태 콘솔 오류 | **0** (계측 스크립트 제거 후 새 세션 로드 기준) |

### 4-4. 반응형

| 폭 | hOverflow | 다시 시도 버튼 | 문구 잘림 |
|----|:---------:|:--------------:|:---------:|
| 1440×900 | 0 | 접근 가능 (89×39) | 없음 |
| 768×1024 | 0 | 접근 가능 | 없음 |
| 390×844 (error) | 0 | 접근 가능 | 없음 |
| 390×844 (not-found) | 0 | 의도적 미제공 | 없음 |

수정 폼 레이아웃 회귀 없음 / 가로 overflow 0.

---

## 5. 불변식 확인

| 불변식 | 상태 |
|--------|------|
| 목록 API 계약(`{ items, total }`) 불변 | 유지 |
| 목록 `limit` 서버 상한 100 | 변경 없음 |
| 소유권 경계 `where { id, supplierId }` | `update`/`delete` 와 동일 |
| 타인 소유 자료 존재 여부 비노출 (404 통일) | 유지 |
| 장애 ≠ 부재 구분 | 확보 |
| DB 변경 / migration | 0 |
| 운영 데이터 write | 0 |
| 테스트 계정·데이터 생성 | 0 |
| 서버 원문·stack trace 화면 노출 | 0 |

---

## 6. 후속 (본 WO 범위 외)

| # | 항목 | 비고 |
|---|------|------|
| 1 | `getShipment()` / `getOrderCondition()` 404 vs 5xx 계약 확인 | IR E등급 잔여 2건 |
| 2 | `supplierScreenSets.ts` 상세/변경 `call()` undefined pass-through | 우선순위 낮음 |
| 3 | `WO-O4O-OPERATOR-ROUTER-KPA-ROLE-PREFIX-ALIGNMENT-V1` | KPA `kpa-society:*` 가드 drift |

---

*Recorded: 2026-07-26*
